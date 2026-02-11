const PRIVATE_ID = Symbol("settings.id");
const PRIVATE_PARTITION_KEY = Symbol("settings.partitionKey");
import React, { useEffect } from "react";
import { createScopedStoreContext } from "@plasius/react-state";
import type { IState } from "@plasius/react-state";
import { useAuthorizedFetch } from "@plasius/auth";
import { useQuery, useMutation, useQueryClient } from "@plasius/react-query";
import type { SettingsEntity } from "@plasius/entity-manager";

export type SettingsState = IState & Record<string, unknown>;

export type SettingsAction =
  | { type: "update"; key: string; value: unknown }
  | { type: "reset" }
  | { type: "load"; payload: Partial<SettingsState> };

const initialState: SettingsState = {};

const reducer = (
  state: SettingsState,
  action: SettingsAction
): SettingsState => {
  switch (action.type) {
    case "update":
      return { ...state, [action.key]: action.value };
    case "load":
      return { ...state, ...action.payload };
    case "reset":
      return initialState;
    default:
      return state;
  }
};

export const SettingsStore = createScopedStoreContext<
  SettingsState,
  SettingsAction
>(reducer, initialState);

export const SettingsProvider = ({
  children,
  configUrl = "/settings",
}: {
  children: React.ReactNode;
  configUrl?: string;
}) => {
  return (
    <SettingsStore.Provider>
      <SettingsInitializer configUrl={configUrl}>{children}</SettingsInitializer>
    </SettingsStore.Provider>
  );
};

const SettingsInitializer = ({
  children,
  configUrl,
}: {
  children: React.ReactNode;
  configUrl: string;
}) => {
  const authorizedFetch = useAuthorizedFetch();
  const dispatch = SettingsStore.useDispatch();
  const state = SettingsStore.useStore();
  const queryClient = useQueryClient();

  type HiddenSettingsKeys = {
    [K in typeof PRIVATE_ID | typeof PRIVATE_PARTITION_KEY]?: string;
  };
  const toSettingsEntity = (state: SettingsState): SettingsEntity => {
    const hidden = state as SettingsState & HiddenSettingsKeys;
    return {
      id: hidden[PRIVATE_ID] ?? "",
      partitionKey: hidden[PRIVATE_PARTITION_KEY] ?? "",
      settings: state,
    } as unknown as SettingsEntity;
  };

  const fromSettingsEntity = (
    entity: SettingsEntity
  ): Partial<SettingsState> => {
    const result: Partial<SettingsState> = {
      ...(entity.settings as Record<string, unknown>),
    };
    Object.defineProperty(result, PRIVATE_ID, {
      value: entity.id,
      enumerable: false,
      writable: false,
    });
    Object.defineProperty(result, PRIVATE_PARTITION_KEY, {
      value: entity.partitionKey,
      enumerable: false,
      writable: false,
    });
    return result;
  };

  const { data } = useQuery<SettingsEntity>(
    "settings",
    async (): Promise<SettingsEntity> => {
      const res = await authorizedFetch(configUrl);
      if (!res.ok) throw new Error(`Load failed with status ${res.status}`);
      return (await res.json()) as SettingsEntity;
    }
  );

  useEffect(() => {
    if (data) {
      dispatch({ type: "load", payload: fromSettingsEntity(data) });
    }
  }, [data]);

  const saveMutation = useMutation(
    async () => {
      const res = await authorizedFetch(configUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toSettingsEntity(state)),
      });
      if (!res.ok) throw new Error(`Save failed with status ${res.status}`);
    },
    {
      onSuccess: () => {
        console.info("✅ Settings saved successfully.");
        queryClient.invalidateQuery("settings", async () => {
          const res = await authorizedFetch(configUrl);
          if (!res.ok) throw new Error(`Load failed with status ${res.status}`);
          const entity = (await res.json()) as SettingsEntity;
          return entity;
        });
      },
      onError: (err: unknown) => {
        console.error("❌ Error saving settings:", err);
      },
    }
  );

  useEffect(() => {
    return () => {
      void saveMutation.mutate();
    };
  }, [saveMutation]);

  return <>{children}</>;
};
