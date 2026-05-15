export interface AccessibleFieldOptions {
  idPrefix: string;
  name: string;
  description?: string;
  error?: string;
  liveMessage?: string;
  invalid?: boolean;
}

export interface AccessibleActionOptions {
  idPrefix: string;
  action: string;
  description?: string;
  intent?: "default" | "destructive";
  destructiveHint?: string;
}

const DEFAULT_DESTRUCTIVE_HINT =
  "This action is destructive. Confirm the target and consequences before continuing.";

function normalizeIdSegment(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? normalized : "field";
}

export function createAccessibleFieldBindings({
  idPrefix,
  name,
  description,
  error,
  liveMessage,
  invalid = false,
}: AccessibleFieldOptions) {
  const baseId = `${idPrefix}-${normalizeIdSegment(name)}`;
  const descriptionId = `${baseId}-description`;
  const errorId = `${baseId}-error`;
  const liveMessageId = `${baseId}-status`;
  const describedBy = [
    description ? descriptionId : "",
    liveMessage ? liveMessageId : "",
    error ? errorId : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    descriptionId,
    errorId,
    liveMessageId,
    inputProps: {
      "aria-describedby": describedBy || undefined,
      "aria-errormessage": error ? errorId : undefined,
      "aria-invalid": invalid || error ? true : undefined,
    },
    descriptionProps: {
      id: descriptionId,
    },
    errorProps: {
      id: errorId,
      role: "alert" as const,
    },
    liveMessageProps: {
      id: liveMessageId,
      role: "status" as const,
      "aria-live": "polite" as const,
    },
  };
}

export function createAccessibleActionBindings({
  idPrefix,
  action,
  description,
  intent = "default",
  destructiveHint = DEFAULT_DESTRUCTIVE_HINT,
}: AccessibleActionOptions) {
  const descriptionId = `${idPrefix}-${normalizeIdSegment(action)}-action-description`;
  const hint =
    intent === "destructive"
      ? [description, destructiveHint].filter(Boolean).join(" ")
      : description;

  return {
    descriptionId,
    buttonProps: {
      "aria-describedby": hint ? descriptionId : undefined,
      "data-action-intent": intent,
    },
    descriptionProps: {
      id: descriptionId,
    },
    descriptionText: hint,
  };
}
