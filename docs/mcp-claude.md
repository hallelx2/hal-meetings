# Hal MCP → Claude and OpenCode

Hal captures meetings. Claude / OpenCode act on them. Server issue: [HAL-807](https://linear.app/hallelx2/issue/HAL-807). Not shipped yet; this is the contract.

Auth: a **workspace API key**. Tools never take `workspace_id` as a model argument.

| Tool | Does |
|---|---|
| `list_meetings` | Upcoming / recent meetings in this workspace |
| `get_summary` | Decrypted summary for one meeting you own |
| `get_transcript` | Decrypted diarized transcript |
| `list_action_items` | Action items from one meeting or the last N |
| `ask` | Question over this workspace only |

## URLs to copy

| Env | MCP URL |
|---|---|
| Local | `http://localhost:3000/api/mcp` |
| Production | `https://hal.hallelx2.com/api/mcp` |

Header (both):

```
Authorization: Bearer <HAL_MCP_API_KEY>
```

## Claude.ai / Desktop

Connector URL: `https://hal.hallelx2.com/api/mcp`  
Header: `Authorization: Bearer <HAL_MCP_API_KEY>`

Local `claude_desktop_config.json`:

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

## OpenCode

`~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "hal": {
      "type": "remote",
      "url": "https://hal.hallelx2.com/api/mcp",
      "enabled": true,
      "oauth": false,
      "headers": {
        "Authorization": "Bearer {env:HAL_MCP_API_KEY}"
      }
    }
  }
}
```

Then: `use hal to list my last three meetings`.
