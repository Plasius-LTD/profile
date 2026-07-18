import React from "react";
import type { UserAvatarEntity, UserEntity } from "@plasius/entity-manager";
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
  /**
   * Retains the legacy all-or-nothing avatar visibility switch.
   *
   * Prefer `fieldPolicies.avatar` for new integrations.
   */
  hideAvatarField?: boolean;
  /** Optional form id so a host-owned review action can submit this form. */
  formId?: string;
  /** Per-field presentation and editing policy. Omitted fields remain editable. */
  fieldPolicies?: SettingsFieldPolicies;
  /** Per-action presentation and availability policy. */
  actionPolicies?: SettingsActionPolicies;
  /**
   * Receives a schema-valid profile snapshot after explicit form submission.
   *
   * When omitted, the legacy self-service submit behavior is retained.
   */
  onSubmit?: SettingsPageSubmitHandler;
  /** Host-controlled pending state, composed with pending async `onSubmit` work. */
  isSubmitting?: boolean;
  /** Display-safe host error text for a failed manual submission. */
  submitError?: string | null;
}

/** Profile fields whose presentation can be governed by a host policy. */
export type SettingsFieldName =
  | "avatar"
  | "name.firstName"
  | "name.middleName"
  | "name.lastName"
  | "name.displayName"
  | "name.preferredDisplayOrder"
  | "email"
  | "emailPreferences";

/** Presentation modes for a settings field. */
export type SettingsFieldPolicy = "editable" | "read-only" | "hidden";

/** Partial field policy; omitted fields preserve the editable self-service default. */
export type SettingsFieldPolicies = Partial<
  Record<SettingsFieldName, SettingsFieldPolicy>
>;

/** Settings actions that a host may expose, disable, or hide. */
export type SettingsActionName = "submit" | "avatarUpload" | "avatarRemove";

/** Presentation modes for a settings action. */
export type SettingsActionPolicy = "enabled" | "disabled" | "hidden";

/** Partial action policy; omitted actions preserve their legacy defaults. */
export type SettingsActionPolicies = Partial<
  Record<SettingsActionName, SettingsActionPolicy>
>;

/** Manual submit callback invoked only with a schema-valid user snapshot. */
export type SettingsPageSubmitHandler = (
  user: UserEntity,
) => void | Promise<void>;

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

const DEFAULT_ACTION_POLICIES: Record<
  SettingsActionName,
  SettingsActionPolicy
> = {
  submit: "enabled",
  avatarUpload: "enabled",
  avatarRemove: "hidden",
};

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

type SettingsFieldAccessibility = ReturnType<
  typeof createAccessibleFieldBindings
>;

interface SettingsTextFieldProps {
  accessibility: SettingsFieldAccessibility;
  disabled: boolean;
  error?: string;
  label: string;
  name: Exclude<
    SettingsFieldName,
    "avatar" | "name.preferredDisplayOrder" | "emailPreferences"
  >;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  readOnly: boolean;
  value: string;
}

function SettingsTextField({
  accessibility,
  disabled,
  error,
  label,
  name,
  onChange,
  readOnly,
  value,
}: SettingsTextFieldProps) {
  return (
    <div className={styles.fieldGroup}>
      <label className={styles.label}>
        {label}
        <input
          name={name}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          disabled={disabled}
          className={styles.input}
          {...accessibility.inputProps}
        />
      </label>
      {error ? (
        <span className={styles.fieldError} {...accessibility.errorProps}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

interface SettingsSelectFieldProps {
  accessibility: SettingsFieldAccessibility;
  disabled: boolean;
  error?: string;
  label: string;
  name: "name.preferredDisplayOrder" | "emailPreferences";
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
  value: string;
}

function SettingsSelectField({
  accessibility,
  disabled,
  error,
  label,
  name,
  onChange,
  options,
  placeholder,
  value,
}: SettingsSelectFieldProps) {
  return (
    <div className={styles.fieldGroup}>
      <label className={styles.label}>
        {label}
        <select
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={styles.select}
          {...accessibility.inputProps}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <span className={styles.fieldError} {...accessibility.errorProps}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function SettingsPage({
  hideAvatarField = false,
  formId,
  fieldPolicies,
  actionPolicies,
  onSubmit,
  isSubmitting = false,
  submitError = null,
}: SettingsPageProps) {
  const authorizedFetch = useAuthorizedFetch();
  const { t } = useI18n();
  const translate = React.useMemo(() => createProfileTranslationResolver(t), [t]);
  const { user } = UserStore.useStore();
  const dispatch = UserStore.useDispatch();
  const errorIdPrefix = React.useId();
  const headingId = `${errorIdPrefix}-heading`;
  const submitInFlightRef = React.useRef(false);
  const [avatarError, setAvatarError] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<SettingsFieldErrors>({});
  const [formErrors, setFormErrors] = React.useState<string[]>([]);
  const [isInternallySubmitting, setIsInternallySubmitting] = React.useState(false);
  const [internalSubmitError, setInternalSubmitError] = React.useState("");
  const effectiveSubmitting = isSubmitting || isInternallySubmitting;
  const displayedSubmitError = submitError?.trim() || internalSubmitError;
  const getFieldPolicy = (field: SettingsFieldName): SettingsFieldPolicy =>
    field === "avatar" && hideAvatarField
      ? "hidden"
      : (fieldPolicies?.[field] ?? "editable");
  const getActionPolicy = (action: SettingsActionName): SettingsActionPolicy =>
    actionPolicies?.[action] ?? DEFAULT_ACTION_POLICIES[action];
  const isFieldVisible = (field: SettingsFieldName) =>
    getFieldPolicy(field) !== "hidden";
  const isFieldEditable = (field: SettingsFieldName) =>
    getFieldPolicy(field) === "editable";
  const avatarFieldPolicy = getFieldPolicy("avatar");
  const avatarUploadPolicy = getActionPolicy("avatarUpload");
  const avatarRemovePolicy = getActionPolicy("avatarRemove");
  const submitPolicy = getActionPolicy("submit");
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

    if (
      !isSettingsFieldName(name)
      || name === "avatar"
      || !isFieldEditable(name)
      || effectiveSubmitting
    ) {
      return;
    }

    setFormErrors([]);
    setInternalSubmitError("");

    clearFieldError(name);

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

    if (
      !file
      || avatarFieldPolicy !== "editable"
      || avatarUploadPolicy !== "enabled"
      || effectiveSubmitting
    ) {
      return;
    }

    setAvatarError("");
    setFormErrors([]);
    setInternalSubmitError("");

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

  const handleAvatarRemove = () => {
    if (
      avatarFieldPolicy === "hidden"
      || avatarRemovePolicy !== "enabled"
      || effectiveSubmitting
      || !user?.avatar
    ) {
      return;
    }

    setAvatarError("");
    setFormErrors([]);
    setInternalSubmitError("");
    dispatch({
      type: "updateField",
      payload: {
        field: "avatar",
        value: undefined,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      submitPolicy === "disabled"
      || effectiveSubmitting
      || submitInFlightRef.current
    ) {
      return;
    }

    const validation = userEntitySchema.validate(user);
    if (!validation.valid || validation.errors?.length) {
      const nextErrors = mapValidationErrors(validation.errors, translate);
      setFieldErrors(nextErrors.fieldErrors);
      setFormErrors(nextErrors.formErrors);
      return;
    }

    setFieldErrors({});
    setFormErrors([]);
    setInternalSubmitError("");

    if (!onSubmit) {
      return;
    }

    submitInFlightRef.current = true;
    setIsInternallySubmitting(true);

    try {
      await onSubmit(user as UserEntity);
    } catch {
      setInternalSubmitError(
        translate(profileTranslationKeys.settings.submitFailed),
      );
    } finally {
      submitInFlightRef.current = false;
      setIsInternallySubmitting(false);
    }
  };

  return (
    <div className={styles.settingsContainer}>
      <form
        id={formId}
        onSubmit={handleSubmit}
        className={styles.settingsForm}
        aria-labelledby={headingId}
        aria-busy={effectiveSubmitting}
      >
        <h2 id={headingId}>
          {translate(profileTranslationKeys.settings.heading)}
        </h2>
        {displayedSubmitError ? (
          <div className={styles.submitError} role="alert" aria-live="assertive">
            {displayedSubmitError}
          </div>
        ) : null}
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
        {avatarFieldPolicy !== "hidden" ? (
          <>
            {avatarFieldPolicy === "editable" && avatarUploadPolicy !== "hidden" ? (
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  {translate(profileTranslationKeys.settings.uploadAvatar)}
                  <input
                    type="file"
                    name="avatar"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={
                      effectiveSubmitting || avatarUploadPolicy === "disabled"
                    }
                    className={styles.input}
                    {...avatarFieldAccessibility.inputProps}
                  />
                </label>
              </div>
            ) : null}
            {avatarError ? (
              <p className={styles.fieldError} {...avatarFieldAccessibility.errorProps}>
                {avatarError}
              </p>
            ) : null}

            {user?.avatar?.url ? (
              <div className={styles.avatarControls}>
                <img
                  src={(user?.avatar as UserAvatarEntity)?.url as string}
                  alt={translate(profileTranslationKeys.settings.avatarPreview)}
                  className={styles.avatarPreview}
                />
                {avatarRemovePolicy !== "hidden" ? (
                  <button
                    type="button"
                    className={styles.avatarAction}
                    onClick={handleAvatarRemove}
                    disabled={
                      effectiveSubmitting || avatarRemovePolicy === "disabled"
                    }
                  >
                    {translate(profileTranslationKeys.settings.removeAvatar)}
                  </button>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
        {isFieldVisible("name.firstName") ? (
          <SettingsTextField
            accessibility={firstNameFieldAccessibility}
            disabled={effectiveSubmitting}
            error={fieldErrors["name.firstName"]}
            label={translate(
              FIELD_LABEL_TRANSLATION_KEYS["name.firstName"],
            )}
            name="name.firstName"
            onChange={handleChange}
            readOnly={!isFieldEditable("name.firstName")}
            value={user?.name?.firstName ?? ""}
          />
        ) : null}
        {isFieldVisible("name.middleName") ? (
          <SettingsTextField
            accessibility={getFieldAccessibility("name.middleName", {
              error: fieldErrors["name.middleName"],
            })}
            disabled={effectiveSubmitting}
            error={fieldErrors["name.middleName"]}
            label={translate(
              FIELD_LABEL_TRANSLATION_KEYS["name.middleName"],
            )}
            name="name.middleName"
            onChange={handleChange}
            readOnly={!isFieldEditable("name.middleName")}
            value={user?.name?.middleName ?? ""}
          />
        ) : null}
        {isFieldVisible("name.lastName") ? (
          <SettingsTextField
            accessibility={getFieldAccessibility("name.lastName", {
              error: fieldErrors["name.lastName"],
            })}
            disabled={effectiveSubmitting}
            error={fieldErrors["name.lastName"]}
            label={translate(
              FIELD_LABEL_TRANSLATION_KEYS["name.lastName"],
            )}
            name="name.lastName"
            onChange={handleChange}
            readOnly={!isFieldEditable("name.lastName")}
            value={user?.name?.lastName ?? ""}
          />
        ) : null}
        {isFieldVisible("name.displayName") ? (
          <SettingsTextField
            accessibility={getFieldAccessibility("name.displayName", {
              error: fieldErrors["name.displayName"],
            })}
            disabled={effectiveSubmitting}
            error={fieldErrors["name.displayName"]}
            label={translate(
              FIELD_LABEL_TRANSLATION_KEYS["name.displayName"],
            )}
            name="name.displayName"
            onChange={handleChange}
            readOnly={!isFieldEditable("name.displayName")}
            value={user?.name?.displayName ?? ""}
          />
        ) : null}
        {isFieldVisible("name.preferredDisplayOrder") ? (
          <SettingsSelectField
            accessibility={getFieldAccessibility(
              "name.preferredDisplayOrder",
              {
                error: fieldErrors["name.preferredDisplayOrder"],
              },
            )}
            disabled={
              effectiveSubmitting
              || !isFieldEditable("name.preferredDisplayOrder")
            }
            error={fieldErrors["name.preferredDisplayOrder"]}
            label={translate(
              FIELD_LABEL_TRANSLATION_KEYS["name.preferredDisplayOrder"],
            )}
            name="name.preferredDisplayOrder"
            onChange={handleChange}
            options={getPreferredDisplayOrder(translate)}
            placeholder={translate(
              profileTranslationKeys.settings.selectPreference,
            )}
            value={user?.name?.preferredDisplayOrder ?? ""}
          />
        ) : null}
        {isFieldVisible("email") ? (
          <SettingsTextField
            accessibility={getFieldAccessibility("email", {
              error: fieldErrors.email,
            })}
            disabled={effectiveSubmitting}
            error={fieldErrors.email}
            label={translate(FIELD_LABEL_TRANSLATION_KEYS.email)}
            name="email"
            onChange={handleChange}
            readOnly={!isFieldEditable("email")}
            value={user?.email ?? ""}
          />
        ) : null}
        {isFieldVisible("emailPreferences") ? (
          <SettingsSelectField
            accessibility={getFieldAccessibility("emailPreferences", {
              error: fieldErrors.emailPreferences,
            })}
            disabled={
              effectiveSubmitting || !isFieldEditable("emailPreferences")
            }
            error={fieldErrors.emailPreferences}
            label={translate(FIELD_LABEL_TRANSLATION_KEYS.emailPreferences)}
            name="emailPreferences"
            onChange={handleChange}
            options={getEmailPreferenceOptions(translate)}
            placeholder={translate(
              profileTranslationKeys.settings.selectPreference,
            )}
            value={selectedEmailPreference}
          />
        ) : null}
        {submitPolicy !== "hidden" ? (
          <button
            type="submit"
            className={styles.submitButton}
            disabled={effectiveSubmitting || submitPolicy === "disabled"}
          >
            {translate(
              effectiveSubmitting
                ? profileTranslationKeys.settings.savingSettings
                : profileTranslationKeys.settings.saveSettings,
            )}
          </button>
        ) : null}
      </form>
    </div>
  );
}

export default SettingsPage;
