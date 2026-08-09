# ADR-0006: Exact-main OIDC trusted package publishing

- Status: Accepted
- Date: 2026-08-09

## Context

Package publication previously depended on a long-lived npm write token and a
single workflow run that prepared release metadata before publishing. That made
the workflow identity differ from the final main commit and exposed a reusable
credential to release infrastructure.

## Decision

Use two phase-isolated `cd.yml` runs. Preparation authenticates with the
narrowly scoped release-preparation GitHub App, lands version and changelog
metadata by pull request, and waits for successful CI on the resulting exact
main SHA. Publication is dispatched from that SHA, builds an immutable package
tarball and SBOM in a read-only job, then hands their IDs and digests to a
dependency-free `production` job.

Pull-request CI uses GitHub-hosted runners after a same-repository trusted-head
admission. Only protected `main` CI may use the workflow-restricted self-hosted
pool, so validating a repository-owned PR does not require temporarily widening
the organisation runner boundary.

The publication job uses npm's GitHub Actions trusted publisher bound to
`Plasius-LTD/profile`, `cd.yml`, and environment `production`. It publishes the
explicit local tarball with provenance, verifies npm registry integrity and the
distribution tag, and only then finalizes the GitHub release. `.npmrc` and the
workflow contain no npm write-token configuration.

## Consequences

- npm publication is bound to the repository, workflow, and protected
  environment instead of a reusable token.
- Tags, attestations, npm bytes, and GitHub releases share one exact main SHA.
- Duplicate retries fail closed unless existing npm bytes and distribution tags
  match the immutable artifact.
- Release preparation and publication remain disabled until branch protection,
  environment protection, and the npm trusted-publisher mapping are verified.

## Rollback

Disable `.github/workflows/cd.yml`. Do not restore `NPM_TOKEN`, the retired npm
auth line, or excluded administrative contributor data.

## Governance

Task Plasius-LTD/profile#36 inherits Feature #1597 and the
`platform.public-artifact-integrity.enabled` rollout flag.
