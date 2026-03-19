/* @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileRouteStatusPanel } from "../src/index.js";

vi.mock("@plasius/sharedcomponents", () => ({
  StatusPanel: ({
    title,
    description,
    meta,
    role = "status",
    actionLabel,
    onAction,
    actionDisabled,
  }: {
    title: string;
    description: string;
    meta?: string;
    role?: "status" | "alert";
    actionLabel?: string;
    onAction?: () => void;
    actionDisabled?: boolean;
  }) => (
    <section role={role} aria-label={title}>
      <p>{description}</p>
      {meta ? <p>{meta}</p> : null}
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} disabled={actionDisabled}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  ),
}));

describe("ProfileRouteStatusPanel", () => {
  it("renders the package-owned loading shell copy", () => {
    render(<ProfileRouteStatusPanel variant="loading" />);

    expect(
      screen.getByRole("status", { name: /loading profile settings/i }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Fetching the latest profile data before mounting the shared editor.",
      ),
    ).toBeTruthy();
  });

  it("renders provisioning trace context while the profile is being created", () => {
    render(
      <ProfileRouteStatusPanel variant="provisioning" requestId="profile-route-123" />,
    );

    expect(screen.getByText("Trace ID: profile-route-123")).toBeTruthy();
  });

  it("falls back to a pending trace identifier while provisioning", () => {
    render(<ProfileRouteStatusPanel variant="provisioning" />);

    expect(screen.getByText("Trace ID: pending")).toBeTruthy();
  });

  it("renders the retryable error shell and forwards retry actions", () => {
    const onRetry = vi.fn();

    render(
      <ProfileRouteStatusPanel
        variant="error"
        attempts={3}
        requestId="profile-route-456"
        onRetry={onRetry}
      />,
    );

    expect(
      screen.getByRole("alert", {
        name: /we could not load your profile settings/i,
      }),
    ).toBeTruthy();
    expect(screen.getByText("Attempts: 3 | Trace ID: profile-route-456")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Retry loading profile" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("falls back to an unavailable trace identifier for error states", () => {
    render(
      <ProfileRouteStatusPanel
        variant="error"
        onRetry={() => undefined}
        retryDisabled
      />,
    );

    expect(screen.getByText("Attempts: 0 | Trace ID: unavailable")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Retry loading profile" }).getAttribute("disabled"),
    ).not.toBeNull();
  });
});
