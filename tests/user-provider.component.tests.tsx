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
});
