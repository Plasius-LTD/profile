// @vitest-environment jsdom

import React from "react";
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsProvider } from "../src/SettingsProvider.js";

const {
  authorizedFetchMock,
  useQueryMock,
  useMutationMock,
  invalidateQueryMock,
} = vi.hoisted(() => ({
  authorizedFetchMock: vi.fn(),
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
  invalidateQueryMock: vi.fn(),
}));

vi.mock("@plasius/auth", () => ({
  useAuthorizedFetch: () => authorizedFetchMock,
}));

vi.mock("@plasius/react-query", () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: (...args: unknown[]) => useMutationMock(...args),
  useQueryClient: () => ({
    invalidateQuery: (...args: unknown[]) => invalidateQueryMock(...args),
  }),
}));

function okJson(payload: unknown): {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
} {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  };
}

beforeEach(() => {
  authorizedFetchMock.mockReset();
  useQueryMock.mockReset();
  useMutationMock.mockReset();
  invalidateQueryMock.mockReset();

  useQueryMock.mockReturnValue({ data: undefined });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SettingsProvider component behavior", () => {
  it("loads settings, persists on unmount, and invalidates cached query on success", async () => {
    const settingsEntity = {
      id: "settings-1",
      partitionKey: "123456789012345678901",
      settings: { theme: "dark" },
    };
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    authorizedFetchMock.mockImplementation(
      async (_url: string, init?: { method?: string }) => {
        if (init?.method === "POST") {
          return okJson({});
        }
        return okJson(settingsEntity);
      }
    );

    useQueryMock.mockImplementation(
      (_key: unknown, fetcher: () => Promise<unknown>) => {
        void fetcher();
        return { data: settingsEntity };
      }
    );

    invalidateQueryMock.mockImplementation(
      async (_key: unknown, refetch: () => Promise<unknown>) => refetch()
    );

    useMutationMock.mockImplementation(
      (mutateFn: () => Promise<unknown>, options?: { onSuccess?: () => void; onError?: (error: unknown) => void }) => ({
        mutate: async () => {
          try {
            await mutateFn();
            options?.onSuccess?.();
          } catch (error) {
            options?.onError?.(error);
          }
        },
      })
    );

    const { unmount } = render(
      <SettingsProvider configUrl="/settings/config">
        <div>child</div>
      </SettingsProvider>
    );

    unmount();

    await waitFor(() => {
      expect(authorizedFetchMock).toHaveBeenCalledWith(
        "/settings/config",
        expect.objectContaining({ method: "POST" })
      );
    });

    await waitFor(() => {
      expect(invalidateQueryMock).toHaveBeenCalledWith("settings", expect.any(Function));
    });

    expect(infoSpy).toHaveBeenCalledWith("✅ Settings saved successfully.");
  });

  it("logs save errors through mutation onError callback", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const settingsEntity = {
      id: "settings-2",
      partitionKey: "123456789012345678901",
      settings: { theme: "light" },
    };

    authorizedFetchMock.mockResolvedValue(okJson(settingsEntity));
    useQueryMock.mockReturnValue({ data: settingsEntity });
    useMutationMock.mockImplementation(
      (_mutateFn: () => Promise<unknown>, options?: { onError?: (error: unknown) => void }) => ({
        mutate: async () => {
          options?.onError?.(new Error("save failed"));
        },
      })
    );

    const { unmount } = render(
      <SettingsProvider configUrl="/settings/config">
        <div>child</div>
      </SettingsProvider>
    );

    unmount();

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        "❌ Error saving settings:",
        expect.any(Error)
      );
    });
  });

  it("uses an injected settings client without calling the auth fetch hook", async () => {
    const client = {
      load: vi.fn().mockResolvedValue({
        id: "settings-4",
        partitionKey: "123456789012345678901",
        settings: { theme: "dark" },
      }),
      save: vi.fn().mockResolvedValue(undefined),
    };

    useQueryMock.mockImplementation(
      (_key: unknown, fetcher: () => Promise<unknown>) => {
        void fetcher();
        return { data: undefined };
      }
    );
    useMutationMock.mockImplementation(
      (mutateFn: () => Promise<unknown>, options?: { onSuccess?: () => void; onError?: (error: unknown) => void }) => ({
        mutate: async () => {
          try {
            await mutateFn();
            options?.onSuccess?.();
          } catch (error) {
            options?.onError?.(error);
          }
        },
      })
    );

    const { unmount } = render(
      <SettingsProvider configUrl="/settings/config" client={client}>
        <div>child</div>
      </SettingsProvider>
    );

    unmount();

    await waitFor(() => {
      expect(client.load).toHaveBeenCalledWith("/settings/config");
      expect(client.save).toHaveBeenCalledWith("/settings/config", expect.any(Object));
    });

    expect(authorizedFetchMock).not.toHaveBeenCalled();
  });
});
