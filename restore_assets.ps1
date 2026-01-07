
$base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
$bytes = [Convert]::FromBase64String($base64)
$publicDir = "apps\web\public\branding"

# Define SVG Content (Basic placeholders)
$logoSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50" viewBox="0 0 200 50"><text x="50" y="32" font-family="Arial" font-size="24">Brand</text></svg>'
$iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path></svg>'
$faviconSvg = $iconSvg

# Ensure directories
foreach ($dir in @("logo", "icon", "favicon")) {
    $path = Join-Path $publicDir $dir
    if (-not (Test-Path $path)) { New-Item -ItemType Directory -Force -Path $path | Out-Null }
}

# Create PNGs (Binary)
$pngFiles = @(
    "$publicDir\logo\logo-default.png",
    "$publicDir\logo\logo-dark.png", 
    "$publicDir\logo\logo-light.png",
    "$publicDir\favicon\favicon-16x16.png",
    "$publicDir\favicon\favicon-32x32.png",
    "$publicDir\favicon\apple-touch-icon.png",
    "$publicDir\favicon\favicon.ico"
)
foreach ($file in $pngFiles) {
    [IO.File]::WriteAllBytes($file, $bytes)
    Write-Host "Created PNG/ICO: $file"
}

# Create SVGs (Text)
Set-Content -Path "$publicDir\logo\logo-default.svg" -Value $logoSvg
Set-Content -Path "$publicDir\icon\icon-default.svg" -Value $iconSvg
Set-Content -Path "$publicDir\favicon\favicon.svg" -Value $faviconSvg
Write-Host "Created SVGs"
