# ADR-0004: Keep Token Wallet Components Presentation-Only

- Date: 2026-07-15
- Status: Accepted

## Context

The sitewide Token economy has authoritative wallet, lot, transaction, and
allocation state outside profile data. Site routes need reusable wallet summary
and activity presentation, but treating a Token balance like editable profile
state would let profile autosave, browser state, or provider return data become
an accidental source of financial truth.

Token amounts also cross JSON boundaries as base-10 TokenSubunit strings. One
Token is exactly 1,000 TokenSubunits, and values must retain signed 64-bit
integer precision when displayed.

The parent Feature is controlled by the stored `economy.tokens.enabled` flag
and wallet capabilities. Those decisions are owned by the host application and
its authoritative backend.

## Decision

Expose `TokenOverviewPanel` and related presentation types from
`@plasius/profile` with these boundaries:

- every balance, lifetime total, status, activity row, action, unavailable use,
  date label, and UI label is supplied through props;
- amount props are canonical, non-negative base-10 TokenSubunit strings and are
  validated against the signed 64-bit maximum for balances/totals and the exact
  absolute signed-minimum magnitude for debit activity before `BigInt`
  formatting;
- the component presents the supplied values but never derives or reconciles a
  balance;
- the component performs no fetching, provider initialization, persistence,
  browser storage, `UserEntity`/`UserProvider` access, profile autosave, feature-
  flag evaluation, capability evaluation, or economy command;
- host actions are returned through callbacks rather than executed by the
  package; and
- the component provides semantic headings, definition/data/time/list markup,
  visible Credit/Debit words, explicit loading/error/empty states, an explicit
  no-wallet preview, and a polite refresh live region.

The no-wallet preview is a separate discriminated state rather than a fabricated
ready wallet. It accepts no balance, lifetime, component, status, action,
unavailable-use, refresh, or activity props, hard-codes exact zero TokenSubunits
inside the component, and uses explicit preview copy. Hosts may select it only
for a deliberately non-economic runtime mode; an authoritative read failure
must remain an error and must never fall back to this preview.

Also expose pure adapters against the released `@plasius/economy` contracts.
`createTokenEconomyPresentation` retains the single-wallet boundary.
`createTokenPortfolioEconomyPresentation` accepts explicit portfolio summary,
portfolio lifetime, and discriminated wallet-activity contracts. It invokes
economy runtime assertions, aligns components by wallet identity while
preserving the authoritative summary order, rejects cross-portfolio role,
beneficiary, subject, or activity-wallet mismatches, and retains economic versus
workflow identity. Both adapters map signed activity amounts to an explicit
direction and non-negative magnitude and retain stable activity-type, status,
`TokenSource`, beneficiary, and masked-reference keys for filtering.
Localization and account labels remain host-supplied. The adapter does not
fetch, persist, authorize, derive a balance, or execute a command.

The lazy `@plasius/profile/tokens` JavaScript subpath does not import CSS at
runtime. Its prefixed global stylesheet is exposed separately as
`@plasius/profile/tokens.css`. This keeps both ESM and CommonJS entrypoints
loadable outside a CSS-aware bundler while preserving an explicit, tree-shakable
style dependency for browser hosts.

Package-owned en-GB translation keys, `createTokenOverviewPanelLabels`, and
`createTokenOverviewPanelPreviewLabels` supply stable fallbacks and convenience
factories. The `labels` and preview-state `previewLabels` props remain required,
so a host deliberately chooses the localized copy used for each render.
Token keys and resolvers use the additive `profileTokenTranslationKeys`
namespace rather than expanding the published closed `ProfileTranslationKey`
union, preserving v1 exhaustive dictionaries while allowing the lazy Token
entry point to evolve under minor releases.

## Consequences

- Authoritative economy state cannot enter `UserEntity` saves through this
  component.
- A site can lazy-load and compose the presentation without adding payment,
  reward-provider, networking, or storage dependencies to this package.
- Contract drift and malformed authoritative DTOs fail at the economy adapter
  boundary instead of being silently rendered, while stable keys prevent
  localized labels from becoming filter identifiers.
- Household, personal, gameplay-allocation, and hold components remain visibly
  separate; portfolio totals come only from the validated authoritative
  projections, and pending/failed workflow activity cannot alter them.
- Exact formatting remains safe above JavaScript's integer precision limit.
- Host routes must validate API contracts, evaluate the rollout flag and wallet
  capability, localize domain-specific activity text, mask references, and
  implement refresh/action callbacks.
- Rollback can disable or make the host route read-only without changing,
  deleting, or rewriting any Token presentation or ledger record.
