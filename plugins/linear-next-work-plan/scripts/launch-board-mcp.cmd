@echo off
setlocal

if "%~1"=="" (
  echo Linear work plan board could not start: missing MCP server entry. 1>&2
  exit /b 64
)

if defined CODEX_MCP_NODE_PATH if exist "%CODEX_MCP_NODE_PATH%" (
  "%CODEX_MCP_NODE_PATH%" %*
  exit /b
)

where node >nul 2>&1
if not errorlevel 1 (
  node %*
  exit /b
)

echo Linear work plan board could not find a Node.js runtime. 1>&2
exit /b 127
