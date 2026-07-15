import { describe, expect, it, vi } from "vitest";

vi.mock("@plasius/sharedcomponents", () => ({
  StatusPanel: () => null,
}));

describe("public package entrypoint", () => {
  it("exports the Token presentation component and economy adapter", async () => {
    const profile = await import("../src/index.js");

    expect(profile.TokenOverviewPanel).toBeTypeOf("function");
    expect(profile.createTokenOverviewPanelLabels).toBeTypeOf("function");
    expect(profile.createTokenEconomyPresentation).toBeTypeOf("function");
    expect(profile.filterTokenActivityPresentations).toBeTypeOf("function");
  });

  it("exports a self-contained lazy Token subpath", async () => {
    const tokens = await import("../src/tokens.js");

    expect(tokens.TokenOverviewPanel).toBeTypeOf("function");
    expect(tokens.createTokenEconomyPresentation).toBeTypeOf("function");
    expect(tokens.createProfileTranslationResolver).toBeTypeOf("function");
  });
});
