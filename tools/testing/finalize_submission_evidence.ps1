param(
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
)

$ErrorActionPreference = "Stop"

function Release-ComObject([object]$Object) {
    if ($null -ne $Object -and [Runtime.InteropServices.Marshal]::IsComObject($Object)) {
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($Object)
    }
}

function Set-EvidenceRow($sheet, [int]$row, [object[]]$values) {
    for ($column = 1; $column -le $values.Count; $column++) {
        $sheet.Cells.Item($row, $column).Value2 = $values[$column - 1]
    }
}

function Add-WordParagraph($selection, [string]$text, [string]$style = "Normal", [int]$alignment = 0) {
    $selection.Style = $style
    $selection.ParagraphFormat.Alignment = $alignment
    $selection.TypeText($text)
    $selection.TypeParagraph()
}

function Add-WordImage($selection, [string]$path, [string]$caption, [string]$altText, [double]$maxWidth = 450, [double]$maxHeight = 470) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Evidence image not found: $path"
    }

    $selection.ParagraphFormat.Alignment = 1
    $shape = $selection.InlineShapes.AddPicture($path, $false, $true)
    $shape.LockAspectRatio = -1
    if ($shape.Width -gt $maxWidth) { $shape.Width = $maxWidth }
    if ($shape.Height -gt $maxHeight) { $shape.Height = $maxHeight }
    $shape.AlternativeText = $altText
    $shape.Title = $caption
    $selection.TypeParagraph()
    Add-WordParagraph $selection $caption "Caption" 1
    Add-WordParagraph $selection "Evidence reference: $($caption.Split(':')[0].Replace('Figure ', 'EV-'))" "Normal" 1
}

$artifacts = Join-Path $RepositoryRoot "artifacts"
$evidence = Join-Path $artifacts "report-evidence\final-evidence"
$sourceWorkbookPath = Join-Path $artifacts "JoIn_Final_Test_Register.xlsx"
$finalWorkbookPath = Join-Path $artifacts "JoIn_Final_Test_Register_FINAL_2026-09-10.xlsx"
$sourceReportPath = Join-Path $artifacts "FYP_CCE_FINAL_REPORT_UPDATED_Zaidan_Mansour_Charbel_Rizk_2026-09-10.docx"
$finalReportPath = Join-Path $artifacts "FYP_CCE_FINAL_REPORT_COMPLETE_Zaidan_Mansour_Charbel_Rizk_2026-09-10.docx"
$finalPdfPath = Join-Path $artifacts "FYP_CCE_FINAL_REPORT_COMPLETE_Zaidan_Mansour_Charbel_Rizk_2026-09-10.pdf"

foreach ($path in @($sourceWorkbookPath, $sourceReportPath, $evidence)) {
    if (-not (Test-Path -LiteralPath $path)) { throw "Required input not found: $path" }
}

# Finalize a copy of the open Excel register. The original working register remains open and unchanged.
$excel = [Runtime.InteropServices.Marshal]::GetActiveObject("Excel.Application")
$sourceWorkbook = $excel.Workbooks | Where-Object { $_.FullName -eq $sourceWorkbookPath } | Select-Object -First 1
if ($null -eq $sourceWorkbook) { throw "The source Excel register is not open: $sourceWorkbookPath" }

if (Test-Path -LiteralPath $finalWorkbookPath) {
    $openFinal = $excel.Workbooks | Where-Object { $_.FullName -eq $finalWorkbookPath } | Select-Object -First 1
    if ($null -ne $openFinal) { $openFinal.Close($false) }
    [IO.File]::Delete($finalWorkbookPath)
}

$sourceWorkbook.SaveCopyAs($finalWorkbookPath)
$finalWorkbook = $excel.Workbooks.Open($finalWorkbookPath)

try {
    $voiceSheet = $null
    foreach ($sheet in $finalWorkbook.Worksheets) {
        if ($sheet.Name -eq "Voice Evidence") { $voiceSheet = $sheet; break }
    }
    if ($null -eq $voiceSheet) {
        $voiceSheet = $finalWorkbook.Worksheets.Add()
        $voiceSheet.Name = "Voice Evidence"
    } else {
        $voiceSheet.Cells.Clear()
    }

    $voiceSheet.Cells.Item(1, 1).Value2 = "Voice Validation Evidence (Retrospective Qualitative Record)"
    $voiceSheet.Range("A1:G1").Merge()
    $voiceSheet.Range("A1:G1").Font.Bold = $true
    $voiceSheet.Range("A1:G1").Font.Size = 16
    $voiceSheet.Range("A1:G1").Interior.Color = 0x402000
    $voiceSheet.Range("A1:G1").Font.Color = 0xFFFFFF
    $voiceSheet.Cells.Item(2, 1).Value2 = "These observations summarize repeated development and post-deployment use reported by the project team. No fixed trial log was retained, so they are supporting evidence and are not included in the formal success-rate denominator."
    $voiceSheet.Range("A2:G2").Merge()
    $voiceSheet.Range("A2:G2").WrapText = $true

    $headers = @("Evidence ID", "Scope", "Condition", "Observed outcome", "Known limitation", "Evidence class", "Counted in formal percentage")
    Set-EvidenceRow $voiceSheet 4 $headers
    $voiceSheet.Range("A4:G4").Font.Bold = $true
    $voiceSheet.Range("A4:G4").Interior.Color = 0xD9EAF7

    $voiceRows = @(
        @("EV-VOICE-QUAL-001", "Navigation", "Quiet environment; clear microphone capture", "Repeated English, French and Arabic navigation use generally opened the intended registered view and returned visual/spoken feedback.", "No fixed sample count or retained per-command log.", "Retrospective qualitative", "No"),
        @("EV-VOICE-QUAL-002", "Interface commands", "Quiet environment; clear speech", "Registered form and interface commands generally completed when transcription preserved the intended wording.", "The observation does not prove accuracy for every command in the formal 60-case matrix.", "Retrospective qualitative", "No"),
        @("EV-VOICE-QUAL-003", "Environmental robustness", "Background noise or weak/unclear capture", "Occasional speech-to-text errors were observed when audio quality decreased.", "Acoustic accuracy depends on microphone quality, pronunciation and ambient noise.", "Retrospective qualitative", "No"),
        @("EV-VOICE-QUAL-004", "Character-by-character entry", "Email address or similar alphanumeric sequence", "Ordinary words were more reliable than isolated letters and symbols; email dictation could be misunderstood.", "Users should be able to edit the value and confirm it before any sensitive action.", "Retrospective qualitative", "No"),
        @("EV-VOICE-AUTO-001", "Authorization boundary", "Automated command-registry, orchestration, profile extraction and question-answering suite", "The final automated voice/profile service rerun passed 57 of 57 checks.", "This verifies deterministic authorization, multilingual routing and structured behavior, not microphone or acoustic accuracy.", "Reproducible automated", "Reported separately"),
        @("EV-VOICE-QUAL-005", "Overall interpretation", "Development and deployed staging use", "Voice support is promising and usable in favorable conditions, with graceful manual correction and confirmation needed for uncertain transcripts.", "A controlled microphone study with fixed scripts and retained recordings/transcripts remains future work.", "Engineering conclusion", "No")
    )
    $row = 5
    foreach ($values in $voiceRows) { Set-EvidenceRow $voiceSheet $row $values; $row++ }
    $voiceSheet.Range("A4:G10").Borders.LineStyle = 1
    $voiceSheet.Range("A4:G10").WrapText = $true
    $voiceSheet.Columns.Item(1).ColumnWidth = 22
    $voiceSheet.Columns.Item(2).ColumnWidth = 23
    $voiceSheet.Columns.Item(3).ColumnWidth = 35
    $voiceSheet.Columns.Item(4).ColumnWidth = 58
    $voiceSheet.Columns.Item(5).ColumnWidth = 54
    $voiceSheet.Columns.Item(6).ColumnWidth = 25
    $voiceSheet.Columns.Item(7).ColumnWidth = 24
    $voiceSheet.Rows.AutoFit() | Out-Null
    $voiceSheet.Range("A12:G12").Merge()
    $voiceSheet.Cells.Item(12, 1).Value2 = "Formal status: the 30 transcription and 60 voice-navigation rows remain unscored because a controlled per-case record was not completed. This prevents retrospective experience from being presented as invented quantitative evidence."
    $voiceSheet.Range("A12:G12").WrapText = $true
    $voiceSheet.Range("A12:G12").Font.Italic = $true

    $master = $finalWorkbook.Worksheets.Item("Master Register")
    for ($row = 2; $row -le $master.UsedRange.Rows.Count; $row++) {
        $area = [string]$master.Cells.Item($row, 2).Text
        if ($area -in @("Voice Transcription", "Voice Navigation")) {
            if ([string]::IsNullOrWhiteSpace([string]$master.Cells.Item($row, 12).Text)) {
                $master.Cells.Item($row, 12).Value2 = "Not formally scored before submission; see the Voice Evidence sheet for retained retrospective observations and automated safety evidence."
            }
            if ([string]::IsNullOrWhiteSpace([string]$master.Cells.Item($row, 13).Text)) {
                $master.Cells.Item($row, 13).Value2 = "EV-VOICE-QUAL-001 to EV-VOICE-QUAL-005; EV-VOICE-AUTO-001"
            }
        }
    }

    $metrics = $finalWorkbook.Worksheets.Item("Metrics")
    for ($row = 16; $row -le 24; $row++) {
        $metrics.Cells.Item($row, 10).Value2 = "Retrospective qualitative evidence only; no formal denominator. See Voice Evidence."
    }

    $index = $finalWorkbook.Worksheets.Item("Evidence Index")
    $evidenceRows = @(
        @("EV-PERF-006", "PERF-01, PERF-02 and PERF-07 groups", "JSON report", "docs/testing/staging-2026-09-10/safe-load-results-final.json", "Final non-destructive shared-load rerun after all four staging services returned HTTP 200.", "2026-09-10", "Development Team", "Yes", "144/144 responses succeeded with zero 5xx errors; 3/9 latency cases met their thresholds."),
        @("EV-VOICE-QUAL-001", "Voice transcription and navigation supporting evidence", "Qualitative test record", "Voice Evidence sheet in this workbook", "Repeated real use in quiet and noisy conditions, including limits for email character sequences.", "2026-09-10", "Development Team", "Yes", "Not included in quantitative success rates because no fixed trial count was retained."),
        @("EV-VOICE-AUTO-001", "Voice authorization/profile service", "Automated terminal log", "docs/testing/staging-2026-09-10/voice-service-unit-final.txt", "Deterministic command registry, orchestration, multilingual profile extraction and question-answering baseline.", "2026-09-10", "Development Team", "Yes", "57/57 automated checks passed; acoustic accuracy is outside this suite."),
        @("EV-AI-SCREEN-EN-001", "Representative AI profile output", "Screenshot", "artifacts/report-evidence/final-evidence/EV-AI-SCREEN-EN-001.png", "English deployed AI profile suggestion evidence.", "2026-09-10", "Development Team", "Yes", "Representative screenshot; matrix statistics remain in EV-AI-002."),
        @("EV-AI-SCREEN-FR-001", "Representative AI profile output", "Screenshot", "artifacts/report-evidence/final-evidence/EV-AI-SCREEN-FR-001.png", "French deployed AI profile suggestion evidence.", "2026-09-10", "Development Team", "Yes", "Representative screenshot; matrix statistics remain in EV-AI-002."),
        @("EV-AI-SCREEN-AR-001", "Representative AI profile output", "Screenshot", "artifacts/report-evidence/final-evidence/EV-AI-SCREEN-AR-001.png", "Arabic RTL deployed AI profile suggestion evidence.", "2026-09-10", "Development Team", "Yes", "Representative screenshot; matrix statistics remain in EV-AI-002."),
        @("EV-HUM-NOELLE-001", "JAWS field evaluation", "Field-test photograph", "artifacts/report-evidence/final-evidence/EV-HUM-NOELLE-001-JAWS.png", "Noelle Marie Gabrielle testing the platform with her adapted device and JAWS.", "2026-09-08", "Development Team", "Yes", "Publication should remain subject to the participant's authorization."),
        @("EV-DEP-RENDER-001", "Deployment evidence", "Screenshot", "artifacts/report-evidence/final-evidence/EV-DEP-RENDER-001-services-user.png", "Render Blueprint showing the frontend, API, voice and scoring resources deployed.", "2026-09-10", "Development Team", "Yes", "Captured from the staging project dashboard."),
        @("EV-DEP-SUPABASE-001", "Deployment evidence", "Screenshot", "artifacts/report-evidence/final-evidence/EV-DEP-SUPABASE-001-schema-user.png", "Supabase PostgreSQL schema visualizer showing deployed relational data structures.", "2026-09-10", "Development Team", "Yes", "No credentials or secret values are shown."),
        @("EV-DEP-SUPABASE-002", "Deployment evidence", "Screenshot", "artifacts/report-evidence/final-evidence/EV-DEP-SUPABASE-002-storage-user.png", "Supabase Storage showing configured buckets and upload restrictions.", "2026-09-10", "Development Team", "Yes", "Shows public logo storage and restricted application/verification document formats and limits.")
    )
    $row = 18
    foreach ($values in $evidenceRows) { Set-EvidenceRow $index $row $values; $row++ }
    $index.Range("A1:I27").WrapText = $true
    $index.Range("A18:I27").Borders.LineStyle = 1
    $index.Rows.AutoFit() | Out-Null

    $finalWorkbook.Save()
} finally {
    $finalWorkbook.Close($true)
    Release-ComObject $finalWorkbook
}

# Finalize a copy of the open Word report and append the consolidated engineering evidence.
$word = [Runtime.InteropServices.Marshal]::GetActiveObject("Word.Application")
$document = $word.Documents | Where-Object { $_.FullName -eq $sourceReportPath } | Select-Object -First 1
if ($null -eq $document) { throw "The source Word report is not open: $sourceReportPath" }

$document.Save()
$openFinalReport = $word.Documents | Where-Object { $_.FullName -eq $finalReportPath } | Select-Object -First 1
if ($null -ne $openFinalReport) { $openFinalReport.Close($false) }
if (Test-Path -LiteralPath $finalReportPath) { [IO.File]::Delete($finalReportPath) }
[IO.File]::Copy($sourceReportPath, $finalReportPath, $true)
$document = $word.Documents.Open($finalReportPath)
$selection = $word.Selection
$selection.EndKey(6) | Out-Null
$selection.InsertBreak(7)

Add-WordParagraph $selection "APPENDIX K - SYSTEM DESIGN PATTERNS AND CONSOLIDATED EVIDENCE" "Heading 1"
Add-WordParagraph $selection "K.1 Implemented system design patterns" "Heading 2"
Add-WordParagraph $selection "JoIn uses several complementary patterns rather than a single pattern. The patterns separate accessibility, business rules, persistence, AI interpretation and trusted execution so that each part can be tested and changed independently."

$patterns = @(
    @("Layered architecture / MVC", "React presents role-specific interfaces; Symfony controllers expose application APIs; Doctrine and PostgreSQL manage persistence; Python services isolate scoring and voice/profile interpretation.", "Clear boundaries reduce coupling and prevent the browser from becoming the authority for security or scoring."),
    @("Component-based presentation", "React layouts, controls and pages reuse accessible components, language state and role-aware navigation.", "Consistent keyboard behavior, validation and multilingual presentation can be maintained across screens."),
    @("Controller-Service-Repository", "Symfony controllers validate requests and coordinate injected services, while Doctrine repositories and entities encapsulate data access and relationships.", "HTTP concerns, business orchestration and persistence remain separately testable."),
    @("Adapter / Gateway", "OpenAI transcription, profile extraction and text-to-speech are accessed through bounded Python adapters with explicit contracts.", "External AI can be replaced or unavailable without giving it direct database or interface authority."),
    @("Strategy / Policy", "The scoring engine isolates weights, feasibility factors, assistance transformations and eligibility gates in a deterministic policy and engine.", "Rules are versionable, explainable and reproducible for identical inputs."),
    @("Pipeline", "Voice follows record -> transcribe -> classify -> authorize -> execute -> feedback. AI profile building follows consent -> interpret -> validate -> review -> confirm -> save.", "Each stage can expose timing, validation and failure evidence without hiding intermediate decisions."),
    @("Command Registry", "The AI proposes canonical voice commands, but a deterministic allowlisted registry maps only approved targets and actions to React behavior.", "Natural-language flexibility is retained while unauthorized routes, selectors and actions are rejected."),
    @("Finite state machine", "The voice interface controls idle, recording, processing, speaking, confirmation, cancellation and error states.", "Mutually exclusive states prevent duplicate capture, unsafe overlap and confusing feedback."),
    @("Schema validation / DTO", "Pydantic structured outputs and Symfony validation normalize multilingual input into canonical fields and codes.", "Malformed or unsupported AI output is rejected before it can affect a profile or workflow."),
    @("Audit and immutable snapshot", "Consent, verifier decisions, application state changes and compatibility snapshots retain the decision context and time.", "Important outcomes remain traceable even if catalogues or profiles later change.")
)

$table = $document.Tables.Add($selection.Range, $patterns.Count + 1, 3)
$table.Style = "Table Grid"
$table.Cell(1, 1).Range.Text = "Pattern"
$table.Cell(1, 2).Range.Text = "Implementation in JoIn"
$table.Cell(1, 3).Range.Text = "Engineering value"
$table.Rows.Item(1).Range.Bold = 1
for ($index = 0; $index -lt $patterns.Count; $index++) {
    for ($column = 0; $column -lt 3; $column++) {
        $table.Cell($index + 2, $column + 1).Range.Text = $patterns[$index][$column]
    }
}
$selection.SetRange($table.Range.End, $table.Range.End)
$selection.TypeParagraph()

Add-WordParagraph $selection "K.2 Final shared staging verification" "Heading 2"
Add-WordParagraph $selection "On 10 September 2026, the public frontend, Symfony API, voice/profile service and deterministic scoring service each returned HTTP 200 before the final shared-load rerun. The non-destructive rerun issued 144 requests across sign-in, profile loading and opportunity loading at concurrency levels 1, 5 and 10. All 144 responses were successful and no server error occurred. Three of nine latency cases met the project thresholds; the remaining six exceeded them, principally sign-in and opportunity listing on the free staging capacity. This separates functional reliability from performance: output availability was 100%, while the measured latency target was not consistently met. Evidence: EV-PERF-006."

Add-WordParagraph $selection "K.3 Voice validation interpretation" "Heading 2"
Add-WordParagraph $selection "Repeated development and post-deployment use showed that navigation and registered interface commands generally succeeded in a quiet environment with clear microphone capture. When background noise increased or capture quality decreased, occasional speech-to-text errors occurred. Character-by-character values such as email addresses were more fragile than ordinary words because isolated letters and symbols can be confused by transcription. The design mitigates these limitations through editable values, visual and spoken feedback, confirmation for sensitive actions, cancellation, and deterministic command authorization. The final automated voice/profile service rerun passed 57/57 checks, covering command authorization, orchestration, multilingual profile extraction and bounded page-question context; it verifies structured behavior rather than microphone accuracy. Because no fixed per-trial voice log was retained, these observations are reported as qualitative evidence and are not converted into a fabricated success percentage. A future controlled study should use fixed scripts, defined noise levels, multiple microphones and retained expected-versus-actual transcripts."

Add-WordParagraph $selection "K.4 Human and deployment evidence" "Heading 2"
Add-WordImage $selection (Join-Path $evidence "EV-HUM-NOELLE-001-JAWS.png") "Figure K.1: Noelle Marie Gabrielle conducting the accessibility workflow on her adapted device with JAWS." "Rear view of Noelle Marie Gabrielle using a laptop during the JAWS accessibility evaluation." 320 430
Add-WordParagraph $selection "The field observation recorded successful navigation, form understanding, registration and job-application interaction with JAWS on the participant's familiar device. The photograph is evidence of the session; retention and publication should remain subject to participant authorization."

Add-WordImage $selection (Join-Path $evidence "EV-DEP-RENDER-001-services-user.png") "Figure K.2: Render Blueprint evidence for the four deployed staging resources." "Render dashboard showing deployed API, voice, scoring and static frontend resources." 460 330
Add-WordParagraph $selection "The Blueprint separates the static frontend from the Dockerized API, voice/profile and scoring services. The application services are hosted in Frankfurt and the static site is distributed globally."

Add-WordImage $selection (Join-Path $evidence "EV-DEP-SUPABASE-001-schema-user.png") "Figure K.3: Supabase PostgreSQL schema visualizer for the deployed staging database." "Supabase schema visualizer showing candidate profile, job definition, job post and job application relationships." 460 330
Add-WordParagraph $selection "The schema evidence confirms that the deployed environment uses relational structures for candidate profiles, controlled job definitions, catalogue tasks, offers, applications and auditable outcome events."

Add-WordImage $selection (Join-Path $evidence "EV-DEP-SUPABASE-002-storage-user.png") "Figure K.4: Supabase Storage buckets and enforced upload limits." "Supabase Storage screen showing employer logos, application documents and candidate verification buckets with file-size and MIME restrictions." 460 330
Add-WordParagraph $selection "The storage configuration separates public employer logos from application and verification documents and applies explicit file-size and MIME-type restrictions. Authorization remains enforced by the application and storage access configuration."

Add-WordParagraph $selection "K.5 Multilingual AI profile evidence" "Heading 2"
Add-WordParagraph $selection "The following screenshots provide representative deployed evidence for English, French and Arabic profile interpretation. They complement the 60-case structured matrix (53 passed, 7 failed, 0 blocked) and do not replace its quantitative results."
Add-WordImage $selection (Join-Path $evidence "EV-AI-SCREEN-EN-001.png") "Figure K.5: English AI profile suggestions after explicit consent." "English candidate profile page showing editable AI-generated structured suggestions." 460 420
Add-WordImage $selection (Join-Path $evidence "EV-AI-SCREEN-FR-001.png") "Figure K.6: French AI profile suggestions after explicit consent." "French candidate profile page showing editable AI-generated structured suggestions." 460 420
Add-WordImage $selection (Join-Path $evidence "EV-AI-SCREEN-AR-001.png") "Figure K.7: Arabic RTL AI profile suggestions after explicit consent." "Arabic right-to-left candidate profile page showing editable AI-generated structured suggestions." 460 420

foreach ($toc in $document.TablesOfContents) { $toc.Update() }
$document.Fields.Update() | Out-Null
$document.Repaginate()
$document.Save()
$document.ExportAsFixedFormat($finalPdfPath, 17)

Write-Output "FINAL_WORKBOOK=$finalWorkbookPath"
Write-Output "FINAL_REPORT=$finalReportPath"
Write-Output "FINAL_PDF=$finalPdfPath"
