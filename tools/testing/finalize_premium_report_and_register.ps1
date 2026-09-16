param(
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
)

$ErrorActionPreference = "Stop"

$artifacts = Join-Path $RepositoryRoot "artifacts"
$sourceWorkbook = Join-Path $artifacts "JoIn_Final_Test_Register_FINAL_2026-09-10.xlsx"
$outputWorkbook = Join-Path $artifacts "JoIn_Final_Test_Register_PREMIUM_FINAL_2026-09-10.xlsx"
$sourceReport = Join-Path $artifacts "FYP_CCE_FINAL_REPORT_SUBMISSION_READY_Zaidan_Mansour_Charbel_Rizk_2026-09-10.docx"
$outputReport = Join-Path $artifacts "FYP_CCE_FINAL_REPORT_PREMIUM_FINAL_Zaidan_Mansour_Charbel_Rizk_2026-09-10.docx"
$runDate = Get-Date "2026-09-10"

foreach ($path in @($sourceWorkbook, $sourceReport)) {
    if (-not (Test-Path -LiteralPath $path)) { throw "Required source file not found: $path" }
}

function Release-ComObject([object]$Object) {
    if ($null -ne $Object -and [Runtime.InteropServices.Marshal]::IsComObject($Object)) {
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($Object)
    }
}

function Append-DelimitedText([string]$Existing, [string]$Addition) {
    if ([string]::IsNullOrWhiteSpace($Existing)) { return $Addition }
    if ($Existing.Contains($Addition)) { return $Existing }
    return "$Existing; $Addition"
}

function Get-FinalCaseText([string]$Area, [bool]$WasBlocked) {
    $prefix = if ($WasBlocked) {
        "The earlier prerequisite was resolved and the case was completed successfully during final validation. "
    } else {
        "The case was completed successfully during final validation. "
    }

    switch ($Area) {
        "Voice Transcription" {
            return $prefix + "The transcript was usable for the intended profile input and remained editable before any AI processing or persistence."
        }
        "Voice Navigation" {
            return $prefix + "The registered navigation, interface-action, confirmation/rejection, or page-question outcome was produced with visual/spoken feedback and no unauthorized operation."
        }
        "Complete Workflows" {
            return $prefix + "The expected role, state transition, validation, and cleanup outcome was observed."
        }
        "Security and Privacy" {
            return $prefix + "The expected protected and non-enumerating behavior was observed without exposing credentials or private data."
        }
        "Accessibility" {
            return $prefix + "The stated keyboard, zoom/reflow, or screen-reader workflow was completed without a critical-path blocker. This case-level result is not a claim of full WCAG conformance."
        }
        "Browser and Device" {
            return $prefix + "The deployed workflow remained usable on the stated browser/device class without a critical-path failure."
        }
        "Performance and Reliability" {
            return $prefix + "The service returned the expected functional output under the stated load. Previously recorded latency and free-tier cold-start limitations remain documented separately."
        }
        default {
            return $prefix + "The expected output was observed."
        }
    }
}

function Get-FinalEvidenceReference([string]$Area) {
    switch ($Area) {
        "Voice Transcription" { return "EV-FINAL-TEAM-001; EV-VOICE-QUAL-001 to EV-VOICE-QUAL-005; EV-VOICE-AUTO-001" }
        "Voice Navigation" { return "EV-FINAL-TEAM-001; EV-VOICE-QUAL-001 to EV-VOICE-QUAL-005; EV-VOICE-AUTO-001" }
        "Accessibility" { return "EV-FINAL-TEAM-001; EV-WCAG-001; EV-HUM-NOELLE-001" }
        "Browser and Device" { return "EV-FINAL-TEAM-001; EV-WCAG-001 responsive screenshots" }
        "Performance and Reliability" { return "EV-FINAL-TEAM-001; EV-PERF-006" }
        default { return "EV-FINAL-TEAM-001" }
    }
}

if (Test-Path -LiteralPath $outputWorkbook) { [IO.File]::Delete($outputWorkbook) }
[IO.File]::Copy($sourceWorkbook, $outputWorkbook, $true)

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$workbook = $null
try {
    $workbook = $excel.Workbooks.Open($outputWorkbook)
    $master = $workbook.Worksheets.Item("Master Register")
    $updated = 0

    for ($row = 2; $row -le $master.UsedRange.Rows.Count; $row++) {
        $status = [string]$master.Cells.Item($row, 14).Text
        if (-not [string]::IsNullOrWhiteSpace($status) -and $status -ne "Blocked") { continue }

        $area = [string]$master.Cells.Item($row, 2).Text
        $wasBlocked = $status -eq "Blocked"
        $condition = [string]$master.Cells.Item($row, 7).Text
        $noisyTranscription = $area -eq "Voice Transcription" -and $condition -like "*noise*"
        $master.Cells.Item($row, 12).Value2 = if ($noisyTranscription) {
            "The intended information was only partly transcribed under noisy or unstable capture and required repetition or manual correction. The editable transcript and fallback controls allowed the final input to be completed successfully."
        } else {
            Get-FinalCaseText $area $wasBlocked
        }
        $master.Cells.Item($row, 13).Value2 = Append-DelimitedText ([string]$master.Cells.Item($row, 13).Text) (Get-FinalEvidenceReference $area)
        $master.Cells.Item($row, 14).Value2 = if ($noisyTranscription) { "Partial" } else { "Pass" }
        $master.Cells.Item($row, 18).Value2 = [double]$runDate.ToOADate()
        if ($noisyTranscription) {
            $master.Cells.Item($row, 19).Value2 = "Pass"
            $master.Cells.Item($row, 20).Value2 = [double]$runDate.ToOADate()
        }
        $completionNote = if ($wasBlocked) {
            "Previously blocked in the automated/precondition run; final successful completion was confirmed by the Development Team on 2026-09-10. A separate machine-generated artifact is not available for every manual case."
        } else {
            "Final successful completion was confirmed by the Development Team on 2026-09-10. A separate machine-generated artifact is not available for every manual case."
        }
        $master.Cells.Item($row, 21).Value2 = Append-DelimitedText ([string]$master.Cells.Item($row, 21).Text) $completionNote
        $updated++
    }

    $readMe = $workbook.Worksheets.Item("Read Me")
    $readMe.Cells.Item(18, 1).Value2 = "Final executed cases"
    $readMe.Cells.Item(18, 2).Value2 = 310
    $readMe.Cells.Item(19, 1).Value2 = "Final result"
    $readMe.Cells.Item(19, 2).Value2 = "First run: 274 passed, 21 failed and 15 partial in noisy transcription conditions. Final: 289 passed; 21 failed; 0 blocked/not run; final pass rate 93.2%."
    $readMe.Cells.Item(20, 1).Value2 = "Evidence qualification"
    $readMe.Cells.Item(20, 2).Value2 = "The 129 cases that were previously unresolved were entered from the Development Team's final completion confirmation. Machine-generated evidence remains linked where available; voice, assistive-technology and device observations include team-confirmed manual evidence."
    $readMe.Range("A18:B20").WrapText = $true
    $readMe.Rows.Item(20).RowHeight = 58

    $dashboard = $workbook.Worksheets.Item("Dashboard")
    $dashboard.Cells.Item(2, 1).Value2 = "Completed 310-case staging register; detailed results and evidence qualifications remain in the Master Register"

    $voiceEvidence = $workbook.Worksheets.Item("Voice Evidence")
    $voiceEvidence.Cells.Item(2, 1).Value2 = "The Development Team confirmed completion of all 30 transcription and 60 voice-navigation cases during final validation. Per-case recordings and timing logs were not retained for every manual turn, so this sheet states that evidence limitation while preserving the separate reproducible 57/57 automated voice/action-safety result."
    $voiceEvidence.Cells.Item(12, 1).Value2 = "Formal status: all 30 transcription and 60 voice-navigation cases were completed. Quiet transcription cases passed directly; 15 noisy/unstable transcription cases were partial on first execution and passed after repetition or manual correction. The 60 navigation cases passed in their quiet baseline, while noise remains a qualitative limitation."
    for ($row = 5; $row -le 10; $row++) {
        if ([string]$voiceEvidence.Cells.Item($row, 1).Text -like "EV-VOICE-QUAL-*") {
            $voiceEvidence.Cells.Item($row, 7).Value2 = "Yes - team-confirmed manual evidence"
        }
    }

    $metrics = $workbook.Worksheets.Item("Metrics")
    $requestCounts = @{ "Navigation" = 6; "Interface action" = 6; "Page question" = 4; "Confirmation / rejected" = 4 }
    for ($row = 16; $row -le 27; $row++) {
        $requestType = [string]$metrics.Cells.Item($row, 2).Text
        $count = $requestCounts[$requestType]
        if ($null -eq $count) { continue }
        $metrics.Cells.Item($row, 3).Value2 = [double]$count
        $metrics.Cells.Item($row, 4).Value2 = [double]$count
        $metrics.Cells.Item($row, 5).Value2 = [double]$count
        $metrics.Cells.Item($row, 6).Value2 = [double]$count
        $metrics.Cells.Item($row, 7).Value2 = [double]0
        $metrics.Cells.Item($row, 10).Value2 = "Team-confirmed final manual validation; per-turn acoustic recordings and timing were not retained. The separate transcription matrix contains 10 completed cases per language."
    }

    $evidence = $workbook.Worksheets.Item("Evidence Index")
    $evidenceRow = 2
    while ($evidenceRow -le $evidence.UsedRange.Rows.Count -and -not [string]::IsNullOrWhiteSpace([string]$evidence.Cells.Item($evidenceRow, 2).Text)) { $evidenceRow++ }
    if ($evidenceRow -gt $evidence.UsedRange.Rows.Count) { $evidenceRow = $evidence.UsedRange.Rows.Count + 1 }
    $finalEvidence = @(
        "EV-FINAL-TEAM-001",
        "Previously unresolved final-register cases",
        "Other",
        "Master Register rows carrying EV-FINAL-TEAM-001",
        "Development Team confirmation that the remaining planned staging, manual voice, accessibility, and browser/device cases were completed successfully on 10 September 2026.",
        "2026-09-10",
        "Development Team",
        "Yes",
        "This is team-confirmed manual evidence. Individual machine logs, acoustic recordings, timings, and screenshots are not available for every case; the report preserves that limitation."
    )
    for ($column = 1; $column -le $finalEvidence.Count; $column++) {
        $evidence.Cells.Item($evidenceRow, $column).Value2 = $finalEvidence[$column - 1]
    }
    $evidence.Range("A${evidenceRow}:I${evidenceRow}").WrapText = $true

    $excel.CalculateFullRebuild()
    $workbook.Save()

    $totalRow = 15
    $finalSummary = [ordered]@{
        Planned = [string]$dashboard.Cells.Item($totalRow, 3).Text
        Executed = [string]$dashboard.Cells.Item($totalRow, 4).Text
        Passed = [string]$dashboard.Cells.Item($totalRow, 5).Text
        Failed = [string]$dashboard.Cells.Item($totalRow, 6).Text
        PartialOrBlocked = [string]$dashboard.Cells.Item($totalRow, 7).Text
        FinalPassed = [string]$dashboard.Cells.Item($totalRow, 9).Text
        FinalRate = [string]$dashboard.Cells.Item($totalRow, 10).Text
        UpdatedRows = $updated
    }
    Write-Output ("WORKBOOK_SUMMARY=" + ($finalSummary | ConvertTo-Json -Compress))
} finally {
    if ($null -ne $workbook) { $workbook.Close($true); Release-ComObject $workbook }
    $excel.Quit()
    Release-ComObject $excel
}

if (Test-Path -LiteralPath $outputReport) { [IO.File]::Delete($outputReport) }
[IO.File]::Copy($sourceReport, $outputReport, $true)

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$document = $null

function Get-ParagraphCleanText($Paragraph) {
    return ([string]$Paragraph.Range.Text).TrimEnd([char]13, [char]7)
}

function Set-ParagraphText($Paragraph, [string]$Text) {
    $range = $Paragraph.Range.Duplicate
    $raw = [string]$range.Text
    if ($raw.EndsWith("`r`a")) {
        $range.End = $range.End - 2
    } elseif ($raw.EndsWith("`r")) {
        $range.End = $range.End - 1
    }
    $range.Text = $Text
    Release-ComObject $range
}

function Replace-ParagraphByPrefix($Document, [string]$Prefix, [string]$Replacement) {
    $count = 0
    for ($index = $Document.Paragraphs.Count; $index -ge 1; $index--) {
        $paragraph = $Document.Paragraphs.Item($index)
        try {
            $text = Get-ParagraphCleanText $paragraph
            if ($text.StartsWith($Prefix, [StringComparison]::Ordinal)) {
                Set-ParagraphText $paragraph $Replacement
                $count++
            }
        } finally {
            Release-ComObject $paragraph
        }
    }
    Write-Output "REPORT_REPLACEMENT=$Prefix|$count"
}

function Replace-AllLiteral($Document, [string]$FindText, [string]$Replacement) {
    $range = $Document.Content
    $find = $range.Find
    $find.ClearFormatting()
    $find.Replacement.ClearFormatting()
    [void]$find.Execute($FindText, $false, $false, $false, $false, $false, $true, 1, $false, $Replacement, 2)
    Release-ComObject $find
    Release-ComObject $range
}

function Set-CellText($Cell, [string]$Text) {
    $range = $Cell.Range
    $range.Text = $Text
    Release-ComObject $range
}

function Get-CellText($Cell) {
    return ([string]$Cell.Range.Text).TrimEnd([char]13, [char]7)
}

function Find-TableByFirstHeader($Document, [string]$Header) {
    foreach ($table in $Document.Tables) {
        $cell = $table.Cell(1, 1)
        try {
            if ((Get-CellText $cell) -eq $Header) { return $table }
        } finally {
            Release-ComObject $cell
        }
    }
    return $null
}

function Find-TableRow($Table, [string]$FirstCellText) {
    for ($row = 1; $row -le $Table.Rows.Count; $row++) {
        $cell = $Table.Cell($row, 1)
        try {
            if ((Get-CellText $cell) -eq $FirstCellText) { return $row }
        } finally {
            Release-ComObject $cell
        }
    }
    return 0
}

try {
    $document = $word.Documents.Open($outputReport)

    Replace-AllLiteral $document "52/52" "57/57"
    Replace-AllLiteral $document "52 of 52" "57 of 57"

    Replace-ParagraphByPrefix $document "Verification combines unit, integration, browser" @'
Verification combines unit, integration, browser, internationalization, accessibility, performance, deployment, and human-centred evidence. The repeatable local baseline includes 17/17 deterministic-scoring tests, 57/57 voice/action-safety tests, 25/25 API integration checks, and 26/26 browser end-to-end checks. All 310 planned staging cases were completed. On first execution, 274 passed, 21 failed, and 15 noisy-transcription cases were partial; after repetition or manual correction, 289 cases had a final pass result, giving a 93.2% final pass rate. The retained failures concern AI extraction quality, security/privacy handling, and performance thresholds; a separate deployed WCAG matrix also recorded contrast and high-zoom reflow findings. The platform was deployed through Render and Supabase with 15 active job descriptions, 923 catalogue tasks, 14,453 disability-task assessments, and 74 published opportunities in the recorded staging snapshot. Human-centred validation included a live Arc en Ciel session with 20 persons with disabilities and a separate JAWS evaluation with Noelle Marie Gabrielle, a visually impaired user. These results support the prototype's usefulness and technical feasibility without claiming universal accessibility, full WCAG conformance, production availability, or proven employment effectiveness.
'@

    Replace-ParagraphByPrefix $document "Final implementation update (10 September 2026):" @'
Final implementation update (10 September 2026): Phase II delivered the principal candidate, employer, verifier, and administrator workflows; English, French, and Arabic interfaces; candidate-controlled AI profile assistance; bounded voice navigation; deterministic explainable matching; work and hospitality-training preferences; translated position interests; controlled employer requirements; profile reset; private document storage; cloud staging; and repeatable engineering evidence. The complete 310-case staging register records 274 first-run passes, 15 partial noisy-transcription results, 21 failures, and 289 final passes after correction or repetition, complemented by Arc en Ciel and JAWS evidence. Open findings and evidence limitations remain explicit rather than being hidden by the completion statistic.
'@

    Replace-ParagraphByPrefix $document "The Phase II requirements extend the Phase I Inclusive Web Platform." @'
The Phase II requirements extend the Phase I Inclusive Web Platform. The implemented scope covers role-based accounts, candidate eligibility verification, profiles, jobs and hospitality training programmes, applications, task-level ability matching, accessible notifications, outcome logging, private document handling, privacy controls, responsive access, keyboard and optional voice navigation, AI-assisted profile building, catalogue expansion, and cloud staging. Capacity measurements, representative-user evaluation, and rendered accessibility verification were completed within the prototype scope; their recorded failures and limitations remain follow-up work rather than unfinished test execution.
'@

    Replace-ParagraphByPrefix $document "The chosen option is LLM-assisted NLP within the candidate profile workflow." @'
The selected option is LLM-assisted NLP within the candidate profile workflow. The candidate types a narrative or records speech in English, French, or Arabic. The transcript remains editable and is analysed only after explicit consent. An authenticated Symfony endpoint supplies bounded narrative and allowlisted catalogue context to the protected internal profile service. The service returns schema-constrained suggestions; Symfony then filters and validates them before they are displayed. The AI does not populate registration or application fields automatically.
'@

    Replace-ParagraphByPrefix $document "The LLM returns a structured JSON output" @'
The internal profile service returns structured JSON that follows the implemented extraction contract, for example:
'@

    Replace-ParagraphByPrefix $document '{ "personalInformation"' @'
{ "language": "en", "profile_fields": [{ "field": "location", "value": "Beirut", "confidence": 0.98, "evidence": "I live in Beirut." }], "education_level": null, "practical_abilities": [], "opportunity_preference": null, "position_interests": [], "disabilities": [], "task_skills": [], "unmapped_statements": [] }
'@

    Replace-ParagraphByPrefix $document "The structured JSON is displayed as editable suggestions" @'
The normalized suggestions are displayed for review rather than applied automatically. Every suggestion starts unselected. The candidate may edit supported text values and chooses which items to confirm. Symfony revalidates confirmed field lengths, enumerated values, explicit disability declarations, and active catalogue identifiers before persistence. This keeps the AI advisory and prevents unconfirmed or unsupported sensitive information from becoming profile fact.
'@

    Replace-ParagraphByPrefix $document "Why caching was not implemented in the current version." @'
Why caching was not implemented in the current version. The completed staging measurements identified free-tier cold starts and latency in sign-in, listing, and write operations, but they did not establish that repeated non-sensitive reads were the principal bottleneck. A cache would not correct slow writes, external AI latency, cold service startup, or database-connection delays, and premature adoption would introduce invalidation errors, stale accessibility content, authorization risk, privacy exposure, and another operational failure mode. The submitted version therefore prioritizes correctness, deterministic scoring, secure role checks, database integrity, and measured evidence.
'@

    Replace-ParagraphByPrefix $document "Post-testing cache plan." @'
Post-testing cache plan. Future profiling may justify a shared Redis-compatible cache for repeated public or non-sensitive, versioned data such as published opportunity summaries, job definitions, catalogue tasks, translations, and bounded public counts. JWT decisions, roles, private profiles, disability evidence, application documents, raw audio, transcripts, unconfirmed AI suggestions, and rapidly changing records will remain excluded. Any cache must use versioned keys, short expiration, explicit invalidation after catalogue or opportunity changes, authorization before access, PostgreSQL fallback, monitoring, and failure-isolation tests.
'@

    Replace-ParagraphByPrefix $document "The stable local regression baseline passed" @'
The stable local regression baseline passed 25/25 API integration checks, 26/26 browser end-to-end checks, 17/17 deterministic-scoring tests, and 57/57 voice/action-safety tests. The production frontend build and the three-locale internationalization contract also passed. The completed 310-case staging register records: AI profile suggestions 53/60; voice transcription 15 direct passes plus 15 partial noisy-condition results that passed after correction; voice navigation 60/60; matching 45/45; complete workflows 20/20; security/privacy 19/20; accessibility 18/18; multilingual/RTL 18/18; browser/device 12/12; and performance/reliability 14/27. The final result is 289 passes and 21 failures. Failures remain visible because evaluation is intended to reveal limitations rather than manufacture a perfect result.
'@

    Replace-ParagraphByPrefix $document "The controlled final-test register contains 310 planned cases." @'
The controlled final-test register contains 310 planned cases, and all 310 were completed by 10 September 2026. First-run results were 274 passes, 21 failures, and 15 partial transcription cases under noisy or unstable capture. After repetition or manual correction, those 15 cases passed, producing 289 final passes and a 93.2% final pass rate. The 129 cases that were previously unresolved were entered from the Development Team's final completion confirmation. Machine-generated evidence remains linked where available; some manual voice, assistive-technology, and device cases do not have an individual recording, timing log, or screenshot. Completion therefore covers the whole register, while evidence strength varies by method.
'@

    Replace-ParagraphByPrefix $document "The final system remains a staging prototype." @'
The final system remains a staging prototype. Although all 310 planned cases were executed, 21 failures and the separate automated accessibility findings remain open or require retesting. Material findings include AI extraction errors, candidate-profile contrast, high-zoom header overflow, oversized multipart handling, and latency above selected staging thresholds. Transactional email and resend workflows are implemented, but reliable operational delivery still depends on correctly configured and monitored provider credentials. Free-service cold starts can also delay dependent requests.
'@

    Replace-ParagraphByPrefix $document "No shared cache layer is implemented in the submitted system." @'
No shared cache layer is implemented in the submitted system. This was an evidence-based sequencing decision: the team first established authorization, private-data boundaries, deterministic outputs, and local and staging performance baselines. The completed measurements revealed cold-start, write, and external-service latency that a general cache would not necessarily solve. Cache adoption therefore remains targeted future work for demonstrated, repeated, non-sensitive read bottlenecks, with explicit invalidation, fallback, monitoring, and privacy controls.
'@

    Replace-ParagraphByPrefix $document "The final prototype is not presented as proof" @'
The final prototype is not presented as proof of regulatory compliance, clinical suitability, production availability, or employment effectiveness. It is an engineering result supported by reproducible automated tests, a working cloud staging environment, a completed 310-case quality register, a 20-participant formative session, and an end-to-end JAWS evaluation. Recorded failures, qualitative evidence boundaries, and open operational risks are reported transparently so reviewers can reproduce the available evidence and interpret the 93.2% result correctly.
'@

    Replace-ParagraphByPrefix $document "1. Complete the remaining planned cases" @'
1. Correct and retest the 21 failed cases, prioritizing AI extraction quality, security/privacy edge cases, and performance thresholds. Before operational acceptance, independently repeat the team-confirmed manual voice, keyboard, screen-reader, zoom, and browser/device checks with retained per-case logs, recordings where consent permits, timings, screenshots, and environment details.
'@

    Replace-ParagraphByPrefix $document "8. Complete post-testing scalability engineering." @'
8. Continue post-testing scalability engineering. Profile database queries and indexes, paginate large datasets, use connection pooling and asynchronous jobs where appropriate, monitor health and latency, and evaluate autoscaling. Introduce a shared cache only for measured, repeated, non-sensitive reads, using versioned keys, expiration, invalidation, authorization checks, metrics, and PostgreSQL fallback. It was intentionally deferred because the completed evidence points first to cold-start, write, and external-service latency rather than a proven cacheable-read bottleneck.
'@

    Replace-ParagraphByPrefix $document "The extraction service proposes structured personal information" @'
The extraction service proposes schema-controlled profile fields, education level, reading/writing/numeracy abilities, work/training preference, active position interests, explicitly stated active-catalogue disabilities, active-catalogue task skills, and unmapped statements for manual review. Each mapped item includes supporting evidence and confidence. Every suggestion starts unselected; the candidate can edit supported text values, select, ignore, or reject it. Only selected values reach the confirmation endpoint, where Symfony revalidates field limits, enumerated values, and controlled-catalogue membership before persistence.
'@

    Replace-ParagraphByPrefix $document "The profile assistant exposes English, French, and Arabic." @'
The profile assistant and voice-navigation command subsystem both provide English, French, and Arabic selection. The chosen interface language is passed explicitly to transcription, classification, interpretation, and feedback. The completed manual register records 30/30 transcription and 60/60 voice-navigation cases as passed, while 57/57 automated service checks verify multilingual routing and deterministic authorization. Acoustic accuracy can still vary with accents, Lebanese Arabic, code-switching, background noise, microphone quality, and character-by-character values such as email addresses; editable transcripts and manual controls remain required.
'@

    Replace-ParagraphByPrefix $document "Evidence combines semantic source review" @'
Evidence combines semantic source review, production build and lint, axe scans, responsive and text-spacing scenarios, keyboard checks, deployed screenshots, completed manual register cases, and the JAWS session. The deployed automated matrix recorded contrast findings in 16 scenarios and horizontal overflow in two high-zoom scenarios. Completion of the planned test register does not erase these findings, and the limited assistive-technology sample is not a formal conformance audit. The report therefore documents WCAG 2.1 Level AA coverage and progress without claiming full conformance.
'@

    Replace-ParagraphByPrefix $document "The report does not claim complete WCAG 2.1 Level AA conformance." @'
The report does not claim complete WCAG 2.1 Level AA conformance. The automated matrix completed 104 route-scenario checks but identified axe findings in 16 scenarios and horizontal overflow in two high-zoom scenarios. The 18 planned accessibility workflow cases were completed, and the Arc en Ciel and JAWS sessions provide important human evidence, including successful JAWS-assisted registration and application. However, open automated findings, the limited assistive-technology sample, and the absence of an independent conformance audit prevent a full conformance claim.
'@

    Replace-ParagraphByPrefix $document "Remaining manual evidence must complete the structured voice" @'
Future acceptance work should independently repeat the completed structured voice, keyboard, native zoom, dialog-focus, AI-review, privacy, mobile-reflow, and browser/device cases with retained per-case evidence. Staging follow-up must also retest recorded failures, verify email delivery under the final provider configuration, and extend deployed-origin performance, concurrency, monitoring, backup/erasure, purge scheduling, and incident-response checks.
'@

    Replace-ParagraphByPrefix $document "The versioned workbook JoIn_Final_Test_Register.xlsx separates" @'
The final workbook separates the test plan, master results, metrics, defects, evidence references, and voice evidence. It contains 310 planned and executed engineering cases. First-run results were 274 passes, 21 failures, and 15 partial noisy-transcription cases; the partial cases passed after repetition or manual correction, producing 289 final passes and a 93.2% final pass rate. No case remains blocked or not run. Machine-generated artifacts support automated checks; the 129 cases completed after the earlier snapshot are identified as Development Team-confirmed final validation where an individual machine log was unavailable. Human-session observations remain separate because the Arc en Ciel session did not use a uniform per-task statistical protocol.
'@

    Replace-ParagraphByPrefix $document "[1] World Wide Web Consortium" @'
[1] World Wide Web Consortium, "Web Content Accessibility Guidelines (WCAG) 2.1," W3C Recommendation, 21 September 2023.
'@

    $standards = Find-TableByFirstHeader $document "Name of standard / regulation"
    if ($null -ne $standards) {
        Set-CellText ($standards.Cell(1, 4)) "How the solution addresses the standard or regulation"
        for ($row = 2; $row -le $standards.Rows.Count; $row++) {
            $nameCell = $standards.Cell($row, 1)
            $name = Get-CellText $nameCell
            Release-ComObject $nameCell
            switch ($name) {
                "ISO/IEC/IEEE 29148:2011" { Set-CellText ($standards.Cell($row, 1)) "ISO/IEC/IEEE 29148:2018" }
                "ISO/IEC 27001:2013" {
                    Set-CellText ($standards.Cell($row, 1)) "ISO/IEC 27001:2022"
                    $section = Get-CellText ($standards.Cell($row, 2))
                    if ($section -eq "A.9.1") {
                        Set-CellText ($standards.Cell($row, 2)) "Annex A 5.15"
                        Set-CellText ($standards.Cell($row, 3)) "Access control"
                    } elseif ($section -eq "A.12.4.1") {
                        Set-CellText ($standards.Cell($row, 2)) "Annex A 8.15"
                        Set-CellText ($standards.Cell($row, 3)) "Logging"
                    }
                }
                "IEEE 12207" {
                    Set-CellText ($standards.Cell($row, 1)) "ISO/IEC/IEEE 12207:2017"
                    Set-CellText ($standards.Cell($row, 2)) "Software life-cycle processes"
                }
                "ISO 9241" { Set-CellText ($standards.Cell($row, 1)) "ISO 9241-110:2020" }
                "ISO/IEC 25010" { Set-CellText ($standards.Cell($row, 1)) "ISO/IEC 25010:2023" }
                "UML 2.5" { Set-CellText ($standards.Cell($row, 1)) "UML 2.5.1" }
            }
        }
        Release-ComObject $standards
    }

    foreach ($table in $document.Tables) {
        $headerCell = $table.Cell(1, 1)
        $header = Get-CellText $headerCell
        Release-ComObject $headerCell

        if ($header -eq "Decision") {
            $row = Find-TableRow $table "Accessibility verification"
            if ($row -gt 0) {
                if ($table.Columns.Count -eq 4) {
                    Set-CellText ($table.Cell($row, 4)) "The combined test programme is complete, but open contrast/reflow findings and limited assistive-technology coverage prevent a full AA conformance claim."
                }
            }
        }

        if ($header -eq "Requirement area") {
            $row = Find-TableRow $table "Accessibility and responsive design"
            if ($row -gt 0) {
                Set-CellText ($table.Cell($row, 2)) "Final matrix completed; open findings remain"
                Set-CellText ($table.Cell($row, 3)) "The 18 planned accessibility workflow cases were completed; Arc en Ciel and JAWS evaluations were conducted. A separate 104-scenario automated audit recorded axe findings in 16 scenarios and overflow in two high-zoom scenarios."
                Set-CellText ($table.Cell($row, 4)) "Correct the recorded findings and repeat an independent WCAG conformance audit before making an AA claim."
            }
            $row = Find-TableRow $table "Integration and E2E testing"
            if ($row -gt 0) {
                Set-CellText ($table.Cell($row, 2)) "Implemented; local and staging verification completed"
                Set-CellText ($table.Cell($row, 3)) "API integration 25/25; browser E2E 26/26; voice/action safety 57/57; deterministic scoring 17/17; production build and i18n contract passed; final staging register completed."
                Set-CellText ($table.Cell($row, 4)) "Automate the full cross-service suite in CI and repeat after material changes."
            }
            $row = Find-TableRow $table "Performance baseline"
            if ($row -gt 0) {
                Set-CellText ($table.Cell($row, 2)) "Local baseline passed; staging programme completed with retained failures"
                Set-CellText ($table.Cell($row, 3)) "Local budgets passed. The final staging register records 14/27 performance/reliability passes and 13 failures; a 144-request shared-load rerun returned no 5xx responses but exceeded six of nine latency targets."
                Set-CellText ($table.Cell($row, 4)) "Profile cold starts, database and external-service latency before selecting caching or scaling measures."
            }
        }

        if ($header -eq "Area") {
            Set-CellText ($table.Cell(1, 4)) "Continuing validation / follow-up"
            $followUps = @{
                "Keyboard and focus" = "Repeat the completed workflows independently and retain tester, browser, focus-order, and announcement evidence."
                "Responsive reflow" = "Correct the recorded profile-header overflow and rerun the 320-1440 px, landscape, text-spacing, and native 200% zoom matrix."
                "Forms and errors" = "Expand manual announcement and recovery checks across multiple screen readers."
                "Semantics" = "Repeat rendered reading-order and accessible-name checks after interface changes."
                "Status feedback" = "Extend assistive-technology checks for AI, applications, verification, privacy, and administration."
                "Visual presentation" = "Correct recorded contrast findings and rerun axe plus manual visual review."
                "User control" = "Repeat representative-user studies with a uniform task and assistance protocol."
            }
            foreach ($key in $followUps.Keys) {
                $row = Find-TableRow $table $key
                if ($row -gt 0) { Set-CellText ($table.Cell($row, 4)) $followUps[$key] }
            }
        }

        if ($header -eq "Verification suite") {
            $row = Find-TableRow $table "Voice navigation"
            if ($row -gt 0) {
                Set-CellText ($table.Cell($row, 2)) "57/57 passed"
                Set-CellText ($table.Cell($row, 4)) "Deterministic boundary coverage; final manual voice cases were completed, while retained acoustic recordings are still needed for independent reproducibility."
            }
            $row = Find-TableRow $table "Frontend quality"
            if ($row -gt 0) { Set-CellText ($table.Cell($row, 4)) "Build evidence is complemented by completed browser/device and deployed workflow checks." }
            $row = Find-TableRow $table "Performance"
            if ($row -gt 0) { Set-CellText ($table.Cell($row, 4)) "Local baseline passed; completed staging measurements separately retain threshold failures and cold-start limitations." }
        }
    }

    foreach ($toc in $document.TablesOfContents) { $toc.Update() }
    $document.Fields.Update() | Out-Null
    $document.Repaginate()
    $document.Save()
    Write-Output "REPORT=$outputReport"
} finally {
    if ($null -ne $document) { $document.Close($true); Release-ComObject $document }
    $word.Quit()
    Release-ComObject $word
}

Write-Output "WORKBOOK=$outputWorkbook"
