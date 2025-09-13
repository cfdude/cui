# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive API documentation in `docs/API.md`
- Unit tests for configuration interface methods
- Automatic configuration migration from old two-file setup to unified format
- `.nvmrc` file specifying Node.js 20.19.0 for consistent environment
- Interface-only configuration endpoints (`/api/config/interface`) for backward compatibility

### Changed
- **BREAKING**: Migrated from NPM to Yarn package manager
- **BREAKING**: Minimum Node.js version requirement updated to 20.19.0
- Simplified configuration to single `config.json` file (automatic migration provided)
- Notifications now use native browser notifications exclusively
- Updated all dependencies to latest compatible versions
- Improved TypeScript type definitions for configuration
- Updated documentation to use Yarn commands (`yarn dlx` instead of `npx`)

### Removed
- **SECURITY**: Completely removed ntfy.sh integration to prevent external data transmission
- Removed `PreferencesService` - functionality merged into `ConfigService`
- Removed `JsonFileManager` - replaced with direct JSON operations
- Removed separate `preferences.json` file - merged into main config
- Removed npm-specific files (`package-lock.json`, `.npmrc`)

### Fixed
- Security vulnerability where machine IDs and session data were sent to external ntfy.sh service
- Node.js compatibility issues with undici package
- TypeScript type conflicts between Express v4 and v5
- Native module compilation issues with better-sqlite3

### Security
- Eliminated all external notification service dependencies
- Prevented potential data leakage of machine IDs, session IDs, and tool usage
- All notifications now handled locally through browser Web Push API

## [0.6.3] - Previous Release

### Added
- Initial public release
- Web UI for Claude CLI
- Real-time conversation streaming
- Task management and archiving
- Dictation support via Gemini API
- Push notifications via ntfy.sh (now removed)