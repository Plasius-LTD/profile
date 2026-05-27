import { createI18n } from "@plasius/translations";
import { describe, expect, it } from "vitest";
import {
  getProfileDefaultTranslation,
  profileTranslationKeys,
  profileTranslations,
  resolveProfileTranslation,
} from "../src/i18n.js";

describe("profile translations", () => {
  it("exports package-owned en-GB dictionaries for the shared translator", () => {
    const i18n = createI18n({
      language: "en-GB",
      fallback: "en-GB",
      translations: profileTranslations,
    });

    expect(i18n.t(profileTranslationKeys.settings.heading)).toBe("Profile settings");
    expect(
      i18n.t(profileTranslationKeys.avatarUpload.success, {
        fileName: "avatar.png",
      }),
    ).toBe("Avatar uploaded successfully as avatar.png.");
  });

  it("resolves package defaults when the active translator has not loaded a key", () => {
    const translator = (key: string) => key;

    expect(
      resolveProfileTranslation(
        translator,
        profileTranslationKeys.routeStatus.errorMeta,
        {
          attempts: 2,
          requestId: "profile-route-123",
        },
      ),
    ).toBe("Attempts: 2 | Trace ID: profile-route-123");
  });

  it("keeps default translation lookup stable for non-React helpers", () => {
    expect(
      getProfileDefaultTranslation(profileTranslationKeys.provider.settingsLoadFailed, {
        status: 503,
      }),
    ).toBe("Load failed with status 503");
  });
});
