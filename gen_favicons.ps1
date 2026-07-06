Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Aneeque\.gemini\antigravity\brain\f4fa1615-e9ea-414a-9bb2-ed45564e48c1\recon_pulse_favicon_1783356667221.jpg"
$logoPath = "C:\Users\Aneeque\.gemini\antigravity\brain\f4fa1615-e9ea-414a-9bb2-ed45564e48c1\recon_pulse_logo_1783356634091.jpg"
$outDir = "frontend\public"

# Copy full logo
Copy-Item $logoPath -Destination "$outDir\logo.png" -Force

# Load the icon source
$src = [System.Drawing.Image]::FromFile($srcPath)

function Save-Resized($size, $filename) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.DrawImage($src, 0, 0, $size, $size)
    $g.Dispose()
    $bmp.Save("$outDir\$filename", [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created $filename ($size x $size)"
}

Save-Resized 16  "favicon-16x16.png"
Save-Resized 32  "favicon-32x32.png"
Save-Resized 180 "apple-touch-icon.png"
Save-Resized 192 "logo192.png"
Save-Resized 512 "logo512.png"

$src.Dispose()
Write-Host "All favicon sizes generated."
