import type {
  TranslationArgs,
  TranslationDictionary,
  TranslationValue,
} from "@plasius/translations";
import { profileEnGbTranslations } from "./translations/en-GB.js";

export const profileTranslationKeys = {
  settings: {
    heading: "profile.settings.heading",
    validationSummary: "profile.settings.validationSummary",
    uploadAvatar: "profile.settings.avatar.upload.label",
    avatarPreview: "profile.settings.avatar.preview.alt",
    firstName: "profile.settings.field.firstName.label",
    middleName: "profile.settings.field.middleName.label",
    lastName: "profile.settings.field.lastName.label",
    displayName: "profile.settings.field.displayName.label",
    preferredDisplayOrder:
      "profile.settings.field.preferredDisplayOrder.label",
    email: "profile.settings.field.email.label",
    emailPreferences: "profile.settings.field.emailPreferences.label",
    selectPreference: "profile.settings.option.selectPreference",
    saveSettings: "profile.settings.action.save",
    avatarUploadFailed: "profile.settings.avatar.upload.error.default",
    avatarPayloadInvalid: "profile.settings.avatar.upload.error.invalidPayload",
    required: {
      firstName: "profile.settings.field.firstName.error.required",
      middleName: "profile.settings.field.middleName.error.required",
      lastName: "profile.settings.field.lastName.error.required",
      displayName: "profile.settings.field.displayName.error.required",
      preferredDisplayOrder:
        "profile.settings.field.preferredDisplayOrder.error.required",
      email: "profile.settings.field.email.error.required",
      emailPreferences:
        "profile.settings.field.emailPreferences.error.required",
    },
    preferredDisplayOrderOptions: {
      firstName: "profile.settings.preferredDisplayOrder.firstName",
      lastName: "profile.settings.preferredDisplayOrder.lastName",
      middleName: "profile.settings.preferredDisplayOrder.middleName",
      displayName: "profile.settings.preferredDisplayOrder.displayName",
    },
    emailPreferenceOptions: {
      all: "profile.settings.emailPreference.all",
      none: "profile.settings.emailPreference.none",
      important: "profile.settings.emailPreference.important",
      custom: "profile.settings.emailPreference.custom",
      promotional: "profile.settings.emailPreference.promotional",
      transactional: "profile.settings.emailPreference.transactional",
      updates: "profile.settings.emailPreference.updates",
      newsletter: "profile.settings.emailPreference.newsletter",
      marketing: "profile.settings.emailPreference.marketing",
      security: "profile.settings.emailPreference.security",
      account: "profile.settings.emailPreference.account",
      privacy: "profile.settings.emailPreference.privacy",
    },
  },
  avatarUpload: {
    title: "profile.avatarUpload.title",
    inputLabel: "profile.avatarUpload.input.label",
    selectedPreviewLabel: "profile.avatarUpload.preview.selected.label",
    currentPreviewLabel: "profile.avatarUpload.preview.current.label",
    emptyState: "profile.avatarUpload.emptyState",
    currentAvatarDescription:
      "profile.avatarUpload.currentAvatar.description",
    selectedAvatarDescription:
      "profile.avatarUpload.selectedAvatar.description",
    selectedImageFallback: "profile.avatarUpload.selectedImage.fallback",
    success: "profile.avatarUpload.status.success",
    uploading: "profile.avatarUpload.status.uploading",
    genericFailure: "profile.avatarUpload.error.generic",
    currentAvatarUrlLabel: "profile.avatarUpload.currentAvatar.url.label",
  },
  routeStatus: {
    loadingTitle: "profile.routeStatus.loading.title",
    loadingDescription: "profile.routeStatus.loading.description",
    loadingMeta: "profile.routeStatus.loading.meta",
    provisioningTitle: "profile.routeStatus.provisioning.title",
    provisioningDescription: "profile.routeStatus.provisioning.description",
    provisioningMeta: "profile.routeStatus.provisioning.meta",
    provisioningTracePending:
      "profile.routeStatus.provisioning.trace.pending",
    errorTitle: "profile.routeStatus.error.title",
    errorDescription: "profile.routeStatus.error.description",
    errorMeta: "profile.routeStatus.error.meta",
    errorTraceUnavailable: "profile.routeStatus.error.trace.unavailable",
    retryAction: "profile.routeStatus.error.action.retry",
  },
  tokenOverview: {
    heading: "profile.tokenOverview.heading",
    tokenUnitSingular: "profile.tokenOverview.unit.token.singular",
    tokenUnitPlural: "profile.tokenOverview.unit.token.plural",
    loadingTitle: "profile.tokenOverview.loading.title",
    loadingDescription: "profile.tokenOverview.loading.description",
    errorTitle: "profile.tokenOverview.error.title",
    errorDescription: "profile.tokenOverview.error.description",
    retryAction: "profile.tokenOverview.error.action.retry",
    emptyTitle: "profile.tokenOverview.empty.title",
    emptyDescription: "profile.tokenOverview.empty.description",
    balancesHeading: "profile.tokenOverview.balances.heading",
    availableBalance: "profile.tokenOverview.balances.available",
    reservedBalance: "profile.tokenOverview.balances.reserved",
    heldBalance: "profile.tokenOverview.balances.held",
    rewardProgress: "profile.tokenOverview.balances.rewardProgress",
    refreshBalances: "profile.tokenOverview.balances.action.refresh",
    refreshingBalances: "profile.tokenOverview.balances.status.refreshing",
    lifetimeHeading: "profile.tokenOverview.lifetime.heading",
    lifetimeBought: "profile.tokenOverview.lifetime.bought",
    lifetimeEarned: "profile.tokenOverview.lifetime.earned",
    lifetimeAllocated: "profile.tokenOverview.lifetime.allocated",
    lifetimeReclaimed: "profile.tokenOverview.lifetime.reclaimed",
    lifetimeSpent: "profile.tokenOverview.lifetime.spent",
    lifetimeReversed: "profile.tokenOverview.lifetime.reversed",
    statusesHeading: "profile.tokenOverview.statuses.heading",
    actionsHeading: "profile.tokenOverview.actions.heading",
    activityHeading: "profile.tokenOverview.activity.heading",
    activityEmpty: "profile.tokenOverview.activity.empty",
    activityCredit: "profile.tokenOverview.activity.direction.credit",
    activityDebit: "profile.tokenOverview.activity.direction.debit",
    activitySource: "profile.tokenOverview.activity.source",
    activityStatus: "profile.tokenOverview.activity.status",
    activityDate: "profile.tokenOverview.activity.date",
    activityBeneficiary: "profile.tokenOverview.activity.beneficiary",
    activityReference: "profile.tokenOverview.activity.reference",
    unavailableUsesHeading: "profile.tokenOverview.unavailableUses.heading",
    unavailableStatus: "profile.tokenOverview.unavailableUses.status",
  },
  save: {
    validationFailed: "profile.save.error.validationFailed",
    validationSummary: "profile.save.error.validationSummary",
    saveFailed: "profile.save.error.saveFailed",
  },
  provider: {
    defaultDisplayName: "profile.provider.defaultDisplayName",
    unknownValidationError: "profile.provider.error.unknownValidationError",
    invalidUserAvatar: "profile.provider.error.invalidUserAvatar",
    invalidUserProfile: "profile.provider.error.invalidUserProfile",
    failedToLoadUser: "profile.provider.error.failedToLoadUser",
    failedToCreateUser: "profile.provider.error.failedToCreateUser",
    failedToSaveUser: "profile.provider.error.failedToSaveUser",
    invalidUserIdForSave: "profile.provider.error.invalidUserIdForSave",
    settingsLoadFailed: "profile.provider.error.settingsLoadFailed",
    settingsSaveFailed: "profile.provider.error.settingsSaveFailed",
  },
  accessibility: {
    destructiveHint: "profile.accessibility.destructiveHint",
  },
} as const;

type LeafValues<T> = T extends string
  ? T
  : T extends Record<string, unknown>
    ? LeafValues<T[keyof T]>
    : never;

export type ProfileTranslationKey = LeafValues<typeof profileTranslationKeys>;

export type ProfileTranslationResolver = (
  key: ProfileTranslationKey,
  args?: TranslationArgs
) => string;

export type ProfileRuntimeTranslator = (
  key: string,
  args?: TranslationArgs
) => string;

export { profileEnGbTranslations };

export const profileTranslations = {
  "en-GB": profileEnGbTranslations,
} as const satisfies Partial<Record<string, TranslationDictionary>>;

function renderTranslationValue(
  value: TranslationValue | undefined,
  args: TranslationArgs
): string | null {
  if (typeof value === "function") {
    return value(args);
  }

  if (typeof value === "string") {
    return value.replace(/\{(\w+)\}/g, (_match, placeholder: string) => {
      const replacement = args[placeholder];
      return replacement !== undefined ? String(replacement) : `{${placeholder}}`;
    });
  }

  return null;
}

export function getProfileDefaultTranslation(
  key: ProfileTranslationKey,
  args: TranslationArgs = {},
): string {
  return renderTranslationValue(profileEnGbTranslations[key], args) ?? key;
}

export function resolveProfileTranslation(
  translator: ProfileRuntimeTranslator,
  key: ProfileTranslationKey,
  args: TranslationArgs = {},
): string {
  const translated = translator(key, args);
  return translated === key ? getProfileDefaultTranslation(key, args) : translated;
}

export function createProfileTranslationResolver(
  translator: ProfileRuntimeTranslator,
): ProfileTranslationResolver {
  return (key, args) => resolveProfileTranslation(translator, key, args);
}
