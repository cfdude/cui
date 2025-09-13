# Configuration Simplification

## Requirements

**Merge user preferences into main config file and eliminate complex versioning.**

Current state: Two separate files (`~/.cui/config.json` + `~/.cui/preferences.json`) with complex JsonFileManager and versioning.
Target state: Single `~/.cui/config.json` with `interface` section, simple field merging on load.

## Implementation Tasks

### 1. **Consolidate Configuration Schema**
- [x] Add `interface` field to `CUIConfig` containing current `Preferences` (colorScheme, language, notifications)
- [x] Delete separate preferences types and merge into config types
- [x] Update `DEFAULT_CONFIG` to include interface defaults

### 2. **Simplify Config Loading Logic** 
- [x] Replace complex versioning with simple field detection in `ConfigService`
- [x] On load: if config missing expected fields, merge with defaults and rewrite file
- [x] Remove `JsonFileManager` dependency - use direct JSON read/write
- [x] Add `getInterface()` and `updateInterface()` convenience methods

### 3. **Eliminate PreferencesService**
- [x] Delete `PreferencesService` class entirely
- [x] Update `NotificationService` to get settings from `ConfigService.getInterface()`
- [x] Remove `PreferencesService` from `CUIServer` constructor and initialization

### 4. **Update API Contract**
- [x] Replace `/api/preferences` routes with `/api/config` routes  
- [x] Support both full config and interface-only endpoints: `GET/PUT /config/interface`
- [x] Maintain backward compatibility for frontend (same response shape for interface data)

### 5. **Frontend Integration**
- [x] Update `PreferencesContext` to call new config endpoints
- [x] Ensure theme switching and preference persistence still work identically
- [x] No changes needed to user-facing interface behavior

### 6. **Remove Dead Code**
- [x] Delete: `preferences-service.ts`, `json-file-manager.ts`, `preferences.ts`
- [x] Delete associated test files
- [x] Clean up imports across codebase

### 7. **Validation**
- [x] Verify single config file contains both system and interface settings
- [x] Confirm theme switching, notifications, and language preferences work
- [x] Ensure clean config migration from existing two-file setup

## Success Criteria
- Single `~/.cui/config.json` file with `interface` section
- No version migration complexity - just field merging
- All user preferences functionality preserved
- Reduced codebase complexity (~300 lines removed)