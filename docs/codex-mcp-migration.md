# Codex MCP Migration

This document captures the Claude-side MCP configuration found on this PC and rewrites it into a Codex-safe migration plan for `ProjectImprove`.

## Source Of Truth

The following files were used to inventory the current Claude MCP setup:

- Project permissions: `.claude/settings.local.json`
- Claude Desktop MCP config: `%APPDATA%\Claude\claude_desktop_config.json`
- Claude global and project MCP config: `%USERPROFILE%\.claude.json`

Important: `.claude/settings.local.json` is not the source of MCP server definitions. It only whitelists tools that Claude is allowed to call after a server is already configured.

## Discovered Servers

| Server | Seen In Claude | Type | Current Definition | Auth Mode | Codex Migration |
| --- | --- | --- | --- | --- | --- |
| `context7` | Project + global | HTTP | `https://mcp.context7.com/mcp` | Unknown or none | Add directly |
| `notion` | Project + global | HTTP | `https://mcp.notion.com/mcp` | OAuth likely | Add directly, then run `codex mcp login notion` if required |
| `github` | Global | HTTP | `https://api.githubcopilot.com/mcp/` | Bearer token | Add with `--bearer-token-env-var` |
| `brave-search` | Global | stdio | `npx -y @modelcontextprotocol/server-brave-search` | `BRAVE_API_KEY` | Use wrapper script so the key stays outside Codex config |
| `tavily` | Global | stdio | `npx -y tavily-mcp` | `TAVILY_API_KEY` | Use wrapper script so the key stays outside Codex config |
| `server-gmail-autoauth-mcp` | Claude Desktop only | stdio | `cmd /c npx -y @smithery/cli@latest run @gongrzhe/server-gmail-autoauth-mcp` | Interactive auth | Optional in Codex |

## Recommended Import Order

1. `context7`
2. `notion`
3. `github`
4. `brave-search`
5. `tavily`
6. `server-gmail-autoauth-mcp` only if you want Gmail inside Codex too

## Safe Prerequisites

Do not paste raw keys into a repo file or into a shared note. Store them as OS environment variables first.

Recommended variable names:

- `GITHUB_MCP_BEARER_TOKEN`
- `BRAVE_API_KEY`
- `TAVILY_API_KEY`

PowerShell examples:

```powershell
setx GITHUB_MCP_BEARER_TOKEN "<paste-rotated-token-here>"
setx BRAVE_API_KEY "<paste-key-here>"
setx TAVILY_API_KEY "<paste-key-here>"
```

Open a new terminal after `setx` so the variables are visible to later processes.

## Codex Registration Commands

Project-relevant HTTP servers:

```powershell
codex mcp add context7 --url https://mcp.context7.com/mcp
codex mcp add notion --url https://mcp.notion.com/mcp
```

GitHub with bearer-token indirection:

```powershell
codex mcp add github --url https://api.githubcopilot.com/mcp/ --bearer-token-env-var GITHUB_MCP_BEARER_TOKEN
```

Search servers without persisting secrets into Codex config:

```powershell
codex mcp add brave-search -- powershell -ExecutionPolicy Bypass -File "C:\Users\Administrator\Workspace\ProjectImprove\scripts\mcp\brave-search.ps1"
codex mcp add tavily -- powershell -ExecutionPolicy Bypass -File "C:\Users\Administrator\Workspace\ProjectImprove\scripts\mcp\tavily.ps1"
```

Optional Gmail server:

```powershell
codex mcp add server-gmail-autoauth-mcp -- cmd /c npx -y @smithery/cli@latest run @gongrzhe/server-gmail-autoauth-mcp
```

## Login Follow-Up

Run login only for servers that actually prompt for OAuth.

```powershell
codex mcp login notion
```

If the Gmail server opens an auth flow on first use, complete that flow in the browser window it launches.

## Validation

After importing servers, validate with:

```powershell
codex mcp list
codex mcp get context7 --json
codex mcp get notion --json
codex mcp get github --json
codex mcp get brave-search --json
codex mcp get tavily --json
```

In a fresh Codex session, MCP-backed tools or resources should then appear instead of returning an empty inventory.

## Security Notes

- Some secrets are currently stored inline in `%USERPROFILE%\.claude.json`. They were intentionally omitted from this document.
- Because those values have existed in plaintext local config, rotating them is the safer choice before or immediately after importing them into Codex.
- Keep `.claude/settings.local.json` out of the migration path. It describes permissions, not server connectivity.
