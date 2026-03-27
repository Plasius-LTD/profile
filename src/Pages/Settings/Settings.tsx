import React from "react";
import type { UserAvatarEntity } from "@plasius/entity-manager";
import {
  userAvatarSchema,
  UserEmailPreferences,
  PreferredDisplayOrder,
} from "@plasius/entity-manager";
import { useAuthorizedFetch } from "@plasius/auth";
import { useI18n } from "@plasius/translations";
import { UserStore, useUserProfileSave } from "../../UserProvider.js";
import {
  normalizeUnknownSaveError,
  type UserProfileFieldErrors,
} from "../../profile-save.js";

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

const DEFAULT_AVATAR_UPLOAD_FAILURE_MESSAGE =
  "Avatar upload failed. Try a different image and retry.";
const INVALID_AVATAR_PAYLOAD_MESSAGE =
  "Avatar upload completed but the returned avatar payload was invalid.";
const VALIDATION_SUMMARY_MESSAGE = "Fix the highlighted fields before saving.";

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

const getEmailPreferenceOptions = () =>
  Object.entries(UserEmailPreferences).map(([key, value]) => ({
    label: key.replace(/([a-z])([A-Z])/g, "$1 $2"), // Optional: format nicely
    value,
  }));

const getPreferredDisplayOrder = () =>
  Object.entries(PreferredDisplayOrder).map(([key, value]) => ({
    label: key.replace(/([a-z])([A-Z])/g, "$1 $2"), // Optional: format nicely
    value,
  }));

export function SettingsPage({ hideAvatarField = false }: SettingsPageProps) {
  const authorizedFetch = useAuthorizedFetch();
  const { t } = useI18n();
  const { user } = UserStore.useStore();
  const dispatch = UserStore.useDispatch();
  const { status, isSlow, lastSavedAt, resetStatus, submit } = useUserProfileSave();
  const errorIdPrefix = React.useId();
  const [avatarError, setAvatarError] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<UserProfileFieldErrors>({});
  const [formErrors, setFormErrors] = React.useState<string[]>([]);
  const selectedEmailPreference = Array.isArray(user?.emailPreferences)
    ? (user.emailPreferences[0] ?? "")
    : "";
  const visibleFormErrors = Object.keys(fieldErrors).length > 0
    ? formErrors.filter((error) => error !== VALIDATION_SUMMARY_MESSAGE)
    : formErrors;
  const hasValidationSummary =
    Object.keys(fieldErrors).length > 0 || visibleFormErrors.length > 0;
  const isPending = status === "pending";
  const isSuccessful = status === "success";
  const pendingMessage = isSlow
    ? "Saving is taking longer than usual. Keep this page open until the profile save completes."
    : "Saving profile changes...";
  const successMessage = lastSavedAt
    ? `Profile changes saved at ${new Date(lastSavedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}.`
    : "Profile changes saved.";

  const getFieldErrorId = (field: SettingsFieldName) =>
    `${errorIdPrefix}-${field.replace(/\./g, "-")}-error`;

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
    resetStatus();

    if (name !== "avatar" && (name === "email" || name === "emailPreferences" || name.startsWith("name."))) {
      clearFieldError(name as Exclude<SettingsFieldName, "avatar">);
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
        (await readUploadErrorMessage(response)) ?? DEFAULT_AVATAR_UPLOAD_FAILURE_MESSAGE,
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
    resetStatus();

    try {
      const uploadedAvatar = await uploadAvatar(file);
      const validatedAvatar = userAvatarSchema.validate(uploadedAvatar);

      if (!validatedAvatar.valid || validatedAvatar.errors?.length) {
        throw new Error(INVALID_AVATAR_PAYLOAD_MESSAGE);
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
          : DEFAULT_AVATAR_UPLOAD_FAILURE_MESSAGE,
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setFormErrors([]);

    try {
      await submit();
    } catch (error) {
      const saveError = normalizeUnknownSaveError(error);
      setFieldErrors(saveError.fieldErrors);
      setFormErrors(
        saveError.formErrors.length > 0
          ? saveError.formErrors
          : [saveError.message || "Profile save failed."],
      );
    }
  };

  return (
    <div className={styles.settingsContainer}>
      <form onSubmit={handleSubmit} className={styles.settingsForm}>
        <h2>{t("profile_settings")}</h2>
        {isPending || isSuccessful ? (
          <div className={styles.statusNotice} role="status" aria-live="polite">
            {isPending ? pendingMessage : successMessage}
          </div>
        ) : null}
        {hasValidationSummary ? (
          <div className={styles.errorSummary} role="alert" aria-live="polite">
            <p className={styles.errorSummaryTitle}>
              {VALIDATION_SUMMARY_MESSAGE}
            </p>
            {visibleFormErrors.length > 0 ? (
              <ul className={styles.errorList}>
                {visibleFormErrors.map((error) => (
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
                {t("upload_avatar")}
                <input
                  type="file"
                  name="avatar"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className={styles.input}
                  aria-invalid={avatarError ? "true" : undefined}
                  aria-describedby={avatarError ? getFieldErrorId("avatar") : undefined}
                />
              </label>
            </div>
            {avatarError ? (
              <p id={getFieldErrorId("avatar")} className={styles.fieldError} role="alert">
                {avatarError}
              </p>
            ) : null}

            {user?.avatar?.url && (
              <div>
                <img
                  src={(user?.avatar as UserAvatarEntity)?.url as string}
                  alt={t("avatar_preview")}
                  className={styles.avatarPreview}
                />
              </div>
            )}
          </>
        ) : null}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {t("first_name")}
            <input
              name="name.firstName"
              value={user?.name?.firstName ?? ""}
              onChange={handleChange}
              className={styles.input}
              aria-invalid={fieldErrors["name.firstName"] ? "true" : undefined}
              aria-describedby={
                fieldErrors["name.firstName"]
                  ? getFieldErrorId("name.firstName")
                  : undefined
              }
            />
          </label>
          {fieldErrors["name.firstName"] ? (
            <span
              id={getFieldErrorId("name.firstName")}
              className={styles.fieldError}
              role="alert"
            >
              {fieldErrors["name.firstName"]}
            </span>
          ) : null}
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {t("middle_name")}
            <input
              name="name.middleName"
              value={user?.name?.middleName ?? ""}
              onChange={handleChange}
              className={styles.input}
              aria-invalid={fieldErrors["name.middleName"] ? "true" : undefined}
              aria-describedby={
                fieldErrors["name.middleName"]
                  ? getFieldErrorId("name.middleName")
                  : undefined
              }
            />
          </label>
          {fieldErrors["name.middleName"] ? (
            <span
              id={getFieldErrorId("name.middleName")}
              className={styles.fieldError}
              role="alert"
            >
              {fieldErrors["name.middleName"]}
            </span>
          ) : null}
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {t("last_name")}
            <input
              name="name.lastName"
              value={user?.name?.lastName ?? ""}
              onChange={handleChange}
              className={styles.input}
              aria-invalid={fieldErrors["name.lastName"] ? "true" : undefined}
              aria-describedby={
                fieldErrors["name.lastName"]
                  ? getFieldErrorId("name.lastName")
                  : undefined
              }
            />
          </label>
          {fieldErrors["name.lastName"] ? (
            <span
              id={getFieldErrorId("name.lastName")}
              className={styles.fieldError}
              role="alert"
            >
              {fieldErrors["name.lastName"]}
            </span>
          ) : null}
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {t("display_name")}
            <input
              name="name.displayName"
              value={user?.name?.displayName ?? ""}
              onChange={handleChange}
              className={styles.input}
              aria-invalid={fieldErrors["name.displayName"] ? "true" : undefined}
              aria-describedby={
                fieldErrors["name.displayName"]
                  ? getFieldErrorId("name.displayName")
                  : undefined
              }
            />
          </label>
          {fieldErrors["name.displayName"] ? (
            <span
              id={getFieldErrorId("name.displayName")}
              className={styles.fieldError}
              role="alert"
            >
              {fieldErrors["name.displayName"]}
            </span>
          ) : null}
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {t("preferred_name_display")}
            <select
              name="name.preferredDisplayOrder"
              value={user?.name?.preferredDisplayOrder ?? ""}
              onChange={handleChange}
              className={styles.select}
              aria-invalid={fieldErrors["name.preferredDisplayOrder"] ? "true" : undefined}
              aria-describedby={
                fieldErrors["name.preferredDisplayOrder"]
                  ? getFieldErrorId("name.preferredDisplayOrder")
                  : undefined
              }
            >
              <option value="">{t("select_preference")}</option>
              {getPreferredDisplayOrder().map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {fieldErrors["name.preferredDisplayOrder"] ? (
            <span
              id={getFieldErrorId("name.preferredDisplayOrder")}
              className={styles.fieldError}
              role="alert"
            >
              {fieldErrors["name.preferredDisplayOrder"]}
            </span>
          ) : null}
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {t("email")}
            <input
              name="email"
              value={user?.email ?? ""}
              onChange={handleChange}
              className={styles.input}
              aria-invalid={fieldErrors.email ? "true" : undefined}
              aria-describedby={fieldErrors.email ? getFieldErrorId("email") : undefined}
            />
          </label>
          {fieldErrors.email ? (
            <span id={getFieldErrorId("email")} className={styles.fieldError} role="alert">
              {fieldErrors.email}
            </span>
          ) : null}
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            {t("email_preferences")}
            <select
              name="emailPreferences"
              value={selectedEmailPreference}
              onChange={handleChange}
              className={styles.select}
              aria-invalid={fieldErrors.emailPreferences ? "true" : undefined}
              aria-describedby={
                fieldErrors.emailPreferences
                  ? getFieldErrorId("emailPreferences")
                  : undefined
              }
            >
              <option value="">{t("select_preference")}</option>
              {getEmailPreferenceOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {fieldErrors.emailPreferences ? (
            <span
              id={getFieldErrorId("emailPreferences")}
              className={styles.fieldError}
              role="alert"
            >
              {fieldErrors.emailPreferences}
            </span>
          ) : null}
        </div>
        <button type="submit" className={styles.submitButton} disabled={isPending}>
          {isPending ? "Saving profile..." : t("save_settings")}
        </button>
      </form>
    </div>
  );
}

export default SettingsPage;
