#!/usr/bin/env bash
# Test des WebDAV-MCP-Servers gegen einen lokalen WebDAV-Server.
set -euo pipefail
cd "$(dirname "$0")"
( cd ../../mailbox_org_mcp/webdav && [ -d node_modules ] || npm install --ignore-scripts --no-audit --no-fund )
[ -d node_modules ] || npm install --ignore-scripts --no-audit --no-fund
node test.mjs
