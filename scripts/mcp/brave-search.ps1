$apiKey = $env:BRAVE_API_KEY

if (-not $apiKey) {
  $apiKey = [Environment]::GetEnvironmentVariable("BRAVE_API_KEY", "User")
}

if (-not $apiKey) {
  $apiKey = [Environment]::GetEnvironmentVariable("BRAVE_API_KEY", "Machine")
}

if (-not $apiKey) {
  Write-Error 'BRAVE_API_KEY is not set. Set it first, for example: setx BRAVE_API_KEY "<key>"'
  exit 1
}

$env:BRAVE_API_KEY = $apiKey
& npx -y @modelcontextprotocol/server-brave-search
exit $LASTEXITCODE
