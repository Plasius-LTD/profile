import {
  assertActivityEntry,
  assertWalletActivityEntry,
  assertWalletBalanceSummary,
  assertWalletLifetimeTotals,
  assertWalletPortfolioLifetime,
  assertWalletPortfolioSummary,
  parseIsoTimestamp,
  parseTokenSubunits,
  type ActivityEntryV1,
  type ActivityStatus,
  type ActivityType,
  type TokenSource,
  type WalletActivityEntryV1,
  type WalletBalanceSummaryV1,
  type WalletLifetimeTotalsV1,
  type WalletPortfolioComponentRole,
  type WalletPortfolioLifetimeV1,
  type WalletPortfolioSummaryV1,
} from "@plasius/economy";
import type {
  TokenActivityPresentation,
  TokenBalancePresentation,
  TokenLifetimeTotalsPresentation,
  TokenPortfolioActivityPresentation,
  TokenWalletComponentPresentation,
} from "./TokenOverviewPanel.js";

/** Host localization and account-label resolvers for stable economy keys. */
export interface TokenEconomyPresentationResolvers {
  activityTitle: (activityType: ActivityType) => string;
  activityStatus: (status: ActivityStatus) => string;
  occurredAt: (isoTimestamp: string) => string;
  beneficiary?: (accountId: string) => string | undefined;
}

export interface TokenEconomyPresentationInput {
  balances: WalletBalanceSummaryV1;
  lifetimeTotals: WalletLifetimeTotalsV1;
  activities: readonly ActivityEntryV1[];
  resolvers: TokenEconomyPresentationResolvers;
}

export interface TokenEconomyPresentation {
  balances: TokenBalancePresentation;
  lifetimeTotals: TokenLifetimeTotalsPresentation;
  activities: readonly TokenActivityPresentation[];
}

/** Additional localization needed to label distinct portfolio components. */
export interface TokenPortfolioEconomyPresentationResolvers
  extends TokenEconomyPresentationResolvers {
  componentLabel: (
    role: WalletPortfolioComponentRole,
    beneficiaryAccountId?: string,
  ) => string;
}

/** Explicit account-aware portfolio input; the legacy single-wallet input remains supported. */
export interface TokenPortfolioEconomyPresentationInput {
  portfolioSummary: WalletPortfolioSummaryV1;
  portfolioLifetime: WalletPortfolioLifetimeV1;
  activities: readonly WalletActivityEntryV1[];
  resolvers: TokenPortfolioEconomyPresentationResolvers;
}

/** Portfolio presentation retains component boundaries and their authoritative ordering. */
export interface TokenPortfolioEconomyPresentation
  extends TokenEconomyPresentation {
  activities: readonly TokenPortfolioActivityPresentation[];
  walletComponents: readonly TokenWalletComponentPresentation[];
}

export interface TokenActivityPresentationFilter {
  activityTypes?: readonly ActivityType[];
  statuses?: readonly ActivityStatus[];
  sourceKeys?: readonly TokenSource[];
  beneficiaryAccountIds?: readonly string[];
  maskedReferences?: readonly string[];
  occurredFromInclusive?: string;
  occurredBeforeExclusive?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}

function requireStringFields(
  value: Record<string, unknown>,
  fields: readonly string[],
  label: string,
): void {
  for (const field of fields) {
    if (typeof value[field] !== "string") {
      throw new TypeError(`${label}.${field} must be a string`);
    }
  }
}

function requireOptionalStringField(
  value: Record<string, unknown>,
  field: string,
  label: string,
): void {
  if (value[field] !== undefined && typeof value[field] !== "string") {
    throw new TypeError(`${label}.${field} must be a string when present`);
  }
}

function requireResolver(
  value: Record<string, unknown>,
  field: string,
): void {
  if (typeof value[field] !== "function") {
    throw new TypeError(`resolvers.${field} must be a function`);
  }
}

function requireDenseRecordArray(value: unknown, label: string): void {
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} must be an array`);
  }
  for (let index = 0; index < value.length; index += 1) {
    requireRecord(value[index], `${label}[${index}]`);
  }
}

function assertRuntimePresentationInput(
  value: unknown,
): asserts value is TokenEconomyPresentationInput {
  const input = requireRecord(value, "Token economy presentation input");
  const balances = requireRecord(input.balances, "balances");
  requireStringFields(
    balances,
    [
      "schemaVersion",
      "walletId",
      "available",
      "reserved",
      "held",
      "rewardProgress",
      "asOf",
    ],
    "balances",
  );
  if (
    typeof balances.version !== "number" ||
    !Number.isSafeInteger(balances.version)
  ) {
    throw new TypeError("balances.version must be a safe integer number");
  }

  const lifetimeTotals = requireRecord(input.lifetimeTotals, "lifetimeTotals");
  requireStringFields(
    lifetimeTotals,
    [
      "schemaVersion",
      "bought",
      "earned",
      "allocated",
      "reclaimed",
      "spent",
      "reversed",
    ],
    "lifetimeTotals",
  );

  if (!Array.isArray(input.activities)) {
    throw new TypeError("activities must be an array");
  }
  for (let index = 0; index < input.activities.length; index += 1) {
    const candidate = input.activities[index];
    const entry = requireRecord(candidate, `activities[${index}]`);
    requireStringFields(
      entry,
      [
        "schemaVersion",
        "transactionId",
        "activityType",
        "status",
        "occurredAt",
        "amount",
        "source",
        "sourceLabel",
      ],
      `activities[${index}]`,
    );
    requireOptionalStringField(entry, "beneficiaryAccountId", `activities[${index}]`);
    requireOptionalStringField(entry, "maskedReference", `activities[${index}]`);
  }

  const resolvers = requireRecord(input.resolvers, "resolvers");
  for (const field of ["activityTitle", "activityStatus", "occurredAt"] as const) {
    requireResolver(resolvers, field);
  }
  if (resolvers.beneficiary !== undefined) {
    requireResolver(resolvers, "beneficiary");
  }
}

function assertRuntimePortfolioPresentationInput(
  value: unknown,
): asserts value is TokenPortfolioEconomyPresentationInput {
  const input = requireRecord(
    value,
    "Token portfolio economy presentation input",
  );
  const portfolioSummary = requireRecord(
    input.portfolioSummary,
    "portfolioSummary",
  );
  const portfolioLifetime = requireRecord(
    input.portfolioLifetime,
    "portfolioLifetime",
  );
  requireDenseRecordArray(
    portfolioSummary.components,
    "portfolioSummary.components",
  );
  requireDenseRecordArray(
    portfolioLifetime.components,
    "portfolioLifetime.components",
  );
  requireDenseRecordArray(input.activities, "activities");

  const resolvers = requireRecord(input.resolvers, "resolvers");
  for (const field of [
    "activityTitle",
    "activityStatus",
    "occurredAt",
    "componentLabel",
  ] as const) {
    requireResolver(resolvers, field);
  }
  if (resolvers.beneficiary !== undefined) {
    requireResolver(resolvers, "beneficiary");
  }
}

function requireResolverText(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new TypeError(`${label} resolver must return a string`);
  }
  return value;
}

/**
 * Maps validated authoritative economy contracts into non-authoritative UI
 * presentation values. Signed activity amounts become an explicit direction
 * and a non-negative magnitude without losing bigint precision.
 */
export interface CreateTokenEconomyPresentation {
  (input: TokenEconomyPresentationInput): TokenEconomyPresentation;
  (input: unknown): TokenEconomyPresentation;
}

export const createTokenEconomyPresentation: CreateTokenEconomyPresentation = (
  input: unknown,
): TokenEconomyPresentation => {
  assertRuntimePresentationInput(input);
  assertWalletBalanceSummary(input.balances);
  assertWalletLifetimeTotals(input.lifetimeTotals);

  const activities = input.activities.map((entry): TokenActivityPresentation => {
    assertActivityEntry(entry);
    const signedAmount = parseTokenSubunits(entry.amount);
    const beneficiaryLabel =
      entry.beneficiaryAccountId === undefined
        ? undefined
        : input.resolvers.beneficiary?.(entry.beneficiaryAccountId);
    if (beneficiaryLabel !== undefined && typeof beneficiaryLabel !== "string") {
      throw new TypeError("beneficiary resolver must return a string or undefined");
    }

    return {
      id: entry.transactionId,
      activityType: entry.activityType,
      status: entry.status,
      title: requireResolverText(
        input.resolvers.activityTitle(entry.activityType),
        "activityTitle",
      ),
      direction: signedAmount < 0n ? "debit" : "credit",
      amountSubunits: (signedAmount < 0n ? -signedAmount : signedAmount).toString(10),
      sourceKey: entry.source,
      sourceLabel: entry.sourceLabel,
      statusLabel: requireResolverText(
        input.resolvers.activityStatus(entry.status),
        "activityStatus",
      ),
      occurredAt: entry.occurredAt,
      occurredAtLabel: requireResolverText(
        input.resolvers.occurredAt(entry.occurredAt),
        "occurredAt",
      ),
      ...(entry.beneficiaryAccountId === undefined
        ? {}
        : { beneficiaryAccountId: entry.beneficiaryAccountId }),
      ...(beneficiaryLabel === undefined ? {} : { beneficiaryLabel }),
      ...(entry.maskedReference === undefined
        ? {}
        : { maskedReference: entry.maskedReference }),
    };
  });

  return {
    balances: {
      availableSubunits: input.balances.available,
      reservedSubunits: input.balances.reserved,
      heldSubunits: input.balances.held,
      rewardProgressSubunits: input.balances.rewardProgress,
    },
    lifetimeTotals: {
      boughtSubunits: input.lifetimeTotals.bought,
      earnedSubunits: input.lifetimeTotals.earned,
      allocatedSubunits: input.lifetimeTotals.allocated,
      reclaimedSubunits: input.lifetimeTotals.reclaimed,
      spentSubunits: input.lifetimeTotals.spent,
      reversedSubunits: input.lifetimeTotals.reversed,
    },
    activities,
  };
};

function mapBalancePresentation(
  balances: WalletBalanceSummaryV1,
): TokenBalancePresentation {
  return {
    availableSubunits: balances.available,
    reservedSubunits: balances.reserved,
    heldSubunits: balances.held,
    rewardProgressSubunits: balances.rewardProgress,
  };
}

function mapLifetimePresentation(
  lifetimeTotals: WalletLifetimeTotalsV1,
): TokenLifetimeTotalsPresentation {
  return {
    boughtSubunits: lifetimeTotals.bought,
    earnedSubunits: lifetimeTotals.earned,
    allocatedSubunits: lifetimeTotals.allocated,
    reclaimedSubunits: lifetimeTotals.reclaimed,
    spentSubunits: lifetimeTotals.spent,
    reversedSubunits: lifetimeTotals.reversed,
  };
}

function resolveBeneficiaryLabel(
  accountId: string | undefined,
  resolvers: TokenEconomyPresentationResolvers,
): string | undefined {
  if (accountId === undefined) {
    return undefined;
  }
  const label = resolvers.beneficiary?.(accountId);
  if (label !== undefined && typeof label !== "string") {
    throw new TypeError("beneficiary resolver must return a string or undefined");
  }
  return label;
}

/**
 * Maps an account-aware portfolio without flattening wallet identity, role, or
 * beneficiary boundaries. Totals are copied only from validated authoritative
 * projections; activity never contributes to them.
 */
export interface CreateTokenPortfolioEconomyPresentation {
  (
    input: TokenPortfolioEconomyPresentationInput,
  ): TokenPortfolioEconomyPresentation;
  (input: unknown): TokenPortfolioEconomyPresentation;
}

export const createTokenPortfolioEconomyPresentation:
  CreateTokenPortfolioEconomyPresentation = (
  input: unknown,
): TokenPortfolioEconomyPresentation => {
  assertRuntimePortfolioPresentationInput(input);
  assertWalletPortfolioSummary(input.portfolioSummary);
  assertWalletPortfolioLifetime(input.portfolioLifetime);

  if (
    input.portfolioSummary.portfolioId !==
      input.portfolioLifetime.portfolioId ||
    input.portfolioSummary.subjectAccountId !==
      input.portfolioLifetime.subjectAccountId
  ) {
    throw new TypeError(
      "Portfolio summary and lifetime must identify the same portfolio and subject",
    );
  }

  const lifetimeComponents = new Map(
    input.portfolioLifetime.components.map((component) => [
      component.walletId,
      component,
    ]),
  );
  if (
    input.portfolioSummary.components.length !== lifetimeComponents.size
  ) {
    throw new TypeError(
      "Portfolio summary and lifetime must contain the same wallet components",
    );
  }

  const walletComponents = input.portfolioSummary.components.map(
    (component): TokenWalletComponentPresentation => {
      const lifetimeComponent = lifetimeComponents.get(component.walletId);
      if (
        lifetimeComponent === undefined ||
        lifetimeComponent.role !== component.role ||
        lifetimeComponent.beneficiaryAccountId !==
          component.beneficiaryAccountId
      ) {
        throw new TypeError(
          "Portfolio summary and lifetime component boundaries must match",
        );
      }
      const beneficiaryLabel = resolveBeneficiaryLabel(
        component.beneficiaryAccountId,
        input.resolvers,
      );

      return {
        walletId: component.walletId,
        role: component.role,
        label: requireResolverText(
          input.resolvers.componentLabel(
            component.role,
            component.beneficiaryAccountId,
          ),
          "componentLabel",
        ),
        balances: mapBalancePresentation(component.summary),
        lifetimeTotals: mapLifetimePresentation(
          lifetimeComponent.snapshot.totals,
        ),
        ...(component.beneficiaryAccountId === undefined
          ? {}
          : { beneficiaryAccountId: component.beneficiaryAccountId }),
        ...(beneficiaryLabel === undefined ? {} : { beneficiaryLabel }),
      };
    },
  );

  const authorizedWalletIds = new Set(
    walletComponents.map((component) => component.walletId),
  );
  const activities = input.activities.map(
    (entry): TokenPortfolioActivityPresentation => {
      assertWalletActivityEntry(entry);
      if (!authorizedWalletIds.has(entry.walletId)) {
        throw new TypeError(
          "Portfolio activity contains a wallet outside the presented portfolio",
        );
      }
      const signedAmount = parseTokenSubunits(entry.amount);
      const beneficiaryLabel = resolveBeneficiaryLabel(
        entry.beneficiaryAccountId,
        input.resolvers,
      );

      const presentation: Omit<
        TokenActivityPresentation,
        "entryKind" | "transactionId" | "commandId"
      > & { walletId: string } = {
        id: entry.activityId,
        walletId: entry.walletId,
        activityType: entry.activityType,
        status: entry.status,
        title: requireResolverText(
          input.resolvers.activityTitle(entry.activityType),
          "activityTitle",
        ),
        direction: signedAmount < 0n ? "debit" : "credit",
        amountSubunits: (
          signedAmount < 0n ? -signedAmount : signedAmount
        ).toString(10),
        sourceKey: entry.source,
        sourceLabel: entry.sourceLabel,
        statusLabel: requireResolverText(
          input.resolvers.activityStatus(entry.status),
          "activityStatus",
        ),
        occurredAt: entry.occurredAt,
        occurredAtLabel: requireResolverText(
          input.resolvers.occurredAt(entry.occurredAt),
          "occurredAt",
        ),
        ...(entry.beneficiaryAccountId === undefined
          ? {}
          : { beneficiaryAccountId: entry.beneficiaryAccountId }),
        ...(beneficiaryLabel === undefined ? {} : { beneficiaryLabel }),
        ...(entry.maskedReference === undefined
          ? {}
          : { maskedReference: entry.maskedReference }),
      };

      return entry.entryKind === "economic"
        ? {
            ...presentation,
            entryKind: "economic",
            transactionId: entry.transactionId,
          }
        : {
            ...presentation,
            entryKind: "workflow",
            commandId: entry.commandId,
          };
    },
  );

  return {
    balances: {
      availableSubunits: input.portfolioSummary.totals.available,
      reservedSubunits: input.portfolioSummary.totals.reserved,
      heldSubunits: input.portfolioSummary.totals.held,
      rewardProgressSubunits: input.portfolioSummary.totals.rewardProgress,
    },
    lifetimeTotals: mapLifetimePresentation(input.portfolioLifetime.totals),
    walletComponents,
    activities,
  };
};

/** Filters on stable contract keys while the component renders localized text. */
export function filterTokenActivityPresentations(
  activities: readonly TokenActivityPresentation[],
  filter: TokenActivityPresentationFilter,
): readonly TokenActivityPresentation[] {
  const activityTypes = new Set(filter.activityTypes ?? []);
  const statuses = new Set(filter.statuses ?? []);
  const sourceKeys = new Set(filter.sourceKeys ?? []);
  const beneficiaryAccountIds = new Set(filter.beneficiaryAccountIds ?? []);
  const maskedReferences = new Set(filter.maskedReferences ?? []);
  const occurredFrom = filter.occurredFromInclusive === undefined
    ? undefined
    : parseIsoTimestamp(filter.occurredFromInclusive);
  const occurredBefore = filter.occurredBeforeExclusive === undefined
    ? undefined
    : parseIsoTimestamp(filter.occurredBeforeExclusive);

  return activities.filter((activity) => {
    const occurredAt = parseIsoTimestamp(activity.occurredAt);

    return (
      (activityTypes.size === 0 || activityTypes.has(activity.activityType)) &&
      (statuses.size === 0 || statuses.has(activity.status)) &&
      (sourceKeys.size === 0 || sourceKeys.has(activity.sourceKey)) &&
      (beneficiaryAccountIds.size === 0 ||
        (activity.beneficiaryAccountId !== undefined &&
          beneficiaryAccountIds.has(activity.beneficiaryAccountId))) &&
      (maskedReferences.size === 0 ||
        (activity.maskedReference !== undefined &&
          maskedReferences.has(activity.maskedReference))) &&
      (occurredFrom === undefined || occurredAt >= occurredFrom) &&
      (occurredBefore === undefined || occurredAt < occurredBefore)
    );
  });
}
