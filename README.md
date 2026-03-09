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
import { UserProvider, SettingsProvider } from "@plasius/profile";
```

`UserProvider` loads and persists the active profile by the user entity `id`. Applications should treat `partitionKey` as storage metadata, not as the profile route identifier.

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
