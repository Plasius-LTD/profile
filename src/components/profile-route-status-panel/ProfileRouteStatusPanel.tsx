import { StatusPanel } from "@plasius/sharedcomponents";
import { useI18n } from "@plasius/translations";
import {
  createProfileTranslationResolver,
  profileTranslationKeys,
} from "../../i18n.js";

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
  const { t } = useI18n();
  const translate = createProfileTranslationResolver(t);

  if (variant === "loading") {
    return (
      <StatusPanel
        title={translate(profileTranslationKeys.routeStatus.loadingTitle)}
        description={translate(profileTranslationKeys.routeStatus.loadingDescription)}
        meta={translate(profileTranslationKeys.routeStatus.loadingMeta)}
        role="status"
        announce="polite"
        className={className}
      />
    );
  }

  if (variant === "provisioning") {
    return (
      <StatusPanel
        title={translate(profileTranslationKeys.routeStatus.provisioningTitle)}
        description={
          translate(profileTranslationKeys.routeStatus.provisioningDescription)
        }
        meta={translate(profileTranslationKeys.routeStatus.provisioningMeta, {
          requestId:
            requestId
            ?? translate(profileTranslationKeys.routeStatus.provisioningTracePending),
        })}
        role="status"
        announce="polite"
        className={className}
      />
    );
  }

  return (
    <StatusPanel
      title={translate(profileTranslationKeys.routeStatus.errorTitle)}
      description={
        translate(profileTranslationKeys.routeStatus.errorDescription)
      }
      meta={translate(profileTranslationKeys.routeStatus.errorMeta, {
        attempts,
        requestId:
          requestId ?? translate(profileTranslationKeys.routeStatus.errorTraceUnavailable),
      })}
      tone="danger"
      role="alert"
      announce="assertive"
      actionLabel={translate(profileTranslationKeys.routeStatus.retryAction)}
      onAction={onRetry}
      actionDisabled={retryDisabled}
      className={className}
    />
  );
}

export default ProfileRouteStatusPanel;
