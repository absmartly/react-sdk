# Changelog

## 1.5.0 (unreleased)

### Changed
- Failed SDK init surfaces as an error state; single ready callback per transition.
- Attributes set before the first assignment; peek during render.

### Added
- SSR support for Treatment components and `useTreatment`.

### Fixed
- Error boundary, SDK provider and treatment components; context created before finalizing the old one.
