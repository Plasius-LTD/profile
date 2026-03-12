# Changelog

All notable changes to this project will be documented in this file.

The format is based on **[Keep a Changelog](https://keepachangelog.com/en/1.1.0/)**, and this project adheres to **[Semantic Versioning](https://semver.org/spec/v2.0.0.html)**.

---

## [Unreleased]

- **Added**
  - `UserProvider` and `SettingsProvider` now accept injected transport clients so host applications can route profile and settings traffic through site-specific adapters instead of the built-in HTTP path.

- **Changed**
  - The default provider transport remains the existing `useAuthorizedFetch` HTTP implementation when no injected client is supplied, preserving backwards compatibility for current consumers.

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.16] - 2026-03-09

- **Added**
  - (placeholder)

- **Changed**
  - Raised the minimum `@plasius/schema` dependency to `^1.2.6` to align with field exposure and safe serialization support across shared packages.

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.15] - 2026-03-09

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - Fixed `UserProvider` profile saves to target `/users/{user.id}/update` instead of the entity partition key, preventing invalid `/users/undefined/update` and cross-tenant route construction.

- **Security**
  - (placeholder)

## [1.0.14] - 2026-03-04

- **Added**
  - Added explicit `@testing-library/dom` dev dependency for CI/runtime parity with `@testing-library/react`.

- **Changed**
  - Hardened CI compatibility for the new provider test suite by removing stale type-only imports and aligning test runtime dependencies.

- **Fixed**
  - Fixed CI failures on `main` caused by missing test runtime peer resolution (`@testing-library/dom`) and lint failures in new tests.

- **Security**
  - No security-impacting changes in unreleased scope.

## [1.0.13] - 2026-03-04

- **Added**
  - Added reducer/helper logic tests for `UserProvider` and `SettingsProvider`.
  - Added component-level provider initialization tests using `jsdom`.
  - Exported reusable provider logic primitives (`userReducer`, `settingsReducer`, load/persist helpers) for deterministic testing.

- **Changed**
  - Restored CI line-coverage gate to `>= 80%`.
  - Restored Vitest thresholds to `>= 80%` across lines/functions/statements/branches.

- **Fixed**
  - Replaced unstable provider behavior tests with deterministic logic-first tests to eliminate timing-dependent failures.

- **Security**
  - Added repository-wide private certificate-key ignore rules and removed tracked localhost private-key material.

## [1.0.9] - 2026-03-01

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - Enforced CommonJS runtime compatibility for dual-build output by generating and validating `dist-cjs/package.json` (`type: commonjs`) during build and package verification.
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.8] - 2026-03-01

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.7] - 2026-02-28

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.6] - 2026-02-22

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.5] - 2026-02-22

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.4] - 2026-02-12

- **Added**
  - Standalone public package scaffold at repository root with independent CI/CD, ADRs, and legal governance assets.

- **Changed**
  - Add dual ESM + CJS build outputs with `exports` entries and CJS artifacts in `dist-cjs/`.

- **Fixed**
  - Removed monorepo-relative TypeScript configuration coupling for standalone builds.

- **Security**
  - Added baseline public package governance and CLA documentation.

---

## Release process (maintainers)

1. Update `CHANGELOG.md` under **Unreleased** with user-visible changes.
2. Bump version in `package.json` following SemVer (major/minor/patch).
3. Move entries from **Unreleased** to a new version section with the current date.
4. Tag the release in Git (`vX.Y.Z`) and push tags.
5. Publish to npm (via CI/CD or `npm publish`).

> Tip: Use Conventional Commits in PR titles/bodies to make changelog updates easier.

---

[Unreleased]: https://github.com/Plasius-LTD/profile/compare/v1.0.16...HEAD

## [1.0.0] - 2026-02-11

- **Added**
  - Initial release.

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)
[1.0.4]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.4
[1.0.5]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.5
[1.0.6]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.6
[1.0.7]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.7
[1.0.8]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.8
[1.0.9]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.9
[1.0.13]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.13
[1.0.14]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.14
[1.0.15]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.15
[1.0.16]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.16
