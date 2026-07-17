import { describe, expect, it } from "vitest";
import {
  serializeTokenSubunits,
  type ActivityEntryV1,
  type WalletActivityEntryV1,
  type WalletBalanceSummaryV1,
  type WalletLifetimeTotalsV1,
  type WalletPortfolioLifetimeV1,
  type WalletPortfolioSummaryV1,
} from "@plasius/economy";
import {
  createTokenEconomyPresentation,
  createTokenPortfolioEconomyPresentation,
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

const portfolioSummary: WalletPortfolioSummaryV1 = {
  schemaVersion: "1",
  portfolioId: "portfolio:account-aware",
  subjectAccountId: "account:adult",
  components: [
    {
      walletId: "wallet:household",
      role: "household-treasury",
      summary: {
        schemaVersion: "1",
        walletId: "wallet:household",
        available: serializeTokenSubunits(50_000n),
        reserved: serializeTokenSubunits(10_000n),
        held: serializeTokenSubunits(500n),
        rewardProgress: serializeTokenSubunits(275n),
        version: 4,
        asOf: "2026-07-15T10:00:00.000Z",
      },
    },
    {
      walletId: "wallet:personal",
      role: "personal",
      beneficiaryAccountId: "account:adult",
      summary: {
        schemaVersion: "1",
        walletId: "wallet:personal",
        available: serializeTokenSubunits(1_000n),
        reserved: serializeTokenSubunits(0n),
        held: serializeTokenSubunits(0n),
        rewardProgress: serializeTokenSubunits(125n),
        version: 2,
        asOf: "2026-07-15T10:00:00.000Z",
      },
    },
  ],
  totals: {
    available: serializeTokenSubunits(51_000n),
    reserved: serializeTokenSubunits(10_000n),
    held: serializeTokenSubunits(500n),
    rewardProgress: serializeTokenSubunits(400n),
  },
  asOf: "2026-07-15T10:00:00.000Z",
};

const zeroLifetimeTotals = (): WalletLifetimeTotalsV1 => ({
  schemaVersion: "1",
  bought: serializeTokenSubunits(0n),
  earned: serializeTokenSubunits(0n),
  allocated: serializeTokenSubunits(0n),
  reclaimed: serializeTokenSubunits(0n),
  spent: serializeTokenSubunits(0n),
  reversed: serializeTokenSubunits(0n),
});

const portfolioLifetime: WalletPortfolioLifetimeV1 = {
  schemaVersion: "1",
  portfolioId: "portfolio:account-aware",
  subjectAccountId: "account:adult",
  // Deliberately opposite to the summary order: pairing must use walletId.
  components: [
    {
      walletId: "wallet:personal",
      role: "personal",
      beneficiaryAccountId: "account:adult",
      snapshot: {
        schemaVersion: "1",
        walletId: "wallet:personal",
        totals: {
          ...zeroLifetimeTotals(),
          earned: serializeTokenSubunits(1_250n),
        },
        version: 2,
        asOf: "2026-07-15T10:05:00.000Z",
      },
    },
    {
      walletId: "wallet:household",
      role: "household-treasury",
      snapshot: {
        schemaVersion: "1",
        walletId: "wallet:household",
        totals: {
          ...zeroLifetimeTotals(),
          bought: serializeTokenSubunits(50_000n),
          allocated: serializeTokenSubunits(10_000n),
          reclaimed: serializeTokenSubunits(1_000n),
          reversed: serializeTokenSubunits(500n),
        },
        version: 4,
        asOf: "2026-07-15T10:05:00.000Z",
      },
    },
  ],
  totals: {
    schemaVersion: "1",
    bought: serializeTokenSubunits(50_000n),
    earned: serializeTokenSubunits(1_250n),
    allocated: serializeTokenSubunits(10_000n),
    reclaimed: serializeTokenSubunits(1_000n),
    spent: serializeTokenSubunits(0n),
    reversed: serializeTokenSubunits(500n),
  },
  asOf: "2026-07-15T10:05:00.000Z",
};

const portfolioActivities: readonly WalletActivityEntryV1[] = [
  {
    schemaVersion: "1",
    activityId: "activity:purchase:1",
    walletId: "wallet:household",
    entryKind: "economic",
    transactionId: "txn:purchase:portfolio:1",
    activityType: "purchase",
    status: "settled",
    occurredAt: "2026-07-15T09:30:00.000Z",
    amount: serializeTokenSubunits(50_000n),
    source: "shopify",
    maskedReference: "Order ending 1234",
    sourceLabel: "Shopify purchase",
  },
  {
    schemaVersion: "1",
    activityId: "activity:reward:pending:1",
    walletId: "wallet:personal",
    entryKind: "workflow",
    commandId: "command:reward:pending:1",
    activityType: "rewarded-ad",
    status: "pending",
    occurredAt: "2026-07-15T09:00:00.000Z",
    amount: serializeTokenSubunits(125n),
    source: "ayet",
    beneficiaryAccountId: "account:adult",
    sourceLabel: "Rewarded video",
  },
  {
    schemaVersion: "1",
    activityId: "activity:offerwall:failed:1",
    walletId: "wallet:personal",
    entryKind: "workflow",
    commandId: "command:offerwall:failed:1",
    activityType: "offerwall",
    status: "failed",
    occurredAt: "2026-07-15T08:45:00.000Z",
    amount: serializeTokenSubunits(500n),
    source: "bitlabs",
    beneficiaryAccountId: "account:adult",
    sourceLabel: "Offerwall",
  },
  {
    schemaVersion: "1",
    activityId: "activity:refund:minimum:1",
    walletId: "wallet:household",
    entryKind: "economic",
    transactionId: "txn:refund:minimum:1",
    activityType: "refund",
    status: "reversed",
    occurredAt: "2026-07-15T08:30:00.000Z",
    amount: serializeTokenSubunits(-(2n ** 63n)),
    source: "shopify",
    sourceLabel: "Refund",
  },
];

const portfolioResolvers = {
  ...resolvers,
  beneficiary: (accountId: string) =>
    accountId === "account:adult" ? "Personal wallet" : undefined,
  componentLabel: (role: string) =>
    role === "household-treasury" ? "Household treasury" : "Personal rewards",
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

  it("maps portfolio totals while retaining component order and wallet boundaries", () => {
    const presentation = createTokenPortfolioEconomyPresentation({
      portfolioSummary,
      portfolioLifetime,
      activities: portfolioActivities,
      resolvers: portfolioResolvers,
    });

    expect(presentation.balances).toEqual({
      availableSubunits: "51000",
      reservedSubunits: "10000",
      heldSubunits: "500",
      rewardProgressSubunits: "400",
    });
    expect(presentation.lifetimeTotals).toEqual({
      boughtSubunits: "50000",
      earnedSubunits: "1250",
      allocatedSubunits: "10000",
      reclaimedSubunits: "1000",
      spentSubunits: "0",
      reversedSubunits: "500",
    });
    expect(
      presentation.walletComponents.map((component) => component.walletId),
    ).toEqual(["wallet:household", "wallet:personal"]);
    expect(presentation.walletComponents[0]).toEqual(
      expect.objectContaining({
        role: "household-treasury",
        label: "Household treasury",
        balances: expect.objectContaining({ availableSubunits: "50000" }),
        lifetimeTotals: expect.objectContaining({ boughtSubunits: "50000" }),
      }),
    );
    expect(presentation.walletComponents[1]).toEqual(
      expect.objectContaining({
        role: "personal",
        label: "Personal rewards",
        beneficiaryAccountId: "account:adult",
        beneficiaryLabel: "Personal wallet",
        balances: expect.objectContaining({ rewardProgressSubunits: "125" }),
        lifetimeTotals: expect.objectContaining({ earnedSubunits: "1250" }),
      }),
    );
  });

  it("preserves economic and workflow activity discriminants and exact amounts", () => {
    const presentation = createTokenPortfolioEconomyPresentation({
      portfolioSummary,
      portfolioLifetime,
      activities: portfolioActivities,
      resolvers: portfolioResolvers,
    });

    expect(presentation.activities).toEqual([
      expect.objectContaining({
        id: "activity:purchase:1",
        entryKind: "economic",
        walletId: "wallet:household",
        transactionId: "txn:purchase:portfolio:1",
        status: "settled",
        direction: "credit",
        amountSubunits: "50000",
      }),
      expect.objectContaining({
        id: "activity:reward:pending:1",
        entryKind: "workflow",
        walletId: "wallet:personal",
        commandId: "command:reward:pending:1",
        status: "pending",
        direction: "credit",
        amountSubunits: "125",
      }),
      expect.objectContaining({
        id: "activity:offerwall:failed:1",
        entryKind: "workflow",
        walletId: "wallet:personal",
        commandId: "command:offerwall:failed:1",
        status: "failed",
        direction: "credit",
        amountSubunits: "500",
      }),
      expect.objectContaining({
        id: "activity:refund:minimum:1",
        entryKind: "economic",
        walletId: "wallet:household",
        transactionId: "txn:refund:minimum:1",
        status: "reversed",
        direction: "debit",
        amountSubunits: "9223372036854775808",
      }),
    ]);
    expect(
      filterTokenActivityPresentations(presentation.activities, {
        statuses: ["pending"],
      }).map((activity) => activity.id),
    ).toEqual(["activity:reward:pending:1"]);

    const workflow = presentation.activities[1]!;
    if (workflow.entryKind !== "workflow") {
      throw new Error("Expected a workflow presentation");
    }
    expect(workflow.commandId).toBe("command:reward:pending:1");
  });

  it("rejects cross-portfolio component and activity boundary mismatches", () => {
    expect(() =>
      createTokenPortfolioEconomyPresentation({
        portfolioSummary,
        portfolioLifetime: {
          ...portfolioLifetime,
          subjectAccountId: "account:another-adult",
        },
        activities: portfolioActivities,
        resolvers: portfolioResolvers,
      }),
    ).toThrowError("same portfolio and subject");

    const personalComponent = portfolioLifetime.components[0]!;
    expect(() =>
      createTokenPortfolioEconomyPresentation({
        portfolioSummary,
        portfolioLifetime: {
          ...portfolioLifetime,
          components: [personalComponent],
          totals: personalComponent.snapshot.totals,
        },
        activities: portfolioActivities,
        resolvers: portfolioResolvers,
      }),
    ).toThrowError("same wallet components");

    const mismatchedLifetime: WalletPortfolioLifetimeV1 = {
      ...portfolioLifetime,
      components: portfolioLifetime.components.map((component) =>
        component.walletId === "wallet:personal"
          ? { ...component, role: "hold" }
          : component,
      ),
    };
    expect(() =>
      createTokenPortfolioEconomyPresentation({
        portfolioSummary,
        portfolioLifetime: mismatchedLifetime,
        activities: portfolioActivities,
        resolvers: portfolioResolvers,
      }),
    ).toThrowError("component boundaries must match");

    expect(() =>
      createTokenPortfolioEconomyPresentation({
        portfolioSummary,
        portfolioLifetime,
        activities: [
          {
            ...portfolioActivities[0]!,
            walletId: "wallet:another-household",
          },
        ],
        resolvers: portfolioResolvers,
      }),
    ).toThrowError("outside the presented portfolio");
  });

  it("rejects sparse portfolio arrays and malformed exact amounts", () => {
    expect(() =>
      createTokenPortfolioEconomyPresentation({
        portfolioSummary,
        portfolioLifetime,
        activities: new Array<WalletActivityEntryV1>(1),
        resolvers: portfolioResolvers,
      }),
    ).toThrowError("activities[0] must be an object");

    expect(() =>
      createTokenPortfolioEconomyPresentation({
        portfolioSummary: {
          ...portfolioSummary,
          components: null,
        },
        portfolioLifetime,
        activities: portfolioActivities,
        resolvers: portfolioResolvers,
      }),
    ).toThrowError("portfolioSummary.components must be an array");

    expect(() =>
      createTokenPortfolioEconomyPresentation({
        portfolioSummary: {
          ...portfolioSummary,
          totals: {
            ...portfolioSummary.totals,
            available: 51_000,
          },
        },
        portfolioLifetime,
        activities: portfolioActivities,
        resolvers: portfolioResolvers,
      }),
    ).toThrowError();

    expect(() =>
      createTokenPortfolioEconomyPresentation({
        portfolioSummary,
        portfolioLifetime,
        activities: portfolioActivities,
        resolvers: {
          ...portfolioResolvers,
          beneficiary: () => 42,
        },
      }),
    ).toThrowError("beneficiary resolver must return a string or undefined");
  });
});
