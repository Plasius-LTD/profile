/* @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileRouteStatusPanel } from "../src/index.js";

const { translationOverrides } = vi.hoisted(() => ({
  translationOverrides: new Map<string, string>(),
}));

vi.mock("@plasius/translations", () => ({
  useI18n: () => ({
    t: (key: string, args: Record<string, string | number | boolean> = {}) => {
      const value = translationOverrides.get(key) ?? key;
      return value.replace(/\{(\w+)\}/g, (_match, placeholder: string) => {
        const replacement = args[placeholder];
        return replacement === undefined ? `{${placeholder}}` : String(replacement);
      });
    },
  }),
}));

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
  beforeEach(() => {
    translationOverrides.clear();
  });

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

  it("uses provider translations for package-owned status text", () => {
    translationOverrides.set(
      "profile.routeStatus.loading.title",
      "Loading account profile",
    );
    translationOverrides.set(
      "profile.routeStatus.loading.description",
      "Fetching translated profile copy.",
    );

    render(<ProfileRouteStatusPanel variant="loading" />);

    expect(
      screen.getByRole("status", { name: /loading account profile/i }),
    ).toBeTruthy();
    expect(screen.getByText("Fetching translated profile copy.")).toBeTruthy();
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
