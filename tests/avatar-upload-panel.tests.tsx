/* @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { UserEntity } from "@plasius/entity-manager";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvatarUploadPanel } from "../src/components/avatar-upload-panel/index.js";

const { dispatchMock, storeState, uploadAvatarMock, validateAvatarFileMock } = vi.hoisted(() => ({
  dispatchMock: vi.fn(),
  storeState: {
    user: null as UserEntity | null,
  },
  uploadAvatarMock: vi.fn(),
  validateAvatarFileMock: vi.fn(),
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
      lastName: "Smith",
      displayName: "Alice Smith",
      preferredDisplayOrder: "display_name",
    },
    emailPreferences: [],
    notificationPreferences: "important",
    avatar: undefined,
    updatedAt: undefined,
    updatedBy: undefined,
    deletedAt: undefined,
    deletedBy: undefined,
    deletedReason: undefined,
    ...overrides,
  };
}

describe("AvatarUploadPanel", () => {
  beforeEach(() => {
    dispatchMock.mockReset();
    uploadAvatarMock.mockReset();
    validateAvatarFileMock.mockReset();
    validateAvatarFileMock.mockResolvedValue(null);
    storeState.user = createUser({
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
    });

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

  it("renders the current avatar and dispatches the uploaded avatar entity", async () => {
    uploadAvatarMock.mockImplementation(async (file, reporter) => {
      reporter.setMessage(`Processing ${file.name}...`);
      return {
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
      };
    });

    render(
      <AvatarUploadPanel
        accept="image/png"
        constraintsDescription="Use a PNG image."
        validateAvatarFile={validateAvatarFileMock}
        uploadAvatar={uploadAvatarMock}
      />,
    );

    expect(screen.getByText("Current avatar preview")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Current avatar preview" })).toBeTruthy();

    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Choose an avatar image"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(validateAvatarFileMock).toHaveBeenCalledWith(file);
      expect(uploadAvatarMock).toHaveBeenCalled();
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

    expect(
      screen.getByText("Avatar uploaded successfully as avatar.png."),
    ).toBeTruthy();
  });

  it("shows validation errors before invoking the upload adapter", async () => {
    validateAvatarFileMock.mockResolvedValue("Avatar image is too large.");

    render(
      <AvatarUploadPanel
        accept="image/png"
        constraintsDescription="Use a PNG image."
        validateAvatarFile={validateAvatarFileMock}
        uploadAvatar={uploadAvatarMock}
      />,
    );

    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Choose an avatar image"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Avatar image is too large.");
    });

    expect(uploadAvatarMock).not.toHaveBeenCalled();
  });

  it("restores the current avatar preview when a replacement file fails validation", async () => {
    uploadAvatarMock.mockRejectedValue(new Error("Avatar upload failed."));

    render(
      <AvatarUploadPanel
        accept="image/png"
        constraintsDescription="Use a PNG image."
        validateAvatarFile={validateAvatarFileMock}
        uploadAvatar={uploadAvatarMock}
      />,
    );

    const firstFile = new File(["avatar"], "avatar.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Choose an avatar image"), {
      target: { files: [firstFile] },
    });

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Selected avatar preview" })).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Avatar upload failed.");
    });

    validateAvatarFileMock.mockResolvedValueOnce("Avatar image is too large.");

    const secondFile = new File(["too-large"], "too-large.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Choose an avatar image"), {
      target: { files: [secondFile] },
    });

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Avatar image is too large.");
    });

    expect(screen.queryByRole("img", { name: "Selected avatar preview" })).toBeNull();
    expect(screen.getByRole("img", { name: "Current avatar preview" })).toBeTruthy();
  });

  it("shows upload errors from the adapter", async () => {
    uploadAvatarMock.mockRejectedValue(new Error("Avatar upload failed."));

    render(
      <AvatarUploadPanel
        accept="image/png"
        constraintsDescription="Use a PNG image."
        validateAvatarFile={validateAvatarFileMock}
        uploadAvatar={uploadAvatarMock}
      />,
    );

    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Choose an avatar image"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Avatar upload failed.");
    });
  });
});
