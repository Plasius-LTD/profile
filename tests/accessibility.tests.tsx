/* @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import type { UserEntity } from "@plasius/entity-manager";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsPage } from "../src/Pages/Settings/index.js";
import { AvatarUploadPanel } from "../src/components/avatar-upload-panel/index.js";
import { avatarUploadAccessibilityTheme } from "../src/components/avatar-upload-panel/accessibilityTheme.js";

const {
  authorizedFetchMock,
  dispatchMock,
  storeState,
  uploadAvatarMock,
  validateAvatarFileMock,
} = vi.hoisted(() => ({
  authorizedFetchMock: vi.fn(),
  dispatchMock: vi.fn(),
  storeState: {
    user: null as UserEntity | null,
  },
  uploadAvatarMock: vi.fn(),
  validateAvatarFileMock: vi.fn(),
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

function createUser(overrides: Partial<UserEntity> = {}): UserEntity {
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
      preferredDisplayOrder: "display_name",
    },
    emailPreferences: [],
    notificationPreferences: "important",
    avatar: {
      partitionKey: "tenant-001",
      id: "avatar-001",
      filename: "current.png",
      contentType: "image/png",
      url: "https://cdn.example.com/current.png",
      size: 256,
      width: 128,
      height: 128,
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

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const bigint = Number.parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("profile accessibility baseline", () => {
  const axeOptions: axe.RunOptions = {
    rules: {
      // jsdom does not implement the canvas APIs axe uses for computed contrast checks.
      "color-contrast": { enabled: false },
    },
  };

  beforeEach(() => {
    authorizedFetchMock.mockReset();
    dispatchMock.mockReset();
    uploadAvatarMock.mockReset();
    validateAvatarFileMock.mockReset();
    validateAvatarFileMock.mockResolvedValue(null);
    storeState.user = createUser();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(() => "blob:selected-avatar"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("settings page fields have no automated axe violations", async () => {
    const { container } = render(<SettingsPage />);

    const result = await axe.run(container, axeOptions);

    expect(result.violations).toEqual([]);
  });

  it("avatar upload panel has no automated axe violations", async () => {
    const { container } = render(
      <AvatarUploadPanel
        accept="image/png"
        constraintsDescription="Use a PNG image."
        validateAvatarFile={validateAvatarFileMock}
        uploadAvatar={uploadAvatarMock}
      />,
    );

    const result = await axe.run(container, axeOptions);

    expect(result.violations).toEqual([]);
  });

  it("associates upload status text with the file input", async () => {
    let resolveUpload: ((value: unknown) => void) | undefined;
    uploadAvatarMock.mockImplementation(
      async (file: File, reporter: { setMessage: (message: string) => void }) => {
        reporter.setMessage(`Processing ${file.name} into avatar sizes...`);
        return await new Promise((resolve) => {
          resolveUpload = resolve;
        });
      },
    );

    render(
      <AvatarUploadPanel
        accept="image/png"
        constraintsDescription="Use a PNG image."
        validateAvatarFile={validateAvatarFileMock}
        uploadAvatar={uploadAvatarMock}
      />,
    );

    const input = screen.getByLabelText("Choose an avatar image") as HTMLInputElement;
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain(
        "Processing avatar.png into avatar sizes...",
      );
    });

    const describedByIds =
      input.getAttribute("aria-describedby")?.split(/\s+/).filter(Boolean) ?? [];
    const describedByText = describedByIds
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ");

    expect(describedByText).toContain("Use a PNG image.");
    expect(describedByText).toContain("Processing avatar.png into avatar sizes...");

    resolveUpload?.({
      partitionKey: "tenant-001",
      id: "avatar-002",
      filename: "avatar.png",
      contentType: "image/png",
      url: "https://cdn.example.com/avatar.png",
      size: 512,
      width: 128,
      height: 128,
      createdAt: new Date().toISOString(),
      createdBy: "123456789012345678901",
      version: 1,
    });

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain(
        "Avatar uploaded successfully as avatar.png.",
      );
    });
  });

  it("marks the file input invalid and exposes the live error text", async () => {
    validateAvatarFileMock.mockResolvedValue("Avatar image is too large.");

    render(
      <AvatarUploadPanel
        accept="image/png"
        constraintsDescription="Use a PNG image."
        validateAvatarFile={validateAvatarFileMock}
        uploadAvatar={uploadAvatarMock}
      />,
    );

    const input = screen.getByLabelText("Choose an avatar image") as HTMLInputElement;
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Avatar image is too large.");
    });

    expect(input.getAttribute("aria-invalid")).toBe("true");

    const describedByIds =
      input.getAttribute("aria-describedby")?.split(/\s+/).filter(Boolean) ?? [];
    const describedByText = describedByIds
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ");

    expect(describedByText).toContain("Use a PNG image.");
    expect(describedByText).toContain("Avatar image is too large.");
  });

  it("keeps fallback panel text colors above WCAG AA contrast on the panel background", () => {
    const background = avatarUploadAccessibilityTheme.panelBackground;

    expect(contrastRatio(avatarUploadAccessibilityTheme.primaryText, background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(avatarUploadAccessibilityTheme.secondaryText, background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(avatarUploadAccessibilityTheme.accentText, background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(avatarUploadAccessibilityTheme.statusText, background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(avatarUploadAccessibilityTheme.errorText, background)).toBeGreaterThanOrEqual(4.5);
  });
});
