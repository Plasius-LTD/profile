import React, { useCallback, useEffect } from "react";
import { type UserAvatarEntity, type UserEntity, userEntitySchema } from "@plasius/entity-manager";
import { validateUserId } from "@plasius/schema";
import { useAuthorizedFetch } from "@plasius/auth";
import { createScopedStoreContext, type IState } from "@plasius/react-state";

export function ValidateUser(user: UserEntity) {
  const validated = userEntitySchema.validate(user);
  if (!validated.valid || !validated.value) {
    throw new Error(
      `Invalid User Profile: ${validated.errors?.join(", ") ?? "unknown error"}`
    );
  }
  return validated.value as unknown as UserEntity;
}

interface UserState extends IState {
  user?: UserEntity;
  userId: string | null;
}

type UserAction =
  | { type: "setUser"; user: UserEntity }
  | { type: "setUserId"; userId: string | null }
  | { type: "updateUser"; user: Partial<UserEntity> }
  | { type: "updateField"; payload: { field: string; value: unknown } }
  | { type: "updateNameField"; payload: { field: string; value: unknown } }
  | { type: "updateAvatarField"; payload: { field: string; value: unknown } };

const reducer = (state: UserState, action: UserAction): UserState => {
  switch (action.type) {
    case "setUser":
      return { ...state, user: action.user };
    case "setUserId":
      return { ...state, userId: action.userId };
    case "updateUser":
      if (!state.user) return state;
      return {
        ...state,
        user: {
          ...state.user,
          ...action.user,
        },
      };
    case "updateField":
      if (!state.user) return state;
      return {
        ...state,
        user: {
          ...state.user,
          [action.payload.field]: action.payload.value,
        },
      };
    case "updateNameField":
      if (!state.user || !state.user.name) return state;
      return {
        ...state,
        user: {
          ...state.user,
          name: {
            ...state.user.name,
            [action.payload.field]: action.payload.value,
          },
        },
      };
    case "updateAvatarField":
      if (!state.user) return state;
      return {
        ...state,
        user: {
          ...state.user,
          avatar: {
            ...(state.user.avatar ?? {}),
            [action.payload.field]: action.payload.value,
          } as UserAvatarEntity,
        },
      };
    default:
      return state;
  }
};

const initialState: UserState = {
  user: undefined,
  userId: null,
};

export const UserStore = createScopedStoreContext(reducer, initialState);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <UserStore.Provider>
      <UserInitializer />
      {children}
    </UserStore.Provider>
  );
};

const UserInitializer = () => {
  const authorizedFetch = useAuthorizedFetch();
  const dispatch = UserStore.useDispatch();
  const { userId, user } = UserStore.useStore();

  const saveUser = useCallback(async () => {
    if (!user) return;
    try {
      const validatedUser = ValidateUser(user);
      const res = await authorizedFetch(
        `/users/${validatedUser.partitionKey}/update`,
        {
          credentials: "include",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(validatedUser),
        }
      );
      if (!res.ok) {
        throw new Error(`Save failed with status ${res.status}`);
      }
      console.info("✅ User profile saved successfully.");
    } catch (err) {
      console.error("❌ Error saving user profile:", err);
    }
  }, [authorizedFetch, user]);

  useEffect(() => {
    if (!userId || !validateUserId(userId)) return;

    const headers = { "Content-Type": "application/json" };

    authorizedFetch(`/users/${userId}/get`, { credentials: "include" })
      .then(async (res) => {
        if (res.status === 404) {
          const newUser: Partial<UserEntity> = { id: userId };
          return await authorizedFetch(`/users/${userId}/create`, {
            credentials: "include",
            method: "POST",
            headers,
            body: JSON.stringify(newUser),
          }).then(async (res) => {
            if (!res.ok) throw new Error(`Failed to load user (${res.status})`);
            const data: unknown = await res.json();
            const validatedUser = ValidateUser(data as UserEntity);
            dispatch({ type: "setUser", user: validatedUser });
          });
        }

        if (!res.ok) throw new Error(`Failed to load user (${res.status})`);
        const data: unknown = await res.json();
        const validatedUser = ValidateUser(data as UserEntity);
        dispatch({ type: "setUser", user: validatedUser });
      })
      .catch((err) => {
        console.warn("⚠️ Failed to load or create user profile:", err);
      });

    return () => {
      saveUser().catch((err) => {
        console.error("❌ Error saving during cleanup:", err);
      });
    };
  }, [userId, authorizedFetch, dispatch, saveUser]);

  return null;
};
