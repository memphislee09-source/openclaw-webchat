# Agent Install Guide: Network Install

This guide is written for OpenClaw agents that need to install `openclaw-webchat` by downloading the necessary software and repository contents over the network.

## Agent Execution Contract

Follow these rules strictly:

1. Finish one numbered step and pass its check before moving on.
2. If a check fails, stop and repair that step before continuing.
3. Prefer narrow commands and explicit checks.
4. Never assume tools already exist just because they usually do.
5. If your model is weaker at long shell workflows, narrate state after every step.

## Best-Fit Environment

This flow is best when:
- the target machine has network access
- the user wants the agent to fetch software directly
- GitHub access is available
- OpenClaw is already installed or can be installed separately first

## Inputs You Need Before Starting

Do not continue until all inputs are known:

- the target install directory
- whether to install from the latest release tag or from `main`
- whether the user wants local-only or LAN / Tailscale access
- whether the user wants lightweight auth enabled

If the user does not care about branch choice, prefer the latest GitHub Release. Use `main` only when the user explicitly wants the newest unreleased state.

## Step 1: Verify Core Tools

Run:

```bash
node -v
npm -v
git --version
curl --version
openclaw --version
```

Check:
- Node.js is `v20` or newer
- `npm`, `git`, and `curl` exist
- `openclaw --version` succeeds

If any tool is missing:
- stop
- report exactly which tool is missing
- install that prerequisite before continuing

## Step 2: Verify Network Reachability

Run:

```bash
curl -I https://github.com
curl -I https://api.github.com
```

Check:
- both commands succeed with HTTP headers

If GitHub is unreachable, stop and fix network access first.

## Step 3: Fetch The Source

### Option A: Install From Latest Release Source

Use this when the user wants a stable public install:

```bash
mkdir -p /ABSOLUTE/PATH/TO/INSTALL_PARENT
cd /ABSOLUTE/PATH/TO/INSTALL_PARENT
RELEASE_TAG="$(curl -fsSL https://api.github.com/repos/memphislee09-source/openclaw-webchat/releases/latest | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
test -n "$RELEASE_TAG" && echo "Resolved release tag: $RELEASE_TAG"
ARCHIVE_PATH="openclaw-webchat-${RELEASE_TAG}.tar.gz"
curl -fL "https://github.com/memphislee09-source/openclaw-webchat/archive/refs/tags/${RELEASE_TAG}.tar.gz" -o "$ARCHIVE_PATH"
EXTRACTED_DIR="$(tar -tzf "$ARCHIVE_PATH" | head -1 | cut -d/ -f1)"
test -n "$EXTRACTED_DIR" && echo "Archive root: $EXTRACTED_DIR"
tar -xzf "$ARCHIVE_PATH"
rm -rf openclaw-webchat
mv "$EXTRACTED_DIR" openclaw-webchat
```

Check before moving on:
- `Resolved release tag: ...` was printed
- `Archive root: ...` was printed
- `openclaw-webchat/package.json` exists after the move

### Option B: Install From `main`

Use this only when the user explicitly wants the latest mainline state:

```bash
mkdir -p /ABSOLUTE/PATH/TO/INSTALL_PARENT
cd /ABSOLUTE/PATH/TO/INSTALL_PARENT
git clone https://github.com/memphislee09-source/openclaw-webchat.git
cd openclaw-webchat
git checkout main
```

Check:

```bash
cd /ABSOLUTE/PATH/TO/INSTALL_PARENT/openclaw-webchat
test -f package.json && echo OK
test -d src && echo OK
test -d public && echo OK
```

Do not continue unless all three checks pass.

## Step 4: Install Dependencies

Run inside the project directory:

```bash
npm install
```

Check:

```bash
test -d node_modules && echo OK
npm run check
```

Both must succeed before you continue.

## Step 5: Verify OpenClaw Gateway Reachability

Run:

```bash
openclaw gateway call health --json
```

Check:
- valid JSON is returned
- the gateway is reachable under the same user account that will run WebChat

If not, stop and fix the OpenClaw side first.

## Step 6: Choose Runtime Settings

For local-only access, defaults are usually enough.

For LAN / Tailscale access, prepare:

```bash
export OPENCLAW_WEBCHAT_HOST=0.0.0.0
```

Optional examples:

```bash
export OPENCLAW_WEBCHAT_PORT=3770
export OPENCLAW_WEBCHAT_DATA_DIR=/ABSOLUTE/PATH/TO/openclaw-webchat-data
```

Check:
- all configured paths are absolute
- the selected port is free

Port check:

```bash
lsof -nP -iTCP:3770 -sTCP:LISTEN
```

If the port is already in use, stop and choose another one.

## Step 7: First Manual Start

Run from the project directory:

```bash
npm start
```

Leave it running long enough to test.

Check from another terminal:

```bash
curl -sf http://127.0.0.1:3770/healthz
```

Confirm:
- `/healthz` returns `"ok": true`
- the UI opens in a browser

If the user selected LAN / Tailscale access, also check the chosen host or IP path.

## Step 8: Run Functional Smoke Test

Run:

```bash
npm run selftest
```

Check:
- it ends with `SELFTEST_OK`

If the environment cannot support `selftest`, record that clearly and explain why.

## Step 9: Enable Background Service

If the machine is macOS and the user wants a persistent background service:

1. Create the LaunchAgent directories and log directory:

```bash
mkdir -p "$HOME/Library/LaunchAgents"
mkdir -p "$HOME/.openclaw/logs"
```

2. Write the LaunchAgent plist to the exact path below. Replace the placeholder values before saving:

```bash
cat > "$HOME/Library/LaunchAgents/ai.openclaw.webchat.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>ai.openclaw.webchat</string>
  <key>ProgramArguments</key>
  <array>
    <string>/ABSOLUTE/PATH/TO/openclaw-webchat/scripts/run-webchat-launchd.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/ABSOLUTE/PATH/TO/openclaw-webchat</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/Users/USERNAME/.openclaw/logs/openclaw-webchat.stdout.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/USERNAME/.openclaw/logs/openclaw-webchat.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key>
    <string>/Users/USERNAME</string>
    <key>OPENCLAW_BIN</key>
    <string>/ABSOLUTE/PATH/TO/openclaw</string>
    <key>OPENCLAW_WEBCHAT_PORT</key>
    <string>3770</string>
    <key>OPENCLAW_WEBCHAT_HOST</key>
    <string>127.0.0.1</string>
    <key>OPENCLAW_WEBCHAT_DATA_DIR</key>
    <string>/ABSOLUTE/PATH/TO/openclaw-webchat-data</string>
  </dict>
</dict>
</plist>
PLIST
```

3. Validate the two most important plist substitutions before loading it:

```bash
test -f "$HOME/Library/LaunchAgents/ai.openclaw.webchat.plist" && echo OK
grep -nE "/ABSOLUTE/PATH/TO|USERNAME" "$HOME/Library/LaunchAgents/ai.openclaw.webchat.plist"
```

Only continue if:
- the plist file exists
- `grep` returns no unresolved placeholders

4. Load or reload the LaunchAgent:

```bash
launchctl bootout "gui/$(id -u)" "$HOME/Library/LaunchAgents/ai.openclaw.webchat.plist" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/ai.openclaw.webchat.plist"
launchctl kickstart -k "gui/$(id -u)/ai.openclaw.webchat"
```

5. Verify the service is really running and serving:

Checks:

```bash
launchctl print gui/$(id -u)/ai.openclaw.webchat | head -40
curl -sf http://127.0.0.1:3770/healthz
tail -n 20 "$HOME/.openclaw/logs/openclaw-webchat.stderr.log"
```

Confirm:
- `launchctl print` shows the loaded `ai.openclaw.webchat` job
- `/healthz` succeeds
- the stderr log does not show an immediate startup failure

If the machine is not macOS:
- stop at a manual install unless the user gives a different service manager target
- report that persistent service setup was not applied

## Step 10: Apply UI Settings

Open the UI and configure:
- access mode
- optional light auth
- language
- theme

Check:
- settings save successfully
- restart guidance is clear if a bind-address change requires it

## Final Completion Check

The install is complete only if:

- the project files were downloaded successfully
- `npm install` succeeded
- `npm run check` succeeded
- OpenClaw gateway health works
- `/healthz` works
- the UI loads
- `npm run selftest` passed or a clear reason was documented
- background service is enabled if requested

## If You Are A Lower-Capability Agent

Use this fallback behavior:

- do not combine fetch, install, and verify steps into one command
- quote exact paths every time
- after each check, report either `pass` or `blocked`
- if GitHub download paths are uncertain, stop and confirm the exact release tag rather than guessing
