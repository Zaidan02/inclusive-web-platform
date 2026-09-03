param(
    [Parameter(Mandatory = $true)]
    [string] $InputPath,

    [Parameter(Mandatory = $true)]
    [string] $OutputPath
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$wNs = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
$xmlNs = 'http://www.w3.org/XML/1998/namespace'

function Copy-OpenFile {
    param([string] $Source, [string] $Destination)

    $sourceStream = [System.IO.File]::Open($Source, 'Open', 'Read', 'ReadWrite')
    try {
        $destinationStream = [System.IO.File]::Open($Destination, 'Create', 'Write', 'None')
        try {
            $sourceStream.CopyTo($destinationStream)
        } finally {
            $destinationStream.Dispose()
        }
    } finally {
        $sourceStream.Dispose()
    }
}

function Read-ZipEntryXml {
    param($Zip, [string] $Name)

    $entry = $Zip.GetEntry($Name)
    if (-not $entry) { throw "Missing DOCX entry: $Name" }
    $reader = [System.IO.StreamReader]::new($entry.Open())
    try { return [xml] $reader.ReadToEnd() } finally { $reader.Dispose() }
}

function Write-ZipEntryXml {
    param($Zip, [string] $Name, [xml] $Xml)

    $oldEntry = $Zip.GetEntry($Name)
    if ($oldEntry) { $oldEntry.Delete() }
    $entry = $Zip.CreateEntry($Name, [System.IO.Compression.CompressionLevel]::Optimal)
    $settings = [System.Xml.XmlWriterSettings]::new()
    $settings.Encoding = [System.Text.UTF8Encoding]::new($false)
    $settings.Indent = $false
    $stream = $entry.Open()
    try {
        $writer = [System.Xml.XmlWriter]::Create($stream, $settings)
        try { $Xml.Save($writer) } finally { $writer.Dispose() }
    } finally {
        $stream.Dispose()
    }
}

function Get-ParagraphText {
    param([System.Xml.XmlNode] $Paragraph)

    return (($Paragraph.SelectNodes('.//w:t', $script:ns) | ForEach-Object { $_.InnerText }) -join '')
}

function Find-Paragraph {
    param([string] $Text, [switch] $StartsWith)

    foreach ($paragraph in $script:body.SelectNodes('./w:p', $script:ns)) {
        $current = (Get-ParagraphText $paragraph).Trim()
        if (($StartsWith -and $current.StartsWith($Text)) -or (-not $StartsWith -and $current -eq $Text)) {
            return $paragraph
        }
    }
    throw "Paragraph not found: $Text"
}

function Set-ParagraphText {
    param([System.Xml.XmlNode] $Paragraph, [string] $Text)

    $runProperties = $null
    $firstRunProperties = $Paragraph.SelectSingleNode('./w:r[1]/w:rPr', $script:ns)
    if ($firstRunProperties) { $runProperties = $firstRunProperties.CloneNode($true) }

    foreach ($child in @($Paragraph.ChildNodes)) {
        if ($child.LocalName -ne 'pPr') { [void] $Paragraph.RemoveChild($child) }
    }

    $run = $script:documentXml.CreateElement('w', 'r', $wNs)
    if ($runProperties) { [void] $run.AppendChild($runProperties) }
    $textNode = $script:documentXml.CreateElement('w', 't', $wNs)
    [void] $textNode.SetAttribute('space', $xmlNs, 'preserve')
    $textNode.InnerText = $Text
    [void] $run.AppendChild($textNode)
    [void] $Paragraph.AppendChild($run)
}

function New-Paragraph {
    param(
        [System.Xml.XmlNode] $Template,
        [string] $Text
    )

    $paragraph = $Template.CloneNode($true)
    Set-ParagraphText $paragraph $Text
    return $paragraph
}

function New-LinkParagraph {
    param(
        [System.Xml.XmlNode] $Template,
        [string] $Prefix,
        [string] $Label,
        [string] $Url
    )

    $paragraph = New-Paragraph $Template $Prefix
    $field = $script:documentXml.CreateElement('w', 'fldSimple', $wNs)
    [void] $field.SetAttribute('instr', $wNs, ('HYPERLINK "{0}"' -f $Url))
    $run = $script:documentXml.CreateElement('w', 'r', $wNs)
    $runProperties = $script:documentXml.CreateElement('w', 'rPr', $wNs)
    $runStyle = $script:documentXml.CreateElement('w', 'rStyle', $wNs)
    [void] $runStyle.SetAttribute('val', $wNs, 'Hyperlink')
    [void] $runProperties.AppendChild($runStyle)
    [void] $run.AppendChild($runProperties)
    $textNode = $script:documentXml.CreateElement('w', 't', $wNs)
    $textNode.InnerText = $Label
    [void] $run.AppendChild($textNode)
    [void] $field.AppendChild($run)
    [void] $paragraph.AppendChild($field)
    return $paragraph
}

function Replace-Between {
    param(
        [System.Xml.XmlNode] $Start,
        [System.Xml.XmlNode] $End,
        [System.Collections.IEnumerable] $NewNodes
    )

    $node = $Start.NextSibling
    while ($node -and $node -ne $End) {
        $next = $node.NextSibling
        [void] $script:body.RemoveChild($node)
        $node = $next
    }
    foreach ($newNode in $NewNodes) {
        [void] $script:body.InsertBefore($newNode, $End)
    }
}

function Add-Attribute {
    param([System.Xml.XmlElement] $Element, [string] $Name, [string] $Value)
    [void] $Element.SetAttribute($Name, $wNs, $Value)
}

function New-Table {
    param([object[][]] $Rows)

    $widths = @(1700, 1250, 2500, 3150)
    $table = $script:documentXml.CreateElement('w', 'tbl', $wNs)
    $tableProperties = $script:documentXml.CreateElement('w', 'tblPr', $wNs)
    $style = $script:documentXml.CreateElement('w', 'tblStyle', $wNs)
    Add-Attribute $style 'val' 'TableGrid'
    [void] $tableProperties.AppendChild($style)
    $tableWidth = $script:documentXml.CreateElement('w', 'tblW', $wNs)
    Add-Attribute $tableWidth 'w' '0'
    Add-Attribute $tableWidth 'type' 'auto'
    [void] $tableProperties.AppendChild($tableWidth)
    [void] $table.AppendChild($tableProperties)

    $grid = $script:documentXml.CreateElement('w', 'tblGrid', $wNs)
    foreach ($width in $widths) {
        $column = $script:documentXml.CreateElement('w', 'gridCol', $wNs)
        Add-Attribute $column 'w' ([string] $width)
        [void] $grid.AppendChild($column)
    }
    [void] $table.AppendChild($grid)

    for ($rowIndex = 0; $rowIndex -lt $Rows.Count; $rowIndex++) {
        $row = $script:documentXml.CreateElement('w', 'tr', $wNs)
        for ($columnIndex = 0; $columnIndex -lt 4; $columnIndex++) {
            $cell = $script:documentXml.CreateElement('w', 'tc', $wNs)
            $cellProperties = $script:documentXml.CreateElement('w', 'tcPr', $wNs)
            $cellWidth = $script:documentXml.CreateElement('w', 'tcW', $wNs)
            Add-Attribute $cellWidth 'w' ([string] $widths[$columnIndex])
            Add-Attribute $cellWidth 'type' 'dxa'
            [void] $cellProperties.AppendChild($cellWidth)
            if ($rowIndex -eq 0) {
                $shading = $script:documentXml.CreateElement('w', 'shd', $wNs)
                Add-Attribute $shading 'fill' 'D9EAF7'
                [void] $cellProperties.AppendChild($shading)
            }
            [void] $cell.AppendChild($cellProperties)

            $paragraph = $script:documentXml.CreateElement('w', 'p', $wNs)
            $run = $script:documentXml.CreateElement('w', 'r', $wNs)
            if ($rowIndex -eq 0) {
                $runProperties = $script:documentXml.CreateElement('w', 'rPr', $wNs)
                [void] $runProperties.AppendChild($script:documentXml.CreateElement('w', 'b', $wNs))
                [void] $run.AppendChild($runProperties)
            }
            $textNode = $script:documentXml.CreateElement('w', 't', $wNs)
            [void] $textNode.SetAttribute('space', $xmlNs, 'preserve')
            $textNode.InnerText = [string] $Rows[$rowIndex][$columnIndex]
            [void] $run.AppendChild($textNode)
            [void] $paragraph.AppendChild($run)
            [void] $cell.AppendChild($paragraph)
            [void] $row.AppendChild($cell)
        }
        [void] $table.AppendChild($row)
    }
    return $table
}

if (-not (Test-Path -LiteralPath $InputPath)) { throw "Input report not found: $InputPath" }
$outputDirectory = Split-Path -Parent $OutputPath
if ($outputDirectory -and -not (Test-Path -LiteralPath $outputDirectory)) {
    [void] (New-Item -ItemType Directory -Path $outputDirectory -Force)
}

Copy-OpenFile $InputPath $OutputPath

$fileStream = [System.IO.File]::Open($OutputPath, 'Open', 'ReadWrite', 'None')
try {
    $zip = [System.IO.Compression.ZipArchive]::new($fileStream, [System.IO.Compression.ZipArchiveMode]::Update, $false)
    try {
        $script:documentXml = Read-ZipEntryXml $zip 'word/document.xml'
        $script:ns = [System.Xml.XmlNamespaceManager]::new($documentXml.NameTable)
        $ns.AddNamespace('w', $wNs)
        $script:body = $documentXml.SelectSingleNode('//w:body', $ns)

        $heading1Template = (Find-Paragraph 'Introduction').CloneNode($true)
        $heading2Template = (Find-Paragraph 'Functional Requirements').CloneNode($true)
        $heading3Template = (Find-Paragraph 'Component Duagram').CloneNode($true)
        $regularTemplate = (Find-Paragraph 'Access to employment is not only an economic need, but also a major factor of dignity, autonomy, social participation, and personal identity.' -StartsWith).CloneNode($true)
        $captionTemplate = (Find-Paragraph 'Figure 7: Gantt chart').CloneNode($true)
        $listTemplate = (Find-Paragraph 'Figure 1 Solution Diagram' -StartsWith).CloneNode($true)

        # Cover and immediately visible corrections.
        Set-ParagraphText (Find-Paragraph 'Final Year Project Proposal Report') 'Final Year Project Progress Report'
        Set-ParagraphText (Find-Paragraph '10-07-2026') '10-08-2026'
        Set-ParagraphText (Find-Paragraph 'Component Duagram') 'Component Diagram'

        # Preserve the proposal introduction and add only a concise progress update.
        $backgroundHeading = Find-Paragraph 'Background Research and Related work'
        $introUpdate = New-Paragraph $regularTemplate 'Progress update (10 August 2026): Phase II has now implemented the principal prototype workflows described above, including candidate eligibility verification, editable English/French/Arabic profile transcripts, consent-gated AI suggestions with candidate confirmation, deterministic task-level matching, private document handling, role-based security, responsive keyboard and optional voice navigation, accessible notifications, outcome logging, and repeatable integration/E2E/performance tests. Final rendered WCAG checks, representative-user evaluation, ten additional validated job roles, deployed capacity evidence, formal multilingual evaluation, and the planned cache layer remain in progress.'
        [void] $body.InsertBefore($introUpdate, $backgroundHeading)

        # Align requirements with the implemented verification and scoring boundaries.
        Set-ParagraphText (Find-Paragraph 'The requirements of Phase II are defined as an extension of the Phase I Inclusive Web Platform.' -StartsWith) 'The Phase II requirements extend the Phase I Inclusive Web Platform. The current implementation covers role-based accounts, candidate eligibility verification, profiles, jobs, applications, task-level ability matching, accessible notifications, outcome logging, private document handling, privacy controls, responsive access, keyboard and optional voice navigation, and AI-assisted profile building. Dataset expansion, deployed capacity validation, representative-user evaluation, and final WCAG rendered verification remain tracked work.'
        Set-ParagraphText (Find-Paragraph 'The system shall allow candidates to optionally upload an official disability card' -StartsWith) 'Candidate registration shall require one disability card or official recognition document, explicit consent to its verification use, and email verification. The document shall be accessible only to an authorized verifier or administrator and shall never be exposed to employers.'
        Set-ParagraphText (Find-Paragraph 'The system shall allow candidates to complete the main candidate journey using text input, voice input, or a combination of both.' -StartsWith) 'The system shall allow candidates to complete the main candidate journey with keyboard and text input. Voice navigation is an optional additional control, and the profile-building workflow accepts either typed text or an editable voice transcript.'
        Set-ParagraphText (Find-Paragraph 'For example, the AI layer shall extract only registration-related information' -StartsWith) 'The AI extraction layer shall be limited to the candidate profile schema and active controlled catalogues. Separately, voice-navigation commands shall use page-specific action allowlists so that spoken commands cannot execute arbitrary application behavior.'
        Set-ParagraphText (Find-Paragraph 'FR15 — ML Matching Model Update') 'FR15 — Scoring Engine Preservation and Validation'
        Set-ParagraphText (Find-Paragraph 'The system shall support updating, retraining, and evaluating the matching model using the expanded dataset of thirteen job roles.' -StartsWith) 'The system shall preserve and test the approved deterministic task-level mathematical scoring policy while importing additional validated job catalogues. Any future change to the scoring formula or its inputs shall require a separately documented version, validation, and stakeholder review.'
        Set-ParagraphText (Find-Paragraph 'The updated model shall generate compatibility scores across all supported jobs while preserving integration with the existing Flask matching microservice.' -StartsWith) 'The Python scoring service shall generate explainable compatibility scores across supported jobs and expose task-level feasibility, weights, mandatory-task effects, and assistance assumptions without using disability identity as an employment decision.'
        Set-ParagraphText (Find-Paragraph 'The expanded job dataset shall follow a consistent structure across all thirteen job roles.' -StartsWith) 'Every imported job dataset shall follow the controlled catalogue schema. The current validated baseline contains three job roles, 362 tasks, 16 disability categories, and 5,477 recorded task/disability assessments; additional roles shall not be claimed until their source workbooks are supplied, reviewed, normalized, and regression-tested.'
        Set-ParagraphText (Find-Paragraph 'The updated matching model shall be evaluated using appropriate metrics and compared against expected expert-defined compatibility outputs.' -StartsWith) 'The deterministic scoring engine shall be evaluated against expected expert-defined compatibility outputs, policy invariants, catalogue integrity checks, and regression tests. Predictive-model metrics shall be used only if a future, separately approved learned model is introduced.'

        # Correct proposal-era architecture statements.
        Set-ParagraphText (Find-Paragraph 'The first contribution is the expansion of the job-description dataset.' -StartsWith) 'The first data contribution is a controlled catalogue-import pipeline and a documented missing-assessment policy. The current validated baseline contains the three supplied HoReCa workbooks—chocolate/confectionery, ice-cream production, and bakery/pastry—with 362 normalized tasks and 5,477 recorded assessments. The planned expansion to thirteen roles remains pending because unsupported roles must not be invented or inferred.'
        Set-ParagraphText (Find-Paragraph 'The second contribution is the improvement of the machine learning matching component.' -StartsWith) 'The second contribution is the preservation and verification of the established mathematical scoring approach. The engine performs deterministic, explainable task-level compatibility calculations using confirmed candidate data, task weights, highlighted or mandatory status, feasibility assessments, education requirements, and assistance availability. AI-generated profile suggestions do not silently change its inputs.'
        Set-ParagraphText (Find-Paragraph 'The AI input orchestrator manages the voice/text workflow.' -StartsWith) 'The AI profile assistant manages an optional text/voice workflow. Voice is converted into an editable transcript, explicit consent is collected, and the internal extraction service returns structured profile suggestions. Suggestions remain unsaved until the candidate selects and confirms them. Page-aware action allowlists are used by the separate voice-navigation control.'
        Set-ParagraphText (Find-Paragraph 'The matching engine compares confirmed PwD candidate abilities with job task requirements and calculates the compatibility percentage.' -StartsWith) 'The matching service compares confirmed candidate information with published job-task requirements and returns an explainable compatibility result. PostgreSQL stores confirmed platform data. Disability cards and application documents use authenticated private storage outside the public web root; audio is kept in browser memory for transcription and is not retained by the application. A cache layer remains part of the planned architecture and will be implemented later for measured, repeated non-sensitive reads with explicit expiry and invalidation rules.'
        Set-ParagraphText (Find-Paragraph 'The solution modeling focuses on the practical implementation structure of the platform.' -StartsWith) 'The solution model reflects the implemented modular structure: accessible React interface, Symfony API and data-access layer, PostgreSQL, Python scoring service, AI/voice service, email notifications, and private file storage. Caching remains a deferred optimization and is not shown as completed implementation evidence.'
        Set-ParagraphText (Find-Paragraph 'The accessible web interface is designed to support full keyboard navigation' -StartsWith) 'The accessible web interface supports keyboard navigation throughout public, candidate, employer, verifier, and administrator workflows. It includes a skip link, visible focus, logical focus movement, responsive controls, accessible form labels, dialog focus trapping and restoration, Left/Right arrow navigation where safe, and screen-reader-compatible outcome messages.'
        Set-ParagraphText (Find-Paragraph 'The design may evolve during the implementation and testing phases' -StartsWith) 'The implementation remains iterative: accessibility retests, representative-user feedback, deployment measurements, and new validated datasets may require controlled refinements. Current limitations and pending evidence are explicitly recorded instead of being presented as completed compliance.'
        Set-ParagraphText (Find-Paragraph 'The selected solution is a' -StartsWith) 'The selected solution is a layered modular web architecture. It combines a React interface, Symfony API, PostgreSQL database, Python scoring service, private file storage, separate AI/voice processing, notifications, and a planned cache layer for repeated non-sensitive data.'
        Set-ParagraphText (Find-Paragraph 'Presentation Layer: React Web Interface') 'Presentation Layer: React/Vite Web Interface'
        Set-ParagraphText (Find-Paragraph 'Matching Layer: Python/Flask ML Matching Microservice') 'Matching Layer: Python Deterministic Scoring Service'
        Set-ParagraphText (Find-Paragraph 'Support Layer: Cache and Secure Temporary File Storage') 'Support Layer: Private File Storage and Planned Cache'
        Set-ParagraphText (Find-Paragraph 'The React frontend provides an accessible interface for PwD candidates' -StartsWith) 'The React frontend provides an accessible interface for PwD candidates, employers, administrators, and authorized verifiers. The Symfony backend API manages registration, authentication, role authorization, profiles, jobs, applications, verification, AI orchestration, and service integration. PostgreSQL stores confirmed persistent data, and the Python scoring service calculates deterministic compatibility results. Protected files use private storage. A cache will be added later for measured repeated non-sensitive reads, with expiry and invalidation rules.'
        Set-ParagraphText (Find-Paragraph 'The chosen option is LLM-assisted NLP.' -StartsWith) 'The chosen option is LLM-assisted NLP within the candidate profile workflow. After voice input is transcribed—or after the candidate types directly—the editable English, Arabic, or French text is analysed only after explicit consent. The protected service returns suggestions mapped to the current profile schema and controlled catalogues; it does not populate registration or application fields automatically.'
        Set-ParagraphText (Find-Paragraph '{  "personal_information"' -StartsWith) '{ "personalInformation": { "location": "Beirut" }, "educationLevel": "...", "disabilities": [], "skills": [], "preferences": [], "assistanceNeeds": [], "taskSkills": [], "unmatchedStatements": [] }'
        Set-ParagraphText (Find-Paragraph 'The chosen option is task-level ability-based matching supported by ML.' -StartsWith) 'The chosen option is deterministic task-level ability-based matching. Each job is decomposed into weighted tasks with explicit feasibility assessments. The service compares confirmed candidate inputs with these task requirements, applies the approved mathematical policy, and returns the overall score and explainable task-level breakdown. It does not make the final recruitment decision.'
        Set-ParagraphText (Find-Paragraph 'The chosen option is to store only confirmed data in PostgreSQL.' -StartsWith) 'The chosen option is to store only confirmed persistent data in PostgreSQL. Profile audio remains in browser memory only long enough for transcription and is not stored by the application. AI suggestions remain transient until confirmation. Disability cards and application documents are stored privately with authenticated access and documented retention/deletion controls.'
        Set-ParagraphText (Find-Paragraph 'The chosen option is to use a cache layer for repeated non-sensitive data.' -StartsWith) 'The selected future optimization is a cache layer for repeated non-sensitive data such as published jobs, tasks, and controlled vocabularies. It has not yet been implemented because the local performance baseline is within budget. The later implementation will be justified with deployed measurements and will define keys, expiry, invalidation, authorization boundaries, and failure fallback before caching is enabled.'
        Set-ParagraphText (Find-Paragraph 'This improves performance while respecting privacy and security requirements.') 'This staged choice avoids premature complexity while retaining a clear path to improve deployed performance without caching disability documents, transcripts, unconfirmed AI output, tokens, or private candidate records.'
        Set-ParagraphText (Find-Paragraph 'For local development, Docker and Docker Compose can be used' -StartsWith) 'Docker and Docker Compose provide the local development environment. Deployment and testing require a local or cloud host for the React production build, Symfony API, PostgreSQL database, Python scoring service, AI/voice service, notifications, and private file storage. The planned cache service can be added after deployed measurements establish its sizing, invalidation, and security requirements.'

        $architectureSummary = Find-Paragraph 'This architecture was selected because it is modular without being unnecessarily complex.' -StartsWith
        $architectureTable = $architectureSummary.NextSibling
        while ($architectureTable -and $architectureTable.LocalName -ne 'tbl') { $architectureTable = $architectureTable.NextSibling }
        if ($architectureTable) {
            [void] $body.InsertBefore((New-Paragraph $captionTemplate 'Table 1: High-level architecture alternatives comparison'), $architectureTable)
        }

        # Add missing captions to the six existing design figures.
        $figureContexts = @(
            @('Before presenting the system context diagram', 'Figure 1: C4 notation legend'),
            @('The system context diagram gives a high-level view', 'Figure 2: System context diagram (C4 Level 1)'),
            @('The container diagram shows the main technical blocks', 'Figure 3: Container diagram (C4 Level 2)'),
            @('The conceptual class diagram presents the main entities', 'Figure 4: Conceptual class diagram'),
            @('The state diagram shows the lifecycle', 'Figure 5: Matching-evaluation state diagram'),
            @('The component diagram shows the internal structure', 'Figure 6: Component diagram')
        )
        foreach ($mapping in $figureContexts) {
            $context = Find-Paragraph $mapping[0] -StartsWith
            $drawing = $context.NextSibling
            while ($drawing -and $drawing.SelectNodes('.//w:drawing', $ns).Count -eq 0) { $drawing = $drawing.NextSibling }
            if ($drawing) {
                $nextText = if ($drawing.NextSibling -and $drawing.NextSibling.LocalName -eq 'p') { (Get-ParagraphText $drawing.NextSibling).Trim() } else { '' }
                if (-not $nextText.StartsWith('Figure ')) {
                    [void] $body.InsertAfter((New-Paragraph $captionTemplate $mapping[1]), $drawing)
                }
            }
        }

        # Rebuild the stale lists of figures and tables.
        $listFigures = Find-Paragraph 'List of figures'
        $listTables = Find-Paragraph 'List of tables'
        $figureListNodes = @(
            'Figure 1: C4 notation legend',
            'Figure 2: System context diagram (C4 Level 1)',
            'Figure 3: Container diagram (C4 Level 2)',
            'Figure 4: Conceptual class diagram',
            'Figure 5: Matching-evaluation state diagram',
            'Figure 6: Component diagram',
            'Figure 7: Gantt chart',
            'Figure 8: Candidate AI-assisted profile-building workflow — screenshot placeholder',
            'Figure 9: Keyboard/voice navigation and accessible notifications — screenshot placeholder',
            'Figure 10: Authorized candidate-verification dashboard — screenshot placeholder',
            'Figure 11: Responsive role dashboards — screenshot placeholder',
            'Figure 12: Integration, E2E, and performance evidence — screenshot placeholder'
        ) | ForEach-Object { New-Paragraph $listTemplate $_ }
        Replace-Between $listFigures $listTables $figureListNodes

        $acronyms = Find-Paragraph 'Acronyms'
        Replace-Between $listTables $acronyms @(
            (New-Paragraph $listTemplate 'Table 1: High-level architecture alternatives comparison'),
            (New-Paragraph $listTemplate 'Table 2: Engineering design-decision matrix'),
            (New-Paragraph $listTemplate 'Table 3: Requirements progress and verification matrix'),
            (New-Paragraph $listTemplate 'Table 4: Runtime services and local endpoints'),
            (New-Paragraph $listTemplate 'Table 5: Security and privacy control summary'),
            (New-Paragraph $listTemplate 'Table 6: Deterministic scoring policy'),
            (New-Paragraph $listTemplate 'Table 7: Accessibility verification coverage'),
            (New-Paragraph $listTemplate 'Table 8: Recorded automated verification results'),
            (New-Paragraph $listTemplate 'Table 9: Repository documentation incorporated into this report')
        )

        # Replace the obsolete preliminary section with evidence-backed progress.
        $progressHeading = Find-Paragraph 'Preliminary implementation/tests'
        Set-ParagraphText $progressHeading 'Implementation Progress and Verification'
        $conclusionHeading = Find-Paragraph 'Conclusion and Future Work Planning'

        $rows = @(
            @('Requirement area', 'Status', 'Implemented evidence', 'Remaining work'),
            @('Authentication and RBAC', 'Implemented', 'Server-validated JWT sessions; explicit candidate, employer, verifier, and administrator route boundaries; anonymous, forged-token, and wrong-role checks.', 'Repeat security audit in the production deployment.'),
            @('Candidate eligibility verification', 'Implemented', 'Mandatory disability-card upload and consent; email verification; authorized review; protected document access; approval/rejection audit.', 'Confirm institutional verifier policy and production retention schedule.'),
            @('Candidate profile and AI assistance', 'Implemented', 'Manual form plus editable English/French/Arabic transcript; consent; reviewable unsaved suggestions; controlled-catalogue validation.', 'Evaluate Lebanese Arabic, mixed-language, and representative-user accuracy.'),
            @('Task-level matching', 'Implemented', 'Approved deterministic scoring policy preserved; task weights, feasibility, mandatory status, assistance, and education remain explicit.', 'Validate future catalogue additions before import.'),
            @('Jobs, applications and outcomes', 'Implemented', 'Candidate, employer, and administrator workflows; optional application documents; accessible statuses; consent-aware outcome logging.', 'Collect sufficient real-world outcome data before any predictive-model study.'),
            @('Accessibility and responsive design', 'Remediated; final verification pending', 'Keyboard workflows, arrow navigation, focus management, semantics, contrast, reflow, reduced motion, errors, and status announcements.', 'Run documented NVDA, native 200% zoom, mobile-device, and post-remediation axe matrix.'),
            @('Privacy and private storage', 'Implemented', 'Purpose-specific consent, MIME/size validation, private no-store downloads, audit events, export, consent withdrawal, deletion, and retention purge.', 'Complete jurisdiction-specific legal review, backup erasure, and incident-response procedures.'),
            @('Integration and E2E testing', 'Implemented', 'API integration: 17/17 passed. Browser E2E: 19/19 passed. Voice-navigation tests: 49/49. Scoring tests: 11/11.', 'Run the same suites in CI and against the deployed environment.'),
            @('Performance baseline', 'Implemented locally', 'Production-build budgets passed with zero violations; representative API p95 values below 245 ms and recorded page-load/FCP evidence.', 'Perform concurrency and deployed-origin measurements; the 100-user target is not yet proven.'),
            @('Dataset expansion to 13 roles', 'Pending', 'Validated baseline: 3 jobs, 362 tasks, 16 disability categories, 5,477 recorded assessments.', 'Obtain, normalize, review, and regression-test ten additional authoritative workbooks.'),
            @('Cache layer', 'Planned', 'Current non-cached baseline is measured and within local budgets; sensitive-data exclusions are defined.', 'Implement and test the planned cache for repeated non-sensitive data with TTL, invalidation, authorization, and failure fallback.')
        )

        $decisionRows = @(
            @('Decision', 'Alternatives compared', 'Selected solution and rationale', 'Trade-off / follow-up'),
            @('System architecture', 'Single monolith; full microservices; layered modular system', 'Layered modular system: simpler to deliver than full microservices while keeping scoring and AI/voice replaceable and independently testable.', 'Some services still share deployment; add operational separation only when scale justifies it.'),
            @('Matching method', 'Keyword matching; opaque ML decision; deterministic task-level scoring', 'Deterministic task-level scoring: preserves the approved mathematics, exposes feasibility and weights, and is easier to audit ethically.', 'Future learned models require consented outcome data, versioning, evaluation, and stakeholder approval.'),
            @('Candidate input', 'Manual only; voice only; multimodal', 'Manual form plus editable English, Arabic, or French typed/voice transcript: expands access without excluding users or making AI mandatory.', 'Formally evaluate Lebanese Arabic, code-switching, and assistive-technology interaction.'),
            @('AI control', 'Automatic persistence; rule-based extraction; LLM suggestions with review', 'Consent-gated LLM suggestions with human confirmation: handles natural language while preventing unreviewed sensitive data from becoming fact.', 'External-service cost, latency, and extraction accuracy remain measurable risks; manual entry is the fallback.'),
            @('Sensitive documents', 'Public uploads; database blobs; authenticated private storage', 'Private storage outside the web root with MIME/size checks, random names, auditing, no-store responses, and retention deletion.', 'Production backups, encryption/key management, legal retention, and incident response require operational policy.'),
            @('Caching', 'No cache; immediate cache; measurement-driven staged cache', 'Planned measurement-driven cache for repeated non-sensitive catalogue reads, preserving a simple and correct baseline first.', 'Implement later with Redis or an equivalent only after deployed profiling; define TTL, invalidation, authorization, privacy exclusions, and fallback.'),
            @('Accessibility verification', 'Informal UI review; automated-only scan; automated plus manual evidence', 'WCAG 2.1 AA-targeted engineering with automated scans, keyboard/reflow tests, and a required manual screen-reader/zoom retest.', 'No conformance claim until all pending rendered and assistive-technology evidence passes.')
        )

        $progressNodes = @(
            (New-Paragraph $regularTemplate 'This progress report records the implemented Phase II baseline as of 10 August 2026. The work has advanced beyond preliminary analysis into an integrated prototype with executable backend, frontend, database, scoring, AI/voice, verification, privacy, accessibility, and testing workflows. Evidence is linked to the zm branch so that each claim can be reviewed against source code, technical documentation, and machine-readable results.'),
            (New-Paragraph $heading2Template 'Implemented System Baseline'),
            (New-Paragraph $regularTemplate 'The platform uses a React/Vite frontend, Symfony API, PostgreSQL database, Python scoring service, and a separate AI/voice service. Docker Compose provides the local integration environment. The current codebase contains dedicated candidate, employer, verifier, and administrator experiences protected by server-validated role authorization.'),
            (New-Paragraph $regularTemplate 'Candidate registration now has two independent eligibility gates: email ownership verification and authorized review of a mandatory disability card. Sensitive files are stored privately outside the public web root, opened only through authenticated endpoints, audited on access, and scheduled for deletion after the documented retention period.'),
            (New-Paragraph $heading2Template 'Engineering Alternatives and Decision Rationale'),
            (New-Paragraph $regularTemplate 'The project decisions were evaluated against accessibility, explainability, privacy, security, implementation effort, maintainability, testability, expected prototype load, and future extensibility. The selected design is not presented as universally best; it is the best fit for the current FYP scope and records the conditions under which it should evolve.'),
            (New-Paragraph $captionTemplate 'Table 2: Engineering design-decision matrix'),
            (New-Table $decisionRows),
            (New-Paragraph $heading2Template 'AI-Assisted Profile-Building Workflow'),
            (New-Paragraph $regularTemplate 'Candidates may keep using the complete manual profile form or provide an editable typed or spoken description. Speech transcription supports English, French, and Arabic selection. Audio is transcribed and discarded by the application. The transcript can be corrected before the candidate gives explicit consent for AI analysis.'),
            (New-Paragraph $regularTemplate 'The assistant returns structured suggestions with evidence and confidence. Every suggestion starts unselected and remains editable. Only explicitly selected values are sent to a confirmation endpoint, revalidated against active database catalogues, and persisted. This human-in-the-loop boundary prevents automatic diagnosis and preserves the approved scoring input contract.'),
            (New-Paragraph $captionTemplate '[Insert screenshot here: candidate profile page showing language selector, editable transcript, consent, and reviewable suggestions.]'),
            (New-Paragraph $captionTemplate 'Figure 8: Candidate AI-assisted profile-building workflow'),
            (New-LinkParagraph $regularTemplate 'Evidence: ' 'AI profile workflow documentation' 'https://github.com/Zaidan02/inclusive-web-platform/blob/zm/docs/AI_PROFILE_WORKFLOW.md'),
            (New-Paragraph $heading2Template 'Accessibility and Responsive Engineering'),
            (New-Paragraph $regularTemplate 'The public pages and all four role experiences were reviewed for responsive reflow, keyboard operation, focus order, semantic structure, accessible names, validation, contrast, reduced motion, dialogs, tables, filters, tabs, file controls, and live status messages. Left and Right Arrow provide requested focus navigation where this does not interfere with text fields or native widgets; Tab and Shift+Tab remain standard controls.'),
            (New-Paragraph $regularTemplate 'The remediation is substantial, but it is not represented as proof of complete WCAG 2.1 Level AA conformance. The final audit still requires a live post-remediation axe run, native 200% zoom, representative mobile and landscape tests, and manual NVDA/browser checks across authenticated workflows.'),
            (New-Paragraph $captionTemplate '[Insert screenshot here: visible keyboard focus and the voice-navigation/status notification controls.]'),
            (New-Paragraph $captionTemplate 'Figure 9: Keyboard/voice navigation and accessible notifications'),
            (New-LinkParagraph $regularTemplate 'Evidence: ' 'WCAG 2.1 AA audit report' 'https://github.com/Zaidan02/inclusive-web-platform/blob/zm/docs/wcag-audit/WCAG_2_1_AA_FINAL_AUDIT_REPORT.md'),
            (New-Paragraph $heading2Template 'Security, Verification, and Privacy'),
            (New-Paragraph $regularTemplate 'Backend firewalls protect role-prefixed APIs before controller execution, and the frontend confirms the active role through the protected session endpoint rather than trusting local token claims. Anonymous, forged-token, and cross-role access are rejected. Candidate verification decisions, document access, consent events, and application outcomes are auditable.'),
            (New-Paragraph $regularTemplate 'The candidate privacy dashboard explains stored data categories and consent history and supports structured export, AI-consent withdrawal, and password-confirmed account deletion. Technical safeguards support privacy principles but do not replace organizational legal review, incident response, backup-erasure rules, or production secret management.'),
            (New-Paragraph $captionTemplate '[Insert screenshot here: verifier dashboard with request filters, protected document control, and decision status.]'),
            (New-Paragraph $captionTemplate 'Figure 10: Authorized candidate-verification dashboard'),
            (New-LinkParagraph $regularTemplate 'Evidence: ' 'candidate verification documentation' 'https://github.com/Zaidan02/inclusive-web-platform/blob/zm/docs/CANDIDATE_VERIFICATION.md'),
            (New-LinkParagraph $regularTemplate 'Related evidence: ' 'authorization security documentation' 'https://github.com/Zaidan02/inclusive-web-platform/blob/zm/docs/AUTHORIZATION_SECURITY.md'),
            (New-LinkParagraph $regularTemplate 'Related evidence: ' 'privacy controls documentation' 'https://github.com/Zaidan02/inclusive-web-platform/blob/zm/docs/PRIVACY_CONTROLS.md'),
            (New-Paragraph $heading2Template 'Catalogue and Scoring Policy'),
            (New-Paragraph $regularTemplate 'The current controlled catalogue contains three supplied job definitions: Chocolate/Confectionery Worker, Ice Cream Maker, and Bakery/Pastry Worker. Together they contain 362 tasks, 16 disability categories, and 5,477 recorded assessments. Unchecked source cells are treated as headings, duplicates, structural cells, or unassessed cells according to the documented source-cell policy; they are not fabricated as negative assessments.'),
            (New-Paragraph $regularTemplate 'The mathematical scoring engine was intentionally preserved. Matching uses confirmed education, confirmed disability selection, published job tasks and weights, mandatory/highlighted status, feasibility assessments, and assistance availability. AI profile task-skill suggestions are stored for profile enrichment but are not introduced into scoring without a separate reviewed scoring version.'),
            (New-Paragraph $heading2Template 'Integration, E2E, and Performance Evidence'),
            (New-Paragraph $regularTemplate 'The repeatable verification suite passed 17 of 17 API integration checks and 19 of 19 browser E2E checks. The existing voice-navigation suite passed 49 of 49 tests and the scoring suite passed 11 of 11 tests. The production frontend build and ESLint completed without errors or warnings.'),
            (New-Paragraph $regularTemplate 'Local production-build performance measurements passed all configured budgets with zero violations. Recorded p95 API latency was 205.1 ms for public jobs, 163.2 ms for public job definitions, 86.7 ms for the candidate session, and 244.8 ms for the candidate profile. Recorded page load/FCP values were 102.6/448 ms for Welcome, 95.3/184 ms for Sign In, and 103/552 ms for Candidate. JavaScript and CSS gzip sizes were 130,428 and 13,579 bytes. These values are a development-machine regression baseline, not a production capacity claim.'),
            (New-Paragraph $captionTemplate '[Insert screenshot here: responsive candidate, employer, verifier, and administrator views at representative desktop and mobile widths.]'),
            (New-Paragraph $captionTemplate 'Figure 11: Responsive role dashboards'),
            (New-Paragraph $captionTemplate '[Insert screenshot here: terminal or report view showing integration, E2E, and performance results.]'),
            (New-Paragraph $captionTemplate 'Figure 12: Integration, E2E, and performance evidence'),
            (New-LinkParagraph $regularTemplate 'Evidence: ' 'integration, E2E, and performance report' 'https://github.com/Zaidan02/inclusive-web-platform/blob/zm/docs/testing/INTEGRATION_E2E_PERFORMANCE.md'),
            (New-LinkParagraph $regularTemplate 'Machine-readable evidence: ' 'performance results' 'https://github.com/Zaidan02/inclusive-web-platform/blob/zm/docs/testing/performance-results.json'),
            (New-Paragraph $heading2Template 'Requirements Traceability'),
            (New-Paragraph $captionTemplate 'Table 3: Requirements progress and verification matrix'),
            (New-Table $rows),
            (New-Paragraph $heading2Template 'Current Limitations'),
            (New-Paragraph $regularTemplate 'The following items remain open and are not represented as completed: ten additional validated job workbooks; final rendered WCAG and assistive-technology evidence; representative stakeholder and PwD usability evaluation; production deployment, capacity, backup, monitoring, and incident-response evidence; and formal Lebanese Arabic/mixed-language evaluation. Redis or another cache is also deferred unless deployed measurements demonstrate a need.')
        )
        Replace-Between $progressHeading $conclusionHeading $progressNodes

        # Replace future-tense conclusion while retaining the original Gantt image.
        $referenceStart = Find-Paragraph '[1] World Wide Web Consortium' -StartsWith
        $ganttImage = $null
        $cursor = $conclusionHeading.NextSibling
        while ($cursor -and $cursor -ne $referenceStart) {
            if ($cursor.SelectNodes('.//w:drawing', $ns).Count -gt 0) { $ganttImage = $cursor.CloneNode($true) }
            $cursor = $cursor.NextSibling
        }

        $conclusionNodes = @(
            (New-Paragraph $regularTemplate 'Phase II has delivered an integrated engineering prototype that advances the Inclusive Web Platform from a basic ability-matching proof of concept toward a secure, accessible, and reviewable recruitment workflow. The principal implemented contributions are candidate eligibility verification, private document handling, server-enforced role authorization, editable multilingual transcription, consent-gated AI profile suggestions, deterministic explainable matching, responsive keyboard-accessible interfaces, privacy controls, outcome logging, and repeatable integration, E2E, unit, accessibility, and performance evidence.'),
            (New-Paragraph $regularTemplate 'The strongest project design decision is to keep people in control. AI output is advisory and editable, candidate confirmation is mandatory before persistence, disability documents are separated from employer views, and the matching score supports—not replaces—human recruitment decisions. The mathematical scoring contract has not been silently altered by the AI workflow.'),
            (New-Paragraph $regularTemplate 'The current result is not presented as finished regulatory compliance or production readiness. The evidence clearly distinguishes implemented controls from pending validation so that later reviewers can reproduce tests, challenge assumptions, and close the remaining gaps.'),
            (New-Paragraph $heading2Template 'Remaining Work and Definition of Done'),
            (New-Paragraph $regularTemplate '1. Complete the post-remediation WCAG matrix at 320, 375, 768, 1024, and 1440 pixels; native 200% zoom; text spacing; landscape orientation; keyboard-only operation; and at least one documented NVDA/browser pairing. Resolve failures and update the audit evidence before making any AA conformance claim.'),
            (New-Paragraph $regularTemplate '2. Obtain ten additional authoritative job workbooks, normalize them through the existing catalogue schema, review them with domain stakeholders, and rerun catalogue and scoring regression tests. Until then, the supported validated catalogue remains three roles.'),
            (New-Paragraph $regularTemplate '3. Conduct representative usability sessions with PwD candidates, employers, and authorized verifiers. Measure task completion, errors, recovery, comprehension, and satisfaction against ISO 9241-110 principles, and record resulting corrections.'),
            (New-Paragraph $regularTemplate '4. Evaluate English, French, Arabic, Lebanese Arabic, and mixed-language transcription/extraction using consented test samples. Report accuracy and failure cases; retain manual entry as the operational fallback.'),
            (New-Paragraph $regularTemplate '5. Deploy to a controlled environment and repeat integration, E2E, security, accessibility, and performance suites. Add concurrency measurements, monitoring, secret management, scheduled retention purge, backup/erasure procedures, incident response, and formal privacy/legal review.'),
            (New-Paragraph $regularTemplate '6. Implement the planned cache layer for repeated non-sensitive catalogue data. Document the selected technology, cache keys, TTL values, invalidation triggers, authorization boundaries, privacy exclusions, monitoring, and database fallback; then rerun correctness and performance tests.'),
            (New-Paragraph $regularTemplate '7. Replace every screenshot placeholder in this report with a dated, readable capture, retain the linked technical evidence, update Word fields and page numbers, and complete supervisor review before submission.'),
            (New-Paragraph $heading2Template 'Risk Management'),
            (New-Paragraph $regularTemplate 'Data quality remains the main scoring risk. The project mitigates it by importing only supplied, reviewable workbooks, preserving source references, ignoring unchecked structural cells according to policy, and refusing to invent the ten missing job roles. AI/ASR accuracy is controlled through editable transcripts, explicit consent, human confirmation, server validation, and a complete manual fallback.'),
            (New-Paragraph $regularTemplate 'Privacy and authorization risks are reduced through role-prefixed API rules, server-confirmed sessions, private storage, random filenames, server-side MIME validation, no-store responses, document access auditing, retention scheduling, data export, consent withdrawal, and account deletion. Production governance, backups, secrets, incident response, and legal validation remain organizational responsibilities.'),
            (New-Paragraph $regularTemplate 'Performance and schedule risk are managed through versioned source control, small testable increments, explicit automated budgets, machine-readable results, and documented limitations. A cache should be introduced only after deployed evidence identifies a bottleneck, since premature caching would add invalidation and privacy risk.'),
            (New-Paragraph $heading2Template 'Project Management'),
            (New-Paragraph $regularTemplate 'Development is maintained on the zm Git branch with focused commits and technical evidence stored beside the code. Requirements, security decisions, privacy controls, accessibility remediation, keyboard tests, and automated test results are documented in the repository. The remaining work should continue as traceable issues with acceptance criteria and attached retest evidence.'),
            (New-LinkParagraph $regularTemplate 'Project repository and current branch: ' 'inclusive-web-platform — zm' 'https://github.com/Zaidan02/inclusive-web-platform/tree/zm')
        )
        if ($ganttImage) {
            $conclusionNodes += $ganttImage
            $conclusionNodes += New-Paragraph $captionTemplate 'Figure 7: Gantt chart'
        }
        Replace-Between $conclusionHeading $referenceStart $conclusionNodes

        # Preserve repository links as traceability, but make the report self-contained
        # by incorporating the technical documentation into formal appendices.
        [void] $body.InsertBefore((New-Paragraph $heading1Template 'References'), $referenceStart)
        $lastReference = Find-Paragraph '[12] Université Saint-Joseph' -StartsWith
        $sectionProperties = $body.SelectSingleNode('./w:sectPr', $ns)
        $additionalReferences = @(
            (New-Paragraph $regularTemplate '[13] International Organization for Standardization, ISO 9241-110:2020 — Ergonomics of human-system interaction — Part 110: Interaction principles, 2020.'),
            (New-Paragraph $regularTemplate '[14] Z. Mansour and C. Rizk, Inclusive Web Platform source code and technical documentation, GitHub, branch zm, 2026.')
        )
        foreach ($reference in $additionalReferences) { [void] $body.InsertBefore($reference, $sectionProperties) }

        $runtimeRows = @(
            @('Component', 'Technology', 'Local endpoint', 'Responsibility'),
            @('Frontend', 'React 19 and Vite', 'http://localhost:5173', 'Accessible public pages and candidate, employer, verifier, and administrator interfaces.'),
            @('Backend API', 'Symfony and PHP', 'http://localhost:8081/api', 'Authentication, authorization, persistence, business workflows, file access, mail, and service orchestration.'),
            @('Database', 'PostgreSQL 16', 'Docker internal service', 'Authoritative accounts, profiles, jobs, tasks, assessments, applications, outcomes, consents, and audits.'),
            @('Scoring service', 'Python HTTP service', 'http://localhost:5001', 'Deterministic task-level eligibility, compatibility, explanation, and ranking.'),
            @('AI and voice service', 'Python/Flask and OpenAI adapters', 'http://localhost:5002', 'Speech transcription, bounded voice interpretation, speech feedback, and protected profile extraction.'),
            @('Private storage', 'Symfony var volume', 'Not publicly routed', 'Disability cards and optional application files with authenticated access and retention controls.'),
            @('Planned cache', 'Redis or equivalent after measurement', 'To be defined', 'Repeated non-sensitive catalogue reads with TTL, invalidation, monitoring, and database fallback.')
        )

        $securityRows = @(
            @('Control area', 'Implemented control', 'Evidence or behavior', 'Remaining operational requirement'),
            @('Authentication', 'Email/password with secure hashing and JWT', 'Protected APIs require X-Auth-Token; query-string token extraction is disabled.', 'Production secret rotation, monitoring, and secure transport.'),
            @('Authorization', 'Explicit route-prefix RBAC', 'Candidate, employer, verifier, and administrator roles cannot use protected APIs assigned to other roles.', 'Repeat route audit after every new endpoint and in deployment.'),
            @('Candidate eligibility', 'Email verification plus authorized disability-card review', 'Both independent gates must pass before a newly registered candidate can sign in.', 'Institutional verifier assignment and review policy.'),
            @('Private uploads', 'Private path, random filename, MIME and size validation', 'Files are outside the public web root and returned only through authenticated no-store responses.', 'Backup encryption/erasure and production key management.'),
            @('Retention', 'Card deletion scheduled 30 days after a decision', 'Status remains after the source file is purged; access and decisions are audited.', 'Run the purge command daily and approve jurisdiction-specific retention.'),
            @('Candidate control', 'Consent history, export, withdrawal, deletion', 'Privacy dashboard supports JSON export, AI-consent withdrawal, and password-confirmed account deletion.', 'Formal legal review, controller contact, incident response, and backup erasure.'),
            @('AI minimization', 'No automatic diagnosis or persistence', 'Audit metadata excludes transcript, narrative, raw audio, passwords, and private documents.', 'Provider agreement and deployment privacy notice for external AI processing.')
        )

        $scoringRows = @(
            @('Policy element', 'Current value', 'Effect', 'Engineering rationale'),
            @('Base task weight', '1.0 by default', 'Defines task importance before vacancy highlighting.', 'No importance is guessed from wording or spreadsheet order.'),
            @('Highlighted multiplier', '1.5', 'Employer-selected important tasks influence numerator and denominator.', 'Represents the real vacancy while keeping the numeric rule centralized.'),
            @('Feasible factor', '1.00', 'Earns the complete adjusted task weight.', 'Represents independent feasibility in the supplied assessment.'),
            @('Needs-assistance factor', '0.75 when assistance exists; otherwise avoid', 'Earns partial points only when the offer provides assistance.', 'Explicit proof-of-concept policy, not a medical probability.'),
            @('Avoid factor', '0.00', 'Earns no points; mandatory avoid excludes the offer.', 'An explicit avoid assessment cannot be rescued by assistance.'),
            @('Missing assessment', 'Feasible fallback plus assumption flag', 'Avoids treating unchecked structural cells as negative evidence.', 'The returned explanation identifies that the value was assumed.'),
            @('Multiple disabilities', 'Most restrictive assessment wins', 'Uses the minimum effective feasibility across confirmed disabilities.', 'Conservative, deterministic, and explainable.'),
            @('Score', '100 × earned adjusted weight / maximum adjusted weight', 'Rounded to two decimals for eligible offers.', 'A null score means a hard eligibility gate failed; zero has a different meaning.')
        )

        $accessibilityRows = @(
            @('Area', 'Implemented evidence', 'Relevant criteria/principle', 'Final evidence still required'),
            @('Keyboard and focus', 'Skip link, logical order, visible focus, route focus, dialog trap/restore, Escape, and safe Left/Right focus navigation.', 'WCAG 2.1.1, 2.1.2, 2.4.3, 2.4.7; ISO controllability.', 'Complete every workflow with keyboard and record tester/browser evidence.'),
            @('Responsive reflow', 'Shared breakpoints, wrapping controls, table/card adaptation, mobile forms, and constrained dialogs.', 'WCAG 1.4.10 and 1.4.12.', 'Retest 320, 375, 768, 1024, 1440, landscape, text spacing, and native 200% zoom.'),
            @('Forms and errors', 'Persistent labels, required state, aria-invalid, linked errors, first-invalid focus, and recovery instructions.', 'WCAG 3.3.1–3.3.3 and ISO error tolerance.', 'Manual announcement and recovery checks with NVDA.'),
            @('Semantics', 'Headings, landmarks, named controls, tables/regions, tabs, dialog semantics, and alternative text.', 'WCAG 1.1.1, 1.3.1, 2.4.6, 4.1.2.', 'Verify reading order and meaningful names in rendered states.'),
            @('Status feedback', 'Polite success status, assertive errors, atomic notices, and focus after consequential actions.', 'WCAG 4.1.3 and ISO self-descriptiveness.', 'NVDA checks for AI, applications, verification, privacy, and administration.'),
            @('Visual presentation', 'Strengthened contrast, non-color status text, resizable layout, and reduced-motion behavior.', 'WCAG 1.4.3, 1.4.10; reduced motion advisory.', 'Post-remediation axe scans and manual visual checks.'),
            @('User control', 'Manual alternatives to AI/voice, editable transcripts, confirmation, cancel/close behavior, and clear state feedback.', 'ISO 9241-110 controllability, conformity, individualization, and learning.', 'Representative PwD usability sessions.')
        )

        $testRows = @(
            @('Verification suite', 'Recorded result', 'Scope', 'Interpretation'),
            @('API integration', '17/17 passed', 'Public catalogues, valid role sessions, representative reads, anonymous rejection, and wrong-role rejection.', 'Read-only local integration baseline.'),
            @('Browser E2E', '19/19 passed', 'Public routes, protected redirects, four dashboards, wrong-role redirect, validation focus, alert, and skip link.', 'Automated browser coverage; does not replace manual assistive-technology testing.'),
            @('Voice navigation', '49/49 passed', 'Registry boundaries, roles, actions, clarification, dynamic records, and safety behavior.', 'Deterministic boundary tests; real accent and microphone evaluation remains pending.'),
            @('Scoring engine', '11/11 passed', 'Feasibility, assistance, mandatory gate, missing assessment, multi-disability, education, and weighting.', 'Validates the mathematical policy, not real-world placement effectiveness.'),
            @('Frontend quality', 'Build and ESLint passed', 'Production bundle creation and static source checks.', 'Browser and deployment behavior still require runtime tests.'),
            @('Performance', 'Zero budget violations', 'API latency, page load/FCP, transfer size, resource timing, and gzip bundle size.', 'Development-machine baseline; concurrency and deployed-origin measurements remain pending.')
        )

        $documentationRows = @(
            @('Repository document', 'Subject incorporated in report', 'Report location', 'Treatment'),
            @('AI_PROFILE_WORKFLOW.md', 'Candidate journey, consent, validation, privacy boundaries, scoring invariant, and endpoints.', 'Appendix C', 'Written into the report; link retained only for source traceability.'),
            @('AUTHORIZATION_SECURITY.md', 'JWT model, server-confirmed frontend route protection, role boundaries, and regression audit.', 'Appendix B', 'Written into the report.'),
            @('CANDIDATE_VERIFICATION.md', 'Two-gate registration, verifier workflow, protected documents, audit, retention, and deployment.', 'Appendix B', 'Written into the report.'),
            @('PRIVACY_CONTROLS.md', 'Consent, minimization, private storage, export, withdrawal, erasure, and operational limits.', 'Appendix B', 'Written into the report.'),
            @('scoring-engine-technical-specification.md', 'Formula, gates, policy constants, ranking, data assumptions, determinism, tests, and limitations.', 'Appendix D', 'Core technical and mathematical content written into the report.'),
            @('voice-navigation-technical-specification.md', 'Architecture, command safety boundary, languages, lifecycle, actions, privacy, configuration, and testing.', 'Appendix C', 'Core technical content written into the report.'),
            @('frontend-revamp.md', 'Architecture evolution, candidate/employer/admin workflows, catalogue import, voice actions, and delivery history.', 'Main progress section and Appendices A–C', 'Consolidated by current feature rather than copying obsolete chronological notes.'),
            @('keyboard-navigation-test-plan.md', 'Acceptance criteria, workflow matrix, dialogs, screen-reader checks, and arrow-key boundaries.', 'Appendix E', 'Written into the report with pending manual evidence identified.'),
            @('wcag-audit/*.md', 'Baseline scope, responsive foundation, route reviews, management reviews, shared corrections, issue matrix, and final audit status.', 'Appendix E', 'Consolidated into an evidence and retest matrix; no unsupported conformance claim.'),
            @('OUTCOME_LOGGING_AND_ACCESSIBLE_NOTIFICATIONS.md', 'Outcome-event minimization, mail status, shared accessible notices, and manual retest.', 'Appendix F', 'Written into the report.'),
            @('INTEGRATION_E2E_PERFORMANCE.md', 'Executable suites, results, performance values, and limitations.', 'Appendix F', 'Written into the report and illustrated by Figure 12.'),
            @('project-setup-and-docker-guide.md', 'Architecture, prerequisites, setup, persistence, database access, updates, and troubleshooting.', 'Appendix A', 'Operational essentials written into the report.'),
            @('run-project-commands.md', 'Startup, shutdown, migrations, fixtures, tests, logs, inspection, and recovery commands.', 'Appendix A', 'Validated command set written into the report.'),
            @('Machine-readable JSON evidence', 'WCAG scenarios, integration, E2E, and performance measurements.', 'Appendices E–F', 'Results summarized; raw JSON remains attached to source control to preserve machine readability.')
        )

        $appendixNodes = @(
            (New-Paragraph $heading1Template 'Appendix A — System Architecture, Setup, and Operations'),
            (New-Paragraph $heading2Template 'A.1 Implemented Runtime Architecture'),
            (New-Paragraph $regularTemplate 'The prototype follows the selected layered modular architecture. React renders user experiences; Symfony is the authoritative API and security boundary; PostgreSQL stores confirmed records; Python services isolate deterministic scoring and AI/voice functions; and private files remain outside the web root. Docker Compose starts the backend stack consistently. The planned cache is deliberately documented as future work rather than shown as an already running component.'),
            (New-Paragraph $captionTemplate 'Table 4: Runtime services and local endpoints'),
            (New-Table $runtimeRows),
            (New-Paragraph $heading2Template 'A.2 Prerequisites and First-Time Setup'),
            (New-Paragraph $regularTemplate 'Required development software is Git, Docker Desktop with Docker Compose, Node.js with npm, and a recent browser. The repository should be cloned, the backend environment files should be prepared from their examples, and strong local values should be supplied for JWT, database, profile-AI, mail, and OpenAI configuration. Real secrets must never be committed or exposed through Vite variables.'),
            (New-Paragraph $regularTemplate 'Backend startup command: cd backend; docker compose up -d --build. First initialization then runs composer install, JWT key generation, Doctrine migrations, and—only for controlled development—fixtures. Fixture loading purges and recreates demonstration data; it must never be used against valuable or production records.'),
            (New-Paragraph $regularTemplate 'Frontend startup command: cd frontend; npm.cmd install when dependencies are absent, followed by npm.cmd run dev -- --host 0.0.0.0. The host option allows testing from another device on the same trusted local network. Frontend API and voice base addresses must use the development computer LAN address rather than 127.0.0.1 when a phone is the client.'),
            (New-Paragraph $heading2Template 'A.3 Daily Operation, Validation, and Troubleshooting'),
            (New-Paragraph $regularTemplate 'Daily startup uses docker compose up -d in backend and npm.cmd run dev in frontend. docker compose ps and service health endpoints confirm readiness. Logs are inspected with docker compose logs --tail 100 or docker compose logs -f followed by php, database, scoring-engine, or voice-navigation.'),
            (New-Paragraph $regularTemplate 'Database changes require a versioned Doctrine migration followed by docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction and doctrine:schema:validate. Backend source is bind-mounted, but container rebuild or recreation is required after Dockerfile, dependency, or environment changes. PostgreSQL data persists in a named volume unless docker compose down -v is deliberately executed.'),
            (New-Paragraph $regularTemplate 'The standard verification sequence includes Symfony configuration/schema checks, scoring unit tests, voice unit tests, frontend build and ESLint, API integration, browser E2E, performance budgets, the security route audit, and the documented WCAG browser/manual matrix. Common failures are diagnosed by checking the current directory, container state, port mapping, CORS origin, migrations, dependencies, fixture credentials, service health, and environment configuration in that order.'),

            (New-Paragraph $heading1Template 'Appendix B — Authentication, Candidate Verification, Security, and Privacy'),
            (New-Paragraph $heading2Template 'B.1 Authentication and Authorization Model'),
            (New-Paragraph $regularTemplate 'Public registration creates candidate or employer accounts only. Administrator and verifier authority is assigned internally. Symfony authenticates protected API calls before controllers run. Route groups require ROLE_CANDIDATE, ROLE_EMPLOYER, ROLE_VERIFIER, or ROLE_ADMIN as appropriate; administrators inherit verifier API oversight but do not enter the verifier frontend route. Public exceptions are limited to registration, login, email verification, password recovery, published jobs, public job definitions, documentation, and CORS preflight.'),
            (New-Paragraph $regularTemplate 'Frontend route protection does not trust decoded browser claims. Before a dashboard renders, the application calls the protected session endpoint and compares the server-confirmed role with the requested route. Validation repeats periodically and when focus returns to the browser. Tokens use sessionStorage rather than persistent localStorage and are never placed in protected document URLs.'),
            (New-Paragraph $heading2Template 'B.2 Candidate Eligibility Verification'),
            (New-Paragraph $regularTemplate 'Candidate access uses two independent gates: ownership of the registered email address and approval of an uploaded disability card by an authorized verifier. Candidate registration requires a PDF, JPEG, or PNG document up to 5 MB and explicit consent to verification processing. The two decisions may occur in either order, but a new candidate cannot sign in until both pass. Employer registration requires email verification but no disability document.'),
            (New-Paragraph $regularTemplate 'The verifier dashboard lists pending, approved, rejected, or all requests; presents email-verification status; opens or downloads the protected file through an authenticated request; records approval or rejection with reviewer identity, note, and timestamp; and requires a clear reason for rejection. Email notification failure does not roll back the saved decision and is reported separately.'),
            (New-Paragraph $heading2Template 'B.3 Private Storage, Consent, and Candidate Rights'),
            (New-Paragraph $regularTemplate 'Disability cards and optional application documents use cryptographically random stored names below backend/var/private. Server-detected MIME type—not filename extension—controls acceptance. Empty or oversized files are rejected. Authorized responses use private, no-store caching and X-Content-Type-Options: nosniff. Every card view or download records actor, action, request, and timestamp.'),
            (New-Paragraph $regularTemplate 'A verification decision schedules the source card for deletion after 30 days while retaining the status and audit record. The purge command must run at least daily. Candidate account deletion removes associated private card and application files before database records are removed.'),
            (New-Paragraph $regularTemplate 'The candidate Privacy & data dashboard explains stored categories and consent history and provides JSON export, withdrawal of future AI analysis consent, and password-confirmed account deletion. These controls support data minimization, purpose limitation, transparency, retention, access control, portability, consent withdrawal, and erasure; they do not independently prove compliance with every privacy law.'),
            (New-Paragraph $captionTemplate 'Table 5: Security and privacy control summary'),
            (New-Table $securityRows),
            (New-Paragraph $heading2Template 'B.4 Security Verification and Deployment Duties'),
            (New-Paragraph $regularTemplate 'The route regression audit checks anonymous calls, forged JWTs, cross-role attempts, valid-role access, and intentionally public catalogue endpoints. Every new protected endpoint must be placed under the correct prefix or explicit access rule and added to this audit. Production responsibilities still include HTTPS, secret rotation, rate limiting where appropriate, backup protection and erasure, monitoring, incident response, verifier governance, and jurisdiction-specific legal approval.'),

            (New-Paragraph $heading1Template 'Appendix C — AI-Assisted Profile Building and Voice Navigation'),
            (New-Paragraph $heading2Template 'C.1 Candidate Profile Assistant'),
            (New-Paragraph $regularTemplate 'The AI profile assistant is optional. The manual form remains fully usable if AI or speech services are unavailable. A candidate chooses English, French, or Arabic, types a narrative or records speech, edits the resulting transcript, reads the privacy notice, and explicitly consents before requesting suggestions. Audio is held in browser memory for transcription and discarded by this application.'),
            (New-Paragraph $regularTemplate 'The extraction service proposes structured personal information, education, active-catalogue disabilities, skills, preferences, assistance needs, and active task skills. Each item includes evidence and confidence where available. Every suggestion starts unselected; the candidate can edit, select, ignore, or reject it. Only selected values reach the confirmation endpoint, where Symfony revalidates field lengths and controlled-catalogue membership before persistence.'),
            (New-Paragraph $regularTemplate 'The assistant may suggest a disability only when it was stated explicitly and exactly matches the active catalogue. It does not diagnose or infer medical facts. Unmatched useful text is displayed for manual review and is not automatically stored. Audit events retain language, consent/outcome type, character count, and item counts—not audio, transcript, or narrative content.'),
            (New-Paragraph $regularTemplate 'Confirmed task skills enrich the profile but are not sent to the scoring engine. This invariant protects the approved mathematical input contract. Introducing AI-derived fields into scoring would require a separately versioned, reviewed, migrated, and regression-tested policy.'),
            (New-Paragraph $heading2Template 'C.2 Voice-Navigation Safety Architecture'),
            (New-Paragraph $regularTemplate 'Voice navigation follows the principle: flexible understanding, restricted choices, deterministic execution. Speech transcription and language interpretation may be probabilistic, but model output is schema constrained and must pass a trusted registry. The model cannot generate routes, selectors, JavaScript, arbitrary clicks, or unregistered operations. React executes only a fixed authorized action returned by the registry.'),
            (New-Paragraph $regularTemplate 'The voice lifecycle covers off, permission request, listening, processing, speaking, paused, and error states. A bounded utterance is recorded, silence ends the turn, the selected language and current page context are supplied, and no more than six structured history turns are retained in browser memory. The registry returns authorized, clarification, or rejected. Clarification choices are revalidated, bare unanchored confirmation is rejected, and disabling voice clears history and releases microphone resources.'),
            (New-Paragraph $regularTemplate 'Registered actions include trusted route navigation, browser back, bounded scrolling, page-section reading, internal dashboard views, authentication-form fields and confirmation-gated submission, candidate profile and matching actions, employer/administrator operations, dynamic records already loaded by the application, and grounded questions about bounded readable content on the current page. Voice is always optional and every function retains a keyboard/mouse equivalent.'),
            (New-Paragraph $heading2Template 'C.3 Language, Privacy, Configuration, and Limitations'),
            (New-Paragraph $regularTemplate 'The profile assistant exposes English, French, and Arabic. The voice-navigation command subsystem currently provides explicit English and Arabic selection; French command coverage is a remaining requirement even though French profile transcription is available. Formal accuracy evaluation is still required for French, Arabic, Lebanese Arabic, accents, code-switching, noise, and representative speech patterns.'),
            (New-Paragraph $regularTemplate 'Audio and transcript content are sent to the configured OpenAI services when the user activates the relevant function. API keys remain server-side and are excluded from Git and Docker build context. CORS, file sizes, transcript lengths, feedback lengths, history size, and schema fields are bounded. Website-question support may send bounded readable page content but does not collect input values; authenticated rendered text may nevertheless contain personal data and therefore requires a clear production privacy notice.'),
            (New-Paragraph $regularTemplate 'The principal internal endpoints are POST /api/profile/transcribe, POST /api/profile/extract, POST /api/voice/process, POST /api/voice/interpret, and POST /api/voice/speech. Symfony exposes authenticated POST /api/candidate/profile/ai-suggestions and /api/candidate/profile/ai-confirm. The internal extraction endpoint requires the shared PROFILE_AI_TOKEN.'),

            (New-Paragraph $heading1Template 'Appendix D — Deterministic Scoring Engine and Catalogue Policy'),
            (New-Paragraph $heading2Template 'D.1 Authoritative Data Flow'),
            (New-Paragraph $regularTemplate 'React requests matches but never calculates the official score. Symfony authenticates the candidate, loads authoritative PostgreSQL profile and offer data, constructs the scoring payload, and calls the Python service. Python validates the domain objects, applies eligibility and mathematical rules, returns explanations and ranking, and Symfony adds presentation metadata before React renders the result.'),
            (New-Paragraph $heading2Template 'D.2 Mathematical Model'),
            (New-Paragraph $regularTemplate 'For task i, let w_i be its positive base weight, h_i its highlighted multiplier, a_i = w_i × h_i its adjusted weight, f_i its effective feasibility factor, and p_i = a_i × f_i its earned points. For an eligible offer, P_max = Σa_i, P_earned = Σp_i, and Score = round(100 × P_earned / P_max, 2). Valid jobs contain at least one positive-weight task, so division by zero is excluded by domain validation.'),
            (New-Paragraph $captionTemplate 'Table 6: Deterministic scoring policy'),
            (New-Table $scoringRows),
            (New-Paragraph $heading2Template 'D.3 Eligibility, Ranking, and Interpretation'),
            (New-Paragraph $regularTemplate 'Education and mandatory-task rules are hard gates. If a gate fails, eligible is false and score is null; null must not be confused with an eligible score of zero. For multiple confirmed disabilities, the most restrictive assessment for each task wins. Assistance can transform needs-assistance into the 0.75 factor but never overrides explicit avoid.'),
            (New-Paragraph $regularTemplate 'Eligible offers are sorted by descending score, followed by title for ties; excluded offers follow eligible ones. Highest-ranked is relative to the returned pool and does not mean strongly compatible. Presentation bands are strong 80–100, moderate 60–below 80, limited 40–below 60, and low below 40. These labels do not alter the formula or authorization to apply.'),
            (New-Paragraph $heading2Template 'D.4 Catalogue Baseline and Missing Assessments'),
            (New-Paragraph $regularTemplate 'The validated catalogue is derived from the three supplied HoReCa workbooks: Chocolate/Confectionery Worker, Ice Cream Maker, and Bakery/Pastry Worker. It currently contains 362 tasks, 16 disability categories, and 5,477 recorded assessments. Only checked feasibility cells are recorded as assessments. Unchecked headings, duplicates, layout rows, and unassessed structural cells are ignored.'),
            (New-Paragraph $regularTemplate 'At runtime, absence of an assessment is treated as no recorded restriction, using the documented feasible fallback and returning an assumed-from-missing-data flag in the explanation. This policy follows the supplied source interpretation and prevents unchecked structural cells from being converted into invented negative evidence. Future stakeholder review may revise the policy through a versioned change, but the current mathematical approach is intentionally preserved.'),
            (New-Paragraph $heading2Template 'D.5 Determinism, Testing, and Future Calibration'),
            (New-Paragraph $regularTemplate 'The score depends only on candidate education and confirmed disabilities; job education, assistance, tasks, weights, mandatory/highlighted status; assessment data; and central policy constants. There is no randomness, training, timestamp input, external web data, or browser-side official calculation. Company description, location, deadline, and prose cannot alter the score.'),
            (New-Paragraph $regularTemplate 'The eleven unit tests cover all-feasible scoring, assistance on/off behavior, explicit and mandatory avoid, optional avoid, missing-assessment fallback, multiple disabilities, education exclusion, and highlighted weighting. Future calibration must use expert-reviewed candidate/job examples and expected outcomes rather than cosmetically changing percentages. Any learned model would be a separately approved future system supported by sufficient consented outcome data.'),

            (New-Paragraph $heading1Template 'Appendix E — Responsive Design, Keyboard Access, and WCAG Evidence'),
            (New-Paragraph $heading2Template 'E.1 Audit Scope and Implemented Corrections'),
            (New-Paragraph $regularTemplate 'The accessibility scope includes Welcome, Employers, Privacy, Voice Help, Sign Up, Sign In, password recovery/reset, candidate setup and dashboard states, AI profile review, jobs and applications, privacy controls, employer workflows, verifier review, administrator management, file controls, dialogs, filters, tabs, notifications, and shared navigation. Responsive checks target 320, 375, 768, 1024, and 1440 CSS pixels, landscape orientation, text spacing, and 200% zoom.'),
            (New-Paragraph $regularTemplate 'Implemented corrections standardize containers, spacing, typography, controls, breakpoints, wrapping, table/card behavior, and dialog sizing. Shared accessibility work covers alternative text, headings and landmarks, accessible names/descriptions, focus visibility, focus management, error identification, live status announcements, contrast, reduced motion, semantic HTML, and valid ARIA. Candidate, employer, verifier, and administrator management operations remain keyboard reachable.'),
            (New-Paragraph $captionTemplate 'Table 7: Accessibility verification coverage'),
            (New-Table $accessibilityRows),
            (New-Paragraph $heading2Template 'E.2 Keyboard Acceptance Plan'),
            (New-Paragraph $regularTemplate 'Every user-facing workflow must be completable without mouse, touch, or voice. The first Tab exposes Skip to main content; focus follows reading order and remains visible; route changes focus the main region; Enter and Space activate controls; Escape closes dismissible overlays; and dialogs trap focus and restore it to their trigger. Tab and Shift+Tab retain their standard sequence.'),
            (New-Paragraph $regularTemplate 'The requested Right Arrow and Left Arrow navigation moves to the next or previous ordinary focusable control only when native behavior is not overridden. Text inputs and textareas keep caret movement until the relevant boundary. Selects, radio groups, sliders, date/time fields, editable content, media controls, and composite widgets retain their native arrow semantics. Within a dialog, focus navigation cannot leave the dialog.'),
            (New-Paragraph $heading2Template 'E.3 ISO 9241-110 Interaction Principles'),
            (New-Paragraph $regularTemplate 'Suitability for the task is supported by role-specific dashboards and direct workflows. Self-descriptiveness is supported by labels, instructions, statuses, and explanations. Controllability is supported by manual alternatives, editable AI output, cancel/close behavior, and user-paced navigation. Conformity with expectations is supported by consistent controls and standard keyboard conventions. Error tolerance is supported by linked validation, focused recovery, confirmation, and non-destructive failure handling. Individualization is supported by text, keyboard, mouse, and optional voice modes with language choice and reduced motion. Suitability for learning is supported by Voice Help, clear commands, feedback, and predictable navigation.'),
            (New-Paragraph $heading2Template 'E.4 Conformance Boundary'),
            (New-Paragraph $regularTemplate 'The report does not claim complete WCAG 2.1 Level AA conformance. Source remediation, build, lint, historical baseline scans, responsive screenshots, and automated E2E evidence are substantial but insufficient. A new live axe scan, native browser 200% zoom, manual text-spacing/reflow inspection, representative authenticated workflows, and NVDA with Edge must be recorded after remediation before a conformance decision.'),

            (New-Paragraph $heading1Template 'Appendix F — Outcome Logging, Accessible Notifications, Testing, and Performance'),
            (New-Paragraph $heading2Template 'F.1 Outcome and Notification Data'),
            (New-Paragraph $regularTemplate 'Application submission and employer status changes create chronological outcome events containing application and actor identifiers, previous/new status, mail-delivery result, and timestamp. Events exclude documents, filenames, disability information, profile narrative, reviewer notes, passwords, and email bodies. Repeating an unchanged status must not create a duplicate outcome or email.'),
            (New-Paragraph $regularTemplate 'Employer transitions to pending, in review, accepted, or rejected trigger a plain-text candidate email when mail is configured. Mail failure never rolls back the saved business decision; sent or failed is recorded and returned. Verifier approval/rejection actions are also audited. Candidate, employer, verifier, and administrator feedback uses the shared AccessibleNotice: errors are assertive alerts, success is a polite status, both are atomic, and focus may move to the outcome after an action.'),
            (New-Paragraph $heading2Template 'F.2 Recorded Automated Verification'),
            (New-Paragraph $captionTemplate 'Table 8: Recorded automated verification results'),
            (New-Table $testRows),
            (New-Paragraph $heading2Template 'F.3 Performance Measurements'),
            (New-Paragraph $regularTemplate 'Recorded local p95 API values were 205.1 ms for public jobs, 163.2 ms for public job definitions, 86.7 ms for candidate session, and 244.8 ms for candidate profile. Recorded page load/FCP values were 102.6/448 ms for Welcome, 95.3/184 ms for Sign In, and 103/552 ms for Candidate. JavaScript and CSS gzip sizes were 130,428 and 13,579 bytes.'),
            (New-Paragraph $regularTemplate 'The first performance run identified a synchronous external Google Fonts request capable of delaying rendering by approximately 6.2 seconds. The dependency was removed and system font fallbacks were used, after which repeated production-build measurements passed all budgets. These measurements are a regression baseline on the development computer—not evidence of production availability, 100 concurrent users, mobile hardware performance, or external-network behavior.'),
            (New-Paragraph $heading2Template 'F.4 Required Manual and Deployment Retests'),
            (New-Paragraph $regularTemplate 'Manual retesting must confirm mail delivery/failure behavior, NVDA announcements, duplicate-outcome prevention, verifier decision audits, keyboard completion, dialog focus, AI suggestion review, privacy operations, mobile reflow, and native zoom. Deployment retesting must repeat integration, E2E, security, accessibility, and performance suites on the deployed origin and add concurrency, monitoring, backups, purge scheduling, and incident-response evidence.'),

            (New-Paragraph $heading1Template 'Appendix G — Documentation and Evidence Traceability'),
            (New-Paragraph $regularTemplate 'Table 9 demonstrates how the repository documentation has been incorporated into the Word report. The report contains the engineering content needed to understand the solution without opening GitHub. Repository links remain useful for verifying exact source code, commands, historical decisions, and machine-readable evidence; they are not substitutes for the written documentation.'),
            (New-Paragraph $captionTemplate 'Table 9: Repository documentation incorporated into this report'),
            (New-Table $documentationRows),
            (New-Paragraph $regularTemplate 'Machine-generated JSON is intentionally summarized rather than printed line by line because raw output is not readable report prose. The original JSON files remain versioned evidence that can be rerun and compared. Chronological frontend notes are likewise consolidated into the current architecture and behavior so obsolete intermediate decisions are not presented as the final system.'),
            (New-LinkParagraph $regularTemplate 'Complete repository documentation: ' 'docs directory on branch zm' 'https://github.com/Zaidan02/inclusive-web-platform/tree/zm/docs'),
            (New-LinkParagraph $regularTemplate 'Current implementation source: ' 'inclusive-web-platform branch zm' 'https://github.com/Zaidan02/inclusive-web-platform/tree/zm')
        )

        foreach ($appendixNode in $appendixNodes) { [void] $body.InsertBefore($appendixNode, $sectionProperties) }

        # Ask Word to refresh the contents and figure/table fields on open.
        $settingsXml = Read-ZipEntryXml $zip 'word/settings.xml'
        $settingsNs = [System.Xml.XmlNamespaceManager]::new($settingsXml.NameTable)
        $settingsNs.AddNamespace('w', $wNs)
        $updateFields = $settingsXml.SelectSingleNode('//w:updateFields', $settingsNs)
        if (-not $updateFields) {
            $updateFields = $settingsXml.CreateElement('w', 'updateFields', $wNs)
            [void] $settingsXml.DocumentElement.AppendChild($updateFields)
        }
        [void] $updateFields.SetAttribute('val', $wNs, 'true')

        Write-ZipEntryXml $zip 'word/document.xml' $documentXml
        Write-ZipEntryXml $zip 'word/settings.xml' $settingsXml
    } finally {
        $zip.Dispose()
    }
} finally {
    $fileStream.Dispose()
}

Write-Output "Revised progress report created: $OutputPath"
