param(
    [Parameter(Mandatory = $true)]
    [string] $DocumentPath,

    [Parameter(Mandatory = $true)]
    [string] $AssetDirectory
)

$ErrorActionPreference = 'Stop'

$documentFullPath = (Resolve-Path -LiteralPath $DocumentPath).Path
$assetFullPath = (Resolve-Path -LiteralPath $AssetDirectory).Path

$figures = @(
    @{
        Placeholder = '[Insert screenshot here: candidate profile page showing language selector, editable transcript, consent, and reviewable suggestions.]'
        File = 'figure-8-ai-profile-workflow.png'
        Alt = 'Candidate AI-assisted profile section showing English, French, and Arabic selection, microphone control, editable transcript, consent checkbox, and profile-suggestion button.'
    },
    @{
        Placeholder = '[Insert screenshot here: visible keyboard focus and the voice-navigation/status notification controls.]'
        File = 'figure-9-keyboard-voice-navigation.png'
        Alt = 'Candidate dashboard with a visible keyboard focus indicator on My Profile and the optional voice-navigation control.'
    },
    @{
        Placeholder = '[Insert screenshot here: verifier dashboard with request filters, protected document control, and decision status.]'
        File = 'figure-10-verifier-dashboard.png'
        Alt = 'Authorized verifier dashboard using anonymized demo data, with request filters, verification status, private-document controls, reviewer note, and approve or reject actions.'
    },
    @{
        Placeholder = '[Insert screenshot here: responsive candidate, employer, verifier, and administrator views at representative desktop and mobile widths.]'
        File = 'figure-11-responsive-role-dashboards.png'
        Alt = 'Candidate and employer dashboards displayed side by side at a 375 by 812 CSS-pixel mobile viewport.'
    },
    @{
        Placeholder = '[Insert screenshot here: terminal or report view showing integration, E2E, and performance results.]'
        File = 'figure-12-test-performance-evidence.png'
        Alt = 'Automated verification summary showing 17 of 17 API integration checks, 19 of 19 browser end-to-end checks, zero performance-budget violations, and additional test results.'
    }
)

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$document = $null

try {
    $document = $word.Documents.Open($documentFullPath, $false, $false)
    $maximumWidth = $document.PageSetup.PageWidth - $document.PageSetup.LeftMargin - $document.PageSetup.RightMargin

    foreach ($figure in $figures) {
        $imagePath = Join-Path $assetFullPath $figure.File
        if (-not (Test-Path -LiteralPath $imagePath)) { throw "Screenshot not found: $imagePath" }

        $range = $document.Content
        $range.Find.ClearFormatting()
        $range.Find.Text = $figure.Placeholder
        $range.Find.Forward = $true
        $range.Find.Wrap = 0
        if (-not $range.Find.Execute()) { throw "Screenshot placeholder not found: $($figure.Placeholder)" }

        $range.Text = ''
        $shape = $document.InlineShapes.AddPicture($imagePath, $false, $true, $range)
        $shape.LockAspectRatio = -1
        if ($shape.Width -gt $maximumWidth) { $shape.Width = $maximumWidth }
        $shape.AlternativeText = $figure.Alt
        $shape.Title = $figure.File
    }

    foreach ($toc in $document.TablesOfContents) { $toc.Update() }
    foreach ($tof in $document.TablesOfFigures) { $tof.Update() }
    [void] $document.Fields.Update()
    $document.Save()
    $pdfPath = [System.IO.Path]::ChangeExtension($documentFullPath, '.pdf')
    $document.ExportAsFixedFormat($pdfPath, 17)
    Write-Output "Embedded $($figures.Count) labeled screenshots in $documentFullPath"
    Write-Output "Exported PDF: $pdfPath"
} finally {
    if ($document) { try { $document.Close(0) } catch {} }
    try { $word.Quit() } catch {}
}
