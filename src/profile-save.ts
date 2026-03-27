import type { UserEntity } from "@plasius/entity-manager";

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

const USER_PROFILE_FIELD_LABELS: Record<Exclude<UserProfileFieldName, "avatar">, string> = {
  "name.firstName": "First name",
  "name.middleName": "Middle name",
  "name.lastName": "Last name",
  "name.displayName": "Display name",
  "name.preferredDisplayOrder": "Preferred name display",
  email: "Email",
  emailPreferences: "Email preferences",
};

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
  category?: UserProfileSaveErrorCategory;
  fieldErrors?: UserProfileFieldErrors;
  formErrors?: string[];
  status?: number;
  cause?: unknown;
}

export class UserProfileSaveError extends Error {
  readonly category: UserProfileSaveErrorCategory;
  readonly fieldErrors: UserProfileFieldErrors;
  readonly formErrors: string[];
  readonly status?: number;

  constructor(options: UserProfileSaveErrorOptions) {
    super(options.message);
    this.name = "UserProfileSaveError";
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
): string {
  const emptyFieldMatch = error.match(EMPTY_FIELD_PATTERN);
  if (emptyFieldMatch?.[1] === field) {
    return `${USER_PROFILE_FIELD_LABELS[field]} is required.`;
  }

  return error;
}

export function mapUserValidationErrors(errors: unknown[] | undefined): {
  fieldErrors: UserProfileFieldErrors;
  formErrors: string[];
} {
  const fieldErrors: UserProfileFieldErrors = {};
  const formErrors: string[] = [];

  for (const rawError of errors ?? []) {
    const error = String(rawError);
    const field = getFieldNameFromValidationError(error);

    if (field) {
      fieldErrors[field] ??= getFieldValidationMessage(field, error);
      continue;
    }

    formErrors.push(error);
  }

  return { fieldErrors, formErrors };
}

export function createValidationSaveError(errors: unknown[] | undefined): UserProfileSaveError {
  const mapped = mapUserValidationErrors(errors);
  return new UserProfileSaveError({
    message: mapped.formErrors[0] ?? "Profile validation failed.",
    category: "validation",
    fieldErrors: mapped.fieldErrors,
    formErrors: mapped.formErrors.length > 0
      ? mapped.formErrors
      : ["Fix the highlighted fields before saving."],
  });
}

export function normalizeUnknownSaveError(error: unknown): UserProfileSaveError {
  if (error instanceof UserProfileSaveError) {
    return error;
  }

  if (error instanceof Error) {
    return new UserProfileSaveError({
      message: error.message || "Profile save failed.",
      cause: error,
    });
  }

  return new UserProfileSaveError({
    message: typeof error === "string" && error.trim().length > 0
      ? error
      : "Profile save failed.",
    cause: error,
  });
}

export function isUserEntityLike(value: unknown): value is UserEntity {
  return value !== null && typeof value === "object" && "id" in (value as Record<string, unknown>);
}
