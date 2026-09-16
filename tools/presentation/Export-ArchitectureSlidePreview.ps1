param(
    [string] $PresentationPath,
    [string] $OutputPath
)

$ErrorActionPreference = 'Stop'
$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $scriptDirectory '..\..'))
if (-not $PresentationPath) { $PresentationPath = Join-Path $repositoryRoot 'artifacts\FYP_Final_Presentation_WITH_ARCHITECTURE.pptx' }
if (-not $OutputPath) { $OutputPath = Join-Path $repositoryRoot 'artifacts\FYP_Final_Presentation_ARCHITECTURE_PREVIEW.png' }

$powerPoint = $null
$presentation = $null
$ownsApplication = $false
try {
    try {
        $powerPoint = [Runtime.InteropServices.Marshal]::GetActiveObject('PowerPoint.Application')
    } catch {
        $powerPoint = New-Object -ComObject PowerPoint.Application
        $ownsApplication = $true
    }

    $presentation = $powerPoint.Presentations.Open([IO.Path]::GetFullPath($PresentationPath), -1, 0, 0)
    $presentation.Slides.Item(4).Export([IO.Path]::GetFullPath($OutputPath), 'PNG', 1600, 1200)
} finally {
    if ($presentation) { $presentation.Close() }
    if ($ownsApplication -and $powerPoint) { $powerPoint.Quit() }
    if ($presentation) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) }
    if ($powerPoint) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

Write-Output "Created preview: $OutputPath"
