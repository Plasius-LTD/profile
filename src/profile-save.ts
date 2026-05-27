import type { UserEntity } from "@plasius/entity-manager";
import {
  getProfileDefaultTranslation,
  profileTranslationKeys,
  type ProfileTranslationKey,
  type ProfileTranslationResolver,
} from "./i18n.js";

export type UserProfileFieldName =
  | "avatar"
  | "name.firstName"
  | "name.middleName"
  | "name.lastName"
  | "name.displayName"
  | "name.preferredDisplayOrder"
  | "email"
  | "emailPreferences";

export type UserProfileFieldErrors = Partial<Record<UserProfileFieldName, string>>;

export type UserProfileSaveStatus = "idle" | "pending" | "success" | "error";

export type UserProfileSaveErrorCategory =
  | "validation"
  | "authorization"
  | "network"
  | "server"
  | "unknown";

const EMPTY_FIELD_PATTERN = /^High PII field must not be empty: ([a-zA-Z]+(?:\.[a-zA-Z]+)*)$/;

const USER_PROFILE_REQUIRED_FIELD_TRANSLATION_KEYS = {
  "name.firstName": profileTranslationKeys.settings.required.firstName,
  "name.middleName": profileTranslationKeys.settings.required.middleName,
  "name.lastName": profileTranslationKeys.settings.required.lastName,
  "name.displayName": profileTranslationKeys.settings.required.displayName,
  "name.preferredDisplayOrder":
    profileTranslationKeys.settings.required.preferredDisplayOrder,
  email: profileTranslationKeys.settings.required.email,
  emailPreferences: profileTranslationKeys.settings.required.emailPreferences,
} as const satisfies Record<
  Exclude<UserProfileFieldName, "avatar">,
  ProfileTranslationKey
>;

const USER_PROFILE_FIELD_NAMES = new Set<UserProfileFieldName>([
  "avatar",
  "name.firstName",
  "name.middleName",
  "name.lastName",
  "name.displayName",
  "name.preferredDisplayOrder",
  "email",
  "emailPreferences",
]);

export interface UserProfileSaveErrorOptions {
  message: string;
  messageKey?: ProfileTranslationKey;
  messageDefault?: string;
  category?: UserProfileSaveErrorCategory;
  fieldErrors?: UserProfileFieldErrors;
  formErrors?: string[];
  status?: number;
  cause?: unknown;
}

export class UserProfileSaveError extends Error {
  readonly messageKey?: ProfileTranslationKey;
  readonly messageDefault?: string;
  readonly category: UserProfileSaveErrorCategory;
  readonly fieldErrors: UserProfileFieldErrors;
  readonly formErrors: string[];
  readonly status?: number;

  constructor(options: UserProfileSaveErrorOptions) {
    super(options.message);
    this.name = "UserProfileSaveError";
    this.messageKey = options.messageKey;
    this.messageDefault = options.messageDefault;
    this.category = options.category ?? "unknown";
    this.fieldErrors = options.fieldErrors ?? {};
    this.formErrors = options.formErrors ?? [];
    this.status = options.status;
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

function isUserProfileFieldName(value: string): value is UserProfileFieldName {
  return USER_PROFILE_FIELD_NAMES.has(value as UserProfileFieldName);
}

function getFieldNameFromValidationError(
  error: string,
): Exclude<UserProfileFieldName, "avatar"> | null {
  const fieldPath = error.match(/:\s*([a-zA-Z]+(?:\.[a-zA-Z]+)*)$/)?.[1] ?? "";
  if (!isUserProfileFieldName(fieldPath) || fieldPath === "avatar") {
    return null;
  }

  return fieldPath;
}

function getFieldValidationMessage(
  field: Exclude<UserProfileFieldName, "avatar">,
  error: string,
  translate: ProfileTranslationResolver,
): string {
  const emptyFieldMatch = error.match(EMPTY_FIELD_PATTERN);
  if (emptyFieldMatch?.[1] === field) {
    return translate(USER_PROFILE_REQUIRED_FIELD_TRANSLATION_KEYS[field]);
  }

  return error;
}

export function mapUserValidationErrors(
  errors: unknown[] | undefined,
  translate: ProfileTranslationResolver = getProfileDefaultTranslation,
): {
  fieldErrors: UserProfileFieldErrors;
  formErrors: string[];
} {
  const fieldErrors: UserProfileFieldErrors = {};
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

export function createValidationSaveError(
  errors: unknown[] | undefined,
  translate: ProfileTranslationResolver = getProfileDefaultTranslation,
): UserProfileSaveError {
  const mapped = mapUserValidationErrors(errors, translate);
  const fallbackMessageKey = profileTranslationKeys.save.validationFailed;
  const fallbackSummaryKey = profileTranslationKeys.save.validationSummary;
  const fallbackMessage = translate(fallbackMessageKey);
  const message = mapped.formErrors[0] ?? fallbackMessage;
  return new UserProfileSaveError({
    message,
    messageKey: mapped.formErrors[0] ? undefined : fallbackMessageKey,
    messageDefault: mapped.formErrors[0]
      ? undefined
      : getProfileDefaultTranslation(fallbackMessageKey),
    category: "validation",
    fieldErrors: mapped.fieldErrors,
    formErrors: mapped.formErrors.length > 0
      ? mapped.formErrors
      : [translate(fallbackSummaryKey)],
  });
}

export function normalizeUnknownSaveError(
  error: unknown,
  translate: ProfileTranslationResolver = getProfileDefaultTranslation,
): UserProfileSaveError {
  if (error instanceof UserProfileSaveError) {
    return error;
  }

  if (error instanceof Error) {
    const fallbackMessageKey = profileTranslationKeys.save.saveFailed;
    const message = error.message || translate(fallbackMessageKey);
    return new UserProfileSaveError({
      message,
      messageKey: error.message ? undefined : fallbackMessageKey,
      messageDefault: error.message
        ? undefined
        : getProfileDefaultTranslation(fallbackMessageKey),
      cause: error,
    });
  }

  const fallbackMessageKey = profileTranslationKeys.save.saveFailed;
  const message = typeof error === "string" && error.trim().length > 0
    ? error
    : translate(fallbackMessageKey);
  return new UserProfileSaveError({
    message,
    messageKey:
      typeof error === "string" && error.trim().length > 0
        ? undefined
        : fallbackMessageKey,
    messageDefault:
      typeof error === "string" && error.trim().length > 0
        ? undefined
        : getProfileDefaultTranslation(fallbackMessageKey),
    cause: error,
  });
}

export function isUserEntityLike(value: unknown): value is UserEntity {
  return value !== null && typeof value === "object" && "id" in (value as Record<string, unknown>);
}
