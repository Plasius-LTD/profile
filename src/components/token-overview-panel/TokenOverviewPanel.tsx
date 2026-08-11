import { useId, useMemo } from "react";
import type {
  ActivityStatus,
  ActivityType,
  TokenSource,
  WalletPortfolioComponentRole,
} from "@plasius/economy";
import {
  getProfileTokenDefaultTranslation,
  profileTokenTranslationKeys,
  type ProfileTokenTranslationResolver,
} from "../../i18n.js";

const TOKEN_SUBUNITS_PER_TOKEN = 1_000n;
const MAX_SIGNED_BIGINT_64 = 9_223_372_036_854_775_807n;
const MAX_SIGNED_BIGINT_64_MAGNITUDE = 9_223_372_036_854_775_808n;

// The stylesheet is an explicit package export so ESM and CJS can load this
// module in non-bundler runtimes without attempting to execute CSS.
const styles = {
  panel: "plasiusTokenOverviewPanel_panel",
  panelHeader: "plasiusTokenOverviewPanel_panelHeader",
  section: "plasiusTokenOverviewPanel_section",
  statePanel: "plasiusTokenOverviewPanel_statePanel",
  activityCard: "plasiusTokenOverviewPanel_activityCard",
  statusCard: "plasiusTokenOverviewPanel_statusCard",
  actionCard: "plasiusTokenOverviewPanel_actionCard",
  unavailableCard: "plasiusTokenOverviewPanel_unavailableCard",
  panelHeading: "plasiusTokenOverviewPanel_panelHeading",
  sectionHeading: "plasiusTokenOverviewPanel_sectionHeading",
  activityHeading: "plasiusTokenOverviewPanel_activityHeading",
  panelDescription: "plasiusTokenOverviewPanel_panelDescription",
  emptyActivity: "plasiusTokenOverviewPanel_emptyActivity",
  sectionHeader: "plasiusTokenOverviewPanel_sectionHeader",
  activityHeader: "plasiusTokenOverviewPanel_activityHeader",
  amountGrid: "plasiusTokenOverviewPanel_amountGrid",
  activityMetadata: "plasiusTokenOverviewPanel_activityMetadata",
  amountDefinition: "plasiusTokenOverviewPanel_amountDefinition",
  cardList: "plasiusTokenOverviewPanel_cardList",
  activityList: "plasiusTokenOverviewPanel_activityList",
  disabledReason: "plasiusTokenOverviewPanel_disabledReason",
  unavailableStatus: "plasiusTokenOverviewPanel_unavailableStatus",
  activityAmount: "plasiusTokenOverviewPanel_activityAmount",
  directionLabel: "plasiusTokenOverviewPanel_directionLabel",
  primaryAction: "plasiusTokenOverviewPanel_primaryAction",
  secondaryAction: "plasiusTokenOverviewPanel_secondaryAction",
  textAction: "plasiusTokenOverviewPanel_textAction",
  visuallyHidden: "plasiusTokenOverviewPanel_visuallyHidden",
} as const;

/**
 * A non-negative base-10 integer string containing TokenSubunits.
 *
 * Runtime values are checked before display because TypeScript cannot enforce
 * a JSON string's canonical representation. Balance/totals use signed 64-bit
 * maximum; an activity magnitude may additionally represent abs(int64 min).
 */
export type CanonicalTokenSubunitString = string;

export type TokenActivityDirection = "credit" | "debit";
export type TokenOverviewStatusTone = "neutral" | "positive" | "warning";

/** Host-supplied, already-authoritative balance projection values. */
export interface TokenBalancePresentation {
  availableSubunits: CanonicalTokenSubunitString;
  reservedSubunits: CanonicalTokenSubunitString;
  heldSubunits: CanonicalTokenSubunitString;
  rewardProgressSubunits: CanonicalTokenSubunitString;
}

/** Host-supplied lifetime totals. This component never calculates these values. */
export interface TokenLifetimeTotalsPresentation {
  boughtSubunits: CanonicalTokenSubunitString;
  earnedSubunits: CanonicalTokenSubunitString;
  allocatedSubunits: CanonicalTokenSubunitString;
  reclaimedSubunits: CanonicalTokenSubunitString;
  spentSubunits: CanonicalTokenSubunitString;
  reversedSubunits: CanonicalTokenSubunitString;
}

/**
 * One explicitly separated, host-labelled wallet component from an
 * authoritative portfolio read.
 */
export interface TokenWalletComponentPresentation {
  walletId: string;
  role: WalletPortfolioComponentRole;
  label: string;
  balances: TokenBalancePresentation;
  lifetimeTotals: TokenLifetimeTotalsPresentation;
  beneficiaryAccountId?: string;
  beneficiaryLabel?: string;
}

/** A single, localized activity row supplied by the host application. */
export interface TokenActivityPresentation {
  id: string;
  activityType: ActivityType;
  status: ActivityStatus;
  title: string;
  direction: TokenActivityDirection;
  amountSubunits: CanonicalTokenSubunitString;
  sourceKey: TokenSource;
  sourceLabel: string;
  statusLabel: string;
  occurredAt: string;
  occurredAtLabel: string;
  beneficiaryAccountId?: string;
  beneficiaryLabel?: string;
  maskedReference?: string;
  entryKind?: "economic" | "workflow";
  walletId?: string;
  transactionId?: string;
  commandId?: string;
}

/** Portfolio activity variants preserve the economy workflow discriminant. */
export interface EconomicTokenPortfolioActivityPresentation
  extends TokenActivityPresentation {
  entryKind: "economic";
  walletId: string;
  transactionId: string;
  commandId?: never;
}

export interface WorkflowTokenPortfolioActivityPresentation
  extends TokenActivityPresentation {
  entryKind: "workflow";
  walletId: string;
  commandId: string;
  transactionId?: never;
}

export type TokenPortfolioActivityPresentation =
  | EconomicTokenPortfolioActivityPresentation
  | WorkflowTokenPortfolioActivityPresentation;

/** A localized wallet/cohort status such as provisional early-backer status. */
export interface TokenOverviewStatusPresentation {
  id: string;
  label: string;
  description: string;
  tone?: TokenOverviewStatusTone;
}

/** A host-owned acquisition action. Activation is returned through `onAction`. */
export interface TokenOverviewActionPresentation {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  disabled?: boolean;
  disabledReason?: string;
}

/** A future Token use that is explicitly unavailable in the baseline. */
export interface TokenUnavailableUsePresentation {
  id: string;
  title: string;
  description: string;
  statusLabel?: string;
  detailsActionLabel?: string;
}

/**
 * All package-owned labels used by `TokenOverviewPanel`.
 *
 * Labels are a required prop so the host controls localization. Use
 * `createTokenOverviewPanelLabels` with the host translator or with the
 * packaged en-GB resolver.
 */
export interface TokenOverviewPanelLabels {
  heading: string;
  tokenUnitSingular: string;
  tokenUnitPlural: string;
  loadingTitle: string;
  loadingDescription: string;
  errorTitle: string;
  errorDescription: string;
  retryAction: string;
  emptyTitle: string;
  emptyDescription: string;
  balancesHeading: string;
  availableBalance: string;
  reservedBalance: string;
  heldBalance: string;
  rewardProgress: string;
  refreshBalances: string;
  refreshingBalances: string;
  lifetimeHeading: string;
  lifetimeBought: string;
  lifetimeEarned: string;
  lifetimeAllocated: string;
  lifetimeReclaimed: string;
  lifetimeSpent: string;
  lifetimeReversed: string;
  statusesHeading: string;
  actionsHeading: string;
  activityHeading: string;
  activityEmpty: string;
  activityCredit: string;
  activityDebit: string;
  activitySource: string;
  activityStatus: string;
  activityDate: string;
  activityBeneficiary: string;
  activityReference: string;
  unavailableUsesHeading: string;
  unavailableStatus: string;
}

/** Copy that makes a no-wallet preview distinct from persisted economy data. */
export interface TokenOverviewPanelPreviewLabels {
  title: string;
  description: string;
  amount: string;
  activityEmpty: string;
}

interface TokenOverviewPanelBaseProps {
  labels: TokenOverviewPanelLabels;
  locale?: string;
  description?: string;
  headingLevel?: 2 | 3;
  className?: string;
}

export interface TokenOverviewPanelLoadingProps extends TokenOverviewPanelBaseProps {
  state: "loading";
}

export interface TokenOverviewPanelErrorProps extends TokenOverviewPanelBaseProps {
  state: "error";
  errorMessage?: string;
  onRetry?: () => void;
  retryDisabled?: boolean;
}

export interface TokenOverviewPanelEmptyProps extends TokenOverviewPanelBaseProps {
  state: "empty";
}

/**
 * A deliberately non-wallet presentation. It accepts no balance, lifetime,
 * component, activity, status, or action data.
 */
export interface TokenOverviewPanelPreviewProps extends TokenOverviewPanelBaseProps {
  state: "preview";
  previewLabels: TokenOverviewPanelPreviewLabels;
}

export interface TokenOverviewPanelReadyProps extends TokenOverviewPanelBaseProps {
  state: "ready";
  balances: TokenBalancePresentation;
  lifetimeTotals: TokenLifetimeTotalsPresentation;
  activities: readonly TokenActivityPresentation[];
  walletComponents?: readonly TokenWalletComponentPresentation[];
  statuses?: readonly TokenOverviewStatusPresentation[];
  actions?: readonly TokenOverviewActionPresentation[];
  unavailableUses?: readonly TokenUnavailableUsePresentation[];
  isRefreshing?: boolean;
  balanceAnnouncement?: string;
  onRefresh?: () => void;
  onAction?: (actionId: string) => void;
  onActivitySelect?: (activityId: string) => void;
  onUnavailableUseSelect?: (useId: string) => void;
}

export type TokenOverviewPanelProps =
  | TokenOverviewPanelLoadingProps
  | TokenOverviewPanelErrorProps
  | TokenOverviewPanelEmptyProps
  | TokenOverviewPanelPreviewProps
  | TokenOverviewPanelReadyProps;

/** Build the required label contract from a host or package translation resolver. */
export function createTokenOverviewPanelLabels(
  translate: ProfileTokenTranslationResolver = getProfileTokenDefaultTranslation,
): TokenOverviewPanelLabels {
  const keys = profileTokenTranslationKeys;

  return {
    heading: translate(keys.heading),
    tokenUnitSingular: translate(keys.tokenUnitSingular),
    tokenUnitPlural: translate(keys.tokenUnitPlural),
    loadingTitle: translate(keys.loadingTitle),
    loadingDescription: translate(keys.loadingDescription),
    errorTitle: translate(keys.errorTitle),
    errorDescription: translate(keys.errorDescription),
    retryAction: translate(keys.retryAction),
    emptyTitle: translate(keys.emptyTitle),
    emptyDescription: translate(keys.emptyDescription),
    balancesHeading: translate(keys.balancesHeading),
    availableBalance: translate(keys.availableBalance),
    reservedBalance: translate(keys.reservedBalance),
    heldBalance: translate(keys.heldBalance),
    rewardProgress: translate(keys.rewardProgress),
    refreshBalances: translate(keys.refreshBalances),
    refreshingBalances: translate(keys.refreshingBalances),
    lifetimeHeading: translate(keys.lifetimeHeading),
    lifetimeBought: translate(keys.lifetimeBought),
    lifetimeEarned: translate(keys.lifetimeEarned),
    lifetimeAllocated: translate(keys.lifetimeAllocated),
    lifetimeReclaimed: translate(keys.lifetimeReclaimed),
    lifetimeSpent: translate(keys.lifetimeSpent),
    lifetimeReversed: translate(keys.lifetimeReversed),
    statusesHeading: translate(keys.statusesHeading),
    actionsHeading: translate(keys.actionsHeading),
    activityHeading: translate(keys.activityHeading),
    activityEmpty: translate(keys.activityEmpty),
    activityCredit: translate(keys.activityCredit),
    activityDebit: translate(keys.activityDebit),
    activitySource: translate(keys.activitySource),
    activityStatus: translate(keys.activityStatus),
    activityDate: translate(keys.activityDate),
    activityBeneficiary: translate(keys.activityBeneficiary),
    activityReference: translate(keys.activityReference),
    unavailableUsesHeading: translate(keys.unavailableUsesHeading),
    unavailableStatus: translate(keys.unavailableStatus),
  };
}

/** Build truthful package-default copy for the explicit no-wallet preview. */
export function createTokenOverviewPanelPreviewLabels(
  translate: ProfileTokenTranslationResolver = getProfileTokenDefaultTranslation,
): TokenOverviewPanelPreviewLabels {
  const keys = profileTokenTranslationKeys;
  return {
    title: translate(keys.previewTitle),
    description: translate(keys.previewDescription),
    amount: translate(keys.previewAmount),
    activityEmpty: translate(keys.previewActivityEmpty),
  };
}

function parseCanonicalNonNegativeTokenAmount(
  value: CanonicalTokenSubunitString,
  maximum: bigint,
): bigint {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > 19
    || !/^(?:0|[1-9][0-9]*)$/u.test(value)
  ) {
    throw new TypeError("TokenSubunits must be a canonical non-negative base-10 integer string.");
  }

  const parsed = BigInt(value);
  if (parsed > maximum) {
    throw new RangeError("TokenSubunits exceed the supported 64-bit magnitude.");
  }

  return parsed;
}

function parseCanonicalTokenSubunits(value: CanonicalTokenSubunitString): bigint {
  return parseCanonicalNonNegativeTokenAmount(value, MAX_SIGNED_BIGINT_64);
}

function parseCanonicalActivityMagnitude(
  value: CanonicalTokenSubunitString,
): bigint {
  return parseCanonicalNonNegativeTokenAmount(
    value,
    MAX_SIGNED_BIGINT_64_MAGNITUDE,
  );
}

function createTokenNumberFormatter(locale: string) {
  const integerFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    useGrouping: true,
  });
  const digitFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    useGrouping: false,
  });
  const decimalSeparator =
    new Intl.NumberFormat(locale)
      .formatToParts(1.1)
      .find((part) => part.type === "decimal")?.value ?? ".";

  return (amount: bigint): string => {
    const wholeTokens = amount / TOKEN_SUBUNITS_PER_TOKEN;
    const remainder = amount % TOKEN_SUBUNITS_PER_TOKEN;
    const wholeText = integerFormatter.format(wholeTokens);

    if (remainder === 0n) {
      return wholeText;
    }

    const fractionalText = remainder
      .toString()
      .padStart(3, "0")
      .replace(/0+$/u, "");
    const localizedFractionalText = Array.from(
      fractionalText,
      (digit) => digitFormatter.format(BigInt(digit)),
    ).join("");
    return `${wholeText}${decimalSeparator}${localizedFractionalText}`;
  };
}

/**
 * Format canonical TokenSubunits exactly, without converting the amount to a
 * JavaScript `number` and without losing precision.
 */
export function formatTokenSubunits(
  amountSubunits: CanonicalTokenSubunitString,
  locale = "en-GB",
): string {
  return createTokenNumberFormatter(locale)(
    parseCanonicalTokenSubunits(amountSubunits),
  );
}

interface TokenAmountDataProps {
  amountSubunits: CanonicalTokenSubunitString;
  formatAmount: (amountSubunits: CanonicalTokenSubunitString) => string;
  className?: string;
}

function TokenAmountData({
  amountSubunits,
  formatAmount,
  className,
}: TokenAmountDataProps) {
  return (
    <data
      value={amountSubunits}
      data-unit="TokenSubunit"
      className={className}
    >
      {formatAmount(amountSubunits)}
    </data>
  );
}

interface AmountDefinitionProps {
  label: string;
  amountSubunits: CanonicalTokenSubunitString;
  formatAmount: (amountSubunits: CanonicalTokenSubunitString) => string;
}

function AmountDefinition({
  label,
  amountSubunits,
  formatAmount,
}: AmountDefinitionProps) {
  return (
    <div className={styles.amountDefinition}>
      <dt>{label}</dt>
      <dd>
        <TokenAmountData
          amountSubunits={amountSubunits}
          formatAmount={formatAmount}
        />
      </dd>
    </div>
  );
}

export function TokenOverviewPanel(props: TokenOverviewPanelProps) {
  const {
    labels,
    locale = "en-GB",
    description,
    headingLevel = 2,
    className,
  } = props;
  const panelHeadingId = useId();
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const SectionHeading = headingLevel === 3 ? "h4" : "h3";
  const ActivityHeading = headingLevel === 3 ? "h5" : "h4";
  const formatNumber = useMemo(() => createTokenNumberFormatter(locale), [locale]);
  const formatParsedAmount = (parsed: bigint): string => {
    const unit = parsed === TOKEN_SUBUNITS_PER_TOKEN
      ? labels.tokenUnitSingular
      : labels.tokenUnitPlural;
    return `${formatNumber(parsed)} ${unit}`;
  };
  const formatAmount = (amountSubunits: CanonicalTokenSubunitString): string =>
    formatParsedAmount(parseCanonicalTokenSubunits(amountSubunits));
  const formatActivityAmount = (
    amountSubunits: CanonicalTokenSubunitString,
  ): string =>
    formatParsedAmount(parseCanonicalActivityMagnitude(amountSubunits));
  const panelClassName = [styles.panel, className].filter(Boolean).join(" ");

  const panelHeader = (
    <header className={styles.panelHeader}>
      <Heading id={panelHeadingId} className={styles.panelHeading}>
        {labels.heading}
      </Heading>
      {description ? <p className={styles.panelDescription}>{description}</p> : null}
    </header>
  );

  if (props.state === "loading") {
    return (
      <section
        className={panelClassName}
        aria-labelledby={panelHeadingId}
        aria-busy="true"
      >
        {panelHeader}
        <div className={styles.statePanel} role="status" aria-live="polite" aria-atomic="true">
          <SectionHeading className={styles.sectionHeading}>
            {labels.loadingTitle}
          </SectionHeading>
          <p>{labels.loadingDescription}</p>
        </div>
      </section>
    );
  }

  if (props.state === "error") {
    return (
      <section className={panelClassName} aria-labelledby={panelHeadingId}>
        {panelHeader}
        <div className={styles.statePanel} role="alert" aria-atomic="true">
          <SectionHeading className={styles.sectionHeading}>
            {labels.errorTitle}
          </SectionHeading>
          <p>{props.errorMessage ?? labels.errorDescription}</p>
          {props.onRetry ? (
            <button
              type="button"
              className={styles.primaryAction}
              onClick={props.onRetry}
              disabled={props.retryDisabled}
            >
              {labels.retryAction}
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  if (props.state === "empty") {
    return (
      <section className={panelClassName} aria-labelledby={panelHeadingId}>
        {panelHeader}
        <div
          className={styles.statePanel}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <SectionHeading className={styles.sectionHeading}>
            {labels.emptyTitle}
          </SectionHeading>
          <p>{labels.emptyDescription}</p>
        </div>
      </section>
    );
  }

  if (props.state === "preview") {
    return (
      <section
        className={panelClassName}
        aria-labelledby={panelHeadingId}
        data-token-presentation="zero-ui-preview"
      >
        {panelHeader}
        <div
          className={styles.statePanel}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <SectionHeading className={styles.sectionHeading}>
            {props.previewLabels.title}
          </SectionHeading>
          <p>{props.previewLabels.description}</p>
          <dl className={styles.amountGrid}>
            <AmountDefinition
              label={props.previewLabels.amount}
              amountSubunits="0"
              formatAmount={formatAmount}
            />
          </dl>
          <p className={styles.emptyActivity}>
            {props.previewLabels.activityEmpty}
          </p>
        </div>
      </section>
    );
  }

  const {
    balances,
    lifetimeTotals,
    activities,
    walletComponents = [],
    statuses = [],
    actions = [],
    unavailableUses = [],
    isRefreshing = false,
    balanceAnnouncement,
    onRefresh,
    onAction,
    onActivitySelect,
    onUnavailableUseSelect,
  } = props;

  return (
    <section className={panelClassName} aria-labelledby={panelHeadingId}>
      {panelHeader}

      <section className={styles.section} aria-busy={isRefreshing || undefined}>
        <div className={styles.sectionHeader}>
          <SectionHeading className={styles.sectionHeading}>
            {labels.balancesHeading}
          </SectionHeading>
          {onRefresh ? (
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? labels.refreshingBalances : labels.refreshBalances}
            </button>
          ) : null}
        </div>
        <p
          className={styles.visuallyHidden}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {isRefreshing ? labels.refreshingBalances : balanceAnnouncement ?? ""}
        </p>
        <dl className={styles.amountGrid}>
          <AmountDefinition
            label={labels.availableBalance}
            amountSubunits={balances.availableSubunits}
            formatAmount={formatAmount}
          />
          <AmountDefinition
            label={labels.reservedBalance}
            amountSubunits={balances.reservedSubunits}
            formatAmount={formatAmount}
          />
          <AmountDefinition
            label={labels.heldBalance}
            amountSubunits={balances.heldSubunits}
            formatAmount={formatAmount}
          />
          <AmountDefinition
            label={labels.rewardProgress}
            amountSubunits={balances.rewardProgressSubunits}
            formatAmount={formatAmount}
          />
        </dl>
        {walletComponents.length > 0 ? (
          <ul className={styles.cardList}>
            {walletComponents.map((component, index) => {
              const componentHeadingId =
                `${panelHeadingId}-wallet-component-${index}`;

              return (
                <li key={component.walletId} className={styles.statusCard}>
                  <ActivityHeading
                    id={componentHeadingId}
                    className={styles.activityHeading}
                  >
                    {component.label}
                  </ActivityHeading>
                  {component.beneficiaryLabel ? (
                    <p>{component.beneficiaryLabel}</p>
                  ) : null}
                  <dl className={styles.amountGrid}>
                    <AmountDefinition
                      label={labels.availableBalance}
                      amountSubunits={component.balances.availableSubunits}
                      formatAmount={formatAmount}
                    />
                    <AmountDefinition
                      label={labels.reservedBalance}
                      amountSubunits={component.balances.reservedSubunits}
                      formatAmount={formatAmount}
                    />
                    <AmountDefinition
                      label={labels.heldBalance}
                      amountSubunits={component.balances.heldSubunits}
                      formatAmount={formatAmount}
                    />
                    <AmountDefinition
                      label={labels.rewardProgress}
                      amountSubunits={component.balances.rewardProgressSubunits}
                      formatAmount={formatAmount}
                    />
                  </dl>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <section className={styles.section}>
        <SectionHeading className={styles.sectionHeading}>
          {labels.lifetimeHeading}
        </SectionHeading>
        <dl className={styles.amountGrid}>
          <AmountDefinition
            label={labels.lifetimeBought}
            amountSubunits={lifetimeTotals.boughtSubunits}
            formatAmount={formatAmount}
          />
          <AmountDefinition
            label={labels.lifetimeEarned}
            amountSubunits={lifetimeTotals.earnedSubunits}
            formatAmount={formatAmount}
          />
          <AmountDefinition
            label={labels.lifetimeAllocated}
            amountSubunits={lifetimeTotals.allocatedSubunits}
            formatAmount={formatAmount}
          />
          <AmountDefinition
            label={labels.lifetimeReclaimed}
            amountSubunits={lifetimeTotals.reclaimedSubunits}
            formatAmount={formatAmount}
          />
          <AmountDefinition
            label={labels.lifetimeSpent}
            amountSubunits={lifetimeTotals.spentSubunits}
            formatAmount={formatAmount}
          />
          <AmountDefinition
            label={labels.lifetimeReversed}
            amountSubunits={lifetimeTotals.reversedSubunits}
            formatAmount={formatAmount}
          />
        </dl>
      </section>

      {statuses.length > 0 ? (
        <section className={styles.section}>
          <SectionHeading className={styles.sectionHeading}>
            {labels.statusesHeading}
          </SectionHeading>
          <ul className={styles.cardList}>
            {statuses.map((status) => (
              <li
                key={status.id}
                className={styles.statusCard}
                data-tone={status.tone ?? "neutral"}
              >
                <strong>{status.label}</strong>
                <p>{status.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {actions.length > 0 ? (
        <section className={styles.section}>
          <SectionHeading className={styles.sectionHeading}>
            {labels.actionsHeading}
          </SectionHeading>
          <ul className={styles.cardList}>
            {actions.map((action) => (
              <li key={action.id} className={styles.actionCard}>
                <strong>{action.title}</strong>
                <p>{action.description}</p>
                {action.disabledReason ? (
                  <p className={styles.disabledReason}>{action.disabledReason}</p>
                ) : null}
                {onAction ? (
                  <button
                    type="button"
                    className={styles.primaryAction}
                    onClick={() => onAction(action.id)}
                    disabled={action.disabled}
                  >
                    {action.actionLabel}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={styles.section}>
        <SectionHeading className={styles.sectionHeading}>
          {labels.activityHeading}
        </SectionHeading>
        {activities.length > 0 ? (
          <ol className={styles.activityList}>
            {activities.map((activity, index) => {
              const activityHeadingId = `${panelHeadingId}-activity-${index}`;
              const directionLabel = activity.direction === "credit"
                ? labels.activityCredit
                : labels.activityDebit;

              return (
                <li key={activity.id}>
                  <article className={styles.activityCard} aria-labelledby={activityHeadingId}>
                    <div className={styles.activityHeader}>
                      <ActivityHeading id={activityHeadingId} className={styles.activityHeading}>
                        {onActivitySelect ? (
                          <button
                            type="button"
                            className={styles.textAction}
                            onClick={() => onActivitySelect(activity.id)}
                          >
                            {activity.title}
                          </button>
                        ) : activity.title}
                      </ActivityHeading>
                      <p
                        className={styles.activityAmount}
                        data-direction={activity.direction}
                      >
                        <span className={styles.directionLabel}>{directionLabel}</span>{" "}
                        <span aria-hidden="true">
                          {activity.direction === "credit" ? "+" : "−"}
                        </span>{" "}
                        <TokenAmountData
                          amountSubunits={activity.amountSubunits}
                          formatAmount={formatActivityAmount}
                        />
                      </p>
                    </div>
                    <dl className={styles.activityMetadata}>
                      <div>
                        <dt>{labels.activitySource}</dt>
                        <dd>{activity.sourceLabel}</dd>
                      </div>
                      <div>
                        <dt>{labels.activityStatus}</dt>
                        <dd>{activity.statusLabel}</dd>
                      </div>
                      <div>
                        <dt>{labels.activityDate}</dt>
                        <dd>
                          <time dateTime={activity.occurredAt}>
                            {activity.occurredAtLabel}
                          </time>
                        </dd>
                      </div>
                      {activity.beneficiaryLabel ? (
                        <div>
                          <dt>{labels.activityBeneficiary}</dt>
                          <dd>{activity.beneficiaryLabel}</dd>
                        </div>
                      ) : null}
                      {activity.maskedReference ? (
                        <div>
                          <dt>{labels.activityReference}</dt>
                          <dd>{activity.maskedReference}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </article>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className={styles.emptyActivity}>{labels.activityEmpty}</p>
        )}
      </section>

      {unavailableUses.length > 0 ? (
        <section className={styles.section}>
          <SectionHeading className={styles.sectionHeading}>
            {labels.unavailableUsesHeading}
          </SectionHeading>
          <ul className={styles.cardList}>
            {unavailableUses.map((use) => (
              <li key={use.id} className={styles.unavailableCard}>
                <strong>{use.title}</strong>
                <p>{use.description}</p>
                <p className={styles.unavailableStatus}>
                  {use.statusLabel ?? labels.unavailableStatus}
                </p>
                {use.detailsActionLabel && onUnavailableUseSelect ? (
                  <button
                    type="button"
                    className={styles.textAction}
                    onClick={() => onUnavailableUseSelect(use.id)}
                  >
                    {use.detailsActionLabel}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

export default TokenOverviewPanel;
