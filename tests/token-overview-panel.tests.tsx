/* @vitest-environment jsdom */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  TokenOverviewPanel,
  createTokenOverviewPanelLabels,
  formatTokenSubunits,
  type TokenOverviewPanelLabels,
  type TokenOverviewPanelReadyProps,
} from "../src/components/token-overview-panel/index.js";

const labels = createTokenOverviewPanelLabels();

function createReadyProps(
  overrides: Partial<TokenOverviewPanelReadyProps> = {},
): TokenOverviewPanelReadyProps {
  return {
    state: "ready",
    labels,
    description: "Track the Tokens supplied by the authoritative wallet API.",
    balances: {
      availableSubunits: "1500",
      reservedSubunits: "2000",
      heldSubunits: "500",
      rewardProgressSubunits: "25",
    },
    lifetimeTotals: {
      boughtSubunits: "50000",
      earnedSubunits: "1250",
      allocatedSubunits: "2000",
      reclaimedSubunits: "1000",
      spentSubunits: "0",
      reversedSubunits: "500",
    },
    statuses: [
      {
        id: "early-backer",
        label: "Early-backer status: provisional",
        description: "Eligibility will be recalculated before any future reward.",
        tone: "positive",
      },
    ],
    actions: [
      {
        id: "shopify-pack",
        title: "Buy a Token pack",
        description: "Continue to the host-owned purchase flow.",
        actionLabel: "View Token packs",
      },
    ],
    activities: [
      {
        id: "purchase-1",
        activityType: "purchase",
        status: "settled",
        sourceKey: "shopify",
        title: "Token pack",
        direction: "credit",
        amountSubunits: "50000",
        sourceLabel: "Shopify purchase",
        statusLabel: "Completed",
        occurredAt: "2026-07-15T08:30:00.000Z",
        occurredAtLabel: "15 July 2026 at 09:30",
        beneficiaryLabel: "Household treasury",
        maskedReference: "Order •••1234",
      },
      {
        id: "reversal-1",
        activityType: "reversal",
        status: "reversed",
        sourceKey: "shopify",
        title: "Refund reversal",
        direction: "debit",
        amountSubunits: "500",
        sourceLabel: "Refund",
        statusLabel: "Reversed",
        occurredAt: "2026-07-15T10:00:00.000Z",
        occurredAtLabel: "15 July 2026 at 11:00",
      },
    ],
    unavailableUses: [
      {
        id: "gameplay",
        title: "Gameplay",
        description: "Token spending is not available yet.",
        detailsActionLabel: "Why is this unavailable?",
      },
    ],
    ...overrides,
  };
}

describe("formatTokenSubunits", () => {
  it("formats exact subunit values with BigInt precision", () => {
    expect(formatTokenSubunits("0")).toBe("0");
    expect(formatTokenSubunits("1")).toBe("0.001");
    expect(formatTokenSubunits("1500")).toBe("1.5");
    expect(formatTokenSubunits("9223372036854775807")).toBe(
      "9,223,372,036,854,775.807",
    );
    expect(formatTokenSubunits("1500", "de-DE")).toBe("1,5");
    expect(formatTokenSubunits("1500", "ar-EG")).toBe("١٫٥");
  });

  it.each(["", "01", "+1", "-1", "1.0", "not-an-amount", "00000000000000000000"])(
    "rejects non-canonical amount %j",
    (amount) => {
      expect(() => formatTokenSubunits(amount)).toThrow(TypeError);
    },
  );

  it("rejects values above signed bigint range", () => {
    expect(() => formatTokenSubunits("9223372036854775808")).toThrow(RangeError);
  });
});

describe("createTokenOverviewPanelLabels", () => {
  it("lets a host supply every localized label through its translator", () => {
    const translated = createTokenOverviewPanelLabels((key) => `translated:${key}`);

    expect(translated.heading).toBe("translated:profile.tokenOverview.heading");
    expect(translated.activityCredit).toBe(
      "translated:profile.tokenOverview.activity.direction.credit",
    );
    expect(translated.unavailableStatus).toBe(
      "translated:profile.tokenOverview.unavailableUses.status",
    );
  });
});

describe("TokenOverviewPanel", () => {
  it("renders explicit loading, error, and empty states", () => {
    const { rerender } = render(
      <TokenOverviewPanel state="loading" labels={labels} />,
    );

    expect(screen.getByRole("status").textContent).toContain("Loading Token activity");
    expect(screen.getByRole("region", { name: "Tokens" }).getAttribute("aria-busy"))
      .toBe("true");

    const onRetry = vi.fn();
    rerender(
      <TokenOverviewPanel
        state="error"
        labels={labels}
        errorMessage="The wallet service did not respond."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "The wallet service did not respond.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry loading Tokens" }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(<TokenOverviewPanel state="empty" labels={labels} />);
    expect(screen.getByRole("status").textContent).toContain(
      "No Token wallet to show",
    );
  });

  it("uses semantic definitions, data, time, and lists without losing bigint precision", () => {
    render(
      <TokenOverviewPanel
        {...createReadyProps({
          balances: {
            availableSubunits: "9223372036854775807",
            reservedSubunits: "1000",
            heldSubunits: "0",
            rewardProgressSubunits: "1",
          },
        })}
      />,
    );

    const balanceSection = screen
      .getByRole("heading", { name: "Current balances" })
      .closest("section");
    expect(balanceSection).not.toBeNull();
    expect(balanceSection?.querySelector("dl")).not.toBeNull();
    expect(
      within(balanceSection as HTMLElement).getByText(
        "9,223,372,036,854,775.807 Tokens",
      ),
    ).toBeTruthy();
    expect(within(balanceSection as HTMLElement).getByText("1 Token")).toBeTruthy();
    expect(balanceSection?.querySelectorAll("data").length).toBe(4);

    const activityHeading = screen.getByRole("heading", { name: "Token activity" });
    const activitySection = activityHeading.closest("section");
    expect(activitySection?.querySelector("ol")).not.toBeNull();
    expect(activitySection?.querySelectorAll("article").length).toBe(2);

    const purchaseTime = screen.getByText("15 July 2026 at 09:30");
    expect(purchaseTime.tagName).toBe("TIME");
    expect(purchaseTime.getAttribute("datetime")).toBe("2026-07-15T08:30:00.000Z");
    expect(screen.getByText("Credit")).toBeTruthy();
    expect(screen.getByText("Debit")).toBeTruthy();
    expect(screen.getByText("Order •••1234")).toBeTruthy();
    expect(screen.getByText("Unavailable")).toBeTruthy();
  });

  it("renders portfolio wallet components as visibly separate balance groups", () => {
    render(
      <TokenOverviewPanel
        {...createReadyProps({
          walletComponents: [
            {
              walletId: "wallet:household",
              role: "household-treasury",
              label: "Household treasury",
              balances: {
                availableSubunits: "50000",
                reservedSubunits: "10000",
                heldSubunits: "500",
                rewardProgressSubunits: "275",
              },
              lifetimeTotals: {
                boughtSubunits: "50000",
                earnedSubunits: "0",
                allocatedSubunits: "10000",
                reclaimedSubunits: "1000",
                spentSubunits: "0",
                reversedSubunits: "500",
              },
            },
            {
              walletId: "wallet:gameplay",
              role: "gameplay-allocation",
              label: "Gameplay allocation",
              beneficiaryAccountId: "account:child",
              beneficiaryLabel: "Alex",
              balances: {
                availableSubunits: "5000",
                reservedSubunits: "0",
                heldSubunits: "0",
                rewardProgressSubunits: "0",
              },
              lifetimeTotals: {
                boughtSubunits: "0",
                earnedSubunits: "0",
                allocatedSubunits: "5000",
                reclaimedSubunits: "0",
                spentSubunits: "0",
                reversedSubunits: "0",
              },
            },
          ],
        })}
      />,
    );

    const householdHeading = screen.getByRole("heading", {
      name: "Household treasury",
    });
    const householdCard = householdHeading.closest("li");
    const gameplayHeading = screen.getByRole("heading", {
      name: "Gameplay allocation",
    });
    const gameplayCard = gameplayHeading.closest("li");

    expect(householdCard).not.toBeNull();
    expect(gameplayCard).not.toBeNull();
    expect(
      within(householdCard as HTMLElement).getByText("50 Tokens"),
    ).toBeTruthy();
    expect(
      within(gameplayCard as HTMLElement).getByText("5 Tokens"),
    ).toBeTruthy();
    expect(within(gameplayCard as HTMLElement).getByText("Alex")).toBeTruthy();
  });

  it("renders a localized activity empty state while retaining zero balances", () => {
    render(
      <TokenOverviewPanel
        {...createReadyProps({
          activities: [],
          balances: {
            availableSubunits: "0",
            reservedSubunits: "0",
            heldSubunits: "0",
            rewardProgressSubunits: "0",
          },
        })}
      />,
    );

    expect(screen.getByText("No Token activity to show yet.")).toBeTruthy();
    expect(screen.queryByRole("list", { name: /token activity/i })).toBeNull();
    expect(screen.getAllByText("0 Tokens").length).toBeGreaterThanOrEqual(4);
  });

  it("formats the exact magnitude of a signed bigint minimum debit", () => {
    render(
      <TokenOverviewPanel
        {...createReadyProps({
          activities: [
            {
              ...createReadyProps().activities[1]!,
              amountSubunits: "9223372036854775808",
            },
          ],
        })}
      />,
    );

    expect(
      screen.getByText("9,223,372,036,854,775.808 Tokens"),
    ).toBeTruthy();
  });

  it("announces balance refreshes politely and forwards host callbacks", () => {
    const onRefresh = vi.fn();
    const onAction = vi.fn();
    const onActivitySelect = vi.fn();
    const onUnavailableUseSelect = vi.fn();
    const { rerender } = render(
      <TokenOverviewPanel
        {...createReadyProps({
          balanceAnnouncement: "Balances updated. Available balance is 1.5 Tokens.",
          onRefresh,
          onAction,
          onActivitySelect,
          onUnavailableUseSelect,
        })}
      />,
    );

    const liveStatus = screen.getByRole("status");
    expect(liveStatus.getAttribute("aria-live")).toBe("polite");
    expect(liveStatus.textContent).toContain("Balances updated");

    fireEvent.click(screen.getByRole("button", { name: "Refresh balances" }));
    fireEvent.click(screen.getByRole("button", { name: "View Token packs" }));
    fireEvent.click(screen.getByRole("button", { name: "Token pack" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Why is this unavailable?" }),
    );

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith("shopify-pack");
    expect(onActivitySelect).toHaveBeenCalledWith("purchase-1");
    expect(onUnavailableUseSelect).toHaveBeenCalledWith("gameplay");

    rerender(
      <TokenOverviewPanel
        {...createReadyProps({
          isRefreshing: true,
          onRefresh,
        })}
      />,
    );

    const refreshButton = screen.getByRole("button", { name: "Refreshing balances" });
    expect(refreshButton.getAttribute("disabled")).not.toBeNull();
    expect(screen.getByRole("status").textContent).toBe("Refreshing balances");
  });

  it("does not expose action controls unless the host supplies callbacks", () => {
    render(<TokenOverviewPanel {...createReadyProps()} />);

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Buy a Token pack")).toBeTruthy();
    expect(screen.getByText("Token pack")).toBeTruthy();
  });

  it("respects disabled host actions and retry controls", () => {
    const onAction = vi.fn();
    const { rerender } = render(
      <TokenOverviewPanel
        {...createReadyProps({
          actions: [
            {
              id: "offerwall",
              title: "Offerwall",
              description: "Not currently eligible.",
              actionLabel: "Open offerwall",
              disabled: true,
              disabledReason: "Verified adults only.",
            },
          ],
          onAction,
        })}
      />,
    );

    const disabledAction = screen.getByRole("button", { name: "Open offerwall" });
    fireEvent.click(disabledAction);
    expect(disabledAction.getAttribute("disabled")).not.toBeNull();
    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByText("Verified adults only.")).toBeTruthy();

    const onRetry = vi.fn();
    rerender(
      <TokenOverviewPanel
        state="error"
        labels={labels}
        onRetry={onRetry}
        retryDisabled
      />,
    );
    const retry = screen.getByRole("button", { name: "Retry loading Tokens" });
    fireEvent.click(retry);
    expect(retry.getAttribute("disabled")).not.toBeNull();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("accepts fully host-supplied labels without consulting profile state", () => {
    const hostLabels: TokenOverviewPanelLabels = {
      ...labels,
      heading: "Wallet Tokens",
      activityCredit: "Added",
      activityDebit: "Removed",
    };

    render(<TokenOverviewPanel {...createReadyProps({ labels: hostLabels })} />);

    expect(screen.getByRole("heading", { name: "Wallet Tokens" })).toBeTruthy();
    expect(screen.getByText("Added")).toBeTruthy();
    expect(screen.getByText("Removed")).toBeTruthy();
  });

  it("nests activity headings beneath level-four section headings", () => {
    render(
      <TokenOverviewPanel {...createReadyProps()} headingLevel={3} />,
    );

    expect(
      screen.getByRole("heading", { level: 5, name: "Token pack" }),
    ).toBeTruthy();
  });
});
