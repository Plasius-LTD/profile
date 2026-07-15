import {
  assertActivityEntry,
  assertWalletBalanceSummary,
  assertWalletLifetimeTotals,
  parseIsoTimestamp,
  parseTokenSubunits,
  type ActivityEntryV1,
  type ActivityStatus,
  type ActivityType,
  type TokenSource,
  type WalletBalanceSummaryV1,
  type WalletLifetimeTotalsV1,
} from "@plasius/economy";
import type {
  TokenActivityPresentation,
  TokenBalancePresentation,
  TokenLifetimeTotalsPresentation,
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
