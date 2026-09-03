param(
    [Parameter(Mandatory = $true)]
    [string] $DocumentPath,

    [Parameter(Mandatory = $true)]
    [string] $AssetDirectory
)

$ErrorActionPreference = 'Stop'

function Paragraph-Text {
    param($Paragraph)
    return (($Paragraph.Range.Text -replace "[`r`a]", '')).Trim()
}

function Find-Paragraph {
    param($Document, [string] $Text, [switch] $StartsWith, [string] $RequiredStyle = '')
    foreach ($paragraph in $Document.Paragraphs) {
        $current = Paragraph-Text $paragraph
        if ($RequiredStyle) {
            try { $style = [string] $paragraph.Range.Style.NameLocal } catch { $style = [string] $paragraph.Range.Style }
            if ($style -ne $RequiredStyle) { continue }
        }
        if (($StartsWith -and $current.StartsWith($Text)) -or (-not $StartsWith -and $current -eq $Text)) { return $paragraph }
    }
    throw "Paragraph not found: $Text"
}

function Set-ParagraphText {
    param($Paragraph, [string] $Text)
    $range = $Paragraph.Range.Duplicate
    if ($range.End -gt $range.Start) { $range.End-- }
    $range.Text = $Text
}

function Add-ParagraphAt {
    param($Document, [ref] $Position, [string] $Text, $Style)
    $start = [int] $Position.Value
    $range = $Document.Range($start, $start)
    $range.InsertAfter($Text + "`r")
    $paragraph = $Document.Range($start, $start + $Text.Length + 1).Paragraphs.Item(1)
    if ($Style) { $paragraph.Range.Style = $Style }
    $Position.Value = $paragraph.Range.End
    return $paragraph
}

function Add-LabeledParagraphAt {
    param($Document, [ref] $Position, [string] $Label, [string] $Text, $Style)
    $paragraph = Add-ParagraphAt $Document $Position ($Label + $Text) $Style
    $labelRange = $paragraph.Range.Duplicate
    $labelRange.End = $labelRange.Start + $Label.Length
    $labelRange.Bold = -1
    return $paragraph
}

function Add-ImageAt {
    param($Document, [ref] $Position, [string] $Path, [string] $Alt)
    if (-not (Test-Path -LiteralPath $Path)) { throw "Image not found: $Path" }
    $range = $Document.Range([int] $Position.Value, [int] $Position.Value)
    $shape = $Document.InlineShapes.AddPicture($Path, $false, $true, $range)
    $shape.LockAspectRatio = -1
    $maximumWidth = $Document.PageSetup.PageWidth - $Document.PageSetup.LeftMargin - $Document.PageSetup.RightMargin
    if ($shape.Width -gt $maximumWidth) { $shape.Width = $maximumWidth }
    $shape.AlternativeText = $Alt
    $shape.Title = [System.IO.Path]::GetFileName($Path)
    $shape.Range.Style = $Document.Styles.Item('Normal')
    $shape.Range.ParagraphFormat.Alignment = 1
    $after = $shape.Range.End
    $Document.Range($after, $after).InsertAfter("`r")
    $Position.Value = $after + 1
    return $shape
}

function Caption-Paragraphs {
    param($Document)
    $paragraphs = @()
    $position = 0
    while ($position -lt $Document.Content.End) {
        $search = $Document.Range($position, $Document.Content.End)
        $search.Find.ClearFormatting()
        $search.Find.Text = '^p'
        $search.Find.Style = $Document.Styles.Item('Caption')
        $search.Find.Forward = $true
        $search.Find.Wrap = 0
        $search.Find.Format = $true
        if (-not $search.Find.Execute()) { break }
        $paragraph = $search.Paragraphs.Item(1)
        $paragraphs += $paragraph
        $next = $paragraph.Range.End
        if ($next -le $position) { break }
        $position = $next
    }
    return $paragraphs
}

function Renumber-Captions {
    param($Document)
    $figureNumber = 0
    $tableNumber = 0
    foreach ($paragraph in (Caption-Paragraphs $Document)) {
        $text = Paragraph-Text $paragraph
        if ($text -match '^Figure\s+\d+\s*:\s*(.+)$') {
            $figureNumber++
            Set-ParagraphText $paragraph ("Figure {0}: {1}" -f $figureNumber, $Matches[1].Trim())
        } elseif ($text -match '^Table\s+\d+\s*:\s*(.+)$') {
            $tableNumber++
            Set-ParagraphText $paragraph ("Table {0}: {1}" -f $tableNumber, $Matches[1].Trim())
        }
    }
}

function Add-CaptionBookmarks {
    param($Document)
    $oldNames = @()
    foreach ($bookmark in $Document.Bookmarks) {
        if ($bookmark.Name -match '^(Figure|Table)_\d+$') { $oldNames += $bookmark.Name }
    }
    foreach ($name in $oldNames) {
        if ($Document.Bookmarks.Exists($name)) { $Document.Bookmarks.Item($name).Delete() }
    }

    $records = @()
    foreach ($paragraph in (Caption-Paragraphs $Document)) {
        $text = Paragraph-Text $paragraph
        if ($text -notmatch '^(Figure|Table)\s+(\d+)\s*:\s*(.+)$') { continue }
        $record = [pscustomobject]@{
            Kind = $Matches[1]
            Number = [int] $Matches[2]
            Title = $Matches[3].Trim()
            Text = $text
            Paragraph = $paragraph
            Bookmark = ('{0}_{1:D3}' -f $Matches[1], [int] $Matches[2])
        }
        $range = $paragraph.Range.Duplicate
        $range.End--
        [void] $Document.Bookmarks.Add($record.Bookmark, $range)
        $records += $record
    }
    return $records
}

function Rebuild-LinkedList {
    param($Document, [string] $StartHeading, [string] $EndHeading, [object[]] $Records)
    $startParagraph = Find-Paragraph $Document $StartHeading
    $endParagraph = Find-Paragraph $Document $EndHeading
    $start = $startParagraph.Range.End
    $end = $endParagraph.Range.Start
    $oldRange = $Document.Range($start, $end)
    $listStyle = $null
    foreach ($paragraph in $oldRange.Paragraphs) {
        if ((Paragraph-Text $paragraph)) { $listStyle = $paragraph.Range.Style; break }
    }
    $oldRange.Delete()

    $entries = @()
    $builder = [System.Text.StringBuilder]::new()
    foreach ($record in $Records) {
        $labelStart = $builder.Length
        [void] $builder.Append($record.Text)
        $labelEnd = $builder.Length
        [void] $builder.Append("`t")
        $pageStart = $builder.Length
        $placeholder = '[[PAGE_' + $record.Bookmark + ']]'
        [void] $builder.Append($placeholder)
        $pageEnd = $builder.Length
        [void] $builder.Append("`r")
        $entries += [pscustomobject]@{ Record = $record; LabelStart = $labelStart; LabelEnd = $labelEnd; PageStart = $pageStart; PageEnd = $pageEnd }
    }

    $block = $builder.ToString()
    $Document.Range($start, $start).InsertAfter($block)
    if ($listStyle) { $Document.Range($start, $start + $block.Length).Style = $listStyle }

    for ($index = $entries.Count - 1; $index -ge 0; $index--) {
        $entry = $entries[$index]
        $pageRange = $Document.Range($start + $entry.PageStart, $start + $entry.PageEnd)
        $pageRange.Text = ''
        $fieldRange = $Document.Range($start + $entry.PageStart, $start + $entry.PageStart)
        [void] $Document.Fields.Add($fieldRange, -1, ("PAGEREF {0} \h" -f $entry.Record.Bookmark), $true)
        $labelRange = $Document.Range($start + $entry.LabelStart, $start + $entry.LabelEnd)
        [void] $Document.Hyperlinks.Add($labelRange, '', $entry.Record.Bookmark)
    }
}

function Replace-TokenWithLink {
    param($Document, [string] $Token, $Record)
    if (-not $Record -or -not $Record.Bookmark) { throw "Missing cross-reference target for $Token" }
    $range = $Document.Content.Duplicate
    $range.Find.ClearFormatting()
    $range.Find.Text = $Token
    $range.Find.Forward = $true
    $range.Find.Wrap = 0
    if (-not $range.Find.Execute()) { throw "Cross-reference token not found: $Token" }
    $range.Text = ('{0} {1}' -f $Record.Kind, $Record.Number)
    [void] $Document.Hyperlinks.Add($range, '', $Record.Bookmark)
}

$documentFullPath = (Resolve-Path -LiteralPath $DocumentPath).Path
$assetFullPath = (Resolve-Path -LiteralPath $AssetDirectory).Path
$pdfPath = [System.IO.Path]::ChangeExtension($documentFullPath, '.pdf')

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$document = $null

try {
    $document = $word.Documents.Open($documentFullPath, $false, $false)
    $normalStyle = $document.Styles.Item('Normal')
    $bodyStyle = $document.Styles.Item('p2')
    $supportingStyle = $document.Styles.Item('p3')
    $sectionStyle = $document.Styles.Item('s1')
    $captionStyle = $document.Styles.Item('Caption')

    # Keep the AI scope aligned with the implemented candidate-profile workflow.
    Set-ParagraphText (Find-Paragraph $document 'Three alternatives were considered for profile completion and job application forms.') 'Three alternatives were considered for candidate profile completion.'

    # Expand the actual catalogue-to-score behavior inside the matching subsection.
    $matchingExample = Find-Paragraph $document 'Applied matching example:' -StartsWith
    Set-ParagraphText $matchingExample 'Applied matching example: [[REF_TASK_FIGURE]] shows an employer selecting Write, Read, and Count as important tasks, so each uses adjusted weight 1.5 instead of the default 1.0. The imported assessments then control feasibility: column F/feasible uses factor 1.00; column G/needs assistance uses factor 0.75 only when the employer offers task assistance, otherwise it becomes effective avoid and earns zero; column H/avoid uses factor 0.00 even when assistance is offered. A mandatory effective avoid excludes the offer, while an optional avoid remains in the denominator and earns zero. The source mapping is shown in [[REF_WORKBOOK_FIGURE]].'
    $matchingPosition = $matchingExample.Range.End
    [void] (Add-ParagraphAt $document ([ref] $matchingPosition) 'A blank or unchecked workbook cell is not an avoid value and is not imported as an assessment. If a genuine candidate-disability/task pair has no recorded assessment at runtime, the centralized inclusion-first policy treats it as feasible and flags the assumption for review. For multiple disabilities, assessments are not averaged: the most restrictive recorded result controls the task.' $supportingStyle)

    # Remove the malformed and redundant low-level table, retaining the surrounding report design.
    $oldSummary = Find-Paragraph $document 'Low-level decision summary'
    $solutionModel = Find-Paragraph $document 'Solution modeling'
    $document.Range($oldSummary.Range.Start, $solutionModel.Range.Start).Delete()
    $solutionModel = Find-Paragraph $document 'Solution modeling'
    $position = $solutionModel.Range.Start

    [void] (Add-ParagraphAt $document ([ref] $position) 'H. Administrator-Controlled Catalogue Workbook Import' $sectionStyle)
    [void] (Add-ParagraphAt $document ([ref] $position) 'New occupational catalogues must be added without editing application code, rerunning fixtures, or deleting live users, profiles, vacancies, and applications. Three approaches were evaluated: developer-only fixture regeneration, an unrestricted generic spreadsheet importer, and a template-specific administrator workflow. Fixture regeneration is deterministic but unsuitable for normal operation. An unrestricted importer is flexible but cannot safely infer arbitrary workbook meaning. The selected boundary is therefore an administrator-only, validated .xlsx importer for the agreed occupational workbook structure.' $bodyStyle)

    [void] (Add-LabeledParagraphAt $document ([ref] $position) '1. Upload and access control. ' 'The Admin dashboard accepts one or more .xlsx files through Add data sheets. Symfony verifies the JWT and ROLE_ADMIN or ROLE_SUPER_ADMIN on the server, requires at least one workbook, enforces a 10 MB per-file limit, rejects duplicate filenames in the same request, copies uploads to a private 0700 temporary directory, and invokes the trusted Python extractor with a Process argument array and a 60-second timeout. Temporary copies are deleted in a finally block. The interface exposes progress and accessible success/error feedback. [[REF_ADMIN_IMPORT_FIGURE]] shows the control and a non-persistent test response used only to demonstrate the feedback state.' $normalStyle)
    [void] (Add-ImageAt $document ([ref] $position) (Join-Path $assetFullPath 'figure-admin-catalogue-import.png') 'Administrator dashboard crop showing the Add data sheets control and accessible example success message for one imported definition, 42 tasks, and 714 assessments; the capture used a non-persistent test response and contains no user data.')
    [void] (Add-ParagraphAt $document ([ref] $position) 'Figure 0: Administrator catalogue upload control and accessible result feedback' $captionStyle)

    [void] (Add-LabeledParagraphAt $document ([ref] $position) '2. Workbook identification. ' 'The extractor opens the OOXML workbook with OpenPyXL in data-only mode. Worksheets after the first are treated as disability/task matrices only when their normalized title matches the controlled disability-sheet map; an unknown sheet produces a warning and is skipped. The three supplied filenames have reviewed job-name overrides. For a future supported filename, the extractor attempts to infer the English position name from column C around rows 19 to 35 and derives a normalized job slug.' $normalStyle)
    [void] (Add-LabeledParagraphAt $document ([ref] $position) '3. Task and assessment extraction. ' 'For each recognized disability sheet, rows are scanned from row 19 to the last used row. The current canonical task name is the trimmed English value in column C. Column B contains French labels and column D contains Arabic labels in the supplied workbooks, but those two source-language labels are not yet persisted by the importer. A row becomes an assessment only when it contains both a task name and a marker: F means feasible, G means needs_assistance, and H means avoid. If markers overlap, the most restrictive precedence H, then G, then F is applied. Blank, title, duplicate-layout, and unmarked rows are skipped rather than converted to avoid. [[REF_WORKBOOK_FIGURE]] records the verified field mapping.' $normalStyle)
    [void] (Add-ImageAt $document ([ref] $position) (Join-Path $assetFullPath 'figure-workbook-import-template.png') 'Illustrated mapping verified against the Chocolaterie workbook: French task labels in column B, canonical English tasks in C, Arabic labels in D, and feasible, needs-assistance, and avoid markers in F, G, and H respectively, with a structural row shown as ignored.')
    [void] (Add-ParagraphAt $document ([ref] $position) 'Figure 0: Supported occupational-workbook columns and feasibility mapping' $captionStyle)

    [void] (Add-LabeledParagraphAt $document ([ref] $position) '4. Normalization and traceability. ' 'Whitespace is normalized and each task receives a stable slug-like key. Repeated wording is preserved with an occurrence suffix so legitimate duplicate task rows can remain aligned across disability sheets. Every assessment retains its source worksheet and source row. The extractor returns schema-versioned JSON containing disabilities, job definitions, ordered tasks, assessments, completeness metadata, and warnings. Unknown feasibility values never reach the entity because the domain model accepts only feasible, needs_assistance, or avoid.' $normalStyle)
    [void] (Add-LabeledParagraphAt $document ([ref] $position) '5. Transactional database application. ' 'Before writing, Symfony rejects any job whose slug or name already exists. One Doctrine transaction then creates any mapped disabilities not already present, the active job definition, its tasks, and its disability/task assessments. Imported definitions currently default to minimum education none; tasks default to weight 1.0 and mandatory false so later policy changes are explicit. Any exception rolls back the batch. This workflow never invokes fixtures and never purges existing business data.' $normalStyle)
    [void] (Add-LabeledParagraphAt $document ([ref] $position) '6. Runtime application and worked score example. ' 'After a successful commit, the new active job definition and task list are available to the employer posting form. The employer selects which imported tasks are important and declares whether task assistance is available. Symfony retrieves the same persisted tasks and disability assessments for candidate matching and passes normalized input to the deterministic Python engine. For an important task with base weight 1.0, adjusted weight is 1.5. A feasible task earns 1.5 points; a needs-assistance task earns 1.5 × 0.75 = 1.125 points when assistance is offered and zero otherwise; an avoid task earns zero and cannot be rescued by the generic assistance flag. The final compatibility percentage is earned adjusted weight divided by maximum adjusted weight, provided all eligibility gates pass.' $normalStyle)
    [void] (Add-LabeledParagraphAt $document ([ref] $position) '7. Current limitations and production hardening. ' 'The importer is intentionally template-specific: disability worksheet names must be mapped, column C is the current canonical language, and repeated task occurrences must remain structurally consistent across sheets. Imported definitions become active immediately; a preview, expert validation, and publish step remain desirable. Production hardening should add MIME/OOXML signature checks, compressed-archive and worksheet-size limits, malware scanning, importer integration tests with rollback evidence, and localized task-label persistence. These are recorded limitations, not completed controls.' $supportingStyle)

    # Replace the static verification-figure number retained in the documentation appendix.
    $testEvidenceReference = Find-Paragraph $document 'Written into the report and illustrated by Figure 12.'
    Set-ParagraphText $testEvidenceReference 'Written into the report and illustrated by [[REF_TEST_FIGURE]].'

    Renumber-Captions $document
    $records = Add-CaptionBookmarks $document
    $figureRecords = @($records | Where-Object Kind -eq 'Figure' | Sort-Object Number)
    $tableRecords = @($records | Where-Object Kind -eq 'Table' | Sort-Object Number)

    foreach ($record in $figureRecords) {
        $nearest = $null
        foreach ($shape in $document.InlineShapes) {
            if ($shape.Range.Start -lt $record.Paragraph.Range.Start -and (-not $nearest -or $shape.Range.Start -gt $nearest.Range.Start)) { $nearest = $shape }
        }
        if ($nearest) {
            $nearest.AlternativeText = $record.Title
            if (-not $nearest.Title) { $nearest.Title = ('Figure {0}' -f $record.Number) }
        }
    }

    $taskFigure = $figureRecords | Where-Object Title -eq 'Employer task-importance and assistance configuration'
    $adminFigure = $figureRecords | Where-Object Title -eq 'Administrator catalogue upload control and accessible result feedback'
    $workbookFigure = $figureRecords | Where-Object Title -eq 'Supported occupational-workbook columns and feasibility mapping'
    $testFigure = $figureRecords | Where-Object Title -eq 'Integration, E2E, and performance evidence'
    Replace-TokenWithLink $document '[[REF_TASK_FIGURE]]' $taskFigure
    Replace-TokenWithLink $document '[[REF_ADMIN_IMPORT_FIGURE]]' $adminFigure
    Replace-TokenWithLink $document '[[REF_WORKBOOK_FIGURE]]' $workbookFigure
    Replace-TokenWithLink $document '[[REF_WORKBOOK_FIGURE]]' $workbookFigure
    Replace-TokenWithLink $document '[[REF_TEST_FIGURE]]' $testFigure

    Rebuild-LinkedList $document 'List of figures' 'List of tables' $figureRecords
    Rebuild-LinkedList $document 'List of tables' 'Acronyms' $tableRecords

    foreach ($contents in $document.TablesOfContents) { $contents.Update() }
    [void] $document.Fields.Update()
    $document.Save()
    $document.ExportAsFixedFormat($pdfPath, 17)

    Write-Output "Reorganized report: $documentFullPath"
    Write-Output "PDF: $pdfPath"
    Write-Output "Figures: $($figureRecords.Count); tables: $($tableRecords.Count)"
} finally {
    if ($document) { try { $document.Close(0) } catch {} }
    try { $word.Quit() } catch {}
}
