import { describe, expect, it } from "vitest";
import {
  serializeTokenSubunits,
  type ActivityEntryV1,
  type WalletBalanceSummaryV1,
  type WalletLifetimeTotalsV1,
} from "@plasius/economy";
import {
  createTokenEconomyPresentation,
  filterTokenActivityPresentations,
} from "../src/components/token-overview-panel/index.js";

const balances: WalletBalanceSummaryV1 = {
  schemaVersion: "1",
  walletId: "wallet:treasury",
  available: serializeTokenSubunits(50_000n),
  reserved: serializeTokenSubunits(10_000n),
  held: serializeTokenSubunits(500n),
  rewardProgress: serializeTokenSubunits(275n),
  version: 3,
  asOf: "2026-07-15T10:00:00.000Z",
};

const lifetimeTotals: WalletLifetimeTotalsV1 = {
  schemaVersion: "1",
  bought: serializeTokenSubunits(50_000n),
  earned: serializeTokenSubunits(275n),
  allocated: serializeTokenSubunits(10_000n),
  reclaimed: serializeTokenSubunits(1_000n),
  spent: serializeTokenSubunits(0n),
  reversed: serializeTokenSubunits(500n),
};

const activities: readonly ActivityEntryV1[] = [
  {
    schemaVersion: "1",
    transactionId: "txn:purchase:1",
    activityType: "purchase",
    status: "settled",
    occurredAt: "2026-07-15T08:30:00.000Z",
    amount: serializeTokenSubunits(50_000n),
    source: "shopify",
    beneficiaryAccountId: "account:household",
    maskedReference: "Order ending 1234",
    sourceLabel: "Shopify purchase",
  },
  {
    schemaVersion: "1",
    transactionId: "txn:refund:1",
    activityType: "refund",
    status: "reversed",
    occurredAt: "2026-07-15T09:30:00.000Z",
    amount: serializeTokenSubunits(-500n),
    source: "adjustment",
    sourceLabel: "Refund",
  },
];

const resolvers = {
  activityTitle: (activityType: string) => `title:${activityType}`,
  activityStatus: (status: string) => `status:${status}`,
  occurredAt: (timestamp: string) => `date:${timestamp}`,
  beneficiary: (accountId: string) =>
    accountId === "account:household" ? "Household treasury" : undefined,
};

describe("economy-to-profile presentation adapter", () => {
  it("maps balances and signed activity without precision or stable-key loss", () => {
    const presentation = createTokenEconomyPresentation({
      balances,
      lifetimeTotals,
      activities,
      resolvers,
    });

    expect(presentation.balances).toEqual({
      availableSubunits: "50000",
      reservedSubunits: "10000",
      heldSubunits: "500",
      rewardProgressSubunits: "275",
    });
    expect(presentation.lifetimeTotals.reversedSubunits).toBe("500");
    expect(presentation.activities).toEqual([
      expect.objectContaining({
        id: "txn:purchase:1",
        activityType: "purchase",
        status: "settled",
        sourceKey: "shopify",
        direction: "credit",
        amountSubunits: "50000",
        title: "title:purchase",
        statusLabel: "status:settled",
        beneficiaryLabel: "Household treasury",
        beneficiaryAccountId: "account:household",
      }),
      expect.objectContaining({
        id: "txn:refund:1",
        activityType: "refund",
        status: "reversed",
        direction: "debit",
        amountSubunits: "500",
      }),
    ]);
  });

  it("filters on stable activity/status/source/beneficiary values", () => {
    const presentation = createTokenEconomyPresentation({
      balances,
      lifetimeTotals,
      activities,
      resolvers,
    });

    expect(
      filterTokenActivityPresentations(presentation.activities, {
        activityTypes: ["purchase"],
        statuses: ["settled"],
        sourceKeys: ["shopify"],
        beneficiaryAccountIds: ["account:household"],
        maskedReferences: ["Order ending 1234"],
        occurredFromInclusive: "2026-07-15T08:00:00.000Z",
        occurredBeforeExclusive: "2026-07-15T09:00:00.000Z",
      }).map((activity) => activity.id),
    ).toEqual(["txn:purchase:1"]);
    expect(
      filterTokenActivityPresentations(presentation.activities, {
        statuses: ["failed"],
      }),
    ).toEqual([]);
  });

  it("uses an inclusive lower and exclusive upper activity time boundary", () => {
    const presentation = createTokenEconomyPresentation({
      balances,
      lifetimeTotals,
      activities,
      resolvers,
    });

    expect(
      filterTokenActivityPresentations(presentation.activities, {
        occurredFromInclusive: "2026-07-15T09:30:00.000Z",
      }).map((activity) => activity.id),
    ).toEqual(["txn:refund:1"]);
    expect(
      filterTokenActivityPresentations(presentation.activities, {
        occurredBeforeExclusive: "2026-07-15T09:30:00.000Z",
      }).map((activity) => activity.id),
    ).toEqual(["txn:purchase:1"]);
  });

  it("filters source, beneficiary, and masked reference independently", () => {
    const presentation = createTokenEconomyPresentation({
      balances,
      lifetimeTotals,
      activities,
      resolvers,
    });

    for (const filter of [
      { sourceKeys: ["shopify"] as const },
      { beneficiaryAccountIds: ["account:household"] },
      { maskedReferences: ["Order ending 1234"] },
    ]) {
      expect(
        filterTokenActivityPresentations(presentation.activities, filter).map(
          (activity) => activity.id,
        ),
      ).toEqual(["txn:purchase:1"]);
    }
    expect(
      filterTokenActivityPresentations(presentation.activities, {
        sourceKeys: ["bitlabs"],
      }),
    ).toEqual([]);
  });

  it("rejects an invalid economy DTO instead of presenting it", () => {
    expect(() =>
      createTokenEconomyPresentation({
        balances: {
          ...balances,
          available: serializeTokenSubunits(-1n),
        },
        lifetimeTotals,
        activities,
        resolvers,
      }),
    ).toThrowError(expect.objectContaining({ code: "INVALID_AMOUNT" }));
  });

  it("rejects numeric JSON amount fields before economy coercion", () => {
    expect(() =>
      createTokenEconomyPresentation({
        balances: {
          ...balances,
          available: 50_000,
        },
        lifetimeTotals,
        activities,
        resolvers,
      }),
    ).toThrowError(TypeError);
  });

  it("rejects sparse activity arrays before presentation mapping", () => {
    expect(() =>
      createTokenEconomyPresentation({
        balances,
        lifetimeTotals,
        activities: new Array<ActivityEntryV1>(1),
        resolvers,
      }),
    ).toThrowError("activities[0] must be an object");
  });

  it("rejects invalid host resolver return values", () => {
    expect(() =>
      createTokenEconomyPresentation({
        balances,
        lifetimeTotals,
        activities,
        resolvers: {
          ...resolvers,
          activityTitle: () => 42,
        },
      }),
    ).toThrowError(TypeError);
    expect(() =>
      createTokenEconomyPresentation({
        balances,
        lifetimeTotals,
        activities,
        resolvers: {
          ...resolvers,
          beneficiary: () => 42,
        },
      }),
    ).toThrowError(TypeError);
  });

  it("preserves the exact magnitude of signed bigint minimum activity", () => {
    const presentation = createTokenEconomyPresentation({
      balances,
      lifetimeTotals,
      activities: [
        {
          ...activities[1]!,
          amount: serializeTokenSubunits(-(2n ** 63n)),
        },
      ],
      resolvers,
    });

    expect(presentation.activities[0]).toEqual(
      expect.objectContaining({
        direction: "debit",
        amountSubunits: "9223372036854775808",
      }),
    );
  });
});
