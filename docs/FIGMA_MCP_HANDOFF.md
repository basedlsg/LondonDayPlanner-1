# Figma MCP Handoff

Date: 2026-03-26

## Goal
Set up Figma MCP in Codex so Figma frame links can be used directly for design context, screenshots, and implementation help.

## Current State
Figma MCP is configured locally and the token is now installed in the machine environment for future Codex launches.

## What Was Verified
- Codex config already had Figma MCP enabled in `/Users/carlos/.codex/config.toml`.
- `rmcp_client = true` is enabled.
- Figma MCP server URL is set to `https://mcp.figma.com/mcp`.
- Launchd environment now has `FIGMA_OAUTH_TOKEN` set.
- A fresh interactive `zsh` shell sees `FIGMA_OAUTH_TOKEN`.
- The MCP endpoint is reachable and responds over HTTPS.

## Local Changes Made
### 1. Codex config
No structural changes were needed. Existing config in `/Users/carlos/.codex/config.toml` is correct:

```toml
[features]
rmcp_client = true

[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"
bearer_token_env_var = "FIGMA_OAUTH_TOKEN"
http_headers = { "X-Figma-Region" = "us-east-1" }
enabled = true
```

### 2. Shell environment
Added this to `/Users/carlos/.zshrc`:

```bash
export FIGMA_OAUTH_TOKEN="..."
```

This ensures future terminal-launched Codex sessions inherit the token.

### 3. GUI app environment
Set the token into `launchd` with:

```bash
launchctl setenv FIGMA_OAUTH_TOKEN "..."
```

This is the important part for the Codex desktop app on macOS.

## Important Operational Note
The current running Codex app process still needs a restart to pick up the new environment variable. The setup is in place for the next launch, but MCP auth will not be reliable in the already-running app process.

## What To Do Next
1. Fully quit Codex desktop.
2. Reopen Codex desktop.
3. Paste a Figma frame link into chat.
4. Ask Codex to use Figma MCP on that exact node.

## How To Use It
Use a full Figma frame or layer URL, for example:

`https://www.figma.com/design/FztpApexcmRvabbt7Dt0wQ/Untitled?node-id=0-1&m=dev&t=BRFNlRsqvewJ3bHn-1`

Then prompt Codex with something like:

- `Use the Figma MCP on this frame and get design context plus screenshot.`
- `Use the Figma MCP to inspect this loading screen and give me the exact overlay dimensions for the baked-in progress bar.`
- `Use the Figma MCP to implement this frame in SwiftUI.`

## Recommended Workflow
For any Figma-driven task, follow this order:

1. `get_design_context`
2. `get_metadata` if the frame is too large or needs node mapping
3. `get_screenshot`
4. implement from the fetched design data

This matches the local skill guidance in `/Users/carlos/.codex/skills/figma/SKILL.md`.

## Why This Matters For The Loading Screen Work
For the loading screen with the baked-in static bar, Figma MCP is a good fit for:

- reading exact overlay geometry
- matching alignment and spacing
- pulling a visual screenshot reference
- designing a precise blue animated overlay that covers the baked bar area

The best implementation path is still:
- keep the exact city image as the background
- overlay a cover patch over the baked bar area
- render the live blue loading UI above that patch

## Official References
- Figma blog: [The Figma canvas is now open to agents](https://www.figma.com/blog/the-figma-canvas-is-now-open-to-agents/)
- Guide to Figma MCP: [https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)
- Remote server installation: [https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/)
- Tools and prompts: [https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)
- Plans and permissions: [https://developers.figma.com/docs/figma-mcp-server/plans-access-and-permissions/](https://developers.figma.com/docs/figma-mcp-server/plans-access-and-permissions/)

## Risk / Cleanup Note
The token is currently stored locally in `/Users/carlos/.zshrc` and `launchd` because you explicitly asked to optimize for local setup over security. If that changes later, move it into a secret store and rotate the token.
