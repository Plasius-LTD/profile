import {
  PreferredDisplayOrder,
  UserEmailPreferences,
  UserNotificationPreferences,
  type UserEntity,
} from "@plasius/entity-manager";
import { describe, expect, it, vi } from "vitest";

import {
  fromSettingsEntity,
  loadSettingsEntity,
  persistSettingsEntity,
  settingsReducer,
  toSettingsEntity,
  type SettingsState,
} from "../src/SettingsProvider.js";
import {
  ValidateUser,
  initialUserState,
  loadOrCreateUserProfile,
  saveUserProfile,
  userReducer,
  type UserAction,
} from "../src/UserProvider.js";

const VALID_USER_ID = "123456789012345678901";
const VALID_PARTITION_KEY = "tenant-001";

function createValidUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    partitionKey: VALID_PARTITION_KEY,
    id: VALID_USER_ID,
    version: "1.0.0",
    entityType: "userEntity",
    createdAt: new Date().toISOString(),
    createdBy: VALID_USER_ID,
    isDeleted: false,
    email: "alice@example.com",
    name: {
      firstName: "Alice",
      lastName: "Smith",
      displayName: "Alice Smith",
      preferredDisplayOrder: PreferredDisplayOrder.DISPLAY_NAME,
      middleName: "B",
    },
    emailPreferences: [UserEmailPreferences.IMPORTANT],
    notificationPreferences: UserNotificationPreferences.IMPORTANT,
    avatar: undefined,
    updatedAt: undefined,
    updatedBy: undefined,
    deletedAt: undefined,
    deletedBy: undefined,
    deletedReason: undefined,
    ...overrides,
  };
}

function okJson(payload: unknown): {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
} {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  };
}

describe("UserProvider logic", () => {
  it("validates user payloads", () => {
    const validated = ValidateUser(createValidUser());
    expect(validated.id).toBe(VALID_USER_ID);
    expect(validated.partitionKey).toBe(VALID_PARTITION_KEY);
    expect(() => ValidateUser({} as UserEntity)).toThrow("Invalid User Profile");
  });

  it("applies userReducer state transitions", () => {
    const user = createValidUser();
    const withUserId = userReducer(initialUserState, {
      type: "setUserId",
      userId: VALID_USER_ID,
    });
    const withUser = userReducer(withUserId, { type: "setUser", user });
    const updated = userReducer(withUser, { type: "updateUser", user: { email: "new@example.com" } });
    const fieldUpdated = userReducer(updated, {
      type: "updateField",
      payload: { field: "notificationPreferences", value: UserNotificationPreferences.NONE },
    });
    const nameUpdated = userReducer(fieldUpdated, {
      type: "updateNameField",
      payload: { field: "displayName", value: "A. Smith" },
    });
    const avatarUpdated = userReducer(nameUpdated, {
      type: "updateAvatarField",
      payload: { field: "url", value: "https://img.example.com/a.png" },
    });
    const unchanged = userReducer(initialUserState, {
      type: "updateNameField",
      payload: { field: "displayName", value: "ignored" },
    });

    expect(withUserId.userId).toBe(VALID_USER_ID);
    expect(withUser.user?.email).toBe("alice@example.com");
    expect(updated.user?.email).toBe("new@example.com");
    expect(fieldUpdated.user?.notificationPreferences).toBe(
      UserNotificationPreferences.NONE
    );
    expect(nameUpdated.user?.name?.displayName).toBe("A. Smith");
    expect((avatarUpdated.user?.avatar as { url?: string })?.url).toBe(
      "https://img.example.com/a.png"
    );
    expect(unchanged).toEqual(initialUserState);
  });

  it("saves user profile when user is present", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    await saveUserProfile(createValidUser(), fetchMock, logger);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/users/${VALID_USER_ID}/update`);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      credentials: "include",
    });
    expect(logger.info).toHaveBeenCalledWith("✅ User profile saved successfully.");
  });

  it("rejects saves when the user id is invalid", async () => {
    const fetchMock = vi.fn();
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    await saveUserProfile(createValidUser({ id: "" }), fetchMock, logger);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      "❌ Error saving user profile:",
      expect.any(Error)
    );
  });

  it("handles save failures without throwing", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    await saveUserProfile(createValidUser(), fetchMock, logger);
    await saveUserProfile(undefined, fetchMock, logger);

    expect(logger.error).toHaveBeenCalledWith(
      "❌ Error saving user profile:",
      expect.any(Error)
    );
  });

  it("supports injected user profile clients for reusable transport composition", async () => {
    const dispatch = vi.fn<(action: UserAction) => void>();
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const client = {
      load: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(createValidUser()),
      save: vi.fn().mockResolvedValue(undefined),
    };

    await loadOrCreateUserProfile(VALID_USER_ID, client, dispatch, logger);
    await saveUserProfile(createValidUser(), client, logger);

    expect(client.load).toHaveBeenCalledWith(VALID_USER_ID);
    expect(client.create).toHaveBeenCalledWith(VALID_USER_ID);
    expect(client.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: VALID_USER_ID })
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "setUser" })
    );
    expect(logger.info).toHaveBeenCalledWith("✅ User profile saved successfully.");
  });

  it("loads existing users and dispatches setUser", async () => {
    const dispatch = vi.fn<(action: UserAction) => void>();
    const fetchMock = vi.fn().mockResolvedValue(okJson(createValidUser()));
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    await loadOrCreateUserProfile(VALID_USER_ID, fetchMock, dispatch, logger);

    expect(fetchMock).toHaveBeenCalledWith(`/users/${VALID_USER_ID}/get`, {
      credentials: "include",
    });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "setUser" })
    );
  });

  it("creates users when /get returns 404", async () => {
    const dispatch = vi.fn<(action: UserAction) => void>();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      })
      .mockResolvedValueOnce(okJson(createValidUser()));
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    await loadOrCreateUserProfile(VALID_USER_ID, fetchMock, dispatch, logger);

    expect(fetchMock).toHaveBeenCalledWith(
      `/users/${VALID_USER_ID}/create`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      })
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "setUser" })
    );
  });

  it("short-circuits invalid user ids and logs load failures", async () => {
    const dispatch = vi.fn<(action: UserAction) => void>();
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const invalidFetch = vi.fn();

    await loadOrCreateUserProfile("", invalidFetch, dispatch, logger);
    expect(invalidFetch).not.toHaveBeenCalled();

    const failingFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    await loadOrCreateUserProfile(VALID_USER_ID, failingFetch, dispatch, logger);

    expect(logger.warn).toHaveBeenCalledWith(
      "⚠️ Failed to load or create user profile:",
      expect.any(Error)
    );
  });
});

describe("SettingsProvider logic", () => {
  it("applies settingsReducer transitions", () => {
    const start: SettingsState = {};
    const updated = settingsReducer(start, { type: "update", key: "theme", value: "dark" });
    const loaded = settingsReducer(updated, {
      type: "load",
      payload: { locale: "en-GB" },
    });
    const reset = settingsReducer(loaded, { type: "reset" });
    const unchanged = settingsReducer(reset, { type: "unknown" } as never);

    expect(updated.theme).toBe("dark");
    expect(loaded.locale).toBe("en-GB");
    expect(reset).toEqual({});
    expect(unchanged).toEqual({});
  });

  it("round-trips hidden settings entity metadata", () => {
    const entity = {
      id: "settings-1",
      partitionKey: VALID_USER_ID,
      settings: {
        theme: "dark",
        density: "comfortable",
      },
    };

    const state = fromSettingsEntity(entity as never);
    const roundTrip = toSettingsEntity(state as SettingsState);

    expect(roundTrip.id).toBe("settings-1");
    expect(roundTrip.partitionKey).toBe(VALID_USER_ID);
    expect(roundTrip.settings).toMatchObject({
      theme: "dark",
      density: "comfortable",
    });
  });

  it("loads and persists settings entities with explicit failure handling", async () => {
    const entity = {
      id: "settings-2",
      partitionKey: VALID_USER_ID,
      settings: { theme: "light" },
    };

    const loadFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => entity,
    });
    const loaded = await loadSettingsEntity(loadFetch, "/settings/config");
    expect(loaded).toEqual(entity);

    const saveFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    await expect(
      persistSettingsEntity(saveFetch, "/settings/config", stateFromEntity(entity))
    ).resolves.toBeUndefined();

    const failingLoad = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });
    await expect(loadSettingsEntity(failingLoad, "/settings/config")).rejects.toThrow(
      "Load failed with status 503"
    );

    const failingSave = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    await expect(
      persistSettingsEntity(failingSave, "/settings/config", stateFromEntity(entity))
    ).rejects.toThrow("Save failed with status 500");
  });

  it("supports injected settings clients for reusable transport composition", async () => {
    const entity = {
      id: "settings-3",
      partitionKey: VALID_USER_ID,
      settings: { theme: "system" },
    };
    const client = {
      load: vi.fn().mockResolvedValue(entity),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const state = stateFromEntity(entity);

    await expect(loadSettingsEntity(client, "/settings/config")).resolves.toEqual(entity);
    await expect(
      persistSettingsEntity(client, "/settings/config", state)
    ).resolves.toBeUndefined();

    expect(client.load).toHaveBeenCalledWith("/settings/config");
    expect(client.save).toHaveBeenCalledWith("/settings/config", state);
  });
});

function stateFromEntity(entity: {
  id: string;
  partitionKey: string;
  settings: Record<string, unknown>;
}): SettingsState {
  return fromSettingsEntity(entity as never) as SettingsState;
}
