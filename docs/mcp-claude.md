# Hal MCP → Claude and OpenCode

Hal captures meetings. Claude (or OpenCode) acts on them. The bridge is a Hal MCP server ([HAL-807](https://linear.app/hallelx2/issue/HAL-807)). This doc is the contract so the server and the connectors stay aligned.

The server is not shipped yet. The tool names and auth model below are what we will implement.

## What the server exposes

Auth: a **workspace API key**. The key resolves to `workspace_id` on the server. Tools never take `workspace_id` as a model argument.

| Tool | Does |
|---|---|
| `list_meetings` | Upcoming / recent meetings in this workspace |
| `get_summary` | Decrypted structured summary for one meeting you own |
| `get_transcript` | Decrypted diarized transcript for one meeting you own |
| `list_action_items` | Action items from one meeting or the last N |
| `ask` | Question over this workspace’s meetings only |

A key from workspace A cannot read workspace B. Unknown meeting ids return not-found, not a confirmation that they exist.

Tokens, DEKs, and raw ciphertext never appear in tool results.

## Mint a key (once the server exists)

In the Hal cockpit: Settings → API keys → create. Copy once. Store it as `HAL_MCP_API_KEY`.

Until that UI exists, the server will accept a hashed row in `api_keys` created by a seed script.

## Claude

### Claude.ai / Claude Desktop (remote MCP)

1. Settings → Connectors → Add custom connector
2. URL: `https://<your-hal-origin>/api/mcp`
3. Header: `Authorization: Bearer <HAL_MCP_API_KEY>`

Local self-host (Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "hal": {
      "url": "http://localhost:3000/api/mcp",
      "headers": {
        "Authorization": "Bearer <HAL_MCP_API_KEY>"
      }
    }
  }
}
```

If the client only supports stdio, wrap with `mcp-remote`:

```json
{
  "mcpServers": {
    "hal": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3000/api/mcp", "--header", "Authorization: Bearer ${HAL_MCP_API_KEY}"]
    }
  }
}
```

Then: “use hal to list my last three meetings and file Linear issues for the action items.”

## OpenCode

In `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "hal": {
      "type": "remote",
      "url": "http://localhost:3000/api/mcp",
      "enabled": true,
      "headers": {
        "Authorization": "Bearer {env:HAL_MCP_API_KEY}"
      },
      "oauth": false
    }
  }
}
```

Restart OpenCode. Prompt: `use hal to get the summary of my last Meet`.

## What this is not

- The in-meeting Chromium bot is **not** an MCP client in Wave 1.
- Hal does not call Claude during the call.
- MCP is Wave 2. The personal loop (join → transcript → cockpit) must work first.
