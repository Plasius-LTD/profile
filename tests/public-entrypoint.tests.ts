import { describe, expect, it, vi } from "vitest";
import type {
  SettingsActionPolicies,
  SettingsFieldPolicies,
  SettingsPageProps,
} from "../src/index.js";

vi.mock("@plasius/sharedcomponents", () => ({
  StatusPanel: () => null,
}));

describe("public package entrypoint", () => {
  it("exports the Token presentation component and economy adapter", async () => {
    const profile = await import("../src/index.js");

    expect(profile.TokenOverviewPanel).toBeTypeOf("function");
    expect(profile.createTokenOverviewPanelLabels).toBeTypeOf("function");
    expect(profile.createTokenEconomyPresentation).toBeTypeOf("function");
    expect(profile.createTokenPortfolioEconomyPresentation).toBeTypeOf(
      "function",
    );
    expect(profile.filterTokenActivityPresentations).toBeTypeOf("function");
  });

  it("exports a self-contained lazy Token subpath", async () => {
    const tokens = await import("../src/tokens.js");

    expect(tokens.TokenOverviewPanel).toBeTypeOf("function");
    expect(tokens.createTokenEconomyPresentation).toBeTypeOf("function");
    expect(tokens.createTokenPortfolioEconomyPresentation).toBeTypeOf(
      "function",
    );
    expect(tokens.createProfileTranslationResolver).toBeTypeOf("function");
  });

  it("exports the controlled SettingsPage surface from the root entrypoint", async () => {
    const profile = await import("../src/index.js");
    const fieldPolicies = {
      avatar: "read-only",
      email: "editable",
    } satisfies SettingsFieldPolicies;
    const actionPolicies = {
      avatarUpload: "hidden",
      avatarRemove: "enabled",
      submit: "hidden",
    } satisfies SettingsActionPolicies;
    const props = {
      formId: "admin-profile-form",
      fieldPolicies,
      actionPolicies,
      isSubmitting: false,
      submitError: null,
      onSubmit: async () => undefined,
    } satisfies SettingsPageProps;

    expect(profile.SettingsPage).toBeTypeOf("function");
    expect(props.fieldPolicies.avatar).toBe("read-only");
    expect(props.actionPolicies.avatarRemove).toBe("enabled");
  });
});
