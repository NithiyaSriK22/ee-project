$target = "https://github.com/UB-Mannheim/tesseract/releases/download/v5.4.0.20240606/tesseract-ocr-w64-setup-5.4.0.20240606.exe"
$dest = "$env:TEMP\tesseract-installer.exe"
$expectedSize = 50175248

$retries = 0
$maxRetries = 50

while ($retries -lt $maxRetries) {
    if (Test-Path $dest) {
        $len = (Get-Item $dest).Length
        Write-Host "Current size: $len of $expectedSize bytes ($([math]::Round($len / 1MB, 2)) MB)"
        if ($len -ge $expectedSize) {
            Write-Host "Download complete and verified!"
            exit 0
        }
    }
    $retries++
    Write-Host "Resuming download (attempt $retries of $maxRetries)..."
    curl.exe -C - -L -o $dest $target --silent --show-error
    Start-Sleep -Milliseconds 500
}

Write-Error "Max retries reached without completing download."
exit 1
