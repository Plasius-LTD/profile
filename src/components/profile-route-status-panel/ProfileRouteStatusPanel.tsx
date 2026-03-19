import { StatusPanel } from "@plasius/sharedcomponents";

export type ProfileRouteStatusVariant = "loading" | "provisioning" | "error";

export interface ProfileRouteStatusPanelProps {
  variant: ProfileRouteStatusVariant;
  requestId?: string | null;
  attempts?: number;
  onRetry?: () => void;
  retryDisabled?: boolean;
  className?: string;
}

export function ProfileRouteStatusPanel({
  variant,
  requestId,
  attempts = 0,
  onRetry,
  retryDisabled = false,
  className,
}: ProfileRouteStatusPanelProps) {
  if (variant === "loading") {
    return (
      <StatusPanel
        title="Loading profile settings"
        description="Fetching the latest profile data before mounting the shared editor."
        meta="Automatic retries use a capped backoff policy for transient dependency failures."
        role="status"
        announce="polite"
        className={className}
      />
    );
  }

  if (variant === "provisioning") {
    return (
      <StatusPanel
        title="Preparing your profile"
        description={
          "No saved profile record was found for this account, so a starter profile is being created now."
        }
        meta={`Trace ID: ${requestId ?? "pending"}`}
        role="status"
        announce="polite"
        className={className}
      />
    );
  }

  return (
    <StatusPanel
      title="We could not load your profile settings"
      description={
        "The profile route could not load your settings in the current browser session. Retry the load to continue."
      }
      meta={`Attempts: ${attempts} | Trace ID: ${requestId ?? "unavailable"}`}
      tone="danger"
      role="alert"
      announce="assertive"
      actionLabel="Retry loading profile"
      onAction={onRetry}
      actionDisabled={retryDisabled}
      className={className}
    />
  );
}

export default ProfileRouteStatusPanel;
