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
  return {
    ...user,
    ...(validated.value as Partial<UserEntity>),
  } as UserEntity;
}

export interface UserState extends IState {
  user?: UserEntity;
  userId: string | null;
}

export type UserAction =
  | { type: "setUser"; user: UserEntity }
  | { type: "setUserId"; userId: string | null }
  | { type: "updateUser"; user: Partial<UserEntity> }
  | { type: "updateField"; payload: { field: string; value: unknown } }
  | { type: "updateNameField"; payload: { field: string; value: unknown } }
  | { type: "updateAvatarField"; payload: { field: string; value: unknown } };

export const userReducer = (state: UserState, action: UserAction): UserState => {
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

export const initialUserState: UserState = {
  user: undefined,
  userId: null,
};

export const UserStore = createScopedStoreContext(userReducer, initialUserState);

type AuthorizedFetch = (
  input: string,
  init?: {
    credentials?: "include" | "omit" | "same-origin";
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

type UserLogger = Pick<Console, "info" | "warn" | "error">;

export async function saveUserProfile(
  user: UserEntity | undefined,
  authorizedFetch: AuthorizedFetch,
  logger: UserLogger = console
): Promise<void> {
  if (!user) return;

  try {
    const validatedUser = ValidateUser(user);
    const targetUserId = typeof validatedUser.id === "string" ? validatedUser.id : "";
    if (!validateUserId(targetUserId)) {
      throw new Error("Invalid user id for save.");
    }
    const res = await authorizedFetch(
      `/users/${targetUserId}/update`,
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
    logger.info("✅ User profile saved successfully.");
  } catch (err) {
    logger.error("❌ Error saving user profile:", err);
  }
}

export async function loadOrCreateUserProfile(
  userId: string,
  authorizedFetch: AuthorizedFetch,
  dispatch: (action: UserAction) => void,
  logger: UserLogger = console
): Promise<void> {
  if (!validateUserId(userId)) return;

  const headers = { "Content-Type": "application/json" };

  try {
    const res = await authorizedFetch(`/users/${userId}/get`, {
      credentials: "include",
    });

    if (res.status === 404) {
      const newUser: Partial<UserEntity> = { id: userId };
      const createRes = await authorizedFetch(`/users/${userId}/create`, {
        credentials: "include",
        method: "POST",
        headers,
        body: JSON.stringify(newUser),
      });
      if (!createRes.ok) throw new Error(`Failed to load user (${createRes.status})`);
      const createdData: unknown = await createRes.json();
      const validatedCreatedUser = ValidateUser(createdData as UserEntity);
      dispatch({ type: "setUser", user: validatedCreatedUser });
      return;
    }

    if (!res.ok) throw new Error(`Failed to load user (${res.status})`);
    const data: unknown = await res.json();
    const validatedUser = ValidateUser(data as UserEntity);
    dispatch({ type: "setUser", user: validatedUser });
  } catch (err) {
    logger.warn("⚠️ Failed to load or create user profile:", err);
  }
}

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
    await saveUserProfile(user, authorizedFetch);
  }, [authorizedFetch, user]);

  useEffect(() => {
    if (!userId) return;

    void loadOrCreateUserProfile(userId, authorizedFetch, dispatch);

    return () => {
      saveUser().catch((err: unknown) => {
        console.error("❌ Error saving during cleanup:", err);
      });
    };
  }, [userId, authorizedFetch, dispatch, saveUser]);

  return null;
};
