/* @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  PreferredDisplayOrder,
  UserEmailPreferences,
  UserNotificationPreferences,
  type UserEntity,
} from "@plasius/entity-manager";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createValidationSaveError,
  UserProfileSaveError,
} from "../src/profile-save.js";
import { SettingsPage } from "../src/Pages/Settings/index.js";

const {
  authorizedFetchMock,
  dispatchMock,
  resetStatusMock,
  saveSubmitMock,
  saveState,
} = vi.hoisted(() => ({
  authorizedFetchMock: vi.fn(),
  dispatchMock: vi.fn(),
  resetStatusMock: vi.fn(),
  saveSubmitMock: vi.fn(),
  saveState: {
    user: null as UserEntity | null,
    status: "idle" as "idle" | "pending" | "success" | "error",
    isSlow: false,
    lastSavedAt: null as string | null,
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
    useStore: () => ({ user: saveState.user }),
    useDispatch: () => dispatchMock,
  },
  useUserProfileSave: () => ({
    status: saveState.status,
    isSlow: saveState.isSlow,
    lastSavedAt: saveState.lastSavedAt,
    submit: saveSubmitMock,
    resetStatus: resetStatusMock,
  }),
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
    resetStatusMock.mockReset();
    saveSubmitMock.mockReset();
    saveSubmitMock.mockResolvedValue(createValidUser());
    saveState.user = createValidUser();
    saveState.status = "idle";
    saveState.isSlow = false;
    saveState.lastSavedAt = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders profile fields, dispatches edits, and submits the save request", () => {
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
        name: "name.preferredDisplayOrder",
        value: PreferredDisplayOrder.FIRST_NAME,
      },
    });
    fireEvent.change(screen.getByLabelText("email_preferences"), {
      target: {
        name: "emailPreferences",
        value: UserEmailPreferences.SECURITY,
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
      type: "updateNameField",
      payload: {
        field: "preferredDisplayOrder",
        value: PreferredDisplayOrder.FIRST_NAME,
      },
    });
    expect(dispatchMock).toHaveBeenCalledWith({
      type: "updateField",
      payload: {
        field: "emailPreferences",
        value: [UserEmailPreferences.SECURITY],
      },
    });
    expect(resetStatusMock).toHaveBeenCalledTimes(4);

    fireEvent.click(screen.getByRole("button", { name: "save_settings" }));

    expect(saveSubmitMock).toHaveBeenCalledTimes(1);
  });

  it("suppresses the legacy avatar field when hideAvatarField is enabled", () => {
    render(<SettingsPage hideAvatarField />);

    expect(screen.queryByLabelText("upload_avatar")).toBeNull();
    expect(screen.queryByRole("img", { name: "avatar_preview" })).toBeNull();
    expect(screen.getByLabelText("display_name")).toBeTruthy();
  });

  it("falls back to an empty email-preference selection when the preference list is empty", () => {
    saveState.user = createValidUser({ emailPreferences: [] });

    render(<SettingsPage />);

    expect(
      (screen.getByLabelText("email_preferences") as HTMLSelectElement).value,
    ).toBe("");
  });

  it("falls back to an empty email-preference selection when the stored shape is missing", () => {
    saveState.user = createValidUser({
      emailPreferences: undefined as unknown as UserEmailPreferences[],
    });

    render(<SettingsPage />);

    expect(
      (screen.getByLabelText("email_preferences") as HTMLSelectElement).value,
    ).toBe("");
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
          }),
        },
      });
    });
  });

  it("ignores avatar changes when no file is selected", () => {
    render(<SettingsPage />);

    fireEvent.change(screen.getByLabelText("upload_avatar"), {
      target: { files: [] },
    });

    expect(authorizedFetchMock).not.toHaveBeenCalled();
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it("renders avatar upload failures without dispatching an update", async () => {
    authorizedFetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({
        "content-type": "application/json",
      }),
      json: async () => ({
        error: "Avatar upload failed because storage is unavailable.",
      }),
    });

    render(<SettingsPage />);

    const file = new File(["binary"], "broken.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("upload_avatar"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(
        screen.getByText("Avatar upload failed because storage is unavailable."),
      ).toBeTruthy();
    });
    expect(dispatchMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: "updateField",
        payload: expect.objectContaining({ field: "avatar" }),
      }),
    );
  });

  it("renders normalized save errors returned by the save controller", async () => {
    saveSubmitMock.mockRejectedValue(
      new UserProfileSaveError({
        message: "Profile validation failed.",
        category: "validation",
        fieldErrors: {
          "name.displayName": "Display name is required.",
        },
        formErrors: ["Fix the highlighted fields before saving."],
      }),
    );

    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "save_settings" }));

    await waitFor(() => {
      expect(screen.getByText("Display name is required.")).toBeTruthy();
    });
    expect(screen.getByText("Fix the highlighted fields before saving.")).toBeTruthy();
    expect(screen.getByLabelText("display_name").getAttribute("aria-invalid")).toBe("true");
  });

  it("renders avatar upload failures from a response message payload", async () => {
    authorizedFetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({
        "content-type": "application/json",
      }),
      json: async () => ({
        message: "Avatar upload stalled before storage confirmed the write.",
      }),
    });

    render(<SettingsPage />);

    const file = new File(["binary"], "broken.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("upload_avatar"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          "Avatar upload stalled before storage confirmed the write.",
        ),
      ).toBeTruthy();
    });
  });

  it("falls back to plain-text avatar upload failures when JSON is unavailable", async () => {
    authorizedFetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({
        "content-type": "text/plain",
      }),
      text: async () => "Avatar upload gateway timed out.",
    });

    render(<SettingsPage />);

    const file = new File(["binary"], "broken.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("upload_avatar"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText("Avatar upload gateway timed out.")).toBeTruthy();
    });
  });

  it("renders avatar validation failures when the upload payload is malformed", async () => {
    authorizedFetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        "content-type": "application/json",
      }),
      json: async () => ({ invalid: true }),
    });

    render(<SettingsPage />);

    const file = new File(["binary"], "broken.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("upload_avatar"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          "Avatar upload completed but the returned avatar payload was invalid.",
        ),
      ).toBeTruthy();
    });

    expect(dispatchMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: "updateField",
        payload: expect.objectContaining({ field: "avatar" }),
      }),
    );
  });

  it("renders inline validation feedback returned by the save controller", async () => {
    saveSubmitMock.mockRejectedValue(
      createValidationSaveError([
        "High PII field must not be empty: email",
        "High PII field must not be empty: name.firstName",
        "forced failure",
      ]),
    );

    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "save_settings" }));

    await waitFor(() => {
      expect(screen.getByText("Email is required.")).toBeTruthy();
    });
    expect(screen.getByText("First name is required.")).toBeTruthy();
    expect(screen.getByText("forced failure")).toBeTruthy();
    expect(screen.getByLabelText("email").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText("first_name").getAttribute("aria-invalid")).toBe("true");
    expect(saveSubmitMock).toHaveBeenCalledTimes(1);
  });

  it("renders field-scoped validation messages without rewriting non-required errors", async () => {
    saveSubmitMock.mockRejectedValue(
      createValidationSaveError([
        "Display name contains unsupported characters: name.displayName",
      ]),
    );

    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "save_settings" }));

    await waitFor(() => {
      expect(
        screen.getByText("Display name contains unsupported characters: name.displayName"),
      ).toBeTruthy();
    });
    expect(screen.getByLabelText("display_name").getAttribute("aria-invalid")).toBe("true");
  });

  it("clears a field validation error after the user edits that field", async () => {
    saveSubmitMock.mockRejectedValueOnce(
      createValidationSaveError(["High PII field must not be empty: email"]),
    );

    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "save_settings" }));

    await waitFor(() => {
      expect(screen.getByText("Email is required.")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("email"), {
      target: { name: "email", value: "updated@example.com" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Email is required.")).toBeNull();
    });
  });

  it("keeps rendering draft input values without throwing when the snapshot is temporarily invalid", () => {
    saveState.user = createValidUser({
      email: "",
      emailPreferences: "security" as unknown as UserEmailPreferences[],
    });

    expect(() => render(<SettingsPage />)).not.toThrow();
    expect(screen.getByLabelText("email")).toBeTruthy();
    expect(
      (screen.getByLabelText("email_preferences") as HTMLSelectElement).value,
    ).toBe("");
  });

  it("disables the save button and renders pending messaging while a save is in flight", () => {
    saveState.status = "pending";

    render(<SettingsPage />);

    expect(screen.getByText("Saving profile changes...")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Saving profile..." }).hasAttribute("disabled"),
    ).toBe(true);
  });

  it("renders the slow-save message once the pending threshold has been exceeded", () => {
    saveState.status = "pending";
    saveState.isSlow = true;

    render(<SettingsPage />);

    expect(
      screen.getByText(
        "Saving is taking longer than usual. Keep this page open until the profile save completes.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("renders success feedback after a profile save completes", () => {
    saveState.status = "success";
    saveState.lastSavedAt = "2026-03-27T18:15:00.000Z";

    render(<SettingsPage />);

    expect(screen.getByText(/Profile changes saved at/)).toBeTruthy();
    expect(screen.getByRole("status")).toBeTruthy();
  });
});
