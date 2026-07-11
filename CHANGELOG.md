# Changelog

All notable changes to this project will be documented in this file.

The format is based on **[Keep a Changelog](https://keepachangelog.com/en/1.1.0/)**, and this project adheres to **[Semantic Versioning](https://semver.org/spec/v2.0.0.html)**.

---

## [Unreleased]

- **Added**
  - (placeholder)

- **Changed**
  - Refreshed direct runtime and development dependencies to the latest stable published versions available for the repository's compatibility constraints.
  - Retained TypeScript 6.x because the latest `@typescript-eslint/parser` release requires TypeScript `<6.1.0`; TypeScript 7.x is not a reproducible clean-install baseline until that peer range is updated upstream.

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.37] - 2026-06-22

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.36] - 2026-06-22

- **Added**
  - Added package-owned `en-GB` translation dictionaries and exported profile translation keys/default lookup helpers for settings, avatar upload, route status, accessibility, and save/provider error surfaces.
  - Exported reusable accessibility helpers for stable field labeling/error associations and destructive-action semantics so host profile/account flows can stay aligned with the package-owned settings surface.

- **Changed**
  - `SettingsPage`, `AvatarUploadPanel`, and `ProfileRouteStatusPanel` now resolve package-owned display text through `@plasius/translations` with packaged fallback defaults.
  - `SettingsPage` and `AvatarUploadPanel` now consume shared accessibility bindings instead of duplicating ad hoc ARIA wiring.

- **Fixed**
  - Restored the package CD workflow so protected main releases are prepared by PR and published without direct branch pushes.
  - Save and provider validation fallback messages now expose stable translation metadata/defaults instead of relying on embedded English literals.
  - Package accessibility coverage now verifies reusable destructive-action affordance semantics alongside field-level validation and live-announcement behavior.

- **Security**
  - Replaced regex-based accessibility ID normalization with a linear scanner to avoid slow matching on repeated separators.

## [1.0.33] - 2026-05-13

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.32] - 2026-05-13

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.31] - 2026-04-21

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.30] - 2026-04-02

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.29] - 2026-03-27

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.26] - 2026-03-26

- **Added**
  - Added rendered validation summaries and inline field errors to `SettingsPage` so invalid profile snapshots surface directly in the shared profile editor UI instead of only logging to the console.

- **Changed**
  - Legacy avatar uploads in `SettingsPage` now expose upload and malformed-payload failures as inline form feedback with field-level ARIA associations.

- **Fixed**
  - Cleared stale submit-time field errors as soon as the affected profile inputs are edited, keeping correction flows visible without forcing a full page reload.

- **Security**
  - (placeholder)

## [1.0.24] - 2026-03-26

- **Added**
  - Added package-level accessibility coverage for `SettingsPage` and `AvatarUploadPanel`, including deterministic fallback contrast checks for the avatar upload surface.

- **Changed**
  - `AvatarUploadPanel` now wires file-input descriptions, live status text, and validation errors through explicit ARIA relationships while exposing accessible fallback color tokens.

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.23] - 2026-03-26

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.23] - 2026-03-26

- **Added**
  - Added a component regression test covering `UserProvider` load and autosave lifecycle so profile updates no longer regress into repeated load/save loops.

- **Changed**
  - `SettingsPage` now keeps draft field values renderable while the user is editing, instead of throwing on transient invalid snapshots.
  - `UserProvider` now debounces autosave after hydrated user changes instead of attempting saves from effect cleanup.

- **Fixed**
  - Corrected profile form field mapping so `preferredDisplayOrder` updates `name.preferredDisplayOrder` and `emailPreferences` persists as a string array.
  - Sanitized profile save payloads to drop draft-only or preview-only fields such as legacy `displayPreferences` and avatar `originalName`.

- **Security**
  - (placeholder)

## [1.0.22] - 2026-03-26

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - Canonicalized legacy zero-padded user entity versions such as `1.0.01` before schema validation so older stored profiles no longer fail to load.

- **Security**
  - (placeholder)

## [1.0.21] - 2026-03-26

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - User hydration now unwraps graph-style `data`/`user`/`profile` envelopes before schema validation so profile settings can render even when upstream transports return wrapped payloads alongside legacy version metadata.

- **Security**
  - (placeholder)

## [1.0.20] - 2026-03-23

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - Normalized legacy numeric `user.version` values inside shared profile hydration before schema validation so older stored profiles no longer fail to load.

- **Security**
  - (placeholder)

## [1.0.19] - 2026-03-23

- **Added**
  - Added a reusable `AvatarUploadPanel` component for staged avatar upload, preview, and profile-store updates.

- **Changed**
  - Extended `SettingsPage` with `hideAvatarField` so host applications can replace the legacy inline avatar input with their own upload transport while keeping the rest of the profile editor.

- **Fixed**
  - Cleared stale local avatar previews when a newly selected file fails validation, preventing invalid replacement attempts from leaving the previous staged preview onscreen.

- **Security**
  - (placeholder)

## [1.0.18] - 2026-03-19

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.17] - 2026-03-13

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

[Unreleased]: https://github.com/Plasius-LTD/profile/compare/v1.0.37...HEAD

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
[1.0.17]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.17
[1.0.18]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.18
[1.0.19]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.19
[1.0.20]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.20
[1.0.21]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.21
[1.0.22]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.22
[1.0.23]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.23
[1.0.24]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.24
[1.0.26]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.26
[1.0.29]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.29
[1.0.30]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.30
[1.0.31]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.31
[1.0.32]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.32
[1.0.33]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.33
[1.0.36]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.36
[1.0.37]: https://github.com/Plasius-LTD/profile/releases/tag/v1.0.37
