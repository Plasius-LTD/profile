import { describe, expect, it } from "vitest";
import {
  createAccessibleActionBindings,
  createAccessibleFieldBindings,
} from "../src/accessibility.js";

describe("accessibility bindings", () => {
  it("builds stable field associations for descriptions, live status, and errors", () => {
    const binding = createAccessibleFieldBindings({
      idPrefix: "profile-settings",
      name: "name.displayName",
      description: "Shown publicly on your profile.",
      liveMessage: "Validating display name.",
      error: "Display name is required.",
      invalid: true,
    });

    expect(binding.descriptionId).toBe("profile-settings-name-displayname-description");
    expect(binding.errorId).toBe("profile-settings-name-displayname-error");
    expect(binding.liveMessageId).toBe("profile-settings-name-displayname-status");
    expect(binding.inputProps["aria-describedby"]).toBe(
      "profile-settings-name-displayname-description profile-settings-name-displayname-status profile-settings-name-displayname-error",
    );
    expect(binding.inputProps["aria-errormessage"]).toBe(
      "profile-settings-name-displayname-error",
    );
    expect(binding.inputProps["aria-invalid"]).toBe(true);
  });

  it("normalizes noisy field names without regex backtracking risk", () => {
    const binding = createAccessibleFieldBindings({
      idPrefix: "profile-settings",
      name: "---Display---Name---",
    });

    expect(binding.descriptionId).toBe("profile-settings-display-name-description");
  });

  it("adds reusable destructive-action semantics for host consumers", () => {
    const binding = createAccessibleActionBindings({
      idPrefix: "profile-settings",
      action: "delete-account",
      description: "Deleting your account starts a grace period before permanent removal.",
      intent: "destructive",
    });

    expect(binding.buttonProps["data-action-intent"]).toBe("destructive");
    expect(binding.buttonProps["aria-describedby"]).toBe(
      "profile-settings-delete-account-action-description",
    );
    expect(binding.descriptionText).toContain(
      "Deleting your account starts a grace period before permanent removal.",
    );
    expect(binding.descriptionText).toContain("This action is destructive.");
  });
});
