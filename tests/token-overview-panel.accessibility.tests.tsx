/* @vitest-environment jsdom */

import { render } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import {
  TokenOverviewPanel,
  createTokenOverviewPanelLabels,
  createTokenOverviewPanelPreviewLabels,
  type TokenOverviewPanelReadyProps,
} from "../src/components/token-overview-panel/index.js";

const labels = createTokenOverviewPanelLabels();
const previewLabels = createTokenOverviewPanelPreviewLabels();
const axeOptions: axe.RunOptions = {
  rules: {
    // jsdom does not implement the canvas APIs axe uses for computed contrast checks.
    "color-contrast": { enabled: false },
  },
};

const readyProps: TokenOverviewPanelReadyProps = {
  state: "ready",
  labels,
  balances: {
    availableSubunits: "1500",
    reservedSubunits: "1000",
    heldSubunits: "0",
    rewardProgressSubunits: "75",
  },
  lifetimeTotals: {
    boughtSubunits: "50000",
    earnedSubunits: "75",
    allocatedSubunits: "1000",
    reclaimedSubunits: "0",
    spentSubunits: "0",
    reversedSubunits: "0",
  },
  walletComponents: [
    {
      walletId: "wallet:household",
      role: "household-treasury",
      label: "Household treasury",
      balances: {
        availableSubunits: "1000",
        reservedSubunits: "1000",
        heldSubunits: "0",
        rewardProgressSubunits: "0",
      },
      lifetimeTotals: {
        boughtSubunits: "50000",
        earnedSubunits: "0",
        allocatedSubunits: "1000",
        reclaimedSubunits: "0",
        spentSubunits: "0",
        reversedSubunits: "0",
      },
    },
    {
      walletId: "wallet:personal",
      role: "personal",
      label: "Personal rewards",
      beneficiaryAccountId: "account:adult",
      beneficiaryLabel: "Your personal wallet",
      balances: {
        availableSubunits: "500",
        reservedSubunits: "0",
        heldSubunits: "0",
        rewardProgressSubunits: "75",
      },
      lifetimeTotals: {
        boughtSubunits: "0",
        earnedSubunits: "75",
        allocatedSubunits: "0",
        reclaimedSubunits: "0",
        spentSubunits: "0",
        reversedSubunits: "0",
      },
    },
  ],
  statuses: [
    {
      id: "early-backer",
      label: "Early-backer status: provisional",
      description: "No future reward is guaranteed.",
    },
  ],
  actions: [
    {
      id: "packs",
      title: "Buy Tokens",
      description: "Open the host purchase flow.",
      actionLabel: "View packs",
    },
  ],
  activities: [
    {
      id: "purchase",
      activityType: "purchase",
      status: "settled",
      sourceKey: "shopify",
      title: "Purchase completed",
      direction: "credit",
      amountSubunits: "50000",
      sourceLabel: "Shopify purchase",
      statusLabel: "Completed",
      occurredAt: "2026-07-15T08:30:00.000Z",
      occurredAtLabel: "15 July 2026 at 09:30",
      beneficiaryLabel: "Household treasury",
      maskedReference: "Order •••1234",
    },
  ],
  unavailableUses: [
    {
      id: "gameplay",
      title: "Gameplay",
      description: "Token spending is not available.",
      detailsActionLabel: "Learn why",
    },
  ],
  onRefresh: () => undefined,
  onAction: () => undefined,
  onActivitySelect: () => undefined,
  onUnavailableUseSelect: () => undefined,
};

describe("TokenOverviewPanel accessibility", () => {
  it("has no automated axe violations in the complete wallet state", async () => {
    const { container } = render(<TokenOverviewPanel {...readyProps} />);

    const result = await axe.run(container, axeOptions);

    expect(result.violations).toEqual([]);
  });

  it("has no automated axe violations with a nested heading level", async () => {
    const { container } = render(
      <TokenOverviewPanel {...readyProps} headingLevel={3} />,
    );

    const result = await axe.run(container, axeOptions);

    expect(result.violations).toEqual([]);
  });

  it.each(["loading", "error", "empty"] as const)(
    "has no automated axe violations in the %s state",
    async (state) => {
      const { container } = render(
        state === "error" ? (
          <TokenOverviewPanel
            state="error"
            labels={labels}
            onRetry={() => undefined}
          />
        ) : (
          <TokenOverviewPanel state={state} labels={labels} />
        ),
      );

      const result = await axe.run(container, axeOptions);

      expect(result.violations).toEqual([]);
    },
  );

  it("has no automated axe violations in the explicit no-wallet preview", async () => {
    const { container } = render(
      <TokenOverviewPanel
        state="preview"
        labels={labels}
        previewLabels={previewLabels}
      />,
    );

    const result = await axe.run(container, axeOptions);

    expect(result.violations).toEqual([]);
  });
});
