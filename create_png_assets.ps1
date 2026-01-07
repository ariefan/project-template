
$base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
$bytes = [Convert]::FromBase64String($base64)
$files = @(
    "apps\web\public\branding\logo\logo-default.png"
)

foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        [IO.File]::WriteAllBytes($file, $bytes)
        Write-Host "Created $file"
    }
}
