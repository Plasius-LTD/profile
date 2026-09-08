# ADR 0008: Trusted CI and confirmed release merges

- Status: Accepted
- Date: 2026-09-08
- Task: profile#36; parent Feature: site#1597
- Feature flag: `platform.public-artifact-integrity.enabled`

## Context

The recovery acceptance criteria require explicit self-hosted CI without hosted
fallbacks or external fork execution. Existing PR validation selected hosted
runners dynamically, and scheduled audit validation was hosted. Release
preparation could mistake successful merge-command acceptance for an observed
merge, then continue before the protected main branch contained the metadata.

## Decision

CI runs only on repository-owned branch pushes. Every job retains its required
check name and uses literal `[self-hosted, Linux, X64]` labels in the explicitly selected
`Public CI - Quarantined` runner group. Group selection prevents matching
labels from routing these jobs through the unrestricted Default group. There are no PR triggers
or caller-controlled selectors. Scheduled audit runs only on main using those
labels. Dependency setup disables automatic package-manager caching; jobs are
bounded. Review branch content and lock branches with administrator enforcement
before admitting exact workflow branch refs to restricted runner groups. Remove
temporary admission after merge without weakening main checks or protection.

Keep ADR 0006's hosted production OIDC publication and immutable artifact
protocol. Both initial and retried merge commands require a subsequent observed
`MERGED` state. One bounded loop handles `OPEN`; `CLOSED`, API errors, unexpected
states and timeout fail closed. Use a new pipeline-generated version, never a
removed version. Existing public @plasius contracts and integrity tooling are
reused without runtime/API or dependency changes.

The inherited flag controls restoration outside this contract package. Mandatory
source/index/package admission and release identity checks do not depend on its
value. Rollback disables cd.yml, preserves integrity checks, and never restores
administrative paths or token publication. No capability is required.

## Validation and consequences

Workflow policy tests check trusted push events, literal runner labels, retained
check names, cache settings and main-only audit admission. Executable regression
tests exercise the actual release merge shell with mocked GitHub states,
including accepted-but-open requests, eventual merge, retry, closure, API error,
unknown state and timeout. Run clean install, full tests/coverage, lint,
typecheck, build, package/path checks and actionlint; require exact-SHA CI before
merge and verify governed release, final tarball and provenance before Done.

Fork contributions need maintainer review and a repository-owned branch. Runner
admission requires bounded operational work for each locked review branch.
Hosted fallback and treating merge command success as completion were rejected
because they violate the required execution policy and release identity checks.

Security/privacy, reproducibility, reliability and testability are checked by
these controls. Accessibility, SEO, browser compatibility and runtime performance
are unchanged because this decision affects workflows only.
