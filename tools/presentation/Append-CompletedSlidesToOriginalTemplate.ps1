param(
    [string] $TargetPath,
    [string] $SlidesPath,
    [string] $PreviewDirectory
)

$ErrorActionPreference = 'Stop'
$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $scriptDirectory '..\..'))

if (-not $TargetPath) {
    $TargetPath = Join-Path $repositoryRoot 'artifacts\FYP_Final_Presentation.pptx'
}
if (-not $SlidesPath) {
    $SlidesPath = Join-Path $repositoryRoot 'artifacts\FYP_Final_Presentation_WITH_ARCHITECTURE.pptx'
}
if (-not $PreviewDirectory) {
    $PreviewDirectory = Join-Path $repositoryRoot 'artifacts\FYP_Final_Presentation_23_SLIDES_preview'
}

$target = [IO.Path]::GetFullPath($TargetPath)
$slidesSource = [IO.Path]::GetFullPath($SlidesPath)
$preview = [IO.Path]::GetFullPath($PreviewDirectory)
$artifactDirectory = Split-Path -Parent $target
$backup = Join-Path $artifactDirectory 'FYP_Final_Presentation_3_SLIDE_BASE_BACKUP.pptx'
$working = Join-Path $artifactDirectory 'FYP_Final_Presentation.append-working.pptx'

if (-not (Test-Path -LiteralPath $target)) { throw "Target not found: $target" }
if (-not (Test-Path -LiteralPath $slidesSource)) { throw "Slides source not found: $slidesSource" }
if (Test-Path -LiteralPath (Join-Path $artifactDirectory '~$FYP_Final_Presentation.pptx')) {
    throw 'FYP_Final_Presentation.pptx is open in PowerPoint. Close it before appending slides.'
}

Copy-Item -LiteralPath $target -Destination $backup -Force
Copy-Item -LiteralPath $target -Destination $working -Force

if (-not (Test-Path -LiteralPath $preview)) {
    New-Item -ItemType Directory -Path $preview | Out-Null
}
Get-ChildItem -LiteralPath $preview -File -Filter 'Slide*.PNG' | Remove-Item -Force

$powerPoint = $null
$presentation = $null
try {
    $powerPoint = New-Object -ComObject PowerPoint.Application
    $presentation = $powerPoint.Presentations.Open($working, 0, 0, 0)

    if ($presentation.Slides.Count -ne 3) {
        throw "Expected the untouched three-slide base, found $($presentation.Slides.Count) slides."
    }

    $inserted = $presentation.Slides.InsertFromFile($slidesSource, 3, 1, 20)
    if ($inserted -ne 20 -or $presentation.Slides.Count -ne 23) {
        throw "Append failed. Inserted=$inserted Slides=$($presentation.Slides.Count)."
    }

    $presentation.Save()
    $presentation.Close()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation)
    $presentation = $null

    Copy-Item -LiteralPath $working -Destination $target -Force

    $presentation = $powerPoint.Presentations.Open($target, -1, 0, 0)
    if ($presentation.Slides.Count -ne 23) {
        throw "Saved presentation has $($presentation.Slides.Count) slides instead of 23."
    }
    $presentation.Export($preview, 'PNG', 1200, 900)
    $presentation.Close()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation)
    $presentation = $null
} finally {
    if ($presentation) {
        try { $presentation.Close() } catch {}
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation)
    }
    if ($powerPoint) {
        try { $powerPoint.Quit() } catch {}
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint)
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

if (Test-Path -LiteralPath $working) { Remove-Item -LiteralPath $working -Force }

Write-Output "Created: $target"
Write-Output 'Slides: 23 (original 3 preserved, completed 20 appended)'
Write-Output "Backup: $backup"
Write-Output "Preview directory: $preview"
