param(
    [Parameter(Mandatory = $true)]
    [string] $DocumentPath
)

$ErrorActionPreference = 'Stop'
$documentFullPath = (Resolve-Path -LiteralPath $DocumentPath).Path
$pdfPath = [System.IO.Path]::ChangeExtension($documentFullPath, '.pdf')

function Paragraph-Text {
    param($Paragraph)
    return (($Paragraph.Range.Text -replace "[`r`a]", '')).Trim()
}

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$document = $null

try {
    $document = $word.Documents.Open($documentFullPath, $false, $false)
    $normalStyle = $document.Styles.Item('Normal')
    $imagesCorrected = 0

    foreach ($paragraph in $document.Paragraphs) {
        $caption = Paragraph-Text $paragraph
        if ($caption -notmatch '^Figure\s+\d+:') { continue }

        $nearest = $null
        foreach ($shape in $document.InlineShapes) {
            if ($shape.Range.Start -lt $paragraph.Range.Start -and (-not $nearest -or $shape.Range.Start -gt $nearest.Range.Start)) {
                $nearest = $shape
            }
        }
        if ($nearest) {
            try {
                $nearest.Range.Paragraphs.Item(1).Range.Style = $normalStyle
                $nearest.Range.Paragraphs.Item(1).Range.ParagraphFormat.Alignment = 1
                $imagesCorrected++
            } catch {}
        }
    }

    foreach ($contents in $document.TablesOfContents) { $contents.Update() }
    [void] $document.Fields.Update()
    $document.Save()
    $document.ExportAsFixedFormat($pdfPath, 17)

    Write-Output "Image paragraphs normalized: $imagesCorrected"
    Write-Output "Final report: $documentFullPath"
    Write-Output "Final PDF: $pdfPath"
} finally {
    if ($document) { try { $document.Close(0) } catch {} }
    try { $word.Quit() } catch {}
}
