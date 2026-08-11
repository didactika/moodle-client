# Changelog

All notable changes to this project are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project uses [Semantic Versioning](https://semver.org/): the first number for
breaking changes, the middle for backward-compatible features, the last for
fixes — security fixes included, always. See the org's
[SECURITY.md](https://github.com/didactika/.github/blob/main/SECURITY.md) for
what that means for which versions get them.

Entries from before this file existed (0.x through 1.1.1) are backfilled from
the real git history — tag dates and the actual diff each release shipped —
not reconstructed from memory.

## [Unreleased]

## [1.1.3] - 2026-08-11

A security release. `1.x` is the previous major and receives security fixes
only; everything else lands on the current one, `2.x`.

### Security

- **axios upgraded from `0.26.1` to `1.19.0`.** `npm audit` reports 23
  advisories against the `0.x` line, as one high-severity vulnerability, and
  none of them have a fix inside `^0.26.1` — axios stopped patching `0.x`
  altogether, so clearing them means crossing a major of the dependency.

  One visible difference comes with it: `response.headers` is an
  `AxiosHeaders` instance rather than a plain object. Reading a header by
  name still works. `response.data`, `response.status` and every error this
  package throws are unchanged.

`2.x` has no runtime dependencies at all — it is built on `fetch` from the
standard library — so none of this applies there. If you can move, move.

## [1.1.2] - 2026-08-10

### Changed

- **Renamed** from `moodle-web-service-client` to `@didactika/moodle-client`.
  Same code, same version number — this release exists only to move the
  package under its new name. The old package is deprecated on npm and
  points here.

Published directly to npm under the old name with no corresponding git tag
or commit — the last one this repository's history can account for is
`v1.1.1`. This release brings the two back in sync.

## [1.1.1] - 2023-10-30

Documentation and metadata only; no code changes.

## [1.1.0] - 2023-10-29

### Added

- Structured error types for failed requests — `AccessExceptionError`,
  `BadRequestError`, `InvalidParameterError`, `InvalidRecordError`,
  `InvalidTokenError`, `MoodleExceptionError`, `UrlError` — with a shared
  error handler that maps a Moodle web service error response to the right
  one.

## [1.0.1] - 2023-10-28

### Fixed

- Removed a leftover debug `console.log` of the request content.

## [1.0.0] - 2023-10-28

Initial release.
