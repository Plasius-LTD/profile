import { useEffect, useId, useState, type CSSProperties, type ChangeEvent } from "react";
import type { UserAvatarEntity } from "@plasius/entity-manager";
import { UserStore } from "../../UserProvider.js";
import { createAccessibleFieldBindings } from "../../accessibility.js";
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

const DEFAULT_TITLE = "Avatar upload";
const DEFAULT_INPUT_LABEL = "Choose an avatar image";
const DEFAULT_SELECTED_PREVIEW_LABEL = "Selected avatar preview";
const DEFAULT_CURRENT_PREVIEW_LABEL = "Current avatar preview";
const DEFAULT_EMPTY_STATE_TEXT = "No avatar is currently attached to your profile.";
const DEFAULT_CURRENT_AVATAR_DESCRIPTION =
  "This is the avatar currently attached to your profile.";
const DEFAULT_GENERIC_FAILURE_MESSAGE =
  "Avatar upload failed. Try a different image and retry.";

function defaultSelectedAvatarDescription(fileName: string): string {
  return `${fileName || "Selected image"} will replace your current avatar once processing completes.`;
}

function defaultSuccessMessage(fileName: string): string {
  return `Avatar uploaded successfully as ${fileName}.`;
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
  title = DEFAULT_TITLE,
  inputLabel = DEFAULT_INPUT_LABEL,
  selectedPreviewLabel = DEFAULT_SELECTED_PREVIEW_LABEL,
  currentPreviewLabel = DEFAULT_CURRENT_PREVIEW_LABEL,
  emptyStateText = DEFAULT_EMPTY_STATE_TEXT,
  currentAvatarDescription = DEFAULT_CURRENT_AVATAR_DESCRIPTION,
  selectedAvatarDescription = defaultSelectedAvatarDescription,
  successMessage = defaultSuccessMessage,
  genericFailureMessage = DEFAULT_GENERIC_FAILURE_MESSAGE,
}: AvatarUploadPanelProps) {
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
    setUploadMessage(`Uploading ${file.name}...`);

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
      setUploadMessage(successMessage(file.name));
    } catch (error) {
      setUploadMessage("");
      setUploadError(
        error instanceof Error && error.message
          ? error.message
          : genericFailureMessage,
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

  return (
    <section
      className={styles.avatarPanel}
      aria-labelledby={titleId}
      aria-busy={isUploading || undefined}
      style={DEFAULT_AVATAR_UPLOAD_THEME_VARS}
    >
      <div className={styles.avatarPanelHeader}>
        <h3 id={titleId} className={styles.avatarPanelTitle}>
          {title}
        </h3>
        <p className={styles.avatarPanelSummary} {...fieldAccessibility.descriptionProps}>
          {constraintsDescription}
        </p>
      </div>

      <label className={styles.avatarUploadLabel}>
        <span className={styles.avatarUploadLabelText}>{inputLabel}</span>
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
            alt={localPreviewUrl ? selectedPreviewLabel : currentPreviewLabel}
            className={styles.avatarPreviewImage}
          />
          <div className={styles.avatarPreviewMeta}>
            <p className={styles.avatarPreviewLabel}>
              {localPreviewUrl ? selectedPreviewLabel : currentPreviewLabel}
            </p>
            <p id={previewDescriptionId} className={styles.avatarMeta}>
              {localPreviewUrl
                ? selectedAvatarDescription(localPreviewName)
                : currentAvatarDescription}
            </p>
            {currentAvatarUrl ? (
              <p className={styles.avatarMeta}>
                Current avatar URL: <a href={currentAvatarUrl}>{currentAvatarUrl}</a>
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <p id={previewDescriptionId} className={styles.avatarMeta}>
          {emptyStateText}
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
