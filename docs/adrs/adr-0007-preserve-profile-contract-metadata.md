# ADR-0007: Profile normalization preserves contract metadata

- Status: Accepted
- Date: 2026-08-01

## Context

`UserProvider` normalizes profile responses before placing them in `UserStore`.
Rebuilding nested user-name fields without carrying contract metadata would
discard the server-owned incomplete-name status and force host applications to
infer state from display text.

## Decision

Preserve a validated `UserName.status` when normalizing profile responses.
Continue accepting legacy user records that omit the optional status. The
profile package does not decide or mutate completeness; it transports the
released entity contract to consumers.

## Consequences

- Host applications can render an explicit completion prompt.
- Existing profiles remain backwards-compatible.
- Completeness ownership stays with the server rather than the presentation
  package.

## Rollout

Task Plasius-LTD/profile#43 inherits Feature #1642 and
`admin.identity-governance.enabled`. The package consumes the released
entity-manager contract and publishes through approved CD before the site
upgrade.
