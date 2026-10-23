# ADR 0009: Fail-closed CSS build and package validation

Status: Accepted
Date: 2026-10-23
Project Task: Plasius-LTD/profile#20

## Context

The ESM and CJS build chains masked compiler and rsync failures with `|| true`.
Stale output could pass package checks without both required CSS modules.
The token stylesheet is also part of the public package contract.

## Decision

Use a dependency-free Node build helper to require the three current CSS
sources and discover all additional CSS files. Copy source-relative paths to
both output formats and verify exact bytes. Propagate compiler, source-read,
directory and copy failures through the existing blocking npm build chains.
The package verifier requires byte-identical built CSS and dry-run tarball
membership for every source stylesheet. CI invokes package verification after
build; existing read-only CD validation already does so before sealing output.

Existing shared packages provide runtime UI components rather than a build
copier. Keep this internal package tooling local; introduce no runtime API,
dependency, public package or entitlement/rollout surface. Task20 explicitly
classifies the change as repository-operational maintenance, outside a product
Feature. Integrity checks apply unconditionally.

## Alternatives

Removing `|| true` alone keeps the platform-specific rsync dependency and cannot
detect individually missing source CSS. Checking only tarball paths permits
stale bytes. Rebuilding inside package verification masks missing output and
weakens artifact inspection. None provides the required failure guarantees.

## Validation and release

Disposable fixtures execute the actual npm build/pack commands for each missing
source, both destination failures, compiler failures, stale CSS, tarball
omissions and valid nested/new CSS. The normal suite validates real compiler
output and UI accessibility. Public APIs, rendering and CSS bytes are unchanged.
No UI/performance/SEO change is expected; filesystem work is build-time only.

Deliver through the protected-main PR process, exact-main CI and existing
main/cd.yml/production OIDC path. Inspect the sealed published tarball and each
installed ESM/CJS stylesheet. No local publication or deployment-policy change.
