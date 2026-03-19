/* @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  PreferredDisplayOrder,
  UserEmailPreferences,
  UserNotificationPreferences,
  userEntitySchema,
  type UserEntity,
} from "@plasius/entity-manager";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsPage } from "../src/Pages/Settings/index.js";

const { authorizedFetchMock, dispatchMock, storeState } = vi.hoisted(() => ({
  authorizedFetchMock: vi.fn(),
  dispatchMock: vi.fn(),
  storeState: {
    user: null as UserEntity | null,
  },
}));

vi.mock("@plasius/auth", () => ({
  useAuthorizedFetch: () => authorizedFetchMock,
}));

vi.mock("@plasius/translations", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("../src/UserProvider.js", () => ({
  UserStore: {
    useStore: () => storeState,
    useDispatch: () => dispatchMock,
  },
}));

function createValidUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    partitionKey: "tenant-001",
    id: "123456789012345678901",
    version: "1.0.0",
    entityType: "userEntity",
    createdAt: new Date().toISOString(),
    createdBy: "123456789012345678901",
    isDeleted: false,
    email: "alice@example.com",
    name: {
      firstName: "Alice",
      middleName: "B",
      lastName: "Smith",
      displayName: "Alice Smith",
      preferredDisplayOrder: PreferredDisplayOrder.DISPLAY_NAME,
    },
    emailPreferences: [UserEmailPreferences.IMPORTANT],
    notificationPreferences: UserNotificationPreferences.IMPORTANT,
    avatar: {
      partitionKey: "tenant-001",
      id: "123456789012345678901",
      filename: "existing.png",
      contentType: "image/png",
      url: "https://cdn.example.com/existing.png",
      size: 128,
      width: 64,
      height: 64,
      createdAt: new Date().toISOString(),
      createdBy: "123456789012345678901",
      version: 1,
    },
    updatedAt: undefined,
    updatedBy: undefined,
    deletedAt: undefined,
    deletedBy: undefined,
    deletedReason: undefined,
    ...overrides,
  };
}

describe("SettingsPage", () => {
  beforeEach(() => {
    authorizedFetchMock.mockReset();
    dispatchMock.mockReset();
    storeState.user = createValidUser();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders profile fields, dispatches edits, and logs a valid save", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "profile_settings" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "avatar_preview" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("display_name"), {
      target: { name: "name.displayName", value: "Alicia" },
    });
    fireEvent.change(screen.getByLabelText("email"), {
      target: { name: "email", value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText("preferred_name_display"), {
      target: {
        name: "displayPreferences",
        value: PreferredDisplayOrder.FIRST_NAME,
      },
    });

    expect(dispatchMock).toHaveBeenCalledWith({
      type: "updateNameField",
      payload: { field: "displayName", value: "Alicia" },
    });
    expect(dispatchMock).toHaveBeenCalledWith({
      type: "updateField",
      payload: { field: "email", value: "new@example.com" },
    });
    expect(dispatchMock).toHaveBeenCalledWith({
      type: "updateField",
      payload: {
        field: "displayPreferences",
        value: PreferredDisplayOrder.FIRST_NAME,
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "save_settings" }));

    expect(infoSpy).toHaveBeenCalledWith("Saved:", storeState.user);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("falls back to an empty email-preference selection when the preference list is empty", () => {
    storeState.user = createValidUser({ emailPreferences: [] });

    render(<SettingsPage />);

    expect(
      (screen.getByLabelText("email_preferences") as HTMLSelectElement).value,
    ).toBe("");
  });

  it("falls back to an empty email-preference selection when the stored shape is missing", () => {
    storeState.user = createValidUser({
      emailPreferences: undefined as unknown as UserEmailPreferences[],
    });
    const validateSpy = vi.spyOn(userEntitySchema, "validate").mockReturnValue({
      valid: true,
      value: storeState.user,
      errors: [],
    } as never);

    render(<SettingsPage />);

    expect(
      (screen.getByLabelText("email_preferences") as HTMLSelectElement).value,
    ).toBe("");
    validateSpy.mockRestore();
  });

  it("uploads an avatar and dispatches the persisted avatar entity", async () => {
    const createdAt = new Date().toISOString();
    authorizedFetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        partitionKey: "tenant-001",
        id: "123456789012345678901",
        filename: "avatar.png",
        contentType: "image/png",
        url: "https://cdn.example.com/avatar.png",
        size: 256,
        width: 128,
        height: 128,
        createdAt,
        createdBy: "123456789012345678901",
        version: 1,
      }),
    });

    render(<SettingsPage />);

    const file = new File(["binary"], "avatar.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("upload_avatar"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(authorizedFetchMock).toHaveBeenCalledWith(
        "/user/avatar",
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData),
        }),
      );
    });

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith({
        type: "updateField",
        payload: {
          field: "avatar",
          value: expect.objectContaining({
            url: "https://cdn.example.com/avatar.png",
            originalName: "avatar.png",
          }),
        },
      });
    });
  });

  it("logs avatar upload failures without dispatching an update", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    authorizedFetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    render(<SettingsPage />);

    const file = new File(["binary"], "broken.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("upload_avatar"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
    });
    expect(dispatchMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: "updateField",
        payload: expect.objectContaining({ field: "avatar" }),
      }),
    );
  });

  it("logs avatar validation failures when the upload payload is malformed", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    authorizedFetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ invalid: true }),
    });

    render(<SettingsPage />);

    const file = new File(["binary"], "broken.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("upload_avatar"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  it("warns instead of saving when the current user snapshot becomes invalid", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const validateSpy = vi.spyOn(userEntitySchema, "validate");
    validateSpy
      .mockImplementationOnce(() => ({
        valid: true,
        value: storeState.user,
        errors: [],
      }) as never)
      .mockImplementation(() => ({
        valid: false,
        errors: ["forced failure"],
      }) as never);

    render(<SettingsPage />);

    await waitFor(() => {
      expect(validateSpy).toHaveBeenCalled();
    });
    infoSpy.mockClear();
    warnSpy.mockClear();
    validateSpy.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "save_settings" }));

    expect(warnSpy).toHaveBeenCalledWith(
      "Validation failed",
      expect.objectContaining({ valid: false }),
    );
    expect(infoSpy).not.toHaveBeenCalledWith("Saved:", expect.anything());
    validateSpy.mockRestore();
  });

  it("throws during mount when the provided user snapshot is invalid", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const validateSpy = vi.spyOn(userEntitySchema, "validate").mockReturnValue({
      valid: false,
      errors: ["forced mount failure"],
    } as never);

    expect(() => render(<SettingsPage />)).toThrow(/Invalid user/);

    validateSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
