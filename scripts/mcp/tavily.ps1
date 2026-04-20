$apiKey = $env:TAVILY_API_KEY

if (-not $apiKey) {
  $apiKey = [Environment]::GetEnvironmentVariable("TAVILY_API_KEY", "User")
}

if (-not $apiKey) {
  $apiKey = [Environment]::GetEnvironmentVariable("TAVILY_API_KEY", "Machine")
}

if (-not $apiKey) {
  Write-Error 'TAVILY_API_KEY is not set. Set it first, for example: setx TAVILY_API_KEY "<key>"'
  exit 1
}

$env:TAVILY_API_KEY = $apiKey
& npx -y tavily-mcp
exit $LASTEXITCODE
