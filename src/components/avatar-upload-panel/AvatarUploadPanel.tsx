import { useEffect, useId, useState, type CSSProperties, type ChangeEvent } from "react";
import type { UserAvatarEntity } from "@plasius/entity-manager";
import { useI18n } from "@plasius/translations";
import { UserStore } from "../../UserProvider.js";
import { createAccessibleFieldBindings } from "../../accessibility.js";
import {
  createProfileTranslationResolver,
  profileTranslationKeys,
  type ProfileTranslationResolver,
} from "../../i18n.js";
import { avatarUploadAccessibilityTheme } from "./accessibilityTheme.js";
import styles from "./AvatarUploadPanel.module.css";

export interface AvatarUploadProgressReporter {
  setMessage: (message: string) => void;
}

export type AvatarUploadValidationResult = string | null;
export type AvatarUploadValidator = (file: File) => Promise<AvatarUploadValidationResult>;
export type AvatarUploadExecutor = (
  file: File,
  reporter: AvatarUploadProgressReporter,
) => Promise<UserAvatarEntity>;

export interface AvatarUploadPanelProps {
  accept: string;
  constraintsDescription: string;
  uploadAvatar: AvatarUploadExecutor;
  validateAvatarFile?: AvatarUploadValidator;
  title?: string;
  inputLabel?: string;
  selectedPreviewLabel?: string;
  currentPreviewLabel?: string;
  emptyStateText?: string;
  currentAvatarDescription?: string;
  selectedAvatarDescription?: (fileName: string) => string;
  successMessage?: (fileName: string) => string;
  genericFailureMessage?: string;
}

function getDefaultSelectedAvatarDescription(
  fileName: string,
  translate: ProfileTranslationResolver,
): string {
  return translate(profileTranslationKeys.avatarUpload.selectedAvatarDescription, {
    fileName:
      fileName || translate(profileTranslationKeys.avatarUpload.selectedImageFallback),
  });
}

function getDefaultSuccessMessage(
  fileName: string,
  translate: ProfileTranslationResolver,
): string {
  return translate(profileTranslationKeys.avatarUpload.success, { fileName });
}

const DEFAULT_AVATAR_UPLOAD_THEME_VARS = {
  "--avatar-panel-bg": avatarUploadAccessibilityTheme.panelBackground,
  "--avatar-panel-border": avatarUploadAccessibilityTheme.panelBorder,
  "--avatar-panel-text-primary": avatarUploadAccessibilityTheme.primaryText,
  "--avatar-panel-text-secondary": avatarUploadAccessibilityTheme.secondaryText,
  "--avatar-panel-text-accent": avatarUploadAccessibilityTheme.accentText,
  "--avatar-panel-text-status": avatarUploadAccessibilityTheme.statusText,
  "--avatar-panel-text-error": avatarUploadAccessibilityTheme.errorText,
} as CSSProperties;

export function AvatarUploadPanel({
  accept,
  constraintsDescription,
  uploadAvatar,
  validateAvatarFile,
  title,
  inputLabel,
  selectedPreviewLabel,
  currentPreviewLabel,
  emptyStateText,
  currentAvatarDescription,
  selectedAvatarDescription,
  successMessage,
  genericFailureMessage,
}: AvatarUploadPanelProps) {
  const { t } = useI18n();
  const translate = createProfileTranslationResolver(t);
  const { user } = UserStore.useStore();
  const dispatch = UserStore.useDispatch();
  const titleId = useId();
  const previewDescriptionId = useId();
  const [uploadError, setUploadError] = useState<string>("");
  const [uploadMessage, setUploadMessage] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [localPreviewName, setLocalPreviewName] = useState<string>("");

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const replaceLocalPreviewUrl = (nextUrl: string | null) => {
    setLocalPreviewUrl((previousUrl) => {
      if (previousUrl && previousUrl !== nextUrl) {
        URL.revokeObjectURL(previousUrl);
      }

      return nextUrl;
    });
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    setUploadError("");
    setUploadMessage("");
    replaceLocalPreviewUrl(null);
    setLocalPreviewName(file.name);

    if (validateAvatarFile) {
      const validationError = await validateAvatarFile(file);
      if (validationError) {
        setUploadError(validationError);
        return;
      }
    }

    replaceLocalPreviewUrl(
      typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : null,
    );
    setIsUploading(true);
    setUploadMessage(
      translate(profileTranslationKeys.avatarUpload.uploading, {
        fileName: file.name,
      }),
    );

    try {
      const avatar = await uploadAvatar(file, {
        setMessage: setUploadMessage,
      });

      dispatch({
        type: "updateField",
        payload: {
          field: "avatar",
          value: avatar,
        },
      });

      replaceLocalPreviewUrl(null);
      setUploadMessage(
        successMessage?.(file.name) ?? getDefaultSuccessMessage(file.name, translate),
      );
    } catch (error) {
      setUploadMessage("");
      setUploadError(
        error instanceof Error && error.message
          ? error.message
          : genericFailureMessage
            ?? translate(profileTranslationKeys.avatarUpload.genericFailure),
      );
    } finally {
      setIsUploading(false);
    }
  };

  const currentAvatarUrl =
    user?.avatar && typeof user.avatar.url === "string" ? user.avatar.url : "";
  const previewUrl = localPreviewUrl ?? currentAvatarUrl;
  const fieldAccessibility = createAccessibleFieldBindings({
    idPrefix: titleId,
    name: "avatar-upload",
    description: constraintsDescription,
    error: uploadError,
    liveMessage: uploadMessage,
    invalid: Boolean(uploadError),
  });
  const inputDescribedBy = [
    fieldAccessibility.inputProps["aria-describedby"],
    previewDescriptionId,
  ]
    .filter(Boolean)
    .join(" ");
  const titleText = title ?? translate(profileTranslationKeys.avatarUpload.title);
  const inputLabelText =
    inputLabel ?? translate(profileTranslationKeys.avatarUpload.inputLabel);
  const selectedPreviewLabelText =
    selectedPreviewLabel
    ?? translate(profileTranslationKeys.avatarUpload.selectedPreviewLabel);
  const currentPreviewLabelText =
    currentPreviewLabel
    ?? translate(profileTranslationKeys.avatarUpload.currentPreviewLabel);
  const emptyStateTextValue =
    emptyStateText ?? translate(profileTranslationKeys.avatarUpload.emptyState);
  const currentAvatarDescriptionText =
    currentAvatarDescription
    ?? translate(profileTranslationKeys.avatarUpload.currentAvatarDescription);
  const selectedAvatarDescriptionText = selectedAvatarDescription
    ? selectedAvatarDescription(localPreviewName)
    : getDefaultSelectedAvatarDescription(localPreviewName, translate);
  const currentAvatarUrlLabel = translate(
    profileTranslationKeys.avatarUpload.currentAvatarUrlLabel,
  );

  return (
    <section
      className={styles.avatarPanel}
      aria-labelledby={titleId}
      aria-busy={isUploading || undefined}
      style={DEFAULT_AVATAR_UPLOAD_THEME_VARS}
    >
      <div className={styles.avatarPanelHeader}>
        <h3 id={titleId} className={styles.avatarPanelTitle}>
          {titleText}
        </h3>
        <p className={styles.avatarPanelSummary} {...fieldAccessibility.descriptionProps}>
          {constraintsDescription}
        </p>
      </div>

      <label className={styles.avatarUploadLabel}>
        <span className={styles.avatarUploadLabelText}>{inputLabelText}</span>
        <input
          type="file"
          accept={accept}
          className={styles.avatarUploadInput}
          disabled={isUploading}
          {...fieldAccessibility.inputProps}
          aria-describedby={inputDescribedBy || undefined}
          onChange={handleAvatarUpload}
        />
      </label>

      {previewUrl ? (
        <div className={styles.avatarPreviewPanel}>
          <img
            src={previewUrl}
            alt={localPreviewUrl ? selectedPreviewLabelText : currentPreviewLabelText}
            className={styles.avatarPreviewImage}
          />
          <div className={styles.avatarPreviewMeta}>
            <p className={styles.avatarPreviewLabel}>
              {localPreviewUrl ? selectedPreviewLabelText : currentPreviewLabelText}
            </p>
            <p id={previewDescriptionId} className={styles.avatarMeta}>
              {localPreviewUrl
                ? selectedAvatarDescriptionText
                : currentAvatarDescriptionText}
            </p>
            {currentAvatarUrl ? (
              <p className={styles.avatarMeta}>
                {currentAvatarUrlLabel} <a href={currentAvatarUrl}>{currentAvatarUrl}</a>
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <p id={previewDescriptionId} className={styles.avatarMeta}>
          {emptyStateTextValue}
        </p>
      )}

      {uploadMessage ? (
        <p className={styles.avatarStatus} {...fieldAccessibility.liveMessageProps}>
          {uploadMessage}
        </p>
      ) : null}

      {uploadError ? (
        <p className={styles.avatarError} {...fieldAccessibility.errorProps}>
          {uploadError}
        </p>
      ) : null}
    </section>
  );
}

export default AvatarUploadPanel;
