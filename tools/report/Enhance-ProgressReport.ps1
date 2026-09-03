param(
    [Parameter(Mandatory = $true)]
    [string] $InputPath,

    [Parameter(Mandatory = $true)]
    [string] $OutputPath,

    [Parameter(Mandatory = $true)]
    [string] $AssetDirectory
)

$ErrorActionPreference = 'Stop'

function Copy-OpenFile {
    param([string] $Source, [string] $Destination)
    $sourceStream = [System.IO.File]::Open($Source, 'Open', 'Read', 'ReadWrite')
    try {
        $destinationStream = [System.IO.File]::Open($Destination, 'Create', 'Write', 'None')
        try { $sourceStream.CopyTo($destinationStream) } finally { $destinationStream.Dispose() }
    } finally { $sourceStream.Dispose() }
}

function Paragraph-Text {
    param($Paragraph)
    return (($Paragraph.Range.Text -replace "[`r`a]", '')).Trim()
}

function Style-Name {
    param($Paragraph)
    try { return [string] $Paragraph.Range.Style.NameLocal } catch { return [string] $Paragraph.Range.Style }
}

function Find-Paragraph {
    param($Document, [string] $Text, [switch] $StartsWith, [string] $RequiredStyle = '')
    foreach ($paragraph in $Document.Paragraphs) {
        $current = Paragraph-Text $paragraph
        if ($RequiredStyle -and (Style-Name $paragraph) -ne $RequiredStyle) { continue }
        if (($StartsWith -and $current.StartsWith($Text)) -or (-not $StartsWith -and $current -eq $Text)) { return $paragraph }
    }
    throw "Paragraph not found: $Text"
}

function Set-ParagraphText {
    param($Paragraph, [string] $Text)
    $range = $Paragraph.Range.Duplicate
    if ($range.End -gt $range.Start) { $range.End = $range.End - 1 }
    $range.Text = $Text
}

function Set-StartingParagraph {
    param($Document, [string] $Prefix, [string] $Text)
    Set-ParagraphText (Find-Paragraph $Document $Prefix -StartsWith) $Text
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

function Find-TableAfter {
    param($Document, $Paragraph)
    foreach ($table in $Document.Tables) {
        if ($table.Range.Start -ge $Paragraph.Range.End) { return $table }
    }
    throw "Table not found after paragraph: $(Paragraph-Text $Paragraph)"
}

function Set-CellText {
    param($Cell, [string] $Text)
    $range = $Cell.Range.Duplicate
    $range.End = $range.End - 1
    $range.Text = $Text
}

function Add-TableAt {
    param($Document, [ref] $Position, [object[][]] $Rows, $Style)
    $range = $Document.Range([int] $Position.Value, [int] $Position.Value)
    $table = $Document.Tables.Add($range, $Rows.Count, 4)
    if ($Style) { try { $table.Style = $Style } catch {} }
    $table.Rows.Item(1).HeadingFormat = -1
    for ($rowIndex = 0; $rowIndex -lt $Rows.Count; $rowIndex++) {
        for ($columnIndex = 0; $columnIndex -lt 4; $columnIndex++) {
            Set-CellText $table.Cell($rowIndex + 1, $columnIndex + 1) ([string] $Rows[$rowIndex][$columnIndex])
            if ($rowIndex -eq 0) { $table.Cell(1, $columnIndex + 1).Range.Bold = -1 }
        }
    }
    try { $table.AutoFitBehavior(2) } catch {}
    $Position.Value = $table.Range.End
    $Document.Range([int] $Position.Value, [int] $Position.Value).InsertAfter("`r")
    $Position.Value = [int] $Position.Value + 1
    return $table
}

function Caption-Paragraphs {
    param($Document)
    $paragraphs = @()
    $position = 0
    $documentEnd = $Document.Content.End
    while ($position -lt $documentEnd) {
        $search = $Document.Range($position, $documentEnd)
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
        $documentEnd = $Document.Content.End
    }
    return $paragraphs
}

function Caption-Records {
    param($Document)
    $records = @()
    foreach ($paragraph in (Caption-Paragraphs $Document)) {
        $text = Paragraph-Text $paragraph
        if ($text -match '^(Figure|Table)\s+(\d+)\s*:\s*(.+)$') {
            $records += [pscustomobject]@{
                Kind = $Matches[1]
                Number = [int] $Matches[2]
                Title = $Matches[3].Trim()
                Text = $text
                Paragraph = $paragraph
                Bookmark = ''
            }
        }
    }
    return $records
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
    $records = Caption-Records $Document
    foreach ($record in $records) {
        $bookmark = '{0}_{1:D3}' -f $record.Kind, $record.Number
        if ($Document.Bookmarks.Exists($bookmark)) { $Document.Bookmarks.Item($bookmark).Delete() }
        $range = $record.Paragraph.Range.Duplicate
        $range.End = $range.End - 1
        [void] $Document.Bookmarks.Add($bookmark, $range)
        $record.Bookmark = $bookmark
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
    $insertRange = $Document.Range($start, $start)
    $insertRange.InsertAfter($block)
    $blockRange = $Document.Range($start, $start + $block.Length)
    if ($listStyle) { $blockRange.Style = $listStyle }

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
    if (-not $Record -or -not $Record.Bookmark) { throw "Cross-reference target missing for token: $Token" }
    $range = $Document.Content.Duplicate
    $range.Find.ClearFormatting()
    $range.Find.Text = $Token
    $range.Find.Forward = $true
    $range.Find.Wrap = 0
    if (-not $range.Find.Execute()) { throw "Cross-reference token not found: $Token" }
    $display = '{0} {1}' -f $Record.Kind, $Record.Number
    $range.Text = $display
    [void] $Document.Hyperlinks.Add($range, '', $Record.Bookmark)
}

if (-not (Test-Path -LiteralPath $InputPath)) { throw "Input document not found: $InputPath" }
$outputDirectory = Split-Path -Parent $OutputPath
if ($outputDirectory -and -not (Test-Path -LiteralPath $outputDirectory)) { [void] (New-Item -ItemType Directory -Path $outputDirectory -Force) }
Copy-OpenFile $InputPath $OutputPath

$documentFullPath = (Resolve-Path -LiteralPath $OutputPath).Path
$assetFullPath = (Resolve-Path -LiteralPath $AssetDirectory).Path
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$document = $null

try {
    $document = $word.Documents.Open($documentFullPath, $false, $false)
    $normalStyle = $document.Styles.Item('Normal')
    $heading3Style = $document.Styles.Item('Heading 3')
    $captionStyle = $document.Styles.Item('Caption')
    Write-Output 'Checkpoint: document opened and styles resolved'

    # Correct inaccurate proposal-era claims in the evaluated design sections.
    Set-StartingParagraph $document 'The proposed project attempts to combine the strengths of these approaches' 'The Phase II solution combines the strengths of these approaches while making implementation status explicit. It preserves the deterministic task-level scoring policy, introduces a controlled catalogue-import process, adds accessible multimodal interaction, uses AI only as an assistive profile-building layer, and requires human confirmation before suggested profile data is stored. Expansion from three to thirteen validated job roles remains a requirement pending ten additional authoritative workbooks.'
    Set-StartingParagraph $document 'ASR, LLM-assisted NLP, and ML matching shall be implemented' 'ASR, LLM-assisted NLP, and deterministic task-level scoring shall remain separable modules or services so that providers and policies can be replaced or versioned without redesigning the whole platform.'
    Set-StartingParagraph $document 'The container diagram shows the main technical blocks' 'The container diagram shows the main technical blocks and their communication boundaries: the accessible React interface, authoritative Symfony API, PostgreSQL, deterministic Python scoring service, AI/voice service, private file storage, and notification delivery. The cache is a planned performance component and is not represented as already implemented.'
    Set-StartingParagraph $document 'The PostgreSQL database stores confirmed platform data' 'PostgreSQL stores confirmed records such as users, profiles, job definitions, tasks, assessments, applications, verification status, outcomes, consents, and audit metadata. The deterministic Python service receives authoritative candidate and offer data from Symfony and returns compatibility, eligibility, ranking, and task-level explanations. The planned cache will be limited to repeated non-sensitive catalogue data and will require explicit expiry and invalidation rules.'
    Set-StartingParagraph $document 'A key design objective is to reduce digital barriers for PwD candidates' 'A key design objective is to reduce digital barriers without making AI or voice mandatory. The complete manual profile form remains available. In the optional profile workflow, a candidate types or records English, French, or Arabic; recorded speech is transcribed into editable text; explicit consent is collected; and the AI service returns structured, reviewable profile suggestions. The workflow does not automatically populate registration or job-application fields.'
    Set-StartingParagraph $document 'Accessibility was also considered as a major design criterion' 'Accessibility is a major design criterion. The interface supports keyboard operation, visible focus, persistent labels, responsive reflow, screen-reader-oriented semantics, error recovery, and status announcements across the principal workflows. These corrections target WCAG 2.1 Level AA, but the project does not claim conformance until the documented post-remediation browser, native 200% zoom, and assistive-technology tests are completed.'
    Set-StartingParagraph $document 'However, this approach is not flexible enough for Phase II' 'However, this approach is not flexible enough for Phase II. The deterministic scoring policy, speech transcription, AI extraction, notification delivery, and private-file lifecycle have different dependencies and change rates. If every concern were embedded in one backend, replacing the transcription provider or versioning the scoring policy would increase regression risk across unrelated workflows.'
    Set-StartingParagraph $document 'The chosen option is temporary secure file handling' 'The chosen option is authorized human verification with private, time-limited document storage. The candidate uploads a required disability card with explicit consent. The request remains pending until an authorized verifier approves or rejects it, and sign-in remains blocked until both email verification and document approval pass. The source file is scheduled for deletion 30 days after the decision; the verification status, reviewer, note, and audit events remain.'
    Set-StartingParagraph $document 'The chosen option is multimodal input' 'The chosen option is multimodal profile input with a complete manual fallback. The candidate can type directly or explicitly activate the microphone. The browser sends bounded audio to the AI/voice service, which returns an English, French, or Arabic transcript. The transcript remains editable and is not analysed until the candidate grants the required AI consent.'
    Set-StartingParagraph $document 'The JSON output is used to pre-fill form fields' 'The structured JSON is displayed as editable suggestions rather than being applied automatically. Every suggestion starts unselected. The candidate chooses which items to confirm, and Symfony validates selected values against field limits and active catalogues before persistence. This keeps AI advisory and prevents unconfirmed sensitive information from becoming profile fact.'
    Set-StartingParagraph $document 'This approach is transparent because the candidate and employer can understand why a job has a certain matching percentage' 'This approach is transparent because the candidate receives the eligibility result, compatibility percentage, absolute compatibility band, and task-level explanations. The score represents compatibility with the configured vacancy under the documented policy; it is not an official disability percentage, employment decision, or guarantee of suitability.'
    Set-StartingParagraph $document 'The chosen option is to store only confirmed persistent data in PostgreSQL' 'The chosen storage boundary separates structured records from private files and transient AI data. PostgreSQL stores confirmed structured records and audit metadata. Profile audio remains in browser memory only long enough for transcription; unconfirmed suggestions remain transient; and disability cards or optional application documents use authenticated private storage with MIME/size validation, no-store responses, auditing, retention, and deletion controls.'
    $appendixHeading = Find-Paragraph $document 'B.4 Security Verification and Deployment Duties'
    Set-ParagraphText $appendixHeading 'Security Verification and Deployment Duties'
    Write-Output 'Checkpoint: factual corrections completed'

    # Correct the misplaced original figure captions before global renumbering.
    $stateCaption = Find-Paragraph $document 'Figure 4: Conceptual class diagram' -RequiredStyle 'Caption'
    Set-ParagraphText $stateCaption 'Figure 0: Matching-evaluation state diagram'
    $componentCaption = Find-Paragraph $document 'Figure 5: Matching-evaluation state diagram' -RequiredStyle 'Caption'
    Set-ParagraphText $componentCaption 'Figure 0: Component diagram'
    $conceptualParagraph = Find-Paragraph $document 'The conceptual class diagram presents the main entities' -StartsWith
    $conceptualPosition = $conceptualParagraph.Range.End
    [void] (Add-ParagraphAt $document ([ref] $conceptualPosition) 'Figure 0: Conceptual class diagram' $captionStyle)
    Write-Output 'Checkpoint: original captions corrected'

    # Strengthen the high-level comparison table without changing its existing formatting.
    $highCaption = Find-Paragraph $document 'Table 1: High-level architecture alternatives comparison' -RequiredStyle 'Caption'
    $highTable = Find-TableAfter $document $highCaption
    for ($row = 1; $row -le $highTable.Rows.Count; $row++) {
        if ((($highTable.Cell($row, 1).Range.Text -replace "[`r`a]", '')).Trim() -eq 'AI/ML integration') {
            Set-CellText $highTable.Cell($row, 1) 'AI and scoring integration'
        }
    }
    $highRows = @(
        @('Operational overhead', 'Low', 'Very high', 'Medium and proportionate to prototype scope'),
        @('Component testability', 'Limited isolation', 'Strong isolation', 'Strong boundaries for scoring and AI/voice'),
        @('Accessibility delivery fit', 'Shared interface possible', 'Shared interface may fragment across teams', 'One accessible React design system across all roles'),
        @('Sensitive-data separation', 'Centralized in one application', 'Flexible but operationally complex', 'Explicit RBAC and private-storage boundary'),
        @('FYP feasibility', 'Fast initially but difficult to extend safely', 'Low within the available time and infrastructure', 'High: implemented incrementally with clear future paths')
    )
    foreach ($values in $highRows) {
        $newRow = $highTable.Rows.Add()
        for ($column = 1; $column -le 4; $column++) { Set-CellText $newRow.Cells.Item($column) ([string] $values[$column - 1]) }
    }
    Write-Output 'Checkpoint: high-level table expanded'

    # Applied high-level example and runtime evidence.
    $highAnchor = Find-Paragraph $document 'The chosen architecture provides the best compromise' -StartsWith
    $position = $highAnchor.Range.End
    [void] (Add-ParagraphAt $document ([ref] $position) 'Applied architecture example' $heading3Style)
    [void] (Add-ParagraphAt $document ([ref] $position) 'For example, replacing the speech-transcription provider affects the AI/voice adapter and configuration, while the Symfony authorization rules, PostgreSQL schema, and deterministic scoring formula remain unchanged. If the AI/voice service is unavailable, the candidate can continue with manual profile entry. The evaluation in [[REF_HIGH_TABLE]] is illustrated by the independently running services in [[REF_RUNTIME_FIGURE]].' $normalStyle)
    [void] (Add-ImageAt $document ([ref] $position) (Join-Path $assetFullPath 'figure-runtime-layered-services.png') 'Runtime evidence showing healthy React, Symfony, deterministic scoring, and AI/voice service boundaries; the planned cache is explicitly not shown as running.')
    [void] (Add-ParagraphAt $document ([ref] $position) 'Figure 0: Layered modular runtime service boundaries and health evidence' $captionStyle)
    Write-Output 'Checkpoint: high-level example inserted'

    # Verification example and screenshot.
    $verificationAnchor = Find-Paragraph $document 'This choice reduces privacy risks and follows the principle of data minimization.'
    $position = $verificationAnchor.Range.End
    [void] (Add-ParagraphAt $document ([ref] $position) 'Applied verification example: a candidate submits a valid PDF and verifies the email address, but the account still cannot sign in while the review status is pending. Approval by an authorized verifier opens access; rejection keeps access blocked and requires a reason. The required upload and purpose-specific consent are shown in [[REF_SIGNUP_FIGURE]].' $normalStyle)
    [void] (Add-ImageAt $document ([ref] $position) (Join-Path $assetFullPath 'figure-candidate-verification-signup.png') 'Candidate signup controls showing the required disability-card upload, accepted PDF/JPEG/PNG formats, 5 MB limit, privacy notice, and verifier-processing consent.')
    [void] (Add-ParagraphAt $document ([ref] $position) 'Figure 0: Candidate disability-card requirement and verification consent' $captionStyle)
    Write-Output 'Checkpoint: verification example inserted'

    # Matching example and employer configuration screenshot.
    $matchingAnchor = Find-Paragraph $document 'This approach is transparent because the candidate receives' -StartsWith
    $position = $matchingAnchor.Range.End
    [void] (Add-ParagraphAt $document ([ref] $position) 'Applied matching example: an employer selects Write, Read, and Count as important vacancy tasks. Their adjusted weights become 1.5 instead of the default 1.0. If assistance is available, a needs-assistance assessment earns the documented 0.75 feasibility factor; without assistance it becomes avoid. Explicit avoid remains zero and a mandatory avoid excludes the offer. [[REF_TASK_FIGURE]] shows the controlled task selection and assistance setting.' $normalStyle)
    [void] (Add-ImageAt $document ([ref] $position) (Join-Path $assetFullPath 'figure-employer-task-configuration.png') 'Employer job form showing an administrator-controlled job definition, selected important tasks, the complete catalogue task list, and the task-assistance setting.')
    [void] (Add-ParagraphAt $document ([ref] $position) 'Figure 0: Employer task-importance and assistance configuration' $captionStyle)
    Write-Output 'Checkpoint: matching example inserted'

    # Storage/privacy example and screenshot.
    $storageAnchor = Find-Paragraph $document 'This design supports privacy, security, and the human-in-the-loop principle.'
    $position = $storageAnchor.Range.End
    [void] (Add-ParagraphAt $document ([ref] $position) 'Applied privacy example: candidate export returns the structured account data rather than raw disability-card bytes. Withdrawing AI consent prevents future AI analysis without deleting already confirmed profile facts. Password-confirmed account deletion removes the account and associated private application/verification documents. These user controls are shown in [[REF_PRIVACY_FIGURE]].' $normalStyle)
    [void] (Add-ImageAt $document ([ref] $position) (Join-Path $assetFullPath 'figure-candidate-privacy-controls.png') 'Candidate Privacy and your data panel showing data export, disability-card retention information, AI-consent withdrawal, and password-confirmed permanent account deletion.')
    [void] (Add-ParagraphAt $document ([ref] $position) 'Figure 0: Candidate data-access, consent, retention, and erasure controls' $captionStyle)
    Write-Output 'Checkpoint: privacy example inserted'

    # Concrete planned-cache example plus a complete low-level comparison table.
    $cacheAnchor = Find-Paragraph $document 'This staged choice avoids premature complexity' -StartsWith
    $position = $cacheAnchor.Range.End
    [void] (Add-ParagraphAt $document ([ref] $position) 'Planned cache example: a key such as catalogue:job-definition:{id}:v{version} may store only published tasks and controlled vocabulary. An administrator catalogue import or job-definition update must invalidate the related version. Short TTL, cache-miss fallback to PostgreSQL, metrics, and failure isolation are required. Tokens, disability cards, transcripts, unconfirmed AI output, private candidate profiles, and authorization decisions must never use this cache.' $normalStyle)
    [void] (Add-ParagraphAt $document ([ref] $position) 'Low-level decision summary' $heading3Style)
    [void] (Add-ParagraphAt $document ([ref] $position) 'The component alternatives, selected boundaries, and remaining trade-offs are summarized in [[REF_LOW_TABLE]].' $normalStyle)
    [void] (Add-ParagraphAt $document ([ref] $position) 'Table 0: Low-level component alternatives and selected boundaries' $captionStyle)
    $lowRows = @(
        @('Decision', 'Alternatives evaluated', 'Selected boundary', 'Reason and remaining trade-off'),
        @('Authentication', 'Server session; JWT API token; external identity provider', 'Symfony JWT plus server-confirmed role session', 'Fits the SPA/API baseline and explicit RBAC; deployment still needs expiry, revocation strategy, HTTPS, and monitoring.'),
        @('Candidate verification', 'Self-declaration; automated OCR/registry; authorized human review', 'Human review with private temporary evidence', 'Avoids unsupported automated eligibility decisions; creates reviewer workload and governance duties.'),
        @('Candidate input', 'Manual only; voice only; multimodal', 'Manual form plus optional editable text/voice profile assistant', 'Maximizes access and graceful degradation; multilingual accuracy requires formal evaluation.'),
        @('AI extraction', 'Rules; automatic LLM persistence; reviewable LLM suggestions', 'Consent-gated suggestions with human confirmation', 'Handles natural language while preventing unreviewed sensitive data from becoming fact.'),
        @('Matching', 'Keywords; opaque learned decision; deterministic task scoring', 'Versioned deterministic weighted task policy', 'Explainable and testable; future calibration needs expert-reviewed examples rather than cosmetic score changes.'),
        @('Private files', 'Public upload; database blob; private filesystem/object store', 'Private Symfony storage for prototype', 'Enforces authenticated access and deletion; deployed scale may justify encrypted object storage.'),
        @('Notifications', 'Email only; in-app only; both plus outcome log', 'Plain-text email and accessible in-app notice with minimized event log', 'Business decisions survive mail failure; production deliverability monitoring remains required.'),
        @('Caching', 'No cache; process-local memory; shared Redis/equivalent', 'Measurement-driven shared cache planned', 'Add only with TTL, invalidation, privacy exclusions, observability, and database fallback.'),
        @('Accessibility verification', 'Automated only; manual only; combined evidence', 'Automated scans/tests plus keyboard, zoom, reflow, and screen-reader plan', 'No AA claim until the remaining rendered/manual evidence is completed.')
    )
    [void] (Add-TableAt $document ([ref] $position) $lowRows $highTable.Style)
    Write-Output 'Checkpoint: low-level table inserted'

    # Renumber every caption by document order and create stable targets.
    Renumber-Captions $document
    $records = Add-CaptionBookmarks $document
    Write-Output 'Checkpoint: captions renumbered and bookmarked'
    $records | ForEach-Object { Write-Output ("Caption record: {0} {1}: {2}" -f $_.Kind, $_.Number, $_.Title) }
    $document.Save()
    $figureRecords = @($records | Where-Object Kind -eq 'Figure' | Sort-Object Number)
    $tableRecords = @($records | Where-Object Kind -eq 'Table' | Sort-Object Number)

    # Set useful alternative text on the nearest image preceding every figure caption.
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

    # Replace explicit content references with working internal hyperlinks.
    $highTableRecord = $tableRecords | Where-Object Title -eq 'High-level architecture alternatives comparison'
    $lowTableRecord = $tableRecords | Where-Object Title -eq 'Low-level component alternatives and selected boundaries'
    $runtimeFigure = $figureRecords | Where-Object Title -eq 'Layered modular runtime service boundaries and health evidence'
    $signupFigure = $figureRecords | Where-Object Title -eq 'Candidate disability-card requirement and verification consent'
    $taskFigure = $figureRecords | Where-Object Title -eq 'Employer task-importance and assistance configuration'
    $privacyFigure = $figureRecords | Where-Object Title -eq 'Candidate data-access, consent, retention, and erasure controls'
    Replace-TokenWithLink $document '[[REF_HIGH_TABLE]]' $highTableRecord
    Replace-TokenWithLink $document '[[REF_LOW_TABLE]]' $lowTableRecord
    Replace-TokenWithLink $document '[[REF_RUNTIME_FIGURE]]' $runtimeFigure
    Replace-TokenWithLink $document '[[REF_SIGNUP_FIGURE]]' $signupFigure
    Replace-TokenWithLink $document '[[REF_TASK_FIGURE]]' $taskFigure
    Replace-TokenWithLink $document '[[REF_PRIVACY_FIGURE]]' $privacyFigure
    Write-Output 'Checkpoint: content cross-references linked'

    # Build linked lists with live page references while retaining the existing list style.
    Rebuild-LinkedList $document 'List of figures' 'List of tables' $figureRecords
    Write-Output 'Checkpoint: figure list rebuilt'
    Rebuild-LinkedList $document 'List of tables' 'Acronyms' $tableRecords
    Write-Output 'Checkpoint: table list rebuilt'

    foreach ($toc in $document.TablesOfContents) { $toc.Update() }
    [void] $document.Fields.Update()
    Write-Output 'Checkpoint: fields updated'
    $document.Save()
    $pdfPath = [System.IO.Path]::ChangeExtension($documentFullPath, '.pdf')
    $document.ExportAsFixedFormat($pdfPath, 17)
    Write-Output "Enhanced report: $documentFullPath"
    Write-Output "PDF: $pdfPath"
    Write-Output "Figures: $($figureRecords.Count); Tables: $($tableRecords.Count)"
} finally {
    if ($document) { try { $document.Close(0) } catch {} }
    try { $word.Quit() } catch {}
}
