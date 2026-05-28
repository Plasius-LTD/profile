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
  UserProvider,
  createAccessibleActionBindings,
  createAccessibleFieldBindings,
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
