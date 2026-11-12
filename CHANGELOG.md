# Changelog

## 1.5.0 (unreleased)

### Changed

- Failed SDK init surfaces as an error state; single ready callback per transition.
- Attributes set before the first assignment; peek during render.

### Added

- SSR support for Treatment components and `useTreatment`.

### Dependencies

- Requires `@absmartly/javascript-sdk` `^1.14.0`. Audiences and assignment-rule conditions now always see `application` and `environment` (the names configured in the SDK); an attribute you set with the same name overrides them. The automatic `app_version` is gone, and `includeSystemAttributes` now only adds `sdk_name` and `sdk_version` to the publish payload. See the JavaScript SDK's [Migration Guide (1.13.x → 1.14.0)](https://github.com/absmartly/javascript-sdk#migration-guide-113x--1140).

  **This changes assignment for running experiments.** A unit in an experiment with Audience enforced (`audienceStrict`) and an `environment` or `application` condition currently gets variant 0, even when it matches the condition and even when the experiment is full-on. After upgrading, a matching unit is randomised normally (or gets the full-on variant). Those experiments are broken today; this release fixes them, but their exposures will change. An audience or rule on `app_version` no longer matches unless you set `app_version` yourself.

### Fixed

- Error boundary, SDK provider and treatment components; context created before finalizing the old one.
