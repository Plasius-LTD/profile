import React from "react";
import type { UserAvatarEntity } from "@plasius/entity-manager";
import {
  userEntitySchema,
  userAvatarSchema,
  UserEmailPreferences,
  PreferredDisplayOrder,
} from "@plasius/entity-manager";
import { useAuthorizedFetch } from "@plasius/auth";
import { useI18n } from "@plasius/translations";
import { UserStore } from "../../UserProvider.js";
import { createAccessibleFieldBindings } from "../../accessibility.js";
import {
  createProfileTranslationResolver,
  profileTranslationKeys,
  type ProfileTranslationKey,
  type ProfileTranslationResolver,
} from "../../i18n.js";

import styles from "./Settings.module.css";

export interface SettingsPageProps {
  hideAvatarField?: boolean;
}

type SettingsFieldName =
  | "avatar"
  | "name.firstName"
  | "name.middleName"
  | "name.lastName"
  | "name.displayName"
  | "name.preferredDisplayOrder"
  | "email"
  | "emailPreferences";

type SettingsFieldErrors = Partial<Record<SettingsFieldName, string>>;

const SETTINGS_FIELD_NAMES = new Set<SettingsFieldName>([
  "avatar",
  "name.firstName",
  "name.middleName",
  "name.lastName",
  "name.displayName",
  "name.preferredDisplayOrder",
  "email",
  "emailPreferences",
]);

const FIELD_LABEL_TRANSLATION_KEYS = {
  "name.firstName": profileTranslationKeys.settings.firstName,
  "name.middleName": profileTranslationKeys.settings.middleName,
  "name.lastName": profileTranslationKeys.settings.lastName,
  "name.displayName": profileTranslationKeys.settings.displayName,
  "name.preferredDisplayOrder":
    profileTranslationKeys.settings.preferredDisplayOrder,
  email: profileTranslationKeys.settings.email,
  emailPreferences: profileTranslationKeys.settings.emailPreferences,
} as const satisfies Record<
  Exclude<SettingsFieldName, "avatar">,
  ProfileTranslationKey
>;

const REQUIRED_FIELD_TRANSLATION_KEYS = {
  "name.firstName": profileTranslationKeys.settings.required.firstName,
  "name.middleName": profileTranslationKeys.settings.required.middleName,
  "name.lastName": profileTranslationKeys.settings.required.lastName,
  "name.displayName": profileTranslationKeys.settings.required.displayName,
  "name.preferredDisplayOrder":
    profileTranslationKeys.settings.required.preferredDisplayOrder,
  email: profileTranslationKeys.settings.required.email,
  emailPreferences: profileTranslationKeys.settings.required.emailPreferences,
} as const satisfies Record<
  Exclude<SettingsFieldName, "avatar">,
  ProfileTranslationKey
>;

const PREFERRED_DISPLAY_ORDER_TRANSLATION_KEYS = {
  [PreferredDisplayOrder.FIRST_NAME]:
    profileTranslationKeys.settings.preferredDisplayOrderOptions.firstName,
  [PreferredDisplayOrder.LAST_NAME]:
    profileTranslationKeys.settings.preferredDisplayOrderOptions.lastName,
  [PreferredDisplayOrder.MIDDLE_NAME]:
    profileTranslationKeys.settings.preferredDisplayOrderOptions.middleName,
  [PreferredDisplayOrder.DISPLAY_NAME]:
    profileTranslationKeys.settings.preferredDisplayOrderOptions.displayName,
} as const satisfies Record<PreferredDisplayOrder, ProfileTranslationKey>;

const EMAIL_PREFERENCE_TRANSLATION_KEYS = {
  [UserEmailPreferences.ALL]:
    profileTranslationKeys.settings.emailPreferenceOptions.all,
  [UserEmailPreferences.NONE]:
    profileTranslationKeys.settings.emailPreferenceOptions.none,
  [UserEmailPreferences.IMPORTANT]:
    profileTranslationKeys.settings.emailPreferenceOptions.important,
  [UserEmailPreferences.CUSTOM]:
    profileTranslationKeys.settings.emailPreferenceOptions.custom,
  [UserEmailPreferences.PROMOTIONAL]:
    profileTranslationKeys.settings.emailPreferenceOptions.promotional,
  [UserEmailPreferences.TRANSACTIONAL]:
    profileTranslationKeys.settings.emailPreferenceOptions.transactional,
  [UserEmailPreferences.UPDATES]:
    profileTranslationKeys.settings.emailPreferenceOptions.updates,
  [UserEmailPreferences.NEWSLETTER]:
    profileTranslationKeys.settings.emailPreferenceOptions.newsletter,
  [UserEmailPreferences.MARKETING]:
    profileTranslationKeys.settings.emailPreferenceOptions.marketing,
  [UserEmailPreferences.SECURITY]:
    profileTranslationKeys.settings.emailPreferenceOptions.security,
  [UserEmailPreferences.ACCOUNT]:
    profileTranslationKeys.settings.emailPreferenceOptions.account,
  [UserEmailPreferences.PRIVACY]:
    profileTranslationKeys.settings.emailPreferenceOptions.privacy,
} as const satisfies Record<UserEmailPreferences, ProfileTranslationKey>;

const EMPTY_FIELD_PATTERN = /^High PII field must not be empty: ([a-zA-Z]+(?:\.[a-zA-Z]+)*)$/;

function isSettingsFieldName(value: string): value is SettingsFieldName {
  return SETTINGS_FIELD_NAMES.has(value as SettingsFieldName);
}

function getFieldNameFromValidationError(error: string): Exclude<SettingsFieldName, "avatar"> | null {
  const fieldPath = error.match(/:\s*([a-zA-Z]+(?:\.[a-zA-Z]+)*)$/)?.[1] ?? "";
  if (!isSettingsFieldName(fieldPath) || fieldPath === "avatar") {
    return null;
  }

  return fieldPath;
}

function getFieldValidationMessage(
  field: Exclude<SettingsFieldName, "avatar">,
  error: string,
  translate: ProfileTranslationResolver,
): string {
  const emptyFieldMatch = error.match(EMPTY_FIELD_PATTERN);
  if (emptyFieldMatch?.[1] === field) {
    return translate(REQUIRED_FIELD_TRANSLATION_KEYS[field]);
  }

  return error;
}

function mapValidationErrors(
  errors: unknown[] | undefined,
  translate: ProfileTranslationResolver,
): {
  fieldErrors: SettingsFieldErrors;
  formErrors: string[];
} {
  const fieldErrors: SettingsFieldErrors = {};
  const formErrors: string[] = [];

  for (const rawError of errors ?? []) {
    const error = String(rawError);
    const field = getFieldNameFromValidationError(error);

    if (field) {
      fieldErrors[field] ??= getFieldValidationMessage(field, error, translate);
      continue;
    }

    formErrors.push(error);
  }

  return { fieldErrors, formErrors };
}

async function readUploadErrorMessage(response: Response): Promise<string | null> {
  const contentType = response.headers?.get?.("content-type") ?? "";

  if (contentType.toLowerCase().includes("application/json")) {
    try {
      const payload = await response.json() as { error?: unknown; message?: unknown };
      if (typeof payload.error === "string" && payload.error.trim().length > 0) {
        return payload.error.trim();
      }

      if (typeof payload.message === "string" && payload.message.trim().length > 0) {
        return payload.message.trim();
      }
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();
    return text.trim().length > 0 ? text.trim() : null;
  } catch {
    return null;
  }
}

const getEmailPreferenceOptions = (translate: ProfileTranslationResolver) =>
  Object.values(UserEmailPreferences).map((value) => ({
    label: translate(EMAIL_PREFERENCE_TRANSLATION_KEYS[value]),
    value,
  }));

const getPreferredDisplayOrder = (translate: ProfileTranslationResolver) =>
  Object.values(PreferredDisplayOrder).map((value) => ({
    label: translate(PREFERRED_DISPLAY_ORDER_TRANSLATION_KEYS[value]),
    value,
  }));

export function SettingsPage({ hideAvatarField = false }: SettingsPageProps) {
  const authorizedFetch = useAuthorizedFetch();
  const { t } = useI18n();
  const translate = React.useMemo(() => createProfileTranslationResolver(t), [t]);
  const { user } = UserStore.useStore();
  const dispatch = UserStore.useDispatch();
  const errorIdPrefix = React.useId();
  const [avatarError, setAvatarError] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<SettingsFieldErrors>({});
  const [formErrors, setFormErrors] = React.useState<string[]>([]);
  const selectedEmailPreference = Array.isArray(user?.emailPreferences)
    ? (user.emailPreferences[0] ?? "")
    : "";
  const defaultAvatarUploadFailureMessage = translate(
    profileTranslationKeys.settings.avatarUploadFailed,
  );
  const hasValidationSummary = Object.keys(fieldErrors).length > 0 || formErrors.length > 0;
  const avatarFieldAccessibility = createAccessibleFieldBindings({
    idPrefix: errorIdPrefix,
    name: "avatar",
    error: avatarError,
    invalid: Boolean(avatarError),
  });
  const firstNameFieldAccessibility = createAccessibleFieldBindings({
    idPrefix: errorIdPrefix,
    name: "name.firstName",
    error: fieldErrors["name.firstName"],
    invalid: Boolean(fieldErrors["name.firstName"]),
  });
  const getFieldAccessibility = (
    field: SettingsFieldName,
    options?: {
      description?: string;
      error?: string;
      liveMessage?: string;
    },
  ) =>
    createAccessibleFieldBindings({
      idPrefix: errorIdPrefix,
      name: field,
      description: options?.description,
      error: options?.error,
      liveMessage: options?.liveMessage,
      invalid: Boolean(options?.error),
    });

  const clearFieldError = (field: Exclude<SettingsFieldName, "avatar">) => {
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormErrors([]);

    if (isSettingsFieldName(name) && name !== "avatar") {
      clearFieldError(name);
    }

    if (name === "emailPreferences") {
      dispatch({
        type: "updateField",
        payload: {
          field: "emailPreferences",
          value: value ? [value] : [],
        },
      });
      return;
    }

    if (name.startsWith("name.")) {
      const [, field] = name.split(".");
      dispatch({ type: "updateNameField", payload: { field, value } });
    } else {
      dispatch({ type: "updateField", payload: { field: name, value } });
    }
  };

  const uploadAvatar = async (file: File): Promise<unknown> => {
    const formData = new FormData();
    formData.append("avatar", file); // "avatar" must match the expected server-side field

    const response = await authorizedFetch(`/user/avatar`, {
      method: "POST",
      body: formData,
      headers: {
        // Do NOT set Content-Type explicitly; browser will set it with boundary
      },
    });

    if (!response.ok) {
      throw new Error(
        (await readUploadErrorMessage(response)) ?? defaultAvatarUploadFailureMessage,
      );
    }

    const data: unknown = await response.json();
    return data; // e.g. { imageUrl: "...uploaded file url..." }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) {
      return;
    }

    setAvatarError("");
    setFormErrors([]);

    try {
      const uploadedAvatar = await uploadAvatar(file);
      const validatedAvatar = userAvatarSchema.validate(uploadedAvatar);

      if (!validatedAvatar.valid || validatedAvatar.errors?.length) {
        throw new Error(
          translate(profileTranslationKeys.settings.avatarPayloadInvalid),
        );
      }

      dispatch({
        type: "updateField",
        payload: {
          field: "avatar",
          value: validatedAvatar.value as unknown as UserAvatarEntity,
        },
      });
    } catch (err) {
      setAvatarError(
        err instanceof Error && err.message
          ? err.message
          : defaultAvatarUploadFailureMessage,
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = userEntitySchema.validate(user);
    if (!validation.valid || validation.errors?.length) {
      const nextErrors = mapValidationErrors(validation.errors, translate);
      setFieldErrors(nextErrors.fieldErrors);
      setFormErrors(nextErrors.formErrors);
      return;
    }

    setFieldErrors({});
    setFormErrors([]);
    console.info("Saved:", user);
  };

  return (
    <div className={styles.settingsContainer}>
      <form onSubmit={handleSubmit} className={styles.settingsForm}>
        <h2>{translate(profileTranslationKeys.settings.heading)}</h2>
        {hasValidationSummary ? (
          <div className={styles.errorSummary} role="alert" aria-live="polite">
            <p className={styles.errorSummaryTitle}>
              {translate(profileTranslationKeys.settings.validationSummary)}
            </p>
            {formErrors.length > 0 ? (
              <ul className={styles.errorList}>
                {formErrors.map((error) => (
                <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {!hideAvatarField ? (
          <>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                {translate(profileTranslationKeys.settings.uploadAvatar)}
                <input
                  type="file"
                  name="avatar"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className={styles.input}
                  {...avatarFieldAccessibility.inputProps}
                />
              </label>
            </div>
            {avatarError ? (
              <p className={styles.fieldError} {...avatarFieldAccessibility.errorProps}>
                {avatarError}
              </p>
            ) : null}

            {user?.avatar?.url && (
              <div>
                <img
                  src={(user?.avatar as UserAvatarEntity)?.url as string}
                  alt={translate(profileTranslationKeys.settings.avatarPreview)}
                  className={styles.avatarPreview}
                />
              </div>
            )}
          </>
        ) : null}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {translate(FIELD_LABEL_TRANSLATION_KEYS["name.firstName"])}
            <input
              name="name.firstName"
              value={user?.name?.firstName ?? ""}
              onChange={handleChange}
              className={styles.input}
              {...firstNameFieldAccessibility.inputProps}
            />
          </label>
          {fieldErrors["name.firstName"] ? (
            <span className={styles.fieldError} {...firstNameFieldAccessibility.errorProps}>
              {fieldErrors["name.firstName"]}
            </span>
          ) : null}
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {translate(FIELD_LABEL_TRANSLATION_KEYS["name.middleName"])}
            <input
              name="name.middleName"
              value={user?.name?.middleName ?? ""}
              onChange={handleChange}
              className={styles.input}
              {...getFieldAccessibility("name.middleName", {
                error: fieldErrors["name.middleName"],
              }).inputProps}
            />
          </label>
          {fieldErrors["name.middleName"] ? (
            <span
              className={styles.fieldError}
              {...getFieldAccessibility("name.middleName", {
                error: fieldErrors["name.middleName"],
              }).errorProps}
            >
              {fieldErrors["name.middleName"]}
            </span>
          ) : null}
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {translate(FIELD_LABEL_TRANSLATION_KEYS["name.lastName"])}
            <input
              name="name.lastName"
              value={user?.name?.lastName ?? ""}
              onChange={handleChange}
              className={styles.input}
              {...getFieldAccessibility("name.lastName", {
                error: fieldErrors["name.lastName"],
              }).inputProps}
            />
          </label>
          {fieldErrors["name.lastName"] ? (
            <span
              className={styles.fieldError}
              {...getFieldAccessibility("name.lastName", {
                error: fieldErrors["name.lastName"],
              }).errorProps}
            >
              {fieldErrors["name.lastName"]}
            </span>
          ) : null}
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {translate(FIELD_LABEL_TRANSLATION_KEYS["name.displayName"])}
            <input
              name="name.displayName"
              value={user?.name?.displayName ?? ""}
              onChange={handleChange}
              className={styles.input}
              {...getFieldAccessibility("name.displayName", {
                error: fieldErrors["name.displayName"],
              }).inputProps}
            />
          </label>
          {fieldErrors["name.displayName"] ? (
            <span
              className={styles.fieldError}
              {...getFieldAccessibility("name.displayName", {
                error: fieldErrors["name.displayName"],
              }).errorProps}
            >
              {fieldErrors["name.displayName"]}
            </span>
          ) : null}
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {translate(FIELD_LABEL_TRANSLATION_KEYS["name.preferredDisplayOrder"])}
            <select
              name="name.preferredDisplayOrder"
              value={user?.name?.preferredDisplayOrder ?? ""}
              onChange={handleChange}
              className={styles.select}
              {...getFieldAccessibility("name.preferredDisplayOrder", {
                error: fieldErrors["name.preferredDisplayOrder"],
              }).inputProps}
            >
              <option value="">
                {translate(profileTranslationKeys.settings.selectPreference)}
              </option>
              {getPreferredDisplayOrder(translate).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {fieldErrors["name.preferredDisplayOrder"] ? (
            <span
              className={styles.fieldError}
              {...getFieldAccessibility("name.preferredDisplayOrder", {
                error: fieldErrors["name.preferredDisplayOrder"],
              }).errorProps}
            >
              {fieldErrors["name.preferredDisplayOrder"]}
            </span>
          ) : null}
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {translate(FIELD_LABEL_TRANSLATION_KEYS.email)}
            <input
              name="email"
              value={user?.email ?? ""}
              onChange={handleChange}
              className={styles.input}
              {...getFieldAccessibility("email", {
                error: fieldErrors.email,
              }).inputProps}
            />
          </label>
          {fieldErrors.email ? (
            <span
              className={styles.fieldError}
              {...getFieldAccessibility("email", {
                error: fieldErrors.email,
              }).errorProps}
            >
              {fieldErrors.email}
            </span>
          ) : null}
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {translate(FIELD_LABEL_TRANSLATION_KEYS.emailPreferences)}
            <select
              name="emailPreferences"
              value={selectedEmailPreference}
              onChange={handleChange}
              className={styles.select}
              {...getFieldAccessibility("emailPreferences", {
                error: fieldErrors.emailPreferences,
              }).inputProps}
            >
              <option value="">
                {translate(profileTranslationKeys.settings.selectPreference)}
              </option>
              {getEmailPreferenceOptions(translate).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {fieldErrors.emailPreferences ? (
            <span
              className={styles.fieldError}
              {...getFieldAccessibility("emailPreferences", {
                error: fieldErrors.emailPreferences,
              }).errorProps}
            >
              {fieldErrors.emailPreferences}
            </span>
          ) : null}
        </div>
        <button type="submit" className={styles.submitButton}>
          {translate(profileTranslationKeys.settings.saveSettings)}
        </button>
      </form>
    </div>
  );
}

export default SettingsPage;
