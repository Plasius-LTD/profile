import React, { useEffect } from "react";
import type { UserAvatarEntity, UserName } from "@plasius/entity-manager";
import {
  userEntitySchema,
  userAvatarSchema,
  UserEmailPreferences,
  PreferredDisplayOrder,
} from "@plasius/entity-manager";
import { useAuthorizedFetch } from "@plasius/auth";
import { useI18n } from "@plasius/translations";
import { UserStore } from "../../UserProvider.js";

import styles from "./Settings.module.css";

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

export function SettingsPage() {
  const authorizedFetch = useAuthorizedFetch();
  const { t } = useI18n();
  const { user } = UserStore.useStore();
  const dispatch = UserStore.useDispatch();

  useEffect(() => {
    if (user) {
      const res = userEntitySchema.validate(user);
      if (!res.valid || res.errors?.length != 0) {
        throw new Error(
          `Invalid user ${String(user)}. Errors: ${res.errors?.join("\n") ?? "unknown"}`
        );
      }
    }
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

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
      throw new Error("Failed to upload avatar");
    }

    const data: unknown = await response.json();
    return data; // e.g. { imageUrl: "...uploaded file url..." }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const uploadedAvatar = await uploadAvatar(file);
      const validatedAvatar = userAvatarSchema.validate(uploadedAvatar);

      if (!validatedAvatar.valid || validatedAvatar.errors?.length) {
        throw new Error(
          (validatedAvatar.errors ?? []).map((e) => String(e)).join("; ")
        );
      }

      const base = validatedAvatar.value as unknown as UserAvatarEntity;
      const userAvatar: UserAvatarEntity = {
        ...base,
        originalName: file.name,
      };

      dispatch({
        type: "updateField",
        payload: {
          field: "avatar",
          value: userAvatar,
        },
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = userEntitySchema.validate(user);
    if (errors) {
      console.warn("Validation failed", errors);
      return;
    }

    console.info("Saved:", user);
  };

  return (
    <div className={styles.settingsContainer}>
      <form onSubmit={handleSubmit} className={styles.settingsForm}>
        <h2>{t("profile_settings")}</h2>
        <label className={styles.label}>
          {t("upload_avatar")}
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className={styles.input}
          />
        </label>

        {user?.avatar?.url && (
          <div>
            <img
              src={(user?.avatar as UserAvatarEntity)?.url as string}
              alt={t("avatar_preview")}
              className={styles.avatarPreview}
            />
          </div>
        )}
        <label className={styles.label}>
          {t("first_name")}
          <input
            name="name.firstName"
            value={(user?.name as UserName)?.firstName as string}
            onChange={handleChange}
            className={styles.input}
          />
        </label>
        <label className={styles.label}>
          {t("middle_name")}
          <input
            name="name.middleName"
            value={(user?.name as UserName)?.middleName as string}
            onChange={handleChange}
            className={styles.input}
          />
        </label>
        <label className={styles.label}>
          {t("last_name")}
          <input
            name="name.lastName"
            value={(user?.name as UserName)?.lastName as string}
            onChange={handleChange}
            className={styles.input}
          />
        </label>
        <label className={styles.label}>
          {t("display_name")}
          <input
            name="name.displayName"
            value={(user?.name as UserName)?.displayName as string}
            onChange={handleChange}
            className={styles.input}
          />
        </label>
        <label className={styles.label}>
          {t("preferred_name_display")}
          <select
            name="displayPreferences"
            value={(user?.name as UserName).preferredDisplayOrder as PreferredDisplayOrder}
            onChange={handleChange}
            className={styles.select}
          >
            <option value="">{t("select_preference")}</option>
            {getPreferredDisplayOrder().map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.label}>
          {t("email")}
          <input
            name="email"
            value={user?.email}
            onChange={handleChange}
            className={styles.input}
          />
        </label>
        <label className={styles.label}>
          {t("email_preferences")}
          <select
            name="emailPreferences"
            value={user?.emailPreferences as UserEmailPreferences[]}
            onChange={handleChange}
            className={styles.select}
          >
            <option value="">{t("select_preference")}</option>
            {getEmailPreferenceOptions().map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={styles.submitButton}>
          {t("save_settings")}
        </button>
      </form>
    </div>
  );
}

export default SettingsPage;
