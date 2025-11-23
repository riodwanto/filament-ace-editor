# Changelog

All notable changes to `filament-ace-editor` will be documented in this file.

## [4.0.0] - 2025-11-23

### Changed

- **Breaking:** Drop support for PHP 8.1, now requires PHP 8.2+
- **Breaking:** Drop support for Laravel 9-10, now requires Laravel 11.28+
- **Breaking:** Update Filament compatibility from 3.x to 4.x
- Update Alpine.js component structure for Filament 4 compatibility
- Simplify Tailwind CSS configuration by removing custom themes and plugins
- Update CSS styling to use standard Tailwind colors instead of custom color palette
- Upgrade build tools - esbuild from v0.19.2 to v0.25.12
- Enhance code documentation with comprehensive comments in PHP and JavaScript files
- Update minimum Node.js version for development dependencies
- Update .gitignore to exclude development-specific files and directories
- Rebuild CSS and JavaScript assets after configuration updates
- Update branch naming from 4.x to v4.x for semantic versioning
- Add production build assets to repository for easier installation

### Added

- Upgrade Ace Editor from v1.32.7 to v1.43.3 with latest features and improvements
- Add comprehensive test coverage for AceEditor field and service provider
- Enhance documentation with version compatibility table and feature matrix
- Improve composer.json with better description and keywords
- Update all CDN URLs to use the latest Ace Editor version
- Update npm ace-builds dependency to match new version

### Fixed

- Fix asset registration syntax in service provider for Filament 4 compatibility
- Update Blade template to use `x-load` and `getAlpineComponentSrc()` for proper Alpine component loading
- Update npm security vulnerabilities in development dependencies
- Fix inline HTML in README.md for markdown linting compliance
