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

  it("renders profile fields, dispatches edits, and validates the legacy self-service submit", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "Profile settings" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Avatar preview" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Remove avatar" })).toBeNull();

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

    expect(infoSpy).not.toHaveBeenCalled();
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

  it("supports an externally triggered manual submit without rendering its own submit action", async () => {
    const onSubmit = vi.fn();

    render(
      <>
        <SettingsPage
          formId="admin-profile-form"
          actionPolicies={{ submit: "hidden" }}
          onSubmit={onSubmit}
        />
        <button type="submit" form="admin-profile-form">
          Commit reviewed profile
        </button>
      </>,
    );

    expect(screen.queryByRole("button", { name: "Save settings" })).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Commit reviewed profile" }),
    );

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(storeState.user);
    });
  });

  it("blocks implicit submission when only an external review action may commit", () => {
    const onSubmit = vi.fn();

    render(
      <>
        <SettingsPage
          formId="reviewed-profile-form"
          actionPolicies={{ submit: "hidden" }}
          onSubmit={onSubmit}
        />
        <button type="submit" form="reviewed-profile-form">
          Commit reviewed profile
        </button>
      </>,
    );

    fireEvent.submit(
      screen.getByRole("form", { name: "Profile settings" }),
    );
    expect(onSubmit).not.toHaveBeenCalled();

    expect(
      fireEvent.keyDown(screen.getByLabelText("Display name"), {
        key: "Enter",
      }),
    ).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();

    expect(
      fireEvent.keyDown(screen.getByLabelText("Preferred name display"), {
        key: "Enter",
      }),
    ).toBe(true);

    expect(
      fireEvent.keyDown(screen.getByLabelText("Display name"), {
        key: "Enter",
        isComposing: true,
      }),
    ).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Commit reviewed profile" }),
    );
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("keeps controlled edits in a local draft until the host submits them", async () => {
    const onSubmit = vi.fn();

    render(<SettingsPage onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Display name"), {
      target: {
        name: "name.displayName",
        value: "Reviewed display name",
      },
    });

    expect(dispatchMock).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.objectContaining({
            displayName: "Reviewed display name",
          }),
        }),
      );
    });
  });

  it("exposes asynchronous manual-submit progress and a safe failure state", async () => {
    let rejectSubmit: ((reason: Error) => void) | undefined;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectSubmit = reject;
        }),
    );

    render(<SettingsPage onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    await waitFor(() => {
      expect(
        (screen.getByRole("button", {
          name: "Saving settings",
        }) as HTMLButtonElement).disabled,
      ).toBe(true);
    });
    expect(
      screen.getByRole("form", { name: "Profile settings" }).getAttribute("aria-busy"),
    ).toBe("true");

    rejectSubmit?.(new Error("private upstream failure details"));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Profile settings could not be saved. Try again.",
      );
    });
    expect(screen.queryByText("private upstream failure details")).toBeNull();
    expect(
      (screen.getByRole("button", {
        name: "Save settings",
      }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("prevents concurrent manual submissions while an async commit is pending", async () => {
    let resolveSubmit: (() => void) | undefined;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );

    render(<SettingsPage onSubmit={onSubmit} />);

    const submitButton = screen.getByRole("button", { name: "Save settings" });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);

    resolveSubmit?.();

    await waitFor(() => {
      expect(
        (screen.getByRole("button", {
          name: "Save settings",
        }) as HTMLButtonElement).disabled,
      ).toBe(false);
    });
  });

  it("renders host-controlled busy and error state accessibly", () => {
    render(
      <SettingsPage
        isSubmitting
        submitError="The reviewed change could not be committed."
      />,
    );

    expect(
      (screen.getByRole("button", {
        name: "Saving settings",
      }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain(
      "The reviewed change could not be committed.",
    );
    expect(
      screen.getByRole("form", { name: "Profile settings" }).getAttribute("aria-busy"),
    ).toBe("true");
  });

  it("applies declarative editable, read-only, and hidden field policies", () => {
    render(
      <SettingsPage
        fieldPolicies={{
          "name.firstName": "hidden",
          email: "read-only",
          emailPreferences: "read-only",
        }}
      />,
    );

    expect(screen.queryByLabelText("First name")).toBeNull();
    expect((screen.getByLabelText("Email") as HTMLInputElement).readOnly).toBe(true);
    expect(
      (screen.getByLabelText("Email preferences") as HTMLSelectElement).disabled,
    ).toBe(true);
    expect((screen.getByLabelText("Display name") as HTMLInputElement).readOnly).toBe(
      false,
    );

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { name: "email", value: "ignored@example.com" },
    });
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it("can show and remove an avatar without exposing upload or replacement", () => {
    render(
      <SettingsPage
        fieldPolicies={{ avatar: "read-only" }}
        actionPolicies={{
          avatarUpload: "hidden",
          avatarRemove: "enabled",
        }}
      />,
    );

    expect(screen.getByRole("img", { name: "Avatar preview" })).toBeTruthy();
    expect(screen.queryByLabelText("Upload avatar")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Remove avatar" }));

    expect(dispatchMock).toHaveBeenCalledWith({
      type: "updateField",
      payload: { field: "avatar", value: undefined },
    });
    expect(authorizedFetchMock).not.toHaveBeenCalled();
  });

  it("keeps controlled avatar removal in the reviewed draft", async () => {
    const onSubmit = vi.fn();

    render(
      <SettingsPage
        fieldPolicies={{ avatar: "read-only" }}
        actionPolicies={{
          avatarUpload: "hidden",
          avatarRemove: "enabled",
        }}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove avatar" }));

    expect(dispatchMock).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ avatar: undefined }),
      );
    });
  });

  it("surfaces validation failures for fields hidden by host policy", () => {
    const onSubmit = vi.fn();
    storeState.user = createValidUser({ email: "" });

    render(
      <SettingsPage
        fieldPolicies={{ email: "hidden" }}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    expect(screen.getByRole("alert").textContent).toContain("Email:");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("can hide avatar upload independently while retaining an editable avatar field", () => {
    render(
      <SettingsPage
        actionPolicies={{
          avatarUpload: "hidden",
          avatarRemove: "enabled",
        }}
      />,
    );

    expect(screen.getByRole("img", { name: "Avatar preview" })).toBeTruthy();
    expect(screen.queryByLabelText("Upload avatar")).toBeNull();
    expect(screen.getByRole("button", { name: "Remove avatar" })).toBeTruthy();
  });

  it("lets the legacy avatar visibility switch override new avatar policies", () => {
    render(
      <SettingsPage
        hideAvatarField
        fieldPolicies={{ avatar: "editable" }}
        actionPolicies={{
          avatarUpload: "enabled",
          avatarRemove: "enabled",
        }}
      />,
    );

    expect(screen.queryByRole("img", { name: "Avatar preview" })).toBeNull();
    expect(screen.queryByLabelText("Upload avatar")).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove avatar" })).toBeNull();
  });

  it("honours disabled mutation actions without hiding their availability", () => {
    const onSubmit = vi.fn();

    render(
      <>
        <SettingsPage
          formId="disabled-admin-profile-form"
          fieldPolicies={{ avatar: "read-only" }}
          actionPolicies={{
            avatarRemove: "disabled",
            submit: "disabled",
          }}
          onSubmit={onSubmit}
        />
        <button type="submit" form="disabled-admin-profile-form">
          External commit
        </button>
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove avatar" }));
    fireEvent.click(screen.getByRole("button", { name: "External commit" }));

    expect(
      (screen.getByRole("button", {
        name: "Remove avatar",
      }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", {
        name: "Save settings",
      }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(dispatchMock).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
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

  it("uses the translated default avatar upload failure when JSON parsing fails", async () => {
    authorizedFetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({
        "content-type": "application/json",
      }),
      json: async () => {
        throw new Error("invalid json");
      },
    });

    render(<SettingsPage />);

    const file = new File(["binary"], "broken.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Upload avatar"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(
        screen.getByText("Avatar upload failed. Try a different image and retry."),
      ).toBeTruthy();
    });
  });

  it("uses the translated default avatar upload failure when plain-text parsing fails", async () => {
    authorizedFetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({
        "content-type": "text/plain",
      }),
      text: async () => {
        throw new Error("text unavailable");
      },
    });

    render(<SettingsPage />);

    const file = new File(["binary"], "broken.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Upload avatar"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(
        screen.getByText("Avatar upload failed. Try a different image and retry."),
      ).toBeTruthy();
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
    expect(infoSpy).not.toHaveBeenCalled();
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
