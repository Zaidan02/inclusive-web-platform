param(
    [Parameter(Mandatory = $true)]
    [string] $DocumentPath
)

$ErrorActionPreference = 'Stop'

$documentFullPath = (Resolve-Path -LiteralPath $DocumentPath).Path
$pdfPath = [System.IO.Path]::ChangeExtension($documentFullPath, '.pdf')

Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression

function Add-MissingFigureAlternativeText {
    param([string] $Path)

    $archive = [System.IO.Compression.ZipFile]::Open($Path, [System.IO.Compression.ZipArchiveMode]::Update)
    try {
        $entry = $archive.GetEntry('word/document.xml')
        if (-not $entry) { throw 'word/document.xml was not found in the report package.' }

        $reader = [System.IO.StreamReader]::new($entry.Open())
        try { [xml] $xml = $reader.ReadToEnd() } finally { $reader.Dispose() }

        $namespace = [System.Xml.XmlNamespaceManager]::new($xml.NameTable)
        $namespace.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
        $namespace.AddNamespace('wp', 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing')
        $body = $xml.SelectSingleNode('//w:body', $namespace)
        $updated = 0

        for ($index = 0; $index -lt $body.ChildNodes.Count; $index++) {
            $properties = $body.ChildNodes[$index].SelectNodes('.//wp:docPr', $namespace)
            foreach ($property in $properties) {
                if ($property.HasAttribute('descr') -or $index -lt 100) { continue }

                $bestTitle = $null
                $bestDistance = [int]::MaxValue
                for ($nearby = [Math]::Max(0, $index - 4); $nearby -le [Math]::Min($body.ChildNodes.Count - 1, $index + 4); $nearby++) {
                    $text = (($body.ChildNodes[$nearby].SelectNodes('.//w:t', $namespace) | ForEach-Object { $_.InnerText }) -join '').Trim()
                    if ($text -match '^Figure\s+\d+:\s*(.+)$') {
                        $distance = [Math]::Abs($nearby - $index)
                        if ($distance -lt $bestDistance) {
                            $bestTitle = $Matches[1].Trim()
                            $bestDistance = $distance
                        }
                    }
                }

                if ($bestTitle) {
                    $property.SetAttribute('descr', $bestTitle)
                    $updated++
                }
            }
        }

        if ($updated -gt 0) {
            $entry.Delete()
            $newEntry = $archive.CreateEntry('word/document.xml', [System.IO.Compression.CompressionLevel]::Optimal)
            $settings = [System.Xml.XmlWriterSettings]::new()
            $settings.Encoding = [System.Text.UTF8Encoding]::new($false)
            $settings.Indent = $false
            $settings.OmitXmlDeclaration = $false
            $writer = [System.Xml.XmlWriter]::Create($newEntry.Open(), $settings)
            try { $xml.Save($writer) } finally { $writer.Dispose() }
        }

        return $updated
    } finally {
        $archive.Dispose()
    }
}

$alternativeTextUpdates = Add-MissingFigureAlternativeText $documentFullPath

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$document = $null

try {
    $document = $word.Documents.Open($documentFullPath, $false, $false)

    $oldPrefix = '7. Replace every screenshot placeholder'
    $replacement = '7. Review every embedded screenshot for readability and privacy, retain the linked technical evidence, update Word fields and page numbers after final edits, and complete supervisor review before submission.'
    $staleUpdated = $false
    foreach ($paragraph in $document.Paragraphs) {
        $text = (($paragraph.Range.Text -replace "[`r`a]", '')).Trim()
        if ($text.StartsWith($oldPrefix)) {
            $range = $paragraph.Range.Duplicate
            if ($range.End -gt $range.Start) { $range.End-- }
            $range.Text = $replacement
            $staleUpdated = $true
            break
        }
    }

    foreach ($contents in $document.TablesOfContents) { $contents.Update() }
    [void] $document.Fields.Update()
    $document.Save()
    $document.ExportAsFixedFormat($pdfPath, 17)

    Write-Output "Alternative-text corrections: $alternativeTextUpdates"
    Write-Output "Stale screenshot task corrected: $staleUpdated"
    Write-Output "Final DOCX: $documentFullPath"
    Write-Output "Final PDF: $pdfPath"
} finally {
    if ($document) { try { $document.Close(0) } catch {} }
    try { $word.Quit() } catch {}
}
