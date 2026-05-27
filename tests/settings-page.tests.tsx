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

const { authorizedFetchMock, dispatchMock, storeState, translationOverrides } = vi.hoisted(() => ({
  authorizedFetchMock: vi.fn(),
  dispatchMock: vi.fn(),
  translationOverrides: new Map<string, string>(),
  storeState: {
    user: null as UserEntity | null,
  },
}));

vi.mock("@plasius/auth", () => ({
  useAuthorizedFetch: () => authorizedFetchMock,
}));

vi.mock("@plasius/translations", () => ({
  useI18n: () => ({
    t: (key: string, args: Record<string, string | number | boolean> = {}) => {
      const value = translationOverrides.get(key) ?? key;
      return value.replace(/\{(\w+)\}/g, (_match, placeholder: string) => {
        const replacement = args[placeholder];
        return replacement === undefined ? `{${placeholder}}` : String(replacement);
      });
    },
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
    translationOverrides.clear();
    storeState.user = createValidUser();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders profile fields, dispatches edits, and logs a valid save", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "Profile settings" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Avatar preview" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { name: "name.displayName", value: "Alicia" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { name: "email", value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Preferred name display"), {
      target: {
        name: "name.preferredDisplayOrder",
        value: PreferredDisplayOrder.FIRST_NAME,
      },
    });
    fireEvent.change(screen.getByLabelText("Email preferences"), {
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

    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    expect(infoSpy).toHaveBeenCalledWith("Saved:", storeState.user);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("renders settings text from the shared translation provider when available", () => {
    translationOverrides.set("profile.settings.heading", "Account profile");
    translationOverrides.set("profile.settings.action.save", "Store profile");

    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "Account profile" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Store profile" })).toBeTruthy();
  });

  it("suppresses the legacy avatar field when hideAvatarField is enabled", () => {
    render(<SettingsPage hideAvatarField />);

    expect(screen.queryByLabelText("Upload avatar")).toBeNull();
    expect(screen.queryByRole("img", { name: "Avatar preview" })).toBeNull();
    expect(screen.getByLabelText("Display name")).toBeTruthy();
  });

  it("falls back to an empty email-preference selection when the preference list is empty", () => {
    storeState.user = createValidUser({ emailPreferences: [] });

    render(<SettingsPage />);

    expect(
      (screen.getByLabelText("Email preferences") as HTMLSelectElement).value,
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
      (screen.getByLabelText("Email preferences") as HTMLSelectElement).value,
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
    fireEvent.change(screen.getByLabelText("Upload avatar"), {
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

    fireEvent.change(screen.getByLabelText("Upload avatar"), {
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
    fireEvent.change(screen.getByLabelText("Upload avatar"), {
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
    fireEvent.change(screen.getByLabelText("Upload avatar"), {
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
    fireEvent.change(screen.getByLabelText("Upload avatar"), {
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
    fireEvent.change(screen.getByLabelText("Upload avatar"), {
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

  it("renders inline field validation feedback instead of saving when the current user snapshot becomes invalid", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const validateSpy = vi.spyOn(userEntitySchema, "validate");
    validateSpy
      .mockImplementation(() => ({
        valid: false,
        errors: [
          "High PII field must not be empty: email",
          "High PII field must not be empty: name.firstName",
          "forced failure",
        ],
      }) as never);

    render(<SettingsPage />);
    infoSpy.mockClear();
    validateSpy.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    expect(screen.getByText("Fix the highlighted fields before saving.")).toBeTruthy();
    expect(screen.getByText("Email is required.")).toBeTruthy();
    expect(screen.getByText("First name is required.")).toBeTruthy();
    expect(screen.getByText("forced failure")).toBeTruthy();
    const emailInput = screen.getByLabelText("Email");
    const firstNameInput = screen.getByLabelText("First name");
    expect(emailInput.getAttribute("aria-invalid")).toBe("true");
    expect(emailInput.getAttribute("aria-errormessage")).toMatch(/-email-error$/);
    expect(firstNameInput.getAttribute("aria-invalid")).toBe("true");
    expect(firstNameInput.getAttribute("aria-errormessage")).toMatch(
      /-name-firstname-error$/,
    );
    expect(infoSpy).not.toHaveBeenCalledWith("Saved:", expect.anything());
    validateSpy.mockRestore();
  });

  it("renders field-scoped validation messages without rewriting non-required errors", async () => {
    const validateSpy = vi.spyOn(userEntitySchema, "validate");
    validateSpy.mockImplementation(() => ({
      valid: false,
      errors: ["Display name contains unsupported characters: name.displayName"],
    }) as never);

    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    expect(
      screen.getByText("Display name contains unsupported characters: name.displayName"),
    ).toBeTruthy();
    expect(screen.getByLabelText("Display name").getAttribute("aria-invalid")).toBe("true");

    validateSpy.mockRestore();
  });

  it("clears a field validation error after the user edits that field", async () => {
    const validateSpy = vi.spyOn(userEntitySchema, "validate");
    validateSpy.mockImplementation(() => ({
      valid: false,
      errors: ["High PII field must not be empty: email"],
    }) as never);

    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
    expect(screen.getByText("Email is required.")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { name: "email", value: "updated@example.com" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Email is required.")).toBeNull();
    });

    validateSpy.mockRestore();
  });

  it("keeps rendering draft input values without throwing when the snapshot is temporarily invalid", () => {
    storeState.user = createValidUser({
      email: "",
      emailPreferences: "security" as unknown as UserEmailPreferences[],
    });

    expect(() => render(<SettingsPage />)).not.toThrow();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(
      (screen.getByLabelText("Email preferences") as HTMLSelectElement).value,
    ).toBe("");
  });
});
