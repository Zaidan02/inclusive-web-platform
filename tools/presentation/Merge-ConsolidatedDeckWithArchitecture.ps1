param(
    [string] $ConsolidatedPath,
    [string] $ArchitecturePath,
    [string] $TargetPath,
    [string] $PreviewDirectory
)

$ErrorActionPreference = 'Stop'
$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $scriptDirectory '..\..'))

if (-not $ConsolidatedPath) {
    $ConsolidatedPath = Join-Path $repositoryRoot 'artifacts\Inclusive_Web_Platform_USJ_CONSOLIDATED_FINAL_PRESENTATION_Zaidan_Charbel_2026-09-14.pptx'
}
if (-not $ArchitecturePath) {
    $ArchitecturePath = Join-Path $repositoryRoot 'artifacts\JoIn_Hospitality_IMPLEMENTED_ARCHITECTURE_FLOW_SLIDE.pptx'
}
if (-not $TargetPath) {
    $TargetPath = Join-Path $repositoryRoot 'artifacts\FYP_Final_Presentation_WITH_ARCHITECTURE.pptx'
}
if (-not $PreviewDirectory) {
    $PreviewDirectory = Join-Path $repositoryRoot 'artifacts\FYP_Final_Presentation_WITH_ARCHITECTURE_preview'
}

$consolidated = [IO.Path]::GetFullPath($ConsolidatedPath)
$architecture = [IO.Path]::GetFullPath($ArchitecturePath)
$target = [IO.Path]::GetFullPath($TargetPath)
$preview = [IO.Path]::GetFullPath($PreviewDirectory)
$working = Join-Path (Split-Path -Parent $target) 'FYP_Final_Presentation_WITH_ARCHITECTURE.merge-working.pptx'
$backup = Join-Path (Split-Path -Parent $target) 'FYP_Final_Presentation_ARCHITECTURE_ONLY_BACKUP.pptx'

foreach ($required in @($consolidated, $architecture, $target)) {
    if (-not (Test-Path -LiteralPath $required)) { throw "Required presentation not found: $required" }
}

# Preserve the previous four-slide target so the merge remains fully recoverable.
Copy-Item -LiteralPath $target -Destination $backup -Force
Copy-Item -LiteralPath $consolidated -Destination $working -Force

$powerPoint = $null
$presentation = $null
try {
    $powerPoint = New-Object -ComObject PowerPoint.Application
    $presentation = $powerPoint.Presentations.Open($working, 0, 0, 0)

    if ($presentation.Slides.Count -ne 20) {
        throw "Expected 20 consolidated slides, found $($presentation.Slides.Count)."
    }

    # Replace the former simplified architecture slide, preserving the 20-slide order.
    $presentation.Slides.Item(8).Delete()
    $inserted = $presentation.Slides.InsertFromFile($architecture, 7, 1, 1)
    if ($inserted -ne 1 -or $presentation.Slides.Count -ne 20) {
        throw "Architecture insertion failed. Inserted=$inserted Slides=$($presentation.Slides.Count)."
    }

    $architectureSlide = $presentation.Slides.Item(8)
    foreach ($shape in $architectureSlide.Shapes) {
        try {
            if ($shape.HasTextFrame -ne -1 -or $shape.TextFrame.HasText -ne -1) { continue }
            $text = $shape.TextFrame.TextRange.Text.Trim()
            if ($text -eq 'ARCH') {
                $shape.TextFrame.TextRange.Text = '8'
            } elseif ($text -like 'INCLUSIVE WEB PLATFORM | FINAL ENGINEERING PRESENTATION*') {
                $shape.TextFrame.TextRange.Text = 'INCLUSIVE WEB PLATFORM | FINAL ENGINEERING PRESENTATION'
            }
        } catch {}
    }

    $presentation.Save()
    $presentation.Close()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation)
    $presentation = $null

    Copy-Item -LiteralPath $working -Destination $target -Force

    if (Test-Path -LiteralPath $preview) {
        Get-ChildItem -LiteralPath $preview -File -Filter 'Slide*.PNG' | Remove-Item -Force
    } else {
        New-Item -ItemType Directory -Path $preview | Out-Null
    }

    $presentation = $powerPoint.Presentations.Open($target, -1, 0, 0)
    $presentation.Export($preview, 'PNG', 1280, 720)
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
Write-Output 'Slides: 20 (architecture flow at slide 8)'
Write-Output "Backup: $backup"
Write-Output "Preview directory: $preview"
