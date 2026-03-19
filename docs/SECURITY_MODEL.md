# Security Model

## Intended Trust Model

`openclaw-webchat` is built first for a trusted operator running the service on a local machine or inside a private network.

The current design assumes:
- the operator controls the host machine
- the OpenClaw CLI on that machine is trusted
- access is limited to the operator or a small trusted group
- optional light authentication may be enabled for LAN-style shared access, but it is still a personal-use deployment model rather than full multi-user tenancy

## What The App Protects

The current mainline includes protections for:
- dedicated `openclaw-webchat` namespace isolation
- local media token signing with a persisted random secret
- optional light authentication for personal LAN-style access
- file media scheme validation
- stored-history filtering so tool traces do not leak into the visible timeline
- late-reply isolation to reduce cross-session contamination

## What The App Does Not Try To Solve

This project does not currently provide:
- multi-user identity and permission management
- public-internet hardening by default
- tenant isolation for shared hosted environments
- advanced malware scanning for uploaded files
- a complete production reverse-proxy or WAF story

## Recommended Deployment

Recommended:
- run on your own machine or a trusted internal host
- keep the default bind host on `127.0.0.1` unless you intentionally need LAN access
- restrict access with Tailscale, VPN, SSH tunnel, or an equivalent private access layer
- keep the service bound to localhost unless you have intentionally added a protected ingress layer
- if you switch to LAN mode for browsers on the same network, treat the built-in light authentication as an extra privacy guard rather than a full enterprise auth system
- treat document access scope as inherited from the current OpenClaw configuration rather than a separate WebChat-only policy

Use extra caution before:
- binding broadly on a public interface
- sharing the instance with untrusted users
- storing sensitive media on a host with weak filesystem controls

## Local Data

By default, this project stores local runtime data under the repository `data/` directory, including:
- session bindings
- profile data
- visible chat history
- uploaded files
- generated media secret

Operators should understand where that repository lives, who can read it, and whether it is backed up.

## Operational Advice

- Treat the host machine as sensitive because uploaded media and local history may be stored there.
- Review file permissions on the repository and data directories.
- Remember that agent-generated local media may be rendered through signed WebChat URLs once your current OpenClaw/runtime flow exposes them, so keep the host filesystem itself trusted.
- Prefer explicit environment configuration over ad hoc local edits.
- If you expose the UI through a reverse proxy, add your own auth, TLS, and rate limiting there.

## Release Expectation

For now, public release should be understood as "open source and community-usable", not "internet-hosted SaaS ready".
