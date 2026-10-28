$dest = "$env:LOCALAPPDATA\Programs\Tesseract-OCR"
Write-Host "Extracting Tesseract to $dest..."
New-Item -ItemType Directory -Path $dest -Force | Out-Null
& "C:\Program Files\7-Zip\7z.exe" x -tNsis "C:\Users\ELCOT\Desktop\ee project\tesseract-installer.exe" "-o$dest" -y
Write-Host "Extraction completed."
Get-ChildItem $dest | Select-Object Name -First 20
