param(
    [string] $InputPath = 'artifacts\FYP_CCE_progress_report_Zaidan_Charbel_ENHANCED.docx',
    [string] $OutputPath = 'artifacts\FYP_CCE_FINAL_REPORT_DRAFT_Zaidan_Mansour_Charbel_Rizk.docx'
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

function Find-Paragraph {
    param($Document, [string] $Text, [switch] $StartsWith)
    foreach ($paragraph in $Document.Paragraphs) {
        $current = Paragraph-Text $paragraph
        if (($StartsWith -and $current.StartsWith($Text)) -or (-not $StartsWith -and $current -eq $Text)) {
            return $paragraph
        }
    }
    throw "Paragraph not found: $Text"
}

function Set-ParagraphText {
    param($Paragraph, [string] $Text)
    $range = $Paragraph.Range.Duplicate
    if ($range.End -gt $range.Start) { $range.End-- }
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

function Add-PageBreakAt {
    param($Document, [ref] $Position)
    $range = $Document.Range([int] $Position.Value, [int] $Position.Value)
    $range.InsertBreak(7)
    $Position.Value = $range.End
}

function Replace-AllText {
    param($Document, [string] $Old, [string] $New)
    $range = $Document.Content.Duplicate
    $find = $range.Find
    $find.ClearFormatting()
    $find.Replacement.ClearFormatting()
    $find.Text = $Old
    $find.Replacement.Text = $New
    $find.Forward = $true
    $find.Wrap = 1
    $find.Format = $false
    [void] $find.Execute($Old, $false, $false, $false, $false, $false, $true, 1, $false, $New, 2)
}

function Set-CellText {
    param($Cell, [string] $Text)
    $range = $Cell.Range.Duplicate
    if ($range.End -gt $range.Start) { $range.End-- }
    $range.Text = $Text
}

function Set-TableRowByLabel {
    param($Document, [string] $Label, [string[]] $Values)
    $paragraph = Find-Paragraph $Document $Label
    if ($paragraph.Range.Tables.Count -lt 1 -or $paragraph.Range.Cells.Count -lt 1) {
        throw "Table row not found for label: $Label"
    }
    $table = $paragraph.Range.Tables.Item(1)
    $rowIndex = $paragraph.Range.Cells.Item(1).RowIndex
    for ($column = 1; $column -le $Values.Count; $column++) {
        Set-CellText $table.Cell($rowIndex, $column) $Values[$column - 1]
    }
}

$source = (Resolve-Path -LiteralPath $InputPath).Path
$outputDirectory = Split-Path -Parent $OutputPath
if ($outputDirectory -and -not (Test-Path -LiteralPath $outputDirectory)) {
    [void] (New-Item -ItemType Directory -Path $outputDirectory -Force)
}
$output = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
Copy-OpenFile $source $output
$pdf = [System.IO.Path]::ChangeExtension($output, '.pdf')

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$document = $null

try {
    $document = $word.Documents.Open($output, $false, $false)
    $normal = $document.Styles.Item('Normal')
    $heading1 = $document.Styles.Item('Heading 1')
    $heading2 = $document.Styles.Item('Heading 2')
    $heading3 = $document.Styles.Item('Heading 3')

    # Final-report identity and front matter.
    Set-StartingParagraph $document 'Final Year Project Progress Report' 'Final Year Project Report'
    Set-StartingParagraph $document '10-08-2026' 'September 2026'

    $contents = Find-Paragraph $document 'Contents'
    $frontPosition = $contents.Range.Start
    [void] (Add-ParagraphAt $document ([ref] $frontPosition) 'Abstract' $heading1)
    [void] (Add-ParagraphAt $document ([ref] $frontPosition) 'Persons with disabilities continue to face digital and organizational barriers in recruitment, even when employment initiatives are designed to promote inclusion. This project extends the JoIn Hospitality Phase I prototype into a multilingual, accessible, and human-controlled platform for hospitality employment and training. The implemented system combines a React/Vite interface, a Symfony security and business-workflow boundary, PostgreSQL persistence, a deterministic Python compatibility service, and a separate voice/profile-assistance service. Candidates can use manual entry or editable speech transcription in English, French, or Arabic; explicit consent is required before profile text is processed, and no AI suggestion is saved without candidate confirmation. Employers publish controlled hospitality positions or training programs, configure practical and educational requirements, identify important catalogue tasks, and record available assistance. Matching remains deterministic and explainable rather than using an opaque learned model.' $normal)
    [void] (Add-ParagraphAt $document ([ref] $frontPosition) 'Verification combines unit, integration, browser, internationalization, accessibility, performance, deployment, and human-evaluation evidence. The current evidence includes 17/17 deterministic-scoring tests, 52/52 voice/action-safety tests, 25/25 API integration checks, 26/26 browser end-to-end checks, a passing production build, a three-locale/seven-namespace translation contract, and 104 automated WCAG route-scenario scans with no recorded axe findings, overflow, console errors, or failed requests. A free cloud staging environment was deployed through Render and Supabase. Its 8 September snapshot exposed 15 active job descriptions, 923 catalogue tasks, 14,453 disability-task assessments, and 74 published opportunities. An initial on-site accessibility session at Arc en Ciel included a real candidate and a blind JAWS user; its protocol and detailed results remain to be completed in this draft. The report therefore presents strong prototype evidence while avoiding unsupported claims of full WCAG conformance, production availability, or real-world matching effectiveness.' $normal)
    [void] (Add-ParagraphAt $document ([ref] $frontPosition) 'Keywords: accessible recruitment; persons with disabilities; hospitality; WCAG 2.1; screen reader; voice navigation; human-in-the-loop AI; deterministic matching; multilingual interface; cloud staging.' $normal)
    Add-PageBreakAt $document ([ref] $frontPosition)

    # Replace progress language and stale implementation facts.
    Set-StartingParagraph $document 'Progress update (10 August 2026):' 'Final implementation update (8 September 2026): Phase II has delivered the principal candidate, employer, verifier, and administrator workflows; English/French/Arabic interfaces; candidate-controlled AI profile assistance; bounded voice navigation; deterministic explainable matching; hospitality work and training preferences; controlled employer requirements; private document storage; cloud staging deployment; and repeatable automated evidence. The remaining work is evaluation-oriented: complete and document representative-user sessions, repeat tests across additional devices and networks, analyse the collected usability data, resolve any observed defects, and finalize the report and presentation. A cache remains intentionally deferred because measured local performance is within budget and no deployed bottleneck has yet justified its complexity.'
    Set-StartingParagraph $document 'For this reason, Phase II will expand the dataset by adding ten additional job descriptions' 'Phase II completed the planned catalogue expansion by importing twelve additional hospitality job descriptions, increasing coverage from three to fifteen active roles. The new datasets use the same ordered-task, disability-assessment, source-reference, and validation model as the original three. This expansion improves practical coverage while remaining subject to final domain-stakeholder review of the added descriptions, translations, and assessments.'
    Set-StartingParagraph $document 'The machine learning matching model is also affected by this expansion.' 'Phase II did not retrain or deploy a machine-learning matching model. The project selected deterministic weighted rules because no sufficiently large, representative, consented outcome dataset was available for responsible supervised learning. Catalogue expansion therefore increases the opportunities evaluated by the same explainable policy; a learned model remains a future research option only after outcome data, bias analysis, versioning, and stakeholder approval are available.'
    Set-StartingParagraph $document 'The Phase II solution combines the strengths of these approaches while making implementation status explicit.' 'The Phase II solution combines these strengths while making implementation status explicit. It preserves deterministic task-level scoring, implements a controlled and traceable catalogue-import process, expands the active catalogue from three to fifteen job descriptions, adds accessible multimodal interaction, uses AI only as an assistive profile-building layer, and requires human confirmation before suggested profile data is stored.'
    Set-StartingParagraph $document 'The first data contribution is a controlled catalogue-import pipeline' 'The first data contribution is a controlled catalogue-import pipeline and a documented missing-assessment policy. The active staging catalogue contains fifteen hospitality datasets, 923 normalized tasks, 16 disability categories, and 14,453 recorded assessments. The twelve added datasets use the same schema and traceability rules as the original three; final domain-stakeholder validation remains required and is distinguished from technical import completion.'
    Set-StartingParagraph $document 'The system shall extend the existing job-description dataset from three HoReCa job roles to thirteen job roles' 'The system shall extend the existing job-description dataset from three HoReCa roles to fifteen roles by importing twelve additional structured descriptions through the controlled validation pipeline. Status: implemented technically; domain-stakeholder validation remains required.'
    Set-StartingParagraph $document 'The system architecture shall support future expansion beyond thirteen job roles' 'The system architecture shall support future expansion beyond fifteen job roles without requiring a complete redesign.'
    Set-StartingParagraph $document 'Every imported job dataset shall follow the controlled catalogue schema.' 'Every imported job dataset shall follow the controlled catalogue schema. The current staging baseline contains fifteen active descriptions, 923 tasks, 16 disability categories, and 14,453 recorded task/disability assessments. Imports preserve source references and are rejected when validation fails; technical import does not replace domain-stakeholder approval.'
    Set-StartingParagraph $document 'Implementation Progress and Verification' 'Implementation and Evaluation'
    Set-StartingParagraph $document 'This progress report records the implemented Phase II baseline' 'This final-report draft records the implemented Phase II platform and verified evidence as of 8 September 2026. The work has progressed from a local prototype to an integrated and publicly reachable staging system. Each quantitative claim is linked to executable tests, machine-readable results, a deployed endpoint, or a clearly identified human-evaluation record; results that have not yet been supplied are marked as pending rather than inferred.'
    Set-StartingParagraph $document 'Implemented System Baseline' 'Implemented System'
    Set-StartingParagraph $document 'The platform uses a React/Vite frontend' 'The platform uses a React/Vite frontend, a Symfony API, PostgreSQL persistence, a deterministic Python scoring service, and a separate AI/voice service. Docker Compose provides the reproducible local environment, while the staging deployment separates the static frontend, API, voice service, scoring service, managed database, and object storage. Dedicated candidate, employer, verifier, and administrator experiences are protected by server-validated role authorization.'
    Set-StartingParagraph $document 'Candidate registration now has two independent eligibility gates' 'Candidate registration has two independent eligibility gates: email ownership verification and authorized review of a mandatory disability card. Candidates can build and edit their profile, choose work, hospitality training, or both, select translated position interests, calculate explainable matches, and submit applications. Employers can publish work or training opportunities, load controlled catalogue tasks, configure education and practical abilities, highlight important tasks, and record assistance. Verifiers and administrators retain separate review and management boundaries.'

    Set-StartingParagraph $document 'The current controlled catalogue contains three supplied job definitions' 'The controlled catalogue now contains 15 active hospitality job descriptions: the three original definitions plus twelve imported additions. The staging snapshot contains 923 ordered catalogue tasks, 16 disability categories, and 14,453 recorded disability-task assessments. Import validation preserves task order and source traceability, rejects unsupported feasibility values, and prevents duplicate or malformed definitions from silently changing the active catalogue.'
    Set-StartingParagraph $document 'The mathematical scoring engine was intentionally preserved' 'The deterministic mathematical scoring policy was intentionally preserved and extended with explicit practical-ability and education rules. Matching uses confirmed candidate data, the selected work/training and position preferences, published opportunity requirements, task weights, mandatory/highlighted status, feasibility assessments, and offered assistance. AI suggestions remain advisory and cannot silently modify the official scoring contract.'

    Set-StartingParagraph $document 'The repeatable verification suite passed 17 of 17 API integration checks' 'The repeatable verification suite passed 25 of 25 API integration checks and 26 of 26 browser end-to-end checks. The current deterministic scoring suite passed 17 of 17 tests and the voice-navigation/action-safety suite passed 52 of 52 tests. The production frontend build completed successfully, and the internationalization contract passed for three locales across seven namespaces.'
    Set-StartingParagraph $document 'Local production-build performance measurements passed all configured budgets' 'The 4 September 2026 local production-build performance run passed every configured budget with zero violations. Recorded p95 API latency was 358.5 ms for public jobs, 144.0 ms for job definitions, 217.8 ms for the candidate session, and 132.3 ms for the candidate profile. Recorded page load/FCP p95 values were 56.5/168 ms for Welcome, 67.9/104 ms for Sign In, and 48.3/84 ms for Candidate. The largest recorded JavaScript and CSS assets were 150,516 and 6,050 gzip bytes. These values are regression evidence from the development computer, not a production-capacity claim.'

    # Current automated evidence appears in several existing tables and appendices.
    Replace-AllText $document '17/17 passed' '25/25 passed'
    Replace-AllText $document '19/19 passed' '26/26 passed'
    Replace-AllText $document '49/49' '52/52'
    Replace-AllText $document '11/11' '17/17'
    Replace-AllText $document 'branch zm' 'branch staging-deployment'
    Replace-AllText $document 'Symfony JWT plus server-confirmed role session' 'Symfony JWT plus server-confirmed role session'
    Replace-AllText $document 'Fits the SPA/API baseline and explicit RBAC; deployment still needs expiry, revocation strategy, HTTPS, and monitoring.' 'Fits the SPA/API baseline and explicit RBAC; staging now uses HTTPS and secret-managed JWT keys, while expiry/revocation governance and production monitoring remain required.'
    Replace-AllText $document 'Private Symfony storage for prototype' 'Private Symfony storage locally and Supabase object storage in staging'
    Replace-AllText $document 'Enforces authenticated access and deletion; deployed scale may justify encrypted object storage.' 'Enforces authenticated access and deletion; staging uses purpose-specific Supabase buckets, while production encryption, backup, and erasure governance remain required.'

    # Insert final deployment and human-evaluation sections before traceability.
    $traceability = Find-Paragraph $document 'Requirements Traceability'
    $position = $traceability.Range.Start
    [void] (Add-ParagraphAt $document ([ref] $position) 'Evaluation Strategy' $heading2)
    [void] (Add-ParagraphAt $document ([ref] $position) 'Evaluation uses triangulation rather than a single pass/fail result. Unit tests verify mathematical and voice-authorization rules; integration tests verify REST contracts and role isolation; browser E2E checks exercise public and authenticated journeys; the internationalization contract detects missing or inconsistent translation keys; the WCAG matrix combines axe, reflow, console, request, and keyboard evidence; performance measurements enforce explicit budgets; staging checks verify configuration and service boundaries; and representative-user sessions reveal usability barriers that automation cannot detect.' $normal)
    [void] (Add-ParagraphAt $document ([ref] $position) 'Automated Accessibility Result' $heading3)
    [void] (Add-ParagraphAt $document ([ref] $position) 'The 4 September WCAG evidence matrix executed 104 route-scenario combinations across 13 public and authenticated routes and eight viewport or text scenarios. It recorded zero scan errors, axe-rule findings, horizontal-overflow scenarios, console-error entries, and failed-request entries. This is strong regression evidence, but it does not establish complete WCAG 2.1 Level AA conformance because automation cannot judge reading quality, announcement clarity, meaningful labels, cognitive effort, or successful use with assistive technology.' $normal)

    [void] (Add-ParagraphAt $document ([ref] $position) 'Cloud Staging Deployment and Operational Validation' $heading2)
    [void] (Add-ParagraphAt $document ([ref] $position) 'The deployment objective was to prove that the complete platform could operate outside the development computer through a public HTTPS address and support evaluation from different devices and networks. A dedicated staging-deployment branch isolates cloud configuration from active feature development. The root render.yaml Blueprint defines one static frontend and three Docker web services: Symfony API, deterministic scoring, and voice/profile assistance. Dynamic services run in Frankfurt, the frontend is distributed through Render global static hosting, and Supabase in Frankfurt provides PostgreSQL persistence and object storage.' $normal)
    [void] (Add-ParagraphAt $document ([ref] $position) 'Deployment Phases' $heading3)
    [void] (Add-ParagraphAt $document ([ref] $position) '1. Environment isolation and infrastructure definition. A staging-specific Git branch and declarative Blueprint were created. Service paths, Dockerfiles, health endpoints, regions, free plans, frontend rewrites, CORS rules, and security headers are version controlled.' $normal)
    [void] (Add-ParagraphAt $document ([ref] $position) '2. Managed data services. A Supabase project was created in Central EU (Frankfurt). PostgreSQL is accessed only by the backend through an SSL-enabled pooler connection. Storage uses private candidate-verification and application-document buckets plus a public employer-logo bucket; server-side MIME and size validation remains authoritative.' $normal)
    [void] (Add-ParagraphAt $document ([ref] $position) '3. Secret and identity configuration. Database credentials, OpenAI access, Supabase server access, JWT keys and passphrase, the demonstration-account password, and independently generated scoring/profile service tokens were supplied through Render environment secrets. No secret value is stored in the Blueprint, frontend bundle, screenshots, or report.' $normal)
    [void] (Add-ParagraphAt $document ([ref] $position) '4. Container hardening and service wiring. The backend image installs the catalogue-import runtime, generates JWT files from Base64 secrets, assigns the private key to the web-server group with restricted permissions, runs migrations, and starts the production server. Explicit service URLs and shared tokens constrain Symfony-to-Python calls, while the browser receives only public base URLs.' $normal)
    [void] (Add-ParagraphAt $document ([ref] $position) '5. Data migration. The local PostgreSQL schema and demonstration records were exported, restored into Supabase, and checked through aggregate SQL and public/application endpoints. The verified staging catalogue contains 15 active datasets, 923 tasks, and 14,453 assessments. The public snapshot on 8 September contained three registered candidate accounts and 74 published work or training opportunities.' $normal)
    [void] (Add-ParagraphAt $document ([ref] $position) '6. Functional validation. Health endpoints for the API, scoring, and voice services were checked; candidate, employer, verifier, and administrator demonstration accounts authenticated successfully; public catalogues loaded; candidate matches returned successfully after service warm-up; and the frontend communicated with all backend services through HTTPS.' $normal)
    [void] (Add-ParagraphAt $document ([ref] $position) 'Observed Deployment Failures and Corrections' $heading3)
    [void] (Add-ParagraphAt $document ([ref] $position) 'The initial API deployment failed because the Supabase database password saved in Render did not match the newly generated project password. Replacing the DATABASE_URL with the confirmed pooler URI resolved PostgreSQL authentication. A second backend issue concerned generated JWT-key ownership: the runtime user could not read the private key. The entrypoint was corrected to assign the key to the web-server group and apply mode 640 to the private key. These failures and corrections are retained as deployment evidence because they demonstrate diagnosis at the database, container, and operating-system permission boundaries.' $normal)
    [void] (Add-ParagraphAt $document ([ref] $position) 'Operational Result and Limitation' $heading3)
    [void] (Add-ParagraphAt $document ([ref] $position) 'All four Render resources were deployed successfully and the Supabase-backed application became publicly reachable over HTTPS. The environment is suitable for demonstration and cross-device evaluation, but it is not production infrastructure. Free Render web services sleep after inactivity; an observed first matching request returned HTTP 503 while the scoring service was waking, whereas the same authenticated request returned HTTP 200 after warm-up. The demonstration procedure therefore warms health endpoints before use. Email transport is disabled, free-tier quotas apply, no availability or concurrency service level is claimed, and cache introduction remains conditional on measured need.' $normal)

    [void] (Add-ParagraphAt $document ([ref] $position) 'Human-Centred Accessibility Evaluation' $heading2)
    [void] (Add-ParagraphAt $document ([ref] $position) 'An initial on-site evaluation was conducted at Arc en Ciel during the finalization phase. The reported session included interaction by a real candidate and an accessibility review with a blind participant who uses JAWS. This is important evidence because it tests the platform through lived interaction rather than only source inspection or browser automation. To avoid inventing results, the detailed participant profile, consent procedure, device and browser, JAWS version, assigned tasks, observed barriers, comments, completion outcomes, and resulting corrections remain marked for completion when the field notes are supplied.' $normal)
    $pending = Add-ParagraphAt $document ([ref] $position) '[FIELD EVIDENCE TO COMPLETE] Record: session date and location; anonymized participant code and relevant access needs; informed-consent procedure; hardware, browser, JAWS version and settings; language; ordered task script; success/assistance/failure for each task; completion time; errors and recovery; participant comments; observer notes; severity and defect identifier; correction; and retest result.' $normal
    $pending.Range.HighlightColorIndex = 7
    [void] (Add-ParagraphAt $document ([ref] $position) 'Planned Quantitative Analysis' $heading3)
    [void] (Add-ParagraphAt $document ([ref] $position) 'Each future session will use the same task definitions and evidence sheet. Primary measures are task-completion rate, independent-completion rate, assistance rate, error count, recovery count, completion time, and post-task ease rating. Secondary measures are issue count by severity, successful screen-reader announcements, navigation efficiency, transcription corrections, and participant satisfaction. Results will be reported by participant group and interaction mode so that a strong result from mouse users cannot hide a barrier for keyboard, voice, or screen-reader users.' $normal)
    [void] (Add-ParagraphAt $document ([ref] $position) 'For completion rates, the report will show the numerator and denominator together with the percentage. Time and error distributions will use median and interquartile range when the sample is small or skewed; mean and standard deviation may be added when appropriate. Before/after repeated measurements may use a paired non-parametric comparison such as Wilcoxon signed-rank only when the sample and protocol justify inference. Otherwise, the analysis will remain descriptive. Missing observations, assistance, abandoned tasks, and test-environment failures will be reported explicitly rather than removed.' $normal)
    $pending2 = Add-ParagraphAt $document ([ref] $position) '[STATISTICAL RESULTS TO COMPLETE] Insert the final sample size, participant-group counts, task-level raw observations, formulas, descriptive tables, graphs, confidence intervals where defensible, identified defects, implemented corrections, and post-correction retest results.' $normal
    $pending2.Range.HighlightColorIndex = 7
    [void] (Add-ParagraphAt $document ([ref] $position) 'Interpretation Boundary' $heading3)
    [void] (Add-ParagraphAt $document ([ref] $position) 'A successful usability session shows that the tested participant completed the tested tasks under the recorded conditions; it does not prove accessibility for every disability, device, browser, language, or context. The final report will therefore separate automated conformance evidence, observed human usability, participant opinion, and unresolved limitations.' $normal)

    # Replace stale traceability, limitation, conclusion, and future-work claims.
    Set-StartingParagraph $document 'Dataset expansion to 13 roles' 'Dataset expansion to 15 roles'
    Set-StartingParagraph $document 'Validated baseline: 3 jobs, 362 tasks' 'Implemented staging catalogue: 15 active job descriptions, 923 tasks, 16 disability categories, and 14,453 recorded assessments.'
    Set-StartingParagraph $document 'Obtain, normalize, review, and regression-test ten additional authoritative workbooks.' 'Maintain source traceability and obtain domain-stakeholder confirmation for the twelve added hospitality descriptions and their imported assessments.'
    Set-StartingParagraph $document 'The following items remain open and are not represented as completed:' 'The following items remain open and are not represented as completed: detailed analysis and documentation of the Arc en Ciel/JAWS field session; a larger representative usability sample; native-device and cross-network retesting; formal multilingual transcription accuracy statistics; deployed-origin performance and concurrency measurements; production monitoring, backups, email delivery, retention automation, incident response, and privacy/legal governance. Redis or another cache remains deferred unless profiling demonstrates a justified need.'
    Set-StartingParagraph $document 'Conclusion and Future Work Planning' 'Conclusion, Limitations, and Future Work'
    Set-StartingParagraph $document 'Phase II has delivered an integrated engineering prototype' 'Phase II delivered an integrated platform that advances the Inclusive Web Platform from a limited ability-matching proof of concept to a deployed, multilingual, accessible, and reviewable hospitality opportunity system. The principal contributions are candidate eligibility verification, private document handling, server-enforced role authorization, work/training preferences, translated position interests, controlled employer requirements, editable multilingual transcription, consent-gated AI suggestions, deterministic explainable matching, responsive keyboard and voice interaction, privacy controls, outcome logging, a fifteen-description catalogue, cloud staging, and repeatable engineering evidence.'
    Set-StartingParagraph $document 'The current result is not presented as finished regulatory compliance' 'The final prototype is not presented as proof of regulatory compliance, clinical suitability, production availability, or employment effectiveness. It is an engineering result supported by reproducible automated tests, a working cloud staging environment, and emerging representative-user evidence. The remaining evaluation tasks are explicitly separated so reviewers can reproduce the evidence and understand the limits of each claim.'
    Set-StartingParagraph $document 'Remaining Work and Definition of Done' 'Remaining Validation and Future Work'
    Set-StartingParagraph $document '1. Complete the post-remediation WCAG matrix' '1. Complete the human accessibility evidence: transcribe the Arc en Ciel field notes, document the JAWS configuration and task outcomes, resolve any defects, and perform a recorded retest. Repeat native 200% zoom and keyboard-only checks on representative deployed workflows before making any conformance statement.'
    Set-StartingParagraph $document '2. Obtain ten additional authoritative job workbooks' '2. Obtain formal domain-stakeholder validation for the twelve additional hospitality job descriptions, their task decomposition, feasibility assessments, and translation quality. Preserve dataset versions and rerun catalogue/scoring regression tests after every approved change.'
    Set-StartingParagraph $document '3. Conduct representative usability sessions' '3. Extend representative usability testing across candidates with different access needs, employers, and authorized verifiers. Apply the common protocol and calculate task completion, independence, assistance, time, errors, recovery, and satisfaction statistics without hiding missing or unsuccessful observations.'
    Set-StartingParagraph $document '4. Evaluate English, French, Arabic' '4. Evaluate English, French, Arabic, Lebanese Arabic, accents, noise, and mixed-language transcription/extraction using consented samples. Report correction rate and failure cases, and retain manual entry as the operational fallback.'
    Set-StartingParagraph $document '5. Deploy to a controlled environment' '5. Repeat integration, E2E, security, accessibility, and performance suites against staging from multiple devices and networks. Add bounded concurrency measurements, uptime/error monitoring, email testing, retention scheduling, backup/erasure procedures, incident response, and formal privacy review before any production proposal.'
    Set-StartingParagraph $document '6. Implement the planned cache layer' '6. Keep caching measurement-driven. Introduce a shared cache only if deployed profiling identifies repeated non-sensitive reads that materially affect response time; then define TTL, invalidation, authorization, privacy exclusions, observability, and database fallback before enabling it.'
    Set-StartingParagraph $document '7. Review every embedded screenshot' '7. Replace the highlighted field/statistical placeholders with approved evidence, review screenshots for readability and privacy, update captions, cross-references, contents, and page numbers, and complete supervisor review before submission.'
    Set-StartingParagraph $document 'Data quality remains the main scoring risk.' 'Data quality remains the main scoring risk. The project mitigates it through schema-validated imports, source references, versioned datasets, explicit missing-assessment behavior, and deterministic regression tests. The twelve newly imported descriptions expand coverage but still require formal domain-stakeholder validation. AI/ASR risk is controlled through editable transcripts, consent, human confirmation, server validation, and a complete manual fallback.'
    Set-StartingParagraph $document 'Development is maintained on the zm Git branch' 'Development evidence is version controlled through focused commits and technical documents stored beside the source. Cloud deployment is isolated on the staging-deployment branch and defined by render.yaml. Requirements, security decisions, privacy controls, accessibility remediation, dataset imports, tests, machine-readable results, and operational limitations are retained for traceability.'
    Set-StartingParagraph $document 'Project repository and current branch:' 'Project repository and deployment branch: inclusive-web-platform — staging-deployment'

    Set-TableRowByLabel $document 'Accessibility and responsive design' @(
        'Accessibility and responsive design',
        'Automated matrix passed; human evidence in progress',
        'Keyboard workflows, focus management, semantics, contrast, reflow, reduced motion, errors, status announcements, and 104 automated route-scenario scans without recorded axe findings or overflow.',
        'Complete the Arc en Ciel/JAWS evidence, native zoom, multi-device checks, corrections, and retests before a conformance statement.'
    )
    Set-TableRowByLabel $document 'Integration and E2E testing' @(
        'Integration and E2E testing',
        'Implemented and passed locally',
        'API integration: 25/25; browser E2E: 26/26; voice/action safety: 52/52; deterministic scoring: 17/17; production build and i18n contract passed.',
        'Repeat the complete suites in CI and against staging; current staging health, role authentication, public data, and matching have been verified.'
    )
    Set-TableRowByLabel $document 'Performance baseline' @(
        'Performance baseline',
        'Local budgets passed; staging behavior observed',
        'Zero local budget violations. API and page p95 values are recorded; staging exposed a free-service cold-start delay rather than a scoring defect.',
        'Measure deployed warm/cold response, multiple devices/networks, and bounded concurrency before making a capacity claim.'
    )
    Set-TableRowByLabel $document 'Dataset expansion to 15 roles' @(
        'Dataset expansion to 15 roles',
        'Implemented technically',
        '15 active descriptions, 923 tasks, 16 disability categories, and 14,453 assessments are deployed in staging.',
        'Complete domain-stakeholder validation, translation review, and regression retesting after approved dataset corrections.'
    )
    Set-TableRowByLabel $document 'Cache layer' @(
        'Cache layer',
        'Deferred by measurement',
        'The non-cached local baseline passes its budgets; sensitive-data exclusions and the decision boundary are documented.',
        'Introduce a shared cache only if deployed profiling identifies a justified repeated-read bottleneck.'
    )

    # Update appendices with the deployed architecture and current measurements.
    Set-StartingParagraph $document 'The prototype follows the selected layered modular architecture.' 'The final prototype follows the selected layered modular architecture. React renders user experiences; Symfony remains the authoritative API, authorization, and business-workflow boundary; PostgreSQL stores confirmed records; Python services isolate deterministic scoring and AI/voice functions; and object storage separates private evidence from public assets. Docker Compose reproduces the local stack, while Render and Supabase provide the staging topology. A cache is deliberately excluded because current evidence has not established a need.'
    Set-StartingParagraph $document 'The eleven unit tests cover all-feasible scoring' 'The current seventeen deterministic unit tests cover all-feasible scoring, assistance on/off behavior, explicit and mandatory avoid, optional avoid, missing-assessment fallback, multiple disabilities, education exclusion, highlighted weighting, practical-ability rules, application-only position knowledge, serialization, and invalid weights. Future calibration must use expert-reviewed candidate/opportunity examples and expected outcomes rather than cosmetically changing percentages.'
    Set-StartingParagraph $document 'The validated catalogue is derived from the three supplied HoReCa workbooks' 'The active catalogue contains 15 hospitality datasets. The staging snapshot includes 923 ordered tasks, 16 disability categories, and 14,453 recorded assessments. The three original workbooks and twelve imported descriptions are normalized through the same schema, preserving source references and explicit feasibility values. The added datasets improve coverage but remain subject to final domain-stakeholder validation.'
    Set-StartingParagraph $document 'The report does not claim complete WCAG 2.1 Level AA conformance.' 'The report does not claim complete WCAG 2.1 Level AA conformance. The latest automated matrix completed 104 route-scenario scans with no axe findings, horizontal overflow, console errors, failed requests, or scan errors. This evidence is complemented by the reported Arc en Ciel/JAWS session, but the field protocol and outcomes must be fully documented and failed cases retested before a conformance decision.'
    Set-StartingParagraph $document 'Recorded local p95 API values were 205.1 ms' 'The 4 September local p95 API values were 358.5 ms for public jobs, 144.0 ms for job definitions, 217.8 ms for candidate session, and 132.3 ms for candidate profile. Page load/FCP p95 values were 56.5/168 ms for Welcome, 67.9/104 ms for Sign In, and 48.3/84 ms for Candidate. The largest JavaScript and CSS assets were 150,516 and 6,050 gzip bytes. All configured budgets passed with zero violations.'
    Set-StartingParagraph $document 'Manual retesting must confirm mail delivery/failure behavior' 'Final manual evidence must document the Arc en Ciel/JAWS session, keyboard completion, native zoom, dialog focus, AI suggestion review, privacy operations, mobile reflow, and participant feedback. Staging evidence must be expanded with repeated deployed-origin performance, multi-device/network checks, bounded concurrency, monitoring, backup/erasure, purge scheduling, email delivery, and incident-response procedures.'

    # Add deployment references before the appendices.
    $appendixA = Find-Paragraph $document 'Appendix A — System Architecture, Setup, and Operations'
    $referencePosition = $appendixA.Range.Start
    [void] (Add-ParagraphAt $document ([ref] $referencePosition) '[15] Render, "Blueprint Specification," Render Documentation, 2026, https://render.com/docs/blueprint-spec.' $normal)
    [void] (Add-ParagraphAt $document ([ref] $referencePosition) '[16] Render, "Deploy for Free," Render Documentation, 2026, https://render.com/docs/free.' $normal)
    [void] (Add-ParagraphAt $document ([ref] $referencePosition) '[17] Supabase, "Database Connections" and "Storage," Supabase Documentation, 2026, https://supabase.com/docs.' $normal)
    [void] (Add-ParagraphAt $document ([ref] $referencePosition) '[18] Freedom Scientific, "JAWS Screen Reading Software," 2026, https://www.freedomscientific.com/products/software/jaws/.' $normal)

    # Add detailed appendices so later field data can be inserted without restructuring the report.
    $endPosition = $document.Content.End - 1
    Add-PageBreakAt $document ([ref] $endPosition)
    [void] (Add-ParagraphAt $document ([ref] $endPosition) 'Appendix H — Cloud Staging Deployment Evidence' $heading1)
    [void] (Add-ParagraphAt $document ([ref] $endPosition) 'Deployment Topology and Boundaries' $heading2)
    [void] (Add-ParagraphAt $document ([ref] $endPosition) 'The Render Blueprint deploys the React/Vite frontend as a static site and the Symfony API, deterministic scoring engine, and AI/voice service as independent Docker web services. The frontend uses only public HTTPS origins. Symfony is the only component authorized to send official scoring payloads or persist candidate-confirmed AI suggestions. Shared random tokens authenticate Symfony-to-Python traffic. Supabase supplies the SSL-enabled PostgreSQL pooler and three purpose-specific storage buckets; its secret key remains server-side.' $normal)
    [void] (Add-ParagraphAt $document ([ref] $endPosition) 'Security and Data Controls' $heading2)
    [void] (Add-ParagraphAt $document ([ref] $endPosition) 'The static site applies nosniff, strict-origin referrer, frame-denial, and microphone permission headers. CORS permits only the deployed frontend origin. Candidate verification documents and application documents are private; employer logos are intentionally public. JWT keys are reconstructed from Base64 environment secrets during container startup, with the private key restricted to the root/web-server group. Database, Supabase, OpenAI, JWT, and service-token values are absent from Git and this report.' $normal)
    [void] (Add-ParagraphAt $document ([ref] $endPosition) 'Data Migration and Verification' $heading2)
    [void] (Add-ParagraphAt $document ([ref] $endPosition) 'A PostgreSQL custom-format backup of the controlled local database was restored into Supabase. Aggregate checks recorded 9 user accounts, including 1 administrator, 1 verifier, 4 employers, and 3 candidates; 15 job descriptions; 923 tasks; 14,453 assessments; and the associated applications and profile records. Additional demonstration offers were inserted idempotently. The public overview showed 74 published opportunities on 8 September 2026. Authentication and representative authorized reads were then verified for all four roles.' $normal)
    [void] (Add-ParagraphAt $document ([ref] $endPosition) 'Operational Lessons' $heading2)
    [void] (Add-ParagraphAt $document ([ref] $endPosition) 'Two deployment failures produced useful engineering evidence. Database authentication failed until the newly confirmed Supabase password was committed through the dashboard and inserted into the Render URI. Backend startup later failed because the web process could not read the generated JWT private key; ownership and permissions were corrected in the container entrypoint. Free-service cold start was also observed as a temporary 503 from candidate matching. A successful repeat after health warm-up showed that the scoring calculation and candidate data were valid. These incidents define concrete demonstration checks and future monitoring requirements.' $normal)

    [void] (Add-ParagraphAt $document ([ref] $endPosition) 'Appendix I — Human Evaluation and Statistical Workbook' $heading1)
    [void] (Add-ParagraphAt $document ([ref] $endPosition) 'Participant and Session Record' $heading2)
    $pending3 = Add-ParagraphAt $document ([ref] $endPosition) '[TO COMPLETE FOR EACH SESSION] Participant code; role; relevant interaction needs; consent; date; location; facilitator; observer; device; operating system; browser; assistive technology and version; language; network; prior familiarity; deviations; and evidence-file references. Do not include names, disability documents, credentials, recordings, or quotations without explicit permission.' $normal
    $pending3.Range.HighlightColorIndex = 7
    [void] (Add-ParagraphAt $document ([ref] $endPosition) 'Task-Level Dataset' $heading2)
    [void] (Add-ParagraphAt $document ([ref] $endPosition) 'For every task, record a stable task identifier, expected outcome, completion status (independent, assisted, failed, or not attempted), start/end time, error count, recovery count, assistance type, issue severity, participant comment, observer note, defect identifier, correction commit, and retest status. Retain raw anonymized rows so all percentages and charts can be regenerated.' $normal)
    [void] (Add-ParagraphAt $document ([ref] $endPosition) 'Planned Calculations' $heading2)
    [void] (Add-ParagraphAt $document ([ref] $endPosition) 'Task completion (%) = completed tasks / attempted tasks × 100. Independent completion (%) = independently completed tasks / attempted tasks × 100. Assistance rate (%) = assisted completed tasks / attempted tasks × 100. Error rate = observed errors / attempted tasks. Report median and interquartile range for time and errors when distributions are skewed or samples are small. Present results by role, access mode, workflow, and language, followed by an overall value only when aggregation is meaningful.' $normal)
    [void] (Add-ParagraphAt $document ([ref] $endPosition) 'Evidence Integrity' $heading2)
    [void] (Add-ParagraphAt $document ([ref] $endPosition) 'Keep pre-correction and post-correction results separate. Never convert assisted completion into independent completion, remove failed tasks from the denominator without explanation, or describe a single participant as representative of all users. Every statistic in the final report must be reproducible from the anonymized workbook and connected to the relevant defect or conclusion.' $normal)

    # Document metadata and fields.
    try { $document.BuiltInDocumentProperties.Item('Title').Value = 'Inclusive Web Platform — Final Year Project Report' } catch {}
    try { $document.BuiltInDocumentProperties.Item('Subject').Value = 'Final implementation, deployment, accessibility, and evaluation report' } catch {}
    foreach ($toc in $document.TablesOfContents) { $toc.Update() }
    [void] $document.Fields.Update()
    $document.Save()
    $document.ExportAsFixedFormat($pdf, 17)

    Write-Output "Final report DOCX: $output"
    Write-Output "Final report PDF: $pdf"
} finally {
    if ($document) { try { $document.Close(0) } catch {} }
    try { $word.Quit() } catch {}
}
