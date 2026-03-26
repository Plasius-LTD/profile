import React, { useEffect, useMemo, useRef } from "react";
import {
  baseEntitySchema,
  PreferredDisplayOrder,
  type UserEmailPreferences,
  type UserAvatarEntity,
  type UserEntity,
  userAvatarSchema,
  userEntitySchema,
} from "@plasius/entity-manager";
import { validateUserId } from "@plasius/schema";
import { useAuthorizedFetch } from "@plasius/auth";
import { createScopedStoreContext, type IState } from "@plasius/react-state";

const DEFAULT_USER_ENTITY_VERSION = "1.0.0";
const DEFAULT_FIRST_NAME = "Plasius";
const DEFAULT_DISPLAY_NAME = "Plasius User";
const USER_PROFILE_AUTO_SAVE_DELAY_MS = 750;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function unwrapUserEntityCandidate(value: unknown): UserEntity {
  let current: unknown = value;
  const visited = new Set<unknown>();

  while (isRecord(current) && !visited.has(current)) {
    visited.add(current);

    if (isRecord(current.data)) {
      current = current.data;
      continue;
    }

    if (isRecord(current.user)) {
      current = current.user;
      continue;
    }

    if (isRecord(current.profile)) {
      current = current.profile;
      continue;
    }

    break;
  }

  return (isRecord(current) ? current : {}) as UserEntity;
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeUserEntityVersion(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const numericSegments = trimmed.split(".");
    if (
      numericSegments.length >= 1
      && numericSegments.length <= 3
      && numericSegments.every((segment) => /^\d+$/.test(segment))
    ) {
      const [major = "0", minor = "0", patch = "0"] = numericSegments;
      return `${Number.parseInt(major, 10)}.${Number.parseInt(minor, 10)}.${Number.parseInt(patch, 10)}`;
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return `${Math.trunc(value)}.0.0`;
  }

  return DEFAULT_USER_ENTITY_VERSION;
}

function normalizeEmailPreferences(value: unknown): UserEmailPreferences[] | undefined {
  if (Array.isArray(value)) {
    const preferences = value.filter(
      (entry): entry is UserEmailPreferences =>
        typeof entry === "string" && entry.trim().length > 0,
    );

    return preferences.length > 0 ? preferences : [];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? [trimmed as UserEmailPreferences] : [];
  }

  return undefined;
}

function normalizeUserEntityCandidate(user: UserEntity): UserEntity {
  const unwrapped = unwrapUserEntityCandidate(user);
  const firstName = normalizeOptionalText(unwrapped.name?.firstName) ?? DEFAULT_FIRST_NAME;
  const lastName = normalizeOptionalText(unwrapped.name?.lastName) ?? firstName;
  const middleName = normalizeOptionalText(unwrapped.name?.middleName);
  const emailPreferences = normalizeEmailPreferences(unwrapped.emailPreferences);
  const fallbackDisplayName = `${firstName} ${lastName}`.trim();
  const displayName =
    normalizeOptionalText(unwrapped.name?.displayName)
    ?? (fallbackDisplayName.length > 0 ? fallbackDisplayName : DEFAULT_DISPLAY_NAME);

  return {
    ...unwrapped,
    version: normalizeUserEntityVersion(unwrapped.version),
    ...(emailPreferences !== undefined ? { emailPreferences } : {}),
    name: {
      firstName,
      ...(middleName ? { middleName } : {}),
      lastName,
      displayName,
      preferredDisplayOrder:
        unwrapped.name?.preferredDisplayOrder ?? PreferredDisplayOrder.DISPLAY_NAME,
    },
  } as UserEntity;
}

function sanitizeUserAvatar(avatar: unknown): UserAvatarEntity | undefined {
  if (!isRecord(avatar)) {
    return undefined;
  }

  const validatedAvatar = userAvatarSchema.validate(avatar as UserAvatarEntity);
  if (!validatedAvatar.valid || !validatedAvatar.value) {
    throw new Error(
      `Invalid User Avatar: ${validatedAvatar.errors?.join(", ") ?? "unknown error"}`
    );
  }

  return {
    partitionKey: validatedAvatar.value.partitionKey,
    id: validatedAvatar.value.id,
    filename: validatedAvatar.value.filename,
    contentType: validatedAvatar.value.contentType,
    url: validatedAvatar.value.url,
    size: validatedAvatar.value.size,
    width: validatedAvatar.value.width,
    height: validatedAvatar.value.height,
    createdAt: validatedAvatar.value.createdAt,
    createdBy: validatedAvatar.value.createdBy,
    version: validatedAvatar.value.version,
  } as unknown as UserAvatarEntity;
}

export function ValidateUser(user: UserEntity) {
  const normalizedUser = normalizeUserEntityCandidate(user);
  const validatedBase = baseEntitySchema.validate(normalizedUser);
  const validated = userEntitySchema.validate(normalizedUser);
  if (!validatedBase.valid || !validatedBase.value) {
    throw new Error(
      `Invalid User Profile: ${validatedBase.errors?.join(", ") ?? "unknown error"}`
    );
  }
  if (!validated.valid || !validated.value) {
    throw new Error(
      `Invalid User Profile: ${validated.errors?.join(", ") ?? "unknown error"}`
    );
  }

  const sanitizedAvatar = "avatar" in normalizedUser
    ? sanitizeUserAvatar(normalizedUser.avatar)
    : undefined;

  return {
    ...(validatedBase.value as Record<string, unknown>),
    email: validated.value.email,
    name: validated.value.name,
    ...("emailPreferences" in validated.value
      ? { emailPreferences: validated.value.emailPreferences }
      : {}),
    ...("notificationPreferences" in validated.value
      ? { notificationPreferences: validated.value.notificationPreferences }
      : {}),
    ...("avatar" in normalizedUser ? { avatar: sanitizedAvatar } : {}),
  } as unknown as UserEntity;
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

export interface UserProfileClient {
  load(userId: string): Promise<UserEntity | null>;
  create(userId: string): Promise<UserEntity>;
  save(user: UserEntity): Promise<void>;
}

function isUserProfileClient(
  clientOrFetch: AuthorizedFetch | UserProfileClient,
): clientOrFetch is UserProfileClient {
  return typeof clientOrFetch === "object" && clientOrFetch !== null;
}

export function createHttpUserProfileClient(
  authorizedFetch: AuthorizedFetch,
): UserProfileClient {
  return {
    load: async (userId: string): Promise<UserEntity | null> => {
      const response = await authorizedFetch(`/users/${userId}/get`, {
        credentials: "include",
      });
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Failed to load user (${response.status})`);
      }

      return (await response.json()) as UserEntity;
    },
    create: async (userId: string): Promise<UserEntity> => {
      const response = await authorizedFetch(`/users/${userId}/create`, {
        credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: userId } satisfies Partial<UserEntity>),
      });
      if (!response.ok) {
        throw new Error(`Failed to load user (${response.status})`);
      }

      return (await response.json()) as UserEntity;
    },
    save: async (user: UserEntity): Promise<void> => {
      const targetUserId = typeof user.id === "string" ? user.id : "";
      const response = await authorizedFetch(`/users/${targetUserId}/update`, {
        credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      });
      if (!response.ok) {
        throw new Error(`Save failed with status ${response.status}`);
      }
    },
  };
}

function resolveUserProfileClient(
  clientOrFetch: AuthorizedFetch | UserProfileClient,
): UserProfileClient {
  return isUserProfileClient(clientOrFetch)
    ? clientOrFetch
    : createHttpUserProfileClient(clientOrFetch);
}

export async function saveUserProfile(
  user: UserEntity | undefined,
  clientOrFetch: AuthorizedFetch | UserProfileClient,
  logger: UserLogger = console
): Promise<boolean> {
  if (!user) {
    return false;
  }

  try {
    const validatedUser = ValidateUser(user);
    const targetUserId = typeof validatedUser.id === "string" ? validatedUser.id : "";
    if (!validateUserId(targetUserId)) {
      throw new Error("Invalid user id for save.");
    }
    const client = resolveUserProfileClient(clientOrFetch);
    await client.save(validatedUser);
    logger.info("✅ User profile saved successfully.");
    return true;
  } catch (err) {
    logger.error("❌ Error saving user profile:", err);
    return false;
  }
}

export async function loadOrCreateUserProfile(
  userId: string,
  clientOrFetch: AuthorizedFetch | UserProfileClient,
  dispatch: (action: UserAction) => void,
  logger: UserLogger = console
): Promise<UserEntity | null> {
  if (!validateUserId(userId)) return null;

  const client = resolveUserProfileClient(clientOrFetch);

  try {
    const loadedUser = await client.load(userId);

    if (!loadedUser) {
      const createdData = await client.create(userId);
      const validatedCreatedUser = ValidateUser(createdData as UserEntity);
      dispatch({ type: "setUser", user: validatedCreatedUser });
      return validatedCreatedUser;
    }

    const validatedUser = ValidateUser(loadedUser as UserEntity);
    dispatch({ type: "setUser", user: validatedUser });
    return validatedUser;
  } catch (err) {
    logger.warn("⚠️ Failed to load or create user profile:", err);
    return null;
  }
}

export interface UserProviderProps {
  children: React.ReactNode;
  client?: UserProfileClient;
}

export const UserProvider = ({ children, client }: UserProviderProps) => {
  return (
    <UserStore.Provider>
      <UserInitializer client={client} />
      {children}
    </UserStore.Provider>
  );
};

const UserInitializer = ({ client }: { client?: UserProfileClient }) => {
  const authorizedFetch = useAuthorizedFetch();
  const dispatch = UserStore.useDispatch();
  const { userId, user } = UserStore.useStore();
  const hasHydratedUserRef = useRef(false);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  const userProfileClient = useMemo(
    () => client ?? createHttpUserProfileClient(authorizedFetch),
    [authorizedFetch, client],
  );

  useEffect(() => {
    let cancelled = false;

    hasHydratedUserRef.current = false;
    lastSavedSnapshotRef.current = null;

    if (!userId) {
      return () => {
        cancelled = true;
      };
    }

    void loadOrCreateUserProfile(userId, userProfileClient, dispatch).then((loadedUser) => {
      if (cancelled || !loadedUser) {
        return;
      }

      hasHydratedUserRef.current = true;
      lastSavedSnapshotRef.current = JSON.stringify(loadedUser);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, userProfileClient, dispatch]);

  useEffect(() => {
    if (!userId || !user) {
      return;
    }

    let validatedUser: UserEntity;
    try {
      validatedUser = ValidateUser(user);
    } catch {
      return;
    }

    const nextSnapshot = JSON.stringify(validatedUser);

    if (!hasHydratedUserRef.current) {
      hasHydratedUserRef.current = true;
      lastSavedSnapshotRef.current = nextSnapshot;
      return;
    }

    if (nextSnapshot === lastSavedSnapshotRef.current) {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      void saveUserProfile(validatedUser, userProfileClient).then((saved) => {
        if (saved) {
          lastSavedSnapshotRef.current = nextSnapshot;
        }
      });
    }, USER_PROFILE_AUTO_SAVE_DELAY_MS);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [user, userId, userProfileClient]);

  return null;
};
