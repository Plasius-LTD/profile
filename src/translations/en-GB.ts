import type {
  ProfilePackageTranslationKey,
  ProfileSettingsExtensionTranslationKey,
  ProfileTokenTranslationKey,
  ProfileTranslationKey,
} from "../i18n.js";

export const profileEnGbTranslations = {
  "profile.settings.heading": "Profile settings",
  "profile.settings.validationSummary":
    "Fix the highlighted fields before saving.",
  "profile.settings.avatar.upload.label": "Upload avatar",
  "profile.settings.avatar.preview.alt": "Avatar preview",
  "profile.settings.field.firstName.label": "First name",
  "profile.settings.field.middleName.label": "Middle name",
  "profile.settings.field.lastName.label": "Last name",
  "profile.settings.field.displayName.label": "Display name",
  "profile.settings.field.preferredDisplayOrder.label":
    "Preferred name display",
  "profile.settings.field.email.label": "Email",
  "profile.settings.field.emailPreferences.label": "Email preferences",
  "profile.settings.option.selectPreference": "Select preference",
  "profile.settings.action.save": "Save settings",
  "profile.settings.avatar.upload.error.default":
    "Avatar upload failed. Try a different image and retry.",
  "profile.settings.avatar.upload.error.invalidPayload":
    "Avatar upload completed but the returned avatar payload was invalid.",
  "profile.settings.field.firstName.error.required": "First name is required.",
  "profile.settings.field.middleName.error.required":
    "Middle name is required.",
  "profile.settings.field.lastName.error.required": "Last name is required.",
  "profile.settings.field.displayName.error.required":
    "Display name is required.",
  "profile.settings.field.preferredDisplayOrder.error.required":
    "Preferred name display is required.",
  "profile.settings.field.email.error.required": "Email is required.",
  "profile.settings.field.emailPreferences.error.required":
    "Email preferences are required.",
  "profile.settings.preferredDisplayOrder.firstName": "First name",
  "profile.settings.preferredDisplayOrder.lastName": "Last name",
  "profile.settings.preferredDisplayOrder.middleName": "Middle name",
  "profile.settings.preferredDisplayOrder.displayName": "Display name",
  "profile.settings.emailPreference.all": "All",
  "profile.settings.emailPreference.none": "None",
  "profile.settings.emailPreference.important": "Important",
  "profile.settings.emailPreference.custom": "Custom",
  "profile.settings.emailPreference.promotional": "Promotional",
  "profile.settings.emailPreference.transactional": "Transactional",
  "profile.settings.emailPreference.updates": "Updates",
  "profile.settings.emailPreference.newsletter": "Newsletter",
  "profile.settings.emailPreference.marketing": "Marketing",
  "profile.settings.emailPreference.security": "Security",
  "profile.settings.emailPreference.account": "Account",
  "profile.settings.emailPreference.privacy": "Privacy",
  "profile.avatarUpload.title": "Avatar upload",
  "profile.avatarUpload.input.label": "Choose an avatar image",
  "profile.avatarUpload.preview.selected.label": "Selected avatar preview",
  "profile.avatarUpload.preview.current.label": "Current avatar preview",
  "profile.avatarUpload.emptyState":
    "No avatar is currently attached to your profile.",
  "profile.avatarUpload.currentAvatar.description":
    "This is the avatar currently attached to your profile.",
  "profile.avatarUpload.selectedAvatar.description":
    "{fileName} will replace your current avatar once processing completes.",
  "profile.avatarUpload.selectedImage.fallback": "Selected image",
  "profile.avatarUpload.status.success":
    "Avatar uploaded successfully as {fileName}.",
  "profile.avatarUpload.status.uploading": "Uploading {fileName}...",
  "profile.avatarUpload.error.generic":
    "Avatar upload failed. Try a different image and retry.",
  "profile.avatarUpload.currentAvatar.url.label": "Current avatar URL:",
  "profile.routeStatus.loading.title": "Loading profile settings",
  "profile.routeStatus.loading.description":
    "Fetching the latest profile data before mounting the shared editor.",
  "profile.routeStatus.loading.meta":
    "Automatic retries use a capped backoff policy for transient dependency failures.",
  "profile.routeStatus.provisioning.title": "Preparing your profile",
  "profile.routeStatus.provisioning.description":
    "No saved profile record was found for this account, so a starter profile is being created now.",
  "profile.routeStatus.provisioning.meta": "Trace ID: {requestId}",
  "profile.routeStatus.provisioning.trace.pending": "pending",
  "profile.routeStatus.error.title": "We could not load your profile settings",
  "profile.routeStatus.error.description":
    "The profile route could not load your settings in the current browser session. Retry the load to continue.",
  "profile.routeStatus.error.meta":
    "Attempts: {attempts} | Trace ID: {requestId}",
  "profile.routeStatus.error.trace.unavailable": "unavailable",
  "profile.routeStatus.error.action.retry": "Retry loading profile",
  "profile.save.error.validationFailed": "Profile validation failed.",
  "profile.save.error.validationSummary":
    "Fix the highlighted fields before saving.",
  "profile.save.error.saveFailed": "Profile save failed.",
  "profile.provider.defaultDisplayName": "Plasius User",
  "profile.provider.error.unknownValidationError": "unknown error",
  "profile.provider.error.invalidUserAvatar": "Invalid User Avatar: {details}",
  "profile.provider.error.invalidUserProfile":
    "Invalid User Profile: {details}",
  "profile.provider.error.failedToLoadUser":
    "Failed to load user ({status})",
  "profile.provider.error.failedToCreateUser":
    "Failed to create user ({status})",
  "profile.provider.error.failedToSaveUser":
    "Save failed with status {status}",
  "profile.provider.error.invalidUserIdForSave": "Invalid user id for save.",
  "profile.provider.error.settingsLoadFailed":
    "Load failed with status {status}",
  "profile.provider.error.settingsSaveFailed":
    "Save failed with status {status}",
  "profile.accessibility.destructiveHint":
    "This action is destructive. Confirm the target and consequences before continuing.",
} as const satisfies Record<ProfileTranslationKey, string>;

export const profileSettingsExtensionEnGbTranslations = {
  "profile.settings.action.saving": "Saving settings",
  "profile.settings.avatar.action.remove": "Remove avatar",
  "profile.settings.submit.error.default":
    "Profile settings could not be saved. Try again.",
} as const satisfies Record<ProfileSettingsExtensionTranslationKey, string>;

export const profileTokenEnGbTranslations = {
  "profile.tokenOverview.heading": "Tokens",
  "profile.tokenOverview.unit.token.singular": "Token",
  "profile.tokenOverview.unit.token.plural": "Tokens",
  "profile.tokenOverview.loading.title": "Loading Token activity",
  "profile.tokenOverview.loading.description":
    "Fetching the latest Token balances and activity.",
  "profile.tokenOverview.error.title": "We could not load your Tokens",
  "profile.tokenOverview.error.description":
    "Your Token information is unavailable right now. Try again.",
  "profile.tokenOverview.error.action.retry": "Retry loading Tokens",
  "profile.tokenOverview.empty.title": "No Token wallet to show",
  "profile.tokenOverview.empty.description":
    "Token information will appear here when a wallet is available.",
  "profile.tokenOverview.preview.title": "No Token wallet has been created",
  "profile.tokenOverview.preview.description":
    "This is a preview only. Tokens cannot yet be earned, bought, allocated, spent, or recorded.",
  "profile.tokenOverview.preview.amount": "Preview amount",
  "profile.tokenOverview.preview.activity.empty":
    "No Token activity can be recorded in this preview.",
  "profile.tokenOverview.balances.heading": "Current balances",
  "profile.tokenOverview.balances.available": "Available",
  "profile.tokenOverview.balances.reserved": "Reserved",
  "profile.tokenOverview.balances.held": "Held",
  "profile.tokenOverview.balances.rewardProgress": "Reward progress",
  "profile.tokenOverview.balances.action.refresh": "Refresh balances",
  "profile.tokenOverview.balances.status.refreshing": "Refreshing balances",
  "profile.tokenOverview.lifetime.heading": "Lifetime activity",
  "profile.tokenOverview.lifetime.bought": "Bought",
  "profile.tokenOverview.lifetime.earned": "Earned",
  "profile.tokenOverview.lifetime.allocated": "Allocated",
  "profile.tokenOverview.lifetime.reclaimed": "Reclaimed",
  "profile.tokenOverview.lifetime.spent": "Spent",
  "profile.tokenOverview.lifetime.reversed": "Reversed",
  "profile.tokenOverview.statuses.heading": "Wallet status",
  "profile.tokenOverview.actions.heading": "Get Tokens",
  "profile.tokenOverview.activity.heading": "Token activity",
  "profile.tokenOverview.activity.empty": "No Token activity to show yet.",
  "profile.tokenOverview.activity.direction.credit": "Credit",
  "profile.tokenOverview.activity.direction.debit": "Debit",
  "profile.tokenOverview.activity.source": "Source",
  "profile.tokenOverview.activity.status": "Status",
  "profile.tokenOverview.activity.date": "Date",
  "profile.tokenOverview.activity.beneficiary": "Beneficiary",
  "profile.tokenOverview.activity.reference": "Reference",
  "profile.tokenOverview.unavailableUses.heading": "Ways to use Tokens",
  "profile.tokenOverview.unavailableUses.status": "Unavailable",
} as const satisfies Record<ProfileTokenTranslationKey, string>;

export const profilePackageEnGbTranslations = {
  ...profileEnGbTranslations,
  ...profileSettingsExtensionEnGbTranslations,
  ...profileTokenEnGbTranslations,
} as const satisfies Record<ProfilePackageTranslationKey, string>;
