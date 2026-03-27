/* @vitest-environment jsdom */

import React, { useEffect, useRef } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import {
  PreferredDisplayOrder,
  UserEmailPreferences,
  UserNotificationPreferences,
  type UserEntity,
} from "@plasius/entity-manager";
import { describe, expect, it, vi } from "vitest";
import { UserProvider, UserStore, useUserProfileSave } from "../src/UserProvider.js";
import { UserProfileSaveError } from "../src/profile-save.js";

const { authorizedFetchMock } = vi.hoisted(() => ({
  authorizedFetchMock: vi.fn(),
}));

vi.mock("@plasius/auth", () => ({
  useAuthorizedFetch: () => authorizedFetchMock,
}));

const VALID_USER_ID = "123456789012345678901";

function createValidUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    partitionKey: "tenant-001",
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

function ProviderHarness() {
  const dispatch = UserStore.useDispatch();
  const { user } = UserStore.useStore();
  const { submit, status } = useUserProfileSave();
  const didEditRef = useRef(false);
  const didSaveRef = useRef(false);

  useEffect(() => {
    dispatch({ type: "setUserId", userId: VALID_USER_ID });
  }, [dispatch]);

  useEffect(() => {
    if (!user || didEditRef.current) {
      return;
    }

    didEditRef.current = true;
    dispatch({
      type: "updateField",
      payload: {
        field: "email",
        value: "updated@example.com",
      },
    });
  }, [dispatch, user]);

  useEffect(() => {
    if (!user || user.email !== "updated@example.com" || didSaveRef.current) {
      return;
    }

    didSaveRef.current = true;
    void submit();
  }, [submit, user]);

  return <div>{`${user?.email ?? "loading"}:${status}`}</div>;
}

function SubmitFailureHarness() {
  const dispatch = UserStore.useDispatch();
  const { user } = UserStore.useStore();
  const { submit, status } = useUserProfileSave();
  const didSaveRef = useRef(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  useEffect(() => {
    dispatch({ type: "setUserId", userId: VALID_USER_ID });
  }, [dispatch]);

  useEffect(() => {
    if (!user || didSaveRef.current) {
      return;
    }

    didSaveRef.current = true;
    void submit().catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    });
  }, [submit, user]);

  return <div>{`${status}:${errorMessage || "no-error"}`}</div>;
}

describe("UserProvider component lifecycle", () => {
  it("loads once and saves edited user state only when submit is invoked", async () => {
    const client = {
      load: vi.fn().mockResolvedValue(createValidUser()),
      create: vi.fn(),
      save: vi.fn().mockResolvedValue(createValidUser({ email: "updated@example.com" })),
    };

    render(
      <UserProvider client={client}>
        <ProviderHarness />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("updated@example.com:success")).toBeTruthy();
    });

    expect(client.load).toHaveBeenCalledTimes(1);
    expect(client.save).toHaveBeenCalledTimes(1);
    expect(client.load).toHaveBeenCalledTimes(1);
  });

  it("reports an error when a save completes without a persisted profile to reload", async () => {
    const client = {
      load: vi
        .fn()
        .mockResolvedValueOnce(createValidUser())
        .mockResolvedValueOnce(null),
      create: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
    };

    render(
      <UserProvider client={client}>
        <SubmitFailureHarness />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          "error:Profile save completed but the updated profile could not be reloaded.",
        ),
      ).toBeTruthy();
    });

    expect(client.save).toHaveBeenCalledTimes(1);
    expect(client.load).toHaveBeenCalledTimes(2);
  });

  it("normalizes thrown save errors before exposing them to consumers", async () => {
    const client = {
      load: vi.fn().mockResolvedValue(createValidUser()),
      create: vi.fn(),
      save: vi.fn().mockRejectedValue(new Error("Gateway timeout")),
    };

    render(
      <UserProvider client={client}>
        <SubmitFailureHarness />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("error:Gateway timeout")).toBeTruthy();
    });

    expect(client.save).toHaveBeenCalledTimes(1);
  });

  it("preserves typed save errors emitted by injected clients", async () => {
    const client = {
      load: vi.fn().mockResolvedValue(createValidUser()),
      create: vi.fn(),
      save: vi.fn().mockRejectedValue(
        new UserProfileSaveError({
          message: "Profile validation failed.",
          category: "validation",
        }),
      ),
    };

    render(
      <UserProvider client={client}>
        <SubmitFailureHarness />
      </UserProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("error:Profile validation failed.")).toBeTruthy();
    });

    expect(client.save).toHaveBeenCalledTimes(1);
  });
});
