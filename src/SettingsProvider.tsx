const PRIVATE_ID = Symbol("settings.id");
const PRIVATE_PARTITION_KEY = Symbol("settings.partitionKey");
import React, { useEffect, useMemo } from "react";
import { createScopedStoreContext } from "@plasius/react-state";
import type { IState } from "@plasius/react-state";
import { useAuthorizedFetch } from "@plasius/auth";
import { useQuery, useMutation, useQueryClient } from "@plasius/react-query";
import type { SettingsEntity } from "@plasius/entity-manager";
import {
  getProfileDefaultTranslation,
  profileTranslationKeys,
} from "./i18n.js";

export type SettingsState = IState & Record<string, unknown>;

export type SettingsAction =
  | { type: "update"; key: string; value: unknown }
  | { type: "reset" }
  | { type: "load"; payload: Partial<SettingsState> };

const initialState: SettingsState = {};

export const settingsReducer = (
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
>(settingsReducer, initialState);

type AuthorizedFetch = (
  input: string,
  init?: {
    credentials?: "include" | "omit" | "same-origin";
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export interface SettingsDataClient {
  load(configUrl: string): Promise<SettingsEntity>;
  save(configUrl: string, state: SettingsState): Promise<void>;
}

function isSettingsDataClient(
  clientOrFetch: AuthorizedFetch | SettingsDataClient,
): clientOrFetch is SettingsDataClient {
  return typeof clientOrFetch === "object" && clientOrFetch !== null;
}

export function createHttpSettingsDataClient(
  authorizedFetch: AuthorizedFetch,
): SettingsDataClient {
  return {
    load: async (configUrl: string): Promise<SettingsEntity> => {
      const response = await authorizedFetch(configUrl);
      if (!response.ok) {
        throw new Error(
          getProfileDefaultTranslation(
            profileTranslationKeys.provider.settingsLoadFailed,
            { status: response.status },
          ),
        );
      }
      return (await response.json()) as SettingsEntity;
    },
    save: async (configUrl: string, state: SettingsState): Promise<void> => {
      const response = await authorizedFetch(configUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toSettingsEntity(state)),
      });
      if (!response.ok) {
        throw new Error(
          getProfileDefaultTranslation(
            profileTranslationKeys.provider.settingsSaveFailed,
            { status: response.status },
          ),
        );
      }
    },
  };
}

function resolveSettingsDataClient(
  clientOrFetch: AuthorizedFetch | SettingsDataClient,
): SettingsDataClient {
  return isSettingsDataClient(clientOrFetch)
    ? clientOrFetch
    : createHttpSettingsDataClient(clientOrFetch);
}

type HiddenSettingsKeys = {
  [K in typeof PRIVATE_ID | typeof PRIVATE_PARTITION_KEY]?: string;
};

export function toSettingsEntity(state: SettingsState): SettingsEntity {
  const hidden = state as SettingsState & HiddenSettingsKeys;
  return {
    id: hidden[PRIVATE_ID] ?? "",
    partitionKey: hidden[PRIVATE_PARTITION_KEY] ?? "",
    settings: state,
  } as unknown as SettingsEntity;
}

export function fromSettingsEntity(entity: SettingsEntity): Partial<SettingsState> {
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
}

export async function loadSettingsEntity(
  clientOrFetch: AuthorizedFetch | SettingsDataClient,
  configUrl: string
): Promise<SettingsEntity> {
  const client = resolveSettingsDataClient(clientOrFetch);
  return client.load(configUrl);
}

export async function persistSettingsEntity(
  clientOrFetch: AuthorizedFetch | SettingsDataClient,
  configUrl: string,
  state: SettingsState
): Promise<void> {
  const client = resolveSettingsDataClient(clientOrFetch);
  await client.save(configUrl, state);
}

export interface SettingsProviderProps {
  children: React.ReactNode;
  configUrl?: string;
  client?: SettingsDataClient;
}

export const SettingsProvider = ({
  children,
  configUrl = "/settings",
  client,
}: SettingsProviderProps) => {
  return (
    <SettingsStore.Provider>
      <SettingsInitializer configUrl={configUrl} client={client}>
        {children}
      </SettingsInitializer>
    </SettingsStore.Provider>
  );
};

const SettingsInitializer = ({
  children,
  configUrl,
  client,
}: {
  children: React.ReactNode;
  configUrl: string;
  client?: SettingsDataClient;
}) => {
  const authorizedFetch = useAuthorizedFetch();
  const dispatch = SettingsStore.useDispatch();
  const state = SettingsStore.useStore();
  const queryClient = useQueryClient();
  const settingsClient = useMemo(
    () => client ?? createHttpSettingsDataClient(authorizedFetch),
    [authorizedFetch, client],
  );

  const { data } = useQuery<SettingsEntity>(
    "settings",
    async (): Promise<SettingsEntity> => loadSettingsEntity(settingsClient, configUrl)
  );

  useEffect(() => {
    if (data) {
      dispatch({ type: "load", payload: fromSettingsEntity(data) });
    }
  }, [data, dispatch]);

  const saveMutation = useMutation(
    async () => persistSettingsEntity(settingsClient, configUrl, state),
    {
      onSuccess: () => {
        console.info("✅ Settings saved successfully.");
        queryClient.invalidateQuery("settings", async () => {
          return loadSettingsEntity(settingsClient, configUrl);
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
