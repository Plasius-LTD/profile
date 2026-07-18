# @plasius/profile

[![npm version](https://img.shields.io/npm/v/@plasius/profile.svg)](https://www.npmjs.com/package/@plasius/profile)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Plasius-LTD/profile/ci.yml?branch=main&label=build&style=flat)](https://github.com/Plasius-LTD/profile/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/codecov/c/github/Plasius-LTD/profile)](https://codecov.io/gh/Plasius-LTD/profile)
[![License](https://img.shields.io/github/license/Plasius-LTD/profile)](./LICENSE)
[![Code of Conduct](https://img.shields.io/badge/code%20of%20conduct-yes-blue.svg)](./CODE_OF_CONDUCT.md)
[![Security Policy](https://img.shields.io/badge/security%20policy-yes-orange.svg)](./SECURITY.md)
[![Changelog](https://img.shields.io/badge/changelog-md-blue.svg)](./CHANGELOG.md)

Public package containing user/profile state and settings providers for Plasius React applications.


## Install

```bash
npm install @plasius/profile
```

## Module formats

This package publishes dual ESM and CJS artifacts.
When CJS output is emitted under `dist-cjs/*.js` with `type: module`, `dist-cjs/package.json` is generated with `{ "type": "commonjs" }` to ensure Node `require(...)` compatibility.


## Usage

```ts
import {
  ProfileRouteStatusPanel,
  SettingsProvider,
  TokenOverviewPanel,
  UserProvider,
  createAccessibleActionBindings,
  createAccessibleFieldBindings,
  createTokenEconomyPresentation,
  createTokenOverviewPanelLabels,
  profileTranslations,
} from "@plasius/profile";
```

`UserProvider` loads and persists the active profile by the user entity `id`. Applications should treat `partitionKey` as storage metadata, not as the profile route identifier.

Both providers also support transport injection so host applications can keep site-specific data access outside the shared package:

```tsx
import {
  SettingsProvider,
  UserProvider,
  type SettingsDataClient,
  type UserProfileClient,
} from "@plasius/profile";

const userClient: UserProfileClient = {
  load: async (userId) => graphBackedUserClient.load(userId),
  create: async (userId) => graphBackedUserClient.create(userId),
  save: async (user) => graphBackedUserClient.save(user),
};

const settingsClient: SettingsDataClient = {
  load: async (configUrl) => graphBackedSettingsClient.load(configUrl),
  save: async (configUrl, state) => graphBackedSettingsClient.save(configUrl, state),
};

<UserProvider client={userClient}>
  <SettingsProvider configUrl="/settings" client={settingsClient}>
    <App />
  </SettingsProvider>
</UserProvider>;
```

If `client` is omitted, the package keeps its legacy HTTP behavior via `@plasius/auth/useAuthorizedFetch`.

### Controlled settings and host policies

`SettingsPage` keeps its self-service defaults when rendered without new props.
Hosts that need an explicit review/commit flow can supply `onSubmit`, controlled
busy/error state, and declarative field/action policies. Supplying `onSubmit`
switches field and avatar changes to a component-local draft, so they do not
enter `UserStore` or trigger provider autosave before the host reviews them. The
callback runs only after that draft passes the package schema.

```tsx
<SettingsPage
  formId="admin-profile-review"
  fieldPolicies={{
    avatar: "read-only",
    email: "read-only",
    emailPreferences: "hidden",
  }}
  actionPolicies={{
    avatarUpload: "hidden",
    avatarRemove: "enabled",
    submit: "hidden",
  }}
  isSubmitting={commitProfile.isPending}
  submitError={commitProfile.displaySafeError}
  onSubmit={(profile) => commitProfile.mutateAsync(profile)}
/>

<button type="submit" form="admin-profile-review">
  Commit reviewed profile
</button>
```

Field policies are `editable`, `read-only`, or `hidden`. Action policies are
`enabled`, `disabled`, or `hidden`. Omitted fields remain editable; avatar upload
and the built-in submit action remain enabled, while avatar removal remains
hidden to preserve the existing self-service surface. `hideAvatarField` is
retained for compatibility and takes precedence over `fieldPolicies.avatar`.

An enabled avatar-removal action updates the in-memory profile draft by clearing
`avatar`; it never calls an endpoint directly. This lets a host show the
before/after change in its own review surface before `onSubmit` persists it.
An async `onSubmit` disables the package controls while pending. Rejections use
package-owned generic copy so internal errors are not disclosed; a host can
supply display-safe `submitError` text for controlled failures.

When the submit action is hidden, implicit form submission is also blocked.
Only an explicit submit control outside the form that references `formId` can
invoke the host callback. Validation failures belonging to hidden fields are
promoted to the form-level error summary, so policy-driven hiding cannot conceal
an invalid draft from the reviewer.

These policies govern presentation only. A host must still evaluate its stored
feature flag and authoritative capabilities, constrain the submitted DTO, and
enforce authorization again at the mutation boundary. The Admin integration
inherits `admin.workspace.touch-first.enabled`; disabling that flag should
remove the host-owned Admin editor without changing self-service defaults.

### Translation bundles

Package-owned UI copy is exposed as `profileTranslations` and stable
`profileTranslationKeys` for host applications that use
`@plasius/translations`.

```tsx
import { I18nProvider, getTranslator } from "@plasius/translations";
import { profileTranslations } from "@plasius/profile";

getTranslator().loadTranslations("en-GB", profileTranslations["en-GB"], {
  replace: false,
});

<I18nProvider initialLang="en-GB">
  <ProfileRouteStatusPanel variant="loading" />
</I18nProvider>;
```

The React components fall back to the packaged `en-GB` defaults when a host
translator has not loaded those keys. Host-supplied props such as
`AvatarUploadPanel` labels and descriptions remain explicit overrides.

Profile-specific route shells are also exported so host applications can keep route state locally while reusing package-owned copy and composition:

```tsx
<ProfileRouteStatusPanel variant="loading" />
<ProfileRouteStatusPanel variant="provisioning" requestId="profile-route-123" />
<ProfileRouteStatusPanel
  variant="error"
  attempts={3}
  requestId="profile-route-123"
  onRetry={() => refetchProfile()}
/>
```

For host-owned profile/account controls, the package also exports accessibility helpers so consumers can keep stable field and action semantics aligned with the shared settings surfaces:

```ts
const fieldA11y = createAccessibleFieldBindings({
  idPrefix: "profile-delete",
  name: "confirmation-text",
  description: "Type DELETE to confirm account removal.",
  error: confirmationError,
});

const actionA11y = createAccessibleActionBindings({
  idPrefix: "profile-delete",
  action: "delete-account",
  description: "Deleting your account starts a grace period before permanent removal.",
  intent: "destructive",
});
```

The package task for feature `Plasius-LTD/plasius-ltd-site#706` inherits the parent rollout flag `profile.account.accessibility.enabled`; host applications remain responsible for evaluating that flag and deciding when to expose new accessibility-hardened flows.

### Token wallet presentation

`TokenOverviewPanel` is a prop-driven presentation boundary for site-owned Token
wallet data. It does not fetch, initialize payment or reward providers, use
browser storage, read `UserEntity`/`UserProvider`, autosave, or calculate a
balance. The host remains responsible for authentication, capability and
feature-flag decisions, authoritative API validation, and localized activity
copy.

`createTokenEconomyPresentation` accepts the released `@plasius/economy`
wallet-summary, lifetime-total, and activity contracts. It validates those
contracts at runtime, preserves stable activity/status keys for filtering, and
maps signed journal amounts to explicit Credit/Debit presentation values. It is
still a pure presentation adapter: it performs no network or economy command.
The same exports are available from `@plasius/profile/tokens`, allowing the host
route to lazy-load the Token boundary without importing unrelated profile UI.
`filterTokenActivityPresentations` supports activity type, status, stable
`TokenSource`, beneficiary account, masked reference, and inclusive-lower/
exclusive-upper UTC date filters without coupling localized labels to ledger
behavior.

All amount props contain non-negative TokenSubunits as canonical base-10 integer
strings. Balances and lifetime totals are bounded by signed 64-bit maximum;
activity magnitudes also represent the exact absolute value of signed 64-bit
minimum. Values are formatted with `BigInt`, using exactly 1,000 TokenSubunits
per displayed Token without passing the amount through a JavaScript `number`.

```tsx
import "@plasius/profile/tokens.css";
import {
  TokenOverviewPanel,
  createProfileTranslationResolver,
  createTokenEconomyPresentation,
  createTokenOverviewPanelLabels,
} from "@plasius/profile/tokens";
import { useI18n } from "@plasius/translations";

function WalletSummary() {
  const { t } = useI18n();
  const labels = createTokenOverviewPanelLabels(
    createProfileTranslationResolver(t),
  );
  const presentation = createTokenEconomyPresentation({
    balances: authoritativeWalletSummary,
    lifetimeTotals: authoritativeLifetimeTotals,
    activities: authoritativeActivityPage.items,
    resolvers: localizedEconomyResolvers,
  });

  return (
    <TokenOverviewPanel
      state="ready"
      labels={labels}
      balances={presentation.balances}
      lifetimeTotals={presentation.lifetimeTotals}
      activities={presentation.activities}
      statuses={localizedWalletStatuses}
      actions={localizedAcquisitionActions}
      unavailableUses={localizedUnavailableUses}
      balanceAnnouncement={localizedBalanceAnnouncement}
      onRefresh={refreshAuthoritativeWallet}
      onAction={(actionId) => openHostOwnedAction(actionId)}
      onActivitySelect={(activityId) => openActivity(activityId)}
    />
  );
}
```

The stylesheet is an explicit side-effect export. Keeping it separate makes the
ESM and CommonJS JavaScript entrypoints loadable in non-bundler runtimes while
allowing Vite/Webpack hosts to include the prefixed component styles in the
lazy route chunk.

The discriminated `state` prop also provides dedicated `loading`, `error`, and
`empty` presentations. In the ready state, balances and lifetime values use
semantic description lists and `<data>` elements; activity uses an ordered list,
semantic `<time>` values, and visible Credit/Debit text. Hosts can pass
`isRefreshing` and `balanceAnnouncement` to update the panel's polite live
region, and receive all refresh/action/activity selections through callbacks.

The parent rollout flag is `economy.tokens.enabled`; hosts must also require the
appropriate wallet capability before mounting the component. Rollback is a host
decision that hides or makes the route read-only. This package never interprets
the flag or capability and never mutates economy state.

## Development

```bash
npm ci
npm run build
npm test
```

## Governance

- Security policy: [SECURITY.md](./SECURITY.md)
- Code of conduct: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- ADRs: [docs/adrs](./docs/adrs)
- Legal docs: [legal](./legal)

## License

MIT
