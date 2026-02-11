import React from "react";
import { renderToString } from "react-dom/server";
import {
  PreferredDisplayOrder,
  UserEmailPreferences,
  UserNotificationPreferences,
  type UserEntity,
} from "@plasius/entity-manager";
import { describe, expect, it } from "vitest";

import { SettingsProvider } from "../src/SettingsProvider.js";
import { UserProvider, ValidateUser } from "../src/UserProvider.js";

const mockUser: UserEntity = {
  partitionKey: "user-123",
  id: "row-001",
  version: "1.0.0",
  entityType: "userEntity",
  createdAt: new Date().toISOString(),
  createdBy: "123456789012345678901",
  name: {
    firstName: "Alice",
    middleName: "B.",
    lastName: "Smith",
    displayName: "Alice S.",
    preferredDisplayOrder: PreferredDisplayOrder.DISPLAY_NAME,
  },
  primaryEmail: "alice@example.com",
  emailVerified: true,
  avatar: undefined,
  isDeleted: false,
  email: "",
  emailPreferences: [UserEmailPreferences.NONE],
  notificationPreferences: UserNotificationPreferences.NONE,
  updatedAt: undefined,
  updatedBy: undefined,
  deletedAt: undefined,
  deletedBy: undefined,
  deletedReason: undefined,
};

describe("@plasius/profile", () => {
  it("rejects legacy payloads that do not satisfy current schema", () => {
    expect(() => ValidateUser(mockUser)).toThrow("Invalid User Profile");
  });

  it("throws on invalid user payload", () => {
    expect(() => ValidateUser({} as UserEntity)).toThrow("Invalid User Profile");
  });

  it("renders UserProvider on server", () => {
    const html = renderToString(
      <UserProvider>
        <div>child</div>
      </UserProvider>
    );
    expect(html).toContain("child");
  });

  it("exports a SettingsProvider component", () => {
    expect(typeof SettingsProvider).toBe("function");
  });
});
