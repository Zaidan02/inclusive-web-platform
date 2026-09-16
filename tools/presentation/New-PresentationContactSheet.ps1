param(
    [Parameter(Mandatory = $true)] [string] $InputDirectory,
    [Parameter(Mandatory = $true)] [string] $OutputPath,
    [int] $Columns = 4
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$files = Get-ChildItem -LiteralPath $InputDirectory -Filter 'Slide*.PNG' | Sort-Object {
    if ($_.BaseName -match '(\d+)$') { [int]$Matches[1] } else { [int]::MaxValue }
}
if ($files.Count -eq 0) { throw "No Slide*.PNG files were found in $InputDirectory" }

$thumbWidth = 400
$thumbHeight = 225
$labelHeight = 24
$rows = [Math]::Ceiling($files.Count / $Columns)
$canvas = New-Object Drawing.Bitmap ($Columns * $thumbWidth), ($rows * ($thumbHeight + $labelHeight))
$graphics = [Drawing.Graphics]::FromImage($canvas)
$graphics.Clear([Drawing.Color]::White)
$graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$font = New-Object Drawing.Font 'Segoe UI', 12, ([Drawing.FontStyle]::Bold)
$brush = [Drawing.Brushes]::Black

try {
    for ($i = 0; $i -lt $files.Count; $i++) {
        $column = $i % $Columns
        $row = [Math]::Floor($i / $Columns)
        $x = $column * $thumbWidth
        $y = $row * ($thumbHeight + $labelHeight)
        $graphics.DrawString("Slide $($i + 1)", $font, $brush, $x + 4, $y + 2)
        $image = [Drawing.Image]::FromFile($files[$i].FullName)
        try {
            $graphics.DrawImage($image, $x, $y + $labelHeight, $thumbWidth, $thumbHeight)
        } finally { $image.Dispose() }
    }
    $outputDirectory = Split-Path -Parent ([IO.Path]::GetFullPath($OutputPath))
    New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
    $canvas.Save([IO.Path]::GetFullPath($OutputPath), [Drawing.Imaging.ImageFormat]::Png)
} finally {
    $font.Dispose()
    $graphics.Dispose()
    $canvas.Dispose()
}

Write-Output ([IO.Path]::GetFullPath($OutputPath))
