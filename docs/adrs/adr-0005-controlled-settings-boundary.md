# ADR-0005: Keep Settings Policies Presentational and Submission Host-Owned

- Date: 2026-07-18
- Status: Accepted

## Context

`SettingsPage` originally exposed one self-service surface: every profile field
was editable, avatar upload was available, and the submit action only validated
the current `UserStore` snapshot. Profile persistence normally occurred through
`UserProvider` autosave.

Administrative hosts need to reuse the profile fields without inheriting
self-service actions. In particular, an administrator may need to view and
remove an avatar but must not upload or replace one. A host-owned review sheet
also needs to trigger an explicit commit, show pending and safe failure state,
and keep authorization and audit decisions outside this public UI package.

The parent Admin feature is remotely controlled by
`admin.workspace.touch-first.enabled` and capability decisions in the host.
Neither rollout state nor administrative authority is available to this
package.

## Decision

Extend `SettingsPage` with optional, backward-compatible composition props:

- `onSubmit` receives the current profile snapshot only after package schema
  validation and may return a promise;
- `formId` allows a host-owned button, such as a review-sheet commit action, to
  submit the package form;
- `isSubmitting` and `submitError` let the host control pending and display-safe
  error presentation, while async callbacks also receive internal pending state
  and a generic translated rejection message;
- `fieldPolicies` declares each field as `editable`, `read-only`, or `hidden`;
  and
- `actionPolicies` declares submit, avatar upload, and avatar removal as
  `enabled`, `disabled`, or `hidden`.

Omitted policies retain the current self-service presentation. Avatar removal
is hidden by default because it is new behavior. `hideAvatarField` remains
supported and takes precedence over the avatar field policy.

Supplying `onSubmit` establishes a controlled review boundary. The page copies
the current `UserStore` value into component-local draft state; field changes,
avatar upload, and avatar removal update that local draft without dispatching
to `UserStore`. This prevents provider autosave from persisting a mutation
before the host review is committed. The draft resynchronizes when the
authoritative stored profile changes.

When the built-in submit action is hidden, implicit submission is rejected.
The host may commit only through an explicit submit control outside the form
that references `formId`. Schema failures for policy-hidden fields are promoted
to the form-level error summary rather than being rendered into an absent field.

Avatar removal only clears the avatar on the local controlled draft when
`onSubmit` is supplied, or retains the existing `UserStore` behavior in the
legacy self-service mode. It does not call a server, authorize the actor, emit
audit data, or persist the controlled change. A host can therefore compare the
original and draft snapshots and submit the reviewed result through its
authoritative mutation path.

Policies are a presentation contract, not a security boundary. The host remains
responsible for:

- evaluating stored feature flags and capabilities before rendering;
- supplying only policies allowed for the current actor and target;
- constraining the accepted profile DTO;
- rechecking authorization, target state, concurrency, reason, notification,
  and audit requirements at the mutation boundary; and
- supplying only error text that is safe to disclose.

## Alternatives Considered

- Fork the settings UI in each administrative host. Rejected because it would
  duplicate validation, accessibility, translation, and field behavior.
- Add administrative authorization and API calls to `@plasius/profile`.
  Rejected because a public presentation package cannot be the authoritative
  policy or audit boundary.
- Add only more `hide*` booleans. Rejected because independent read-only,
  hidden, disabled, and externally submitted states would become difficult to
  compose and extend safely.

## Consequences

- Existing self-service callers can continue rendering `SettingsPage` without
  new props.
- Admin hosts can reuse the editor without DOM mutation or exposure of avatar
  replacement.
- Controlled edits do not enter the shared provider store or autosave before
  host review.
- Review-sheet actions can submit the semantic form without moving mutation
  ownership into the package.
- Hiding the built-in submit action also closes implicit Enter/request-submit
  paths, while hidden-field validation remains visible in the error summary.
- Async failures do not expose thrown error details by default.
- Consumers must not treat a hidden or disabled control as authorization; all
  mutations still require authoritative server enforcement.
- The package continues to require `UserStore` composition. Original-snapshot
  comparison, reviewed persistence, and mutation coordination remain host
  responsibilities.
