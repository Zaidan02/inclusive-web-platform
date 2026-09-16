param(
    [string] $ReportPath = (Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'artifacts\FYP_CCE_FINAL_REPORT_PREMIUM_SUBMISSION_Zaidan_Mansour_Charbel_Rizk_2026-09-11.docx'),
    [string] $OutputPath = (Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'artifacts\presentation-assets\project-management-gantt.png')
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression
$resolvedReport = [IO.Path]::GetFullPath($ReportPath)
$resolvedOutput = [IO.Path]::GetFullPath($OutputPath)
$outputDirectory = Split-Path -Parent $resolvedOutput
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

$stream = [IO.File]::Open($resolvedReport, 'Open', 'Read', 'ReadWrite')
try {
    $archive = New-Object IO.Compression.ZipArchive($stream, [IO.Compression.ZipArchiveMode]::Read, $false)
    try {
        # Figure 16 in the report is embedded as rId31 -> word/media/image17.png.
        $entry = $archive.GetEntry('word/media/image17.png')
        if (-not $entry) { throw 'The Gantt chart image was not found in the report package.' }
        $source = $entry.Open()
        try {
            $destination = [IO.File]::Open($resolvedOutput, 'Create', 'Write', 'None')
            try { $source.CopyTo($destination) } finally { $destination.Dispose() }
        } finally { $source.Dispose() }
    } finally { $archive.Dispose() }
} finally { $stream.Dispose() }

Write-Output $resolvedOutput
