param(
    [Parameter(Mandatory = $true)] [string] $PresentationPath
)

$ErrorActionPreference = 'Stop'
$resolvedPath = [IO.Path]::GetFullPath($PresentationPath)
$powerPoint = New-Object -ComObject PowerPoint.Application
$powerPoint.Visible = -1
$presentation = $powerPoint.Presentations.Open($resolvedPath, $false, $true, $false)

$overflow = New-Object Collections.Generic.List[string]
$smallMainText = New-Object Collections.Generic.List[string]
$notesCount = 0
$hiddenCount = 0

try {
    foreach ($slide in $presentation.Slides) {
        if ($slide.SlideShowTransition.Hidden -eq -1) { $hiddenCount++ }
        foreach ($noteShape in $slide.NotesPage.Shapes) {
            try {
                if ($noteShape.PlaceholderFormat.Type -eq 2 -and $noteShape.TextFrame.HasText -eq -1 -and $noteShape.TextFrame.TextRange.Text.Trim()) {
                    $notesCount++
                    break
                }
            } catch {}
        }
        foreach ($shape in $slide.Shapes) {
            try {
                if ($shape.HasTextFrame -ne -1 -or $shape.TextFrame.HasText -ne -1) { continue }
                $text = ($shape.TextFrame.TextRange.Text -replace '[\r\n]+', ' ').Trim()
                if (-not $text) { continue }
                $boundHeight = $shape.TextFrame2.TextRange.BoundHeight
                $boundWidth = $shape.TextFrame2.TextRange.BoundWidth
                if ($boundHeight -gt ($shape.Height + 2) -or $boundWidth -gt ($shape.Width + 2)) {
                    $overflow.Add("Slide $($slide.SlideIndex): $text")
                }
                $fontSize = $shape.TextFrame.TextRange.Font.Size
                # Ignore fixed header/footer/source metadata. Main slide content
                # smaller than 16 pt is flagged for manual review.
                if ($shape.Top -ge 140 -and $shape.Top -lt 490 -and $fontSize -gt 0 -and $fontSize -lt 16) {
                    $smallMainText.Add("Slide $($slide.SlideIndex): ${fontSize}pt - $text")
                }
            } catch {}
        }
    }
    Write-Output "Slides=$($presentation.Slides.Count) Hidden=$hiddenCount Notes=$notesCount"
    Write-Output "Overflow=$($overflow.Count) SmallMainText=$($smallMainText.Count)"
    foreach ($item in $overflow) { Write-Output "OVERFLOW $item" }
    foreach ($item in $smallMainText) { Write-Output "SMALL $item" }
} finally {
    $presentation.Close()
    $powerPoint.Quit()
    [Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null
    [Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
