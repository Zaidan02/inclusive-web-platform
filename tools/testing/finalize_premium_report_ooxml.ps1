param(
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$artifacts = Join-Path $RepositoryRoot "artifacts"
$source = Join-Path $artifacts "FYP_CCE_FINAL_REPORT_SUBMISSION_READY_Zaidan_Mansour_Charbel_Rizk_2026-09-10.docx"
$output = Join-Path $artifacts "FYP_CCE_FINAL_REPORT_PREMIUM_SUBMISSION_Zaidan_Mansour_Charbel_Rizk_2026-09-11.docx"

if (-not (Test-Path -LiteralPath $source)) { throw "Source report not found: $source" }
if (Test-Path -LiteralPath $output) { [IO.File]::Delete($output) }
[IO.File]::Copy($source, $output, $true)

$wordNamespace = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

function Get-NodeText($node, $namespaces) {
    return (($node.SelectNodes(".//w:t", $namespaces) | ForEach-Object { $_.InnerText }) -join "")
}

function Set-ParagraphText([xml]$document, $paragraph, [string]$text) {
    $firstRunProperties = $paragraph.SelectSingleNode(".//w:r/w:rPr", $script:namespaces)
    foreach ($child in @($paragraph.ChildNodes)) {
        if ($child.LocalName -ne "pPr") { [void]$paragraph.RemoveChild($child) }
    }
    $run = $document.CreateElement("w", "r", $wordNamespace)
    if ($null -ne $firstRunProperties) { [void]$run.AppendChild($firstRunProperties.CloneNode($true)) }
    $textNode = $document.CreateElement("w", "t", $wordNamespace)
    $textNode.InnerText = $text.Trim()
    [void]$run.AppendChild($textNode)
    [void]$paragraph.AppendChild($run)
}

function Set-CellText([xml]$document, $cell, [string]$text) {
    $paragraphs = @($cell.SelectNodes("./w:p", $script:namespaces))
    if ($paragraphs.Count -eq 0) {
        $paragraph = $document.CreateElement("w", "p", $wordNamespace)
        [void]$cell.AppendChild($paragraph)
    } else {
        $paragraph = $paragraphs[0]
        for ($index = 1; $index -lt $paragraphs.Count; $index++) { [void]$cell.RemoveChild($paragraphs[$index]) }
    }
    Set-ParagraphText $document $paragraph $text
}

function Get-TableRows($table) {
    return @($table.SelectNodes("./w:tr", $script:namespaces))
}

function Get-RowCells($row) {
    return @($row.SelectNodes("./w:tc", $script:namespaces))
}

function Find-TableRow($table, [string]$firstCellText) {
    foreach ($row in (Get-TableRows $table)) {
        $cells = Get-RowCells $row
        if ($cells.Count -gt 0 -and (Get-NodeText $cells[0] $script:namespaces) -eq $firstCellText) { return $row }
    }
    return $null
}

$replacements = [ordered]@{
    "Verification included unit, integration, end-to-end" = @'
Verification included unit, integration, end-to-end, multilingual, accessibility, performance, deployment, and human-centred testing. The local automated baseline passed 17/17 scoring tests, 57/57 voice and profile-service tests, 25/25 API integration tests, and 26/26 browser tests. All 310 planned staging cases were completed. On first execution, 274 passed, 21 failed, and 15 noisy-transcription cases were partial. After repetition or manual correction, 289 cases had a final pass result, producing a 93.2% final pass rate. Matching achieved 45/45 passes, while multilingual and RTL testing achieved 18/18. Testing also identified areas requiring improvement, including AI preference extraction, colour contrast, zoom reflow, upload validation, and response time under load.
'@
    "Verification combines unit, integration, browser" = @'
Verification combines unit, integration, browser, internationalization, accessibility, performance, deployment, and human-centred evidence. The repeatable local baseline includes 17/17 deterministic-scoring tests, 57/57 voice/action-safety tests, 25/25 API integration checks, and 26/26 browser end-to-end checks. All 310 planned staging cases were completed. On first execution, 274 passed, 21 failed, and 15 noisy-transcription cases were partial; after repetition or manual correction, 289 cases had a final pass result, giving a 93.2% final pass rate. The retained failures concern AI extraction quality, security/privacy handling, and performance thresholds; a separate deployed WCAG matrix also recorded contrast and high-zoom reflow findings. The platform was deployed through Render and Supabase with 15 active job descriptions, 923 catalogue tasks, 14,453 disability-task assessments, and 74 published opportunities in the recorded staging snapshot. Human-centred validation included a live Arc en Ciel session with 20 persons with disabilities and a separate JAWS evaluation with Noelle Marie Gabrielle, a visually impaired user. These results support the prototype's usefulness and technical feasibility without claiming universal accessibility, full WCAG conformance, production availability, or proven employment effectiveness.
'@
    "Final implementation update (10 September 2026):" = @'
Final implementation update (10 September 2026): Phase II delivered the principal candidate, employer, verifier, and administrator workflows; English, French, and Arabic interfaces; candidate-controlled AI profile assistance; bounded voice navigation; deterministic explainable matching; work and hospitality-training preferences; translated position interests; controlled employer requirements; profile reset; private document storage; cloud staging; and repeatable engineering evidence. The complete 310-case staging register records 274 first-run passes, 15 partial noisy-transcription results, 21 failures, and 289 final passes after correction or repetition, complemented by Arc en Ciel and JAWS evidence. Open findings and evidence limitations remain explicit rather than being hidden by the completion statistic.
'@
    "The Phase II requirements extend the Phase I Inclusive Web Platform." = @'
The Phase II requirements extend the Phase I Inclusive Web Platform. The implemented scope covers role-based accounts, candidate eligibility verification, profiles, jobs and hospitality training programmes, applications, task-level ability matching, accessible notifications, outcome logging, private document handling, privacy controls, responsive access, keyboard and optional voice navigation, AI-assisted profile building, catalogue expansion, and cloud staging. Capacity measurements, representative-user evaluation, and rendered accessibility verification were completed within the prototype scope; their recorded failures and limitations remain follow-up work rather than unfinished test execution.
'@
    "The requirements in this section are structured according to the principles" = @'
The requirements in this section follow the requirements-engineering principles described in ISO/IEC/IEEE 29148:2018. Functional requirements define observable services and behaviours, while non-functional requirements define measurable quality attributes, technical constraints, and governance obligations. These requirements guided the platform's design, implementation, testing, and validation.
'@
    "The system shall allow candidates to create, view, edit, and update their profiles." = @'
The system shall allow candidates to create, view, edit, reset, and update their profiles. The implemented profile includes personal information, an optional biography, education level, reading/writing/numeracy abilities, work or training preference, position interests, explicitly selected disabilities, and candidate-confirmed catalogue task skills.
'@
    "The AI component shall propose structured information such as" = @'
The AI component shall propose schema-controlled profile fields, education level, practical abilities, work/training preference, position interests, explicitly stated active-catalogue disabilities, active-catalogue task skills, and unmapped statements for manual review. Suggestions shall remain unselected until the candidate confirms them.
'@
    "The chosen option is LLM-assisted NLP within the candidate profile workflow." = @'
The selected option is LLM-assisted NLP within the candidate profile workflow. The candidate types a narrative or records speech in English, French, or Arabic. The transcript remains editable and is analysed only after explicit consent. An authenticated Symfony endpoint supplies bounded narrative and allowlisted catalogue context to the protected internal profile service. The service returns schema-constrained suggestions; Symfony then filters and validates them before they are displayed. The AI does not populate registration or application fields automatically.
'@
    "The LLM returns a structured JSON output" = @'
The internal profile service returns structured JSON that follows the implemented extraction contract, for example:
'@
    '{ "personalInformation"' = @'
{ "language": "en", "profile_fields": [{ "field": "location", "value": "Beirut", "confidence": 0.98, "evidence": "I live in Beirut." }], "education_level": null, "practical_abilities": [], "opportunity_preference": null, "position_interests": [], "disabilities": [], "task_skills": [], "unmapped_statements": [] }
'@
    "The structured JSON is displayed as editable suggestions" = @'
The normalized suggestions are displayed for review rather than applied automatically. Every suggestion starts unselected. The candidate may edit supported text values and chooses which items to confirm. Symfony revalidates confirmed field lengths, enumerated values, explicit disability declarations, and active catalogue identifiers before persistence. This keeps the AI advisory and prevents unconfirmed or unsupported sensitive information from becoming profile fact.
'@
    "External services support the platform with additional features." = @'
External services support the platform with bounded functions. The notification service delivers email and in-app alerts, the ASR service transcribes activated voice input into editable text, and the LLM/OpenAI API extracts structured profile suggestions using the candidate narrative, current confirmed profile values, and allowlisted catalogue context. Separately, page-question voice requests may receive bounded readable content from the current page. No AI suggestion is stored as final profile data before candidate review and confirmation.
'@
    "Why caching was not implemented in the current version." = @'
Why caching was not implemented in the current version. The completed staging measurements identified free-tier cold starts and latency in sign-in, listing, and write operations, but they did not establish that repeated non-sensitive reads were the principal bottleneck. A cache would not correct slow writes, external AI latency, cold service startup, or database-connection delays, and premature adoption would introduce invalidation errors, stale accessibility content, authorization risk, privacy exposure, and another operational failure mode. The submitted version therefore prioritizes correctness, deterministic scoring, secure role checks, database integrity, and measured evidence.
'@
    "Post-testing cache plan." = @'
Post-testing cache plan. Future profiling may justify a shared Redis-compatible cache for repeated public or non-sensitive, versioned data such as published opportunity summaries, job definitions, catalogue tasks, translations, and bounded public counts. JWT decisions, roles, private profiles, disability evidence, application documents, raw audio, transcripts, unconfirmed AI suggestions, and rapidly changing records will remain excluded. Any cache must use versioned keys, short expiration, explicit invalidation after catalogue or opportunity changes, authorization before access, PostgreSQL fallback, monitoring, and failure-isolation tests.
'@
    "The stable local regression baseline passed" = @'
The stable local regression baseline passed 25/25 API integration checks, 26/26 browser end-to-end checks, 17/17 deterministic-scoring tests, and 57/57 voice/action-safety tests. The production frontend build and the three-locale internationalization contract also passed. The completed 310-case staging register records: AI profile suggestions 53/60; voice transcription 15 direct passes plus 15 partial noisy-condition results that passed after correction; voice navigation 60/60; matching 45/45; complete workflows 20/20; security/privacy 19/20; accessibility 18/18; multilingual/RTL 18/18; browser/device 12/12; and performance/reliability 14/27. The final result is 289 passes and 21 failures. Failures remain visible because evaluation is intended to reveal limitations rather than manufacture a perfect result.
'@
    "The controlled final-test register contains 310 planned cases." = @'
The controlled final-test register contains 310 planned cases, and all 310 were completed by 10 September 2026. First-run results were 274 passes, 21 failures, and 15 partial transcription cases under noisy or unstable capture. After repetition or manual correction, those 15 cases passed, producing 289 final passes and a 93.2% final pass rate. The 129 cases that were previously unresolved were entered from the Development Team's final completion confirmation. Machine-generated evidence remains linked where available; some manual voice, assistive-technology, and device cases do not have an individual recording, timing log, or screenshot. Completion therefore covers the whole register, while evidence strength varies by method.
'@
    "This final report records the implemented Phase II platform" = @'
This final report records the implemented Phase II platform and the verified evidence available as of 10 September 2026. The work progressed from a local prototype to an integrated and publicly reachable staging system. Quantitative claims are linked to executable tests, machine-readable results, deployed endpoints, recorded human-evaluation observations, or explicitly identified Development Team confirmation. All planned register cases were completed; recorded failures and differences in evidence strength are reported explicitly rather than inferred or hidden.
'@
    "The final system remains a staging prototype." = @'
The final system remains a staging prototype. Although all 310 planned cases were executed, 21 failures and the separate automated accessibility findings remain open or require retesting. Material findings include AI extraction errors, candidate-profile contrast, high-zoom header overflow, oversized multipart handling, and latency above selected staging thresholds. Transactional email and resend workflows are implemented, but reliable operational delivery still depends on correctly configured and monitored provider credentials. Free-service cold starts can also delay dependent requests.
'@
    "No shared cache layer is implemented in the submitted system." = @'
No shared cache layer is implemented in the submitted system. This was an evidence-based sequencing decision: the team first established authorization, private-data boundaries, deterministic outputs, and local and staging performance baselines. The completed measurements revealed cold-start, write, and external-service latency that a general cache would not necessarily solve. Cache adoption therefore remains targeted future work for demonstrated, repeated, non-sensitive read bottlenecks, with explicit invalidation, fallback, monitoring, and privacy controls.
'@
    "The final prototype is not presented as proof" = @'
The final prototype is not presented as proof of regulatory compliance, clinical suitability, production availability, or employment effectiveness. It is an engineering result supported by reproducible automated tests, a working cloud staging environment, a completed 310-case quality register, a 20-participant formative session, and an end-to-end JAWS evaluation. Recorded failures, qualitative evidence boundaries, and open operational risks are reported transparently so reviewers can reproduce the available evidence and interpret the 93.2% result correctly.
'@
    "1. Complete the remaining planned cases" = @'
1. Correct and retest the 21 failed cases, prioritizing AI extraction quality, security/privacy edge cases, and performance thresholds. Before operational acceptance, independently repeat the team-confirmed manual voice, keyboard, screen-reader, zoom, and browser/device checks with retained per-case logs, recordings where consent permits, timings, screenshots, and environment details.
'@
    "8. Complete post-testing scalability engineering." = @'
8. Continue post-testing scalability engineering. Profile database queries and indexes, paginate large datasets, use connection pooling and asynchronous jobs where appropriate, monitor health and latency, and evaluate autoscaling. Introduce a shared cache only for measured, repeated, non-sensitive reads, using versioned keys, expiration, invalidation, authorization checks, metrics, and PostgreSQL fallback. It was intentionally deferred because the completed evidence points first to cold-start, write, and external-service latency rather than a proven cacheable-read bottleneck.
'@
    "The extraction service proposes structured personal information" = @'
The extraction service proposes schema-controlled profile fields, education level, reading/writing/numeracy abilities, work/training preference, active position interests, explicitly stated active-catalogue disabilities, active-catalogue task skills, and unmapped statements for manual review. Each mapped item includes supporting evidence and confidence. Every suggestion starts unselected; the candidate can edit supported text values, select, ignore, or reject it. Only selected values reach the confirmation endpoint, where Symfony revalidates field limits, enumerated values, and controlled-catalogue membership before persistence.
'@
    "The profile assistant exposes English, French, and Arabic." = @'
The profile assistant and voice-navigation command subsystem both provide English, French, and Arabic selection. The chosen interface language is passed explicitly to transcription, classification, interpretation, and feedback. The completed manual register records 30/30 transcription and 60/60 voice-navigation cases as final passes, while 57/57 automated service checks verify multilingual routing and deterministic authorization. Under noisy or unstable capture, 15 transcription cases were partial before correction, and accuracy can still vary with accents, Lebanese Arabic, code-switching, microphone quality, and character-by-character values such as email addresses. Editable transcripts and manual controls remain required.
'@
    "The profile assistant and the voice-navigation command subsystem both expose" = @'
The profile assistant and voice-navigation command subsystem both provide English, French, and Arabic selection. The chosen interface language is passed explicitly to transcription, classification, interpretation, and feedback. The completed manual register records 30/30 transcription and 60/60 voice-navigation cases as final passes, while 57/57 automated service checks verify multilingual routing and deterministic authorization. Under noisy or unstable capture, 15 transcription cases were partial before correction, and accuracy can still vary with accents, Lebanese Arabic, code-switching, microphone quality, and character-by-character values such as email addresses. Editable transcripts and manual controls remain required.
'@
    "Evidence combines semantic source review" = @'
Evidence combines semantic source review, production build and lint, axe scans, responsive and text-spacing scenarios, keyboard checks, deployed screenshots, completed manual register cases, and the JAWS session. The deployed automated matrix recorded contrast findings in 16 scenarios and horizontal overflow in two high-zoom scenarios. Completion of the planned test register does not erase these findings, and the limited assistive-technology sample is not a formal conformance audit. The report therefore documents WCAG 2.1 Level AA coverage and progress without claiming full conformance.
'@
    "The report does not claim complete WCAG 2.1 Level AA conformance." = @'
The report does not claim complete WCAG 2.1 Level AA conformance. The automated matrix completed 104 route-scenario checks but identified axe findings in 16 scenarios and horizontal overflow in two high-zoom scenarios. The 18 planned accessibility workflow cases were completed, and the Arc en Ciel and JAWS sessions provide important human evidence, including successful JAWS-assisted registration and application. However, open automated findings, the limited assistive-technology sample, and the absence of an independent conformance audit prevent a full conformance claim.
'@
    "Remaining manual evidence must complete the structured voice" = @'
Future acceptance work should independently repeat the completed structured voice, keyboard, native zoom, dialog-focus, AI-review, privacy, mobile-reflow, and browser/device cases with retained per-case evidence. Staging follow-up must also retest recorded failures, verify email delivery under the final provider configuration, and extend deployed-origin performance, concurrency, monitoring, backup/erasure, purge scheduling, and incident-response checks.
'@
    "The versioned workbook JoIn_Final_Test_Register.xlsx separates" = @'
The final workbook separates the test plan, master results, metrics, defects, evidence references, and voice evidence. It contains 310 planned and executed engineering cases. First-run results were 274 passes, 21 failures, and 15 partial noisy-transcription cases; the partial cases passed after repetition or manual correction, producing 289 final passes and a 93.2% final pass rate. No case remains blocked or not run. Machine-generated artifacts support automated checks; the 129 cases completed after the earlier snapshot are identified as Development Team-confirmed final validation where an individual machine log was unavailable. Human-session observations remain separate because the Arc en Ciel session did not use a uniform per-task statistical protocol.
'@
    "Machine-generated JSON is intentionally summarized rather than printed line by line" = @'
Machine-generated JSON is intentionally summarized rather than printed line by line because raw output is not readable report prose. The source files remain versioned evidence that can be rerun and compared. A repository-document coverage audit identified 26 Markdown engineering documents, 40 JSON evidence files, and 181 PNG evidence images under docs at finalization. The report synthesizes them by category: product and workflow design; multilingual strategy; hospitality abilities and catalogue policy; scoring mathematics; authorization, verification, privacy, and notifications; responsive and WCAG remediation; setup and operations; cloud deployment; and integration, E2E, AI, security, performance, and staging evidence. Presentation files and generated screenshots support traceability but are not treated as independent requirements. This category-based consolidation covers the repository evidence without reproducing hundreds of machine-generated files or obsolete chronological notes.
'@
    "[1] World Wide Web Consortium" = @'
[1] World Wide Web Consortium, "Web Content Accessibility Guidelines (WCAG) 2.1," W3C Recommendation, 21 September 2023.
'@
    "[4] ISO/IEC/IEEE" = @'
[4] ISO/IEC/IEEE, "ISO/IEC/IEEE 29148:2018 - Systems and software engineering - Life cycle processes - Requirements engineering," ISO, 2018.
'@
    "[5] ISO/IEC" = @'
[5] ISO/IEC, "ISO/IEC 25010:2023 - Systems and software engineering - Systems and software Quality Requirements and Evaluation (SQuaRE) - Product quality model," ISO, 2023.
'@
}

$stream = [IO.File]::Open($output, [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
$archive = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Update, $false)
try {
    $entry = $archive.GetEntry("word/document.xml")
    if ($null -eq $entry) { throw "word/document.xml is missing" }
    $reader = [IO.StreamReader]::new($entry.Open())
    try { [xml]$document = $reader.ReadToEnd() } finally { $reader.Dispose() }

    $script:namespaces = [Xml.XmlNamespaceManager]::new($document.NameTable)
    $script:namespaces.AddNamespace("w", $wordNamespace)

    foreach ($textNode in $document.SelectNodes("//w:t", $script:namespaces)) {
        $textNode.InnerText = $textNode.InnerText.Replace("52/52", "57/57").Replace("52 of 52", "57 of 57")
    }

    $replacementCounts = @{}
    foreach ($paragraph in @($document.SelectNodes("//w:body//w:p", $script:namespaces))) {
        $paragraphText = Get-NodeText $paragraph $script:namespaces
        foreach ($prefix in $replacements.Keys) {
            if ($paragraphText.StartsWith($prefix, [StringComparison]::Ordinal)) {
                Set-ParagraphText $document $paragraph $replacements[$prefix]
                $replacementCounts[$prefix] = 1 + ($replacementCounts[$prefix] -as [int])
                break
            }
        }
    }

    foreach ($table in @($document.SelectNodes("//w:tbl", $script:namespaces))) {
        $rows = Get-TableRows $table
        if ($rows.Count -eq 0) { continue }
        $headerCells = Get-RowCells $rows[0]
        if ($headerCells.Count -eq 0) { continue }
        $header = Get-NodeText $headerCells[0] $script:namespaces

        if ($header -eq "Name of standard / regulation") {
            Set-CellText $document $headerCells[3] "How the solution addresses the standard or regulation"
            foreach ($row in $rows | Select-Object -Skip 1) {
                $cells = Get-RowCells $row
                if ($cells.Count -lt 4) { continue }
                $name = Get-NodeText $cells[0] $script:namespaces
                switch ($name) {
                    "ISO/IEC/IEEE 29148:2011" { Set-CellText $document $cells[0] "ISO/IEC/IEEE 29148:2018" }
                    "ISO/IEC 27001:2013" {
                        Set-CellText $document $cells[0] "ISO/IEC 27001:2022"
                        $section = Get-NodeText $cells[1] $script:namespaces
                        if ($section -eq "A.9.1") {
                            Set-CellText $document $cells[1] "Annex A 5.15"
                            Set-CellText $document $cells[2] "Access control"
                        } elseif ($section -eq "A.12.4.1") {
                            Set-CellText $document $cells[1] "Annex A 8.15"
                            Set-CellText $document $cells[2] "Logging"
                        }
                    }
                    "IEEE 12207" {
                        Set-CellText $document $cells[0] "ISO/IEC/IEEE 12207:2017"
                        Set-CellText $document $cells[1] "Software life-cycle processes"
                    }
                    "ISO 9241" { Set-CellText $document $cells[0] "ISO 9241-110:2020" }
                    "ISO/IEC 25010" { Set-CellText $document $cells[0] "ISO/IEC 25010:2023" }
                    "UML 2.5" { Set-CellText $document $cells[0] "UML 2.5.1" }
                }
            }
        }

        if ($header -eq "Decision") {
            $row = Find-TableRow $table "Accessibility verification"
            if ($null -ne $row) {
                $cells = Get-RowCells $row
                Set-CellText $document $cells[3] "The combined test programme is complete, but open contrast/reflow findings and limited assistive-technology coverage prevent a full AA conformance claim."
            }
        }

        if ($header -eq "Requirement area") {
            $row = Find-TableRow $table "Accessibility and responsive design"
            if ($null -ne $row) {
                $cells = Get-RowCells $row
                Set-CellText $document $cells[1] "Final matrix completed; open findings remain"
                Set-CellText $document $cells[2] "The 18 planned accessibility workflow cases were completed; Arc en Ciel and JAWS evaluations were conducted. A separate 104-scenario automated audit recorded axe findings in 16 scenarios and overflow in two high-zoom scenarios."
                Set-CellText $document $cells[3] "Correct the recorded findings and repeat an independent WCAG conformance audit before making an AA claim."
            }
            $row = Find-TableRow $table "Integration and E2E testing"
            if ($null -ne $row) {
                $cells = Get-RowCells $row
                Set-CellText $document $cells[1] "Implemented; local and staging verification completed"
                Set-CellText $document $cells[2] "API integration 25/25; browser E2E 26/26; voice/action safety 57/57; deterministic scoring 17/17; production build and i18n contract passed; final staging register completed."
                Set-CellText $document $cells[3] "Automate the full cross-service suite in CI and repeat after material changes."
            }
            $row = Find-TableRow $table "Performance baseline"
            if ($null -ne $row) {
                $cells = Get-RowCells $row
                Set-CellText $document $cells[1] "Local baseline passed; staging programme completed with retained failures"
                Set-CellText $document $cells[2] "Local budgets passed. The final staging register records 14/27 performance/reliability passes and 13 failures; a 144-request shared-load rerun returned no 5xx responses but exceeded six of nine latency targets."
                Set-CellText $document $cells[3] "Profile cold starts, database and external-service latency before selecting caching or scaling measures."
            }
        }

        if ($header -eq "Area") {
            Set-CellText $document $headerCells[3] "Continuing validation / follow-up"
            $followUps = @{
                "Keyboard and focus" = "Repeat the completed workflows independently and retain tester, browser, focus-order, and announcement evidence."
                "Responsive reflow" = "Correct the recorded profile-header overflow and rerun the 320-1440 px, landscape, text-spacing, and native 200% zoom matrix."
                "Forms and errors" = "Expand manual announcement and recovery checks across multiple screen readers."
                "Semantics" = "Repeat rendered reading-order and accessible-name checks after interface changes."
                "Status feedback" = "Extend assistive-technology checks for AI, applications, verification, privacy, and administration."
                "Visual presentation" = "Correct recorded contrast findings and rerun axe plus manual visual review."
                "User control" = "Repeat representative-user studies with a uniform task and assistance protocol."
            }
            foreach ($name in $followUps.Keys) {
                $row = Find-TableRow $table $name
                if ($null -ne $row) {
                    $cells = Get-RowCells $row
                    Set-CellText $document $cells[3] $followUps[$name]
                }
            }
        }

        if ($header -eq "Verification suite") {
            $row = Find-TableRow $table "Voice navigation"
            if ($null -ne $row) {
                $cells = Get-RowCells $row
                Set-CellText $document $cells[1] "57/57 passed"
                Set-CellText $document $cells[3] "Deterministic boundary coverage; final manual voice cases were completed, while retained acoustic recordings are still needed for independent reproducibility."
            }
            $row = Find-TableRow $table "Frontend quality"
            if ($null -ne $row) {
                $cells = Get-RowCells $row
                Set-CellText $document $cells[3] "Build evidence is complemented by completed browser/device and deployed workflow checks."
            }
            $row = Find-TableRow $table "Performance"
            if ($null -ne $row) {
                $cells = Get-RowCells $row
                Set-CellText $document $cells[3] "Local baseline passed; completed staging measurements separately retain threshold failures and cold-start limitations."
            }
        }

        if ($header -eq "Repository document") {
            $row = Find-TableRow $table "keyboard-navigation-test-plan.md"
            if ($null -ne $row) {
                $cells = Get-RowCells $row
                Set-CellText $document $cells[3] "Written into the report with completed register coverage and continuing independent-evidence needs identified."
            }
        }
    }

    $entry.Delete()
    $newEntry = $archive.CreateEntry("word/document.xml", [IO.Compression.CompressionLevel]::Optimal)
    $writer = [IO.StreamWriter]::new($newEntry.Open(), [Text.UTF8Encoding]::new($false))
    try { $document.Save($writer) } finally { $writer.Dispose() }

    $settingsEntry = $archive.GetEntry("word/settings.xml")
    if ($null -ne $settingsEntry) {
        $settingsReader = [IO.StreamReader]::new($settingsEntry.Open())
        try { [xml]$settings = $settingsReader.ReadToEnd() } finally { $settingsReader.Dispose() }
        $settingsNs = [Xml.XmlNamespaceManager]::new($settings.NameTable)
        $settingsNs.AddNamespace("w", $wordNamespace)
        $updateFields = $settings.SelectSingleNode("//w:updateFields", $settingsNs)
        if ($null -eq $updateFields) {
            $updateFields = $settings.CreateElement("w", "updateFields", $wordNamespace)
            [void]$settings.DocumentElement.AppendChild($updateFields)
        }
        [void]$updateFields.SetAttribute("val", $wordNamespace, "true")
        $settingsEntry.Delete()
        $newSettingsEntry = $archive.CreateEntry("word/settings.xml", [IO.Compression.CompressionLevel]::Optimal)
        $settingsWriter = [IO.StreamWriter]::new($newSettingsEntry.Open(), [Text.UTF8Encoding]::new($false))
        try { $settings.Save($settingsWriter) } finally { $settingsWriter.Dispose() }
    }

    foreach ($prefix in $replacements.Keys) {
        Write-Output "REPLACED=$prefix|$($replacementCounts[$prefix] -as [int])"
    }
} finally {
    $archive.Dispose()
    $stream.Dispose()
}

Write-Output "REPORT=$output"
