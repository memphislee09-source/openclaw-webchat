# Changelog

All notable user-facing changes to `openclaw-webchat` should be documented in this file.

The format is intentionally lightweight and follows a simple versioned release log.

## [Unreleased]

### Changed
- Bind the server explicitly to `127.0.0.1` by default, with `OPENCLAW_WEBCHAT_HOST` for intentional LAN access
- Return opaque upload source handles to the browser instead of absolute filesystem paths
- Add a settings-managed access mode switch for local-only versus LAN / Tailscale-friendly access
- Add optional light authentication for personal LAN-style deployments
- Reorganize settings into first-level sections for Contacts, Appearance, Access & Security, About, and Manual Start
- Add an About panel with project summary and GitHub link
- Add a Manual Start panel with install/start/restart command hints
- Align WebChat document-access messaging with the current OpenClaw configuration instead of a separate WebChat-only scope
- Remove the extra WebChat-side local media allowlist restriction so existing agent-generated images continue to render under the current instance auth boundary

## [0.1.3] - 2026-03-18

### Added
- History search for the current agent timeline
- Search result jump, keyword highlighting, and recent-search recall
- Theme preset variants with one dark preset and five light presets

### Changed
- Tightened visual media bubble behavior for long text plus small media combinations
- Tightened chat bubble shadow treatment for lighter themes
- Reduced mobile first-open history load to improve perceived performance
- Improved chat auto-scroll behavior with a unified pinned-bottom state
- Refined left agent list refresh to avoid unnecessary full rerenders

### Fixed
- Hardened local media secret handling and media path allowlist behavior
- Restricted file media URL schemes to trusted values
- Prevented timeout placeholder replies from polluting stored history
- Moved audio transcription off the synchronous request path
- Preserved compatibility for older avatar media tokens during migration
- Improved late-reply isolation and cross-agent session safety

## [0.1.2] - 2026-03-17

### Added
- launchd helper script for background macOS operation
- visual media bubble experiment with desktop fallback protection
- avatar persistence based on stable source paths instead of short-lived signed URLs

### Changed
- aligned project docs with the JavaScript-based implementation
- refined settings themes and default light appearance

### Fixed
- prevented long text plus small image messages from collapsing into overly narrow desktop bubbles
- fixed avatar expiry caused by persisting signed media URLs

## [0.1.1] - 2026-03-15

### Added
- standalone project structure, API namespace, and dedicated local history storage
- per-agent session binding and `/new` marker retention
- assistant rich media rendering for images, audio, video, and files
- user image and audio uploads
- responsive web UI with agent list, message timeline, and settings

### Fixed
- improved gateway retry behavior for temporary disconnects
- prevented stale upstream replies from leaking into reset sessions
