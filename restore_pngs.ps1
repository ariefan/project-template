
$base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
$bytes = [Convert]::FromBase64String($base64)
$publicDir = "apps\web\public\branding"

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
    # Ensure directory exists just in case
    $dir = Split-Path $file
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    
    [IO.File]::WriteAllBytes($file, $bytes)
    Write-Host "Created $file"
}
