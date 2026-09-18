$envFile = Get-Content .env

$url = (($envFile |
  Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_URL=' }) `
  -replace '^NEXT_PUBLIC_SUPABASE_URL=', '').Trim('"').TrimEnd('/')

$key = (($envFile |
  Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' }) `
  -replace '^NEXT_PUBLIC_SUPABASE_ANON_KEY=', '').Trim('"')

$headers = @{
  apikey = $key
  Authorization = "Bearer $key"
}

$uri = "$url/rest/v1/_prisma_migrations?select=id&limit=1"

try {
  $response = Invoke-WebRequest `
    -Uri $uri `
    -Headers $headers `
    -Method Get `
    -UseBasicParsing `
    -ErrorAction Stop

  Write-Output "Status: $($response.StatusCode)"
  Write-Output "Resposta: $($response.Content)"
} catch {
  $errorResponse = $_.Exception.Response

  if ($null -eq $errorResponse) {
    throw
  }

  $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
  $body = $reader.ReadToEnd()
  $reader.Dispose()

  Write-Output "Status: $([int]$errorResponse.StatusCode)"
  Write-Output "Resposta: $body"
}
