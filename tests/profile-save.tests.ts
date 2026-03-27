import { describe, expect, it } from "vitest";
import {
  UserProfileSaveError,
  createValidationSaveError,
  isUserEntityLike,
  mapUserValidationErrors,
  normalizeUnknownSaveError,
} from "../src/profile-save.js";

describe("profile-save helpers", () => {
  it("maps field validation errors and rewrites empty-field messages", () => {
    const mapped = mapUserValidationErrors([
      "High PII field must not be empty: name.firstName",
      "Field must be a string: emailPreferences",
      "Field must be a string: avatar",
      "Unexpected profile failure",
    ]);

    expect(mapped.fieldErrors).toEqual({
      "name.firstName": "First name is required.",
      emailPreferences: "Field must be a string: emailPreferences",
    });
    expect(mapped.formErrors).toEqual([
      "Field must be a string: avatar",
      "Unexpected profile failure",
    ]);
  });

  it("creates validation save errors with fallback form guidance when only field errors exist", () => {
    const error = createValidationSaveError([
      "High PII field must not be empty: name.lastName",
    ]);

    expect(error).toBeInstanceOf(UserProfileSaveError);
    expect(error.category).toBe("validation");
    expect(error.message).toBe("Profile validation failed.");
    expect(error.fieldErrors["name.lastName"]).toBe("Last name is required.");
    expect(error.formErrors).toEqual(["Fix the highlighted fields before saving."]);
  });

  it("creates validation save errors from top-level form errors", () => {
    const error = createValidationSaveError(["Backend validation failed."]);

    expect(error.message).toBe("Backend validation failed.");
    expect(error.formErrors).toEqual(["Backend validation failed."]);
    expect(error.fieldErrors).toEqual({});
  });

  it("normalizes existing save errors without wrapping them", () => {
    const original = new UserProfileSaveError({
      message: "Already normalized.",
      category: "server",
      status: 500,
    });

    expect(normalizeUnknownSaveError(original)).toBe(original);
  });

  it("normalizes generic Error objects and preserves the cause", () => {
    const original = new Error("Network exploded.");
    const normalized = normalizeUnknownSaveError(original);

    expect(normalized).toBeInstanceOf(UserProfileSaveError);
    expect(normalized.message).toBe("Network exploded.");
    expect((normalized as Error & { cause?: unknown }).cause).toBe(original);
  });

  it("normalizes string and unknown failures into stable save errors", () => {
    expect(normalizeUnknownSaveError("Request timed out.").message).toBe("Request timed out.");
    expect(normalizeUnknownSaveError("   ").message).toBe("Profile save failed.");
    expect(normalizeUnknownSaveError({ retryable: false }).message).toBe("Profile save failed.");
  });

  it("recognizes user-shaped objects by id presence", () => {
    expect(isUserEntityLike({ id: "user-1" })).toBe(true);
    expect(isUserEntityLike({ email: "user@example.com" })).toBe(false);
    expect(isUserEntityLike(null)).toBe(false);
    expect(isUserEntityLike("user-1")).toBe(false);
  });
});
