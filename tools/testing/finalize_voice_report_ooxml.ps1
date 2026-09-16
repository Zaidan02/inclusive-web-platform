param(
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$artifacts = Join-Path $RepositoryRoot "artifacts"
$source = Join-Path $artifacts "FYP_CCE_FINAL_REPORT_COMPLETE_Zaidan_Mansour_Charbel_Rizk_2026-09-10.docx"
$output = Join-Path $artifacts "FYP_CCE_FINAL_REPORT_SUBMISSION_READY_Zaidan_Mansour_Charbel_Rizk_2026-09-10.docx"

if (-not (Test-Path -LiteralPath $source)) { throw "Source report not found: $source" }
if (Test-Path -LiteralPath $output) { [IO.File]::Delete($output) }
[IO.File]::Copy($source, $output, $true)

$wordNamespace = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

function New-WordParagraph([xml]$document, [string]$text, [string]$style = "Normal", [bool]$pageBreak = $false, [bool]$code = $false) {
    $paragraph = $document.CreateElement("w", "p", $wordNamespace)
    $properties = $document.CreateElement("w", "pPr", $wordNamespace)
    $styleElement = $document.CreateElement("w", "pStyle", $wordNamespace)
    [void]$styleElement.SetAttribute("val", $wordNamespace, $style)
    [void]$properties.AppendChild($styleElement)
    if ($code) {
        $spacing = $document.CreateElement("w", "spacing", $wordNamespace)
        [void]$spacing.SetAttribute("before", $wordNamespace, "0")
        [void]$spacing.SetAttribute("after", $wordNamespace, "0")
        [void]$properties.AppendChild($spacing)
    }
    [void]$paragraph.AppendChild($properties)

    $run = $document.CreateElement("w", "r", $wordNamespace)
    if ($pageBreak) {
        $break = $document.CreateElement("w", "br", $wordNamespace)
        [void]$break.SetAttribute("type", $wordNamespace, "page")
        [void]$run.AppendChild($break)
    }
    if ($code) {
        $runProperties = $document.CreateElement("w", "rPr", $wordNamespace)
        $fonts = $document.CreateElement("w", "rFonts", $wordNamespace)
        [void]$fonts.SetAttribute("ascii", $wordNamespace, "Consolas")
        [void]$fonts.SetAttribute("hAnsi", $wordNamespace, "Consolas")
        [void]$runProperties.AppendChild($fonts)
        $size = $document.CreateElement("w", "sz", $wordNamespace)
        [void]$size.SetAttribute("val", $wordNamespace, "18")
        [void]$runProperties.AppendChild($size)
        [void]$run.AppendChild($runProperties)
    }
    $textNode = $document.CreateElement("w", "t", $wordNamespace)
    $textNode.InnerText = $text
    [void]$run.AppendChild($textNode)
    [void]$paragraph.AppendChild($run)
    return $paragraph
}

$stream = [IO.File]::Open($output, [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
$archive = New-Object IO.Compression.ZipArchive($stream, [IO.Compression.ZipArchiveMode]::Update, $false)
try {
    $entry = $archive.GetEntry("word/document.xml")
    if ($null -eq $entry) { throw "word/document.xml is missing" }
    $reader = New-Object IO.StreamReader($entry.Open())
    $documentText = $reader.ReadToEnd()
    $reader.Dispose()

    [xml]$document = $documentText
    $namespaces = New-Object Xml.XmlNamespaceManager($document.NameTable)
    $namespaces.AddNamespace("w", $wordNamespace)

    foreach ($textNode in $document.SelectNodes("//w:t", $namespaces)) {
        if ($textNode.InnerText.Contains("52/52")) {
            $textNode.InnerText = $textNode.InnerText.Replace("52/52", "57/57")
        }
        if ($textNode.InnerText.Contains("52 of 52")) {
            $textNode.InnerText = $textNode.InnerText.Replace("52 of 52", "57 of 57")
        }
    }

    foreach ($paragraph in @($document.SelectNodes("//w:p", $namespaces))) {
        $paragraphText = (($paragraph.SelectNodes(".//w:t", $namespaces) | ForEach-Object { $_.InnerText }) -join "")
        if ($paragraphText.StartsWith("The profile assistant exposes English, French, and Arabic. The voice-navigation command subsystem currently")) {
            $replacement = "The profile assistant and the voice-navigation command subsystem both expose English, French, and Arabic selection. The selected interface language is passed explicitly to transcription, classification, interpretation, and feedback. Automated tests cover French and Arabic routing and labelled profile abilities. Controlled acoustic evaluation is still required for accents, Lebanese Arabic, code-switching, background noise, microphone variation, and character-by-character inputs such as email addresses."
            foreach ($child in @($paragraph.ChildNodes)) {
                if ($child.LocalName -ne "pPr") { [void]$paragraph.RemoveChild($child) }
            }
            $run = $document.CreateElement("w", "r", $wordNamespace)
            $text = $document.CreateElement("w", "t", $wordNamespace)
            $text.InnerText = $replacement
            [void]$run.AppendChild($text)
            [void]$paragraph.AppendChild($run)
        }
    }

    $body = $document.SelectSingleNode("//w:body", $namespaces)
    $sectionProperties = $body.SelectSingleNode("w:sectPr", $namespaces)
    if ($null -eq $sectionProperties) { throw "Document section properties were not found" }

    $paragraphs = @(
        (New-WordParagraph $document "" "Normal" $true),
        (New-WordParagraph $document "APPENDIX L - VERIFIED VOICE PATH AND TRACE EXAMPLES" "Heading1"),
        (New-WordParagraph $document "L.1 Verified implementation path" "Heading2"),
        (New-WordParagraph $document "The report's voice examples were checked against the current React control, Flask orchestration code, Pydantic schemas, specialist registries and automated tests. The ordinary voice-navigation path is:"),
        (New-WordParagraph $document "Browser MediaRecorder (bounded WebM/Opus or Ogg) -> POST /api/voice/process -> Flask validation -> OpenAI transcription -> request classification -> navigation, interface-action or page-question specialist -> schema validation -> deterministic registry decision -> structured response -> fixed React action -> OpenAI speech or browser SpeechSynthesis feedback." "NoSpacing" $false $true),
        (New-WordParagraph $document "The request also carries the selected language, current page context and at most six sanitized structured turns. Symfony and the scoring engine are not part of an ordinary navigation turn. They remain authoritative only when the resulting registered interface action later calls a protected business API. The separate AI-profile path sends an authenticated request through Symfony, requires explicit consent, validates structured suggestions, and saves only candidate-confirmed items."),
        (New-WordParagraph $document "L.2 Correct command examples" "Heading2"),
        (New-WordParagraph $document "1. Navigation: 'Open my profile' -> classification navigation -> proposal NAVIGATE with target candidate_profile -> registry action route_and_tab('/candidate', 'PROFILE') -> React opens the candidate profile tab -> feedback is spoken and displayed."),
        (New-WordParagraph $document "2. Interface action: 'Set my email to person@example.com' on the sign-in page -> classification interface action -> SET_FIELD proposal for the registered email control -> the draft value is updated. Sensitive values are redacted in logs, and form submission still requires the registered validation/confirmation path."),
        (New-WordParagraph $document "3. Page question: 'How is my score calculated?' -> classification page question -> the question specialist receives bounded readable page context -> it returns a grounded answer -> no route or form action executes."),
        (New-WordParagraph $document "4. Rejected request: 'Open the secret admin page' from candidate context -> the target is absent from the candidate registry -> status rejected or permission_denied -> React performs no action and explains the rejection."),
        (New-WordParagraph $document "5. High-risk action: 'Submit my application' -> the registered action returns confirmation_required -> the candidate must explicitly confirm before React triggers the normal protected submission workflow."),
        (New-WordParagraph $document "L.3 Browser inspect-console example" "Heading2"),
        (New-WordParagraph $document "The following is an illustrative redacted trace using the exact console labels and the registered candidate_profile action. It demonstrates the expected structure; it is not presented as a captured acoustic trial:"),
        (New-WordParagraph $document '[VOICE AUDIO] Exact uploaded recording: { type: "audio/webm;codecs=opus", bytes: 18432, durationMs: 2300 }' "NoSpacing" $false $true),
        (New-WordParagraph $document '[VOICE STT] Transcript: Open my profile' "NoSpacing" $false $true),
        (New-WordParagraph $document '[VOICE CLASSIFIER] Category: { category: "navigation", language: "en", confidence: 0.99 }' "NoSpacing" $false $true),
        (New-WordParagraph $document '[VOICE INTENT] Proposal: { command: "NAVIGATE", target: "candidate_profile", language: "en" }' "NoSpacing" $false $true),
        (New-WordParagraph $document '[VOICE ROUTER] Decision: { status: "authorized", action: { type: "route_and_tab", value: "/candidate", tab: "PROFILE" } }' "NoSpacing" $false $true),
        (New-WordParagraph $document '[VOICE FEEDBACK] Text: Opening your profile.' "NoSpacing" $false $true),
        (New-WordParagraph $document "The browser also groups each turn by request ID. The backend emits one [VOICE PIPELINE] JSON trace containing context, transcript, language, classification, proposal, route and feedback. Raw audio bytes and API keys are not logged, and sensitive action values are redacted."),
        (New-WordParagraph $document "L.4 Final automated verification" "Heading2"),
        (New-WordParagraph $document "The final service rerun completed 57/57 tests successfully. Coverage includes registered navigation, role/context restrictions, unknown-target rejection, confirmation for sensitive actions, multilingual orchestration, Arabic imperfect-transcript profile abilities, English/French ability extraction, bounded profile context and bounded page-question context. Evidence: docs/testing/staging-2026-09-10/voice-service-unit-final.txt.")
    )
    foreach ($paragraph in $paragraphs) { [void]$body.InsertBefore($paragraph, $sectionProperties) }

    $entry.Delete()
    $newEntry = $archive.CreateEntry("word/document.xml", [IO.Compression.CompressionLevel]::Optimal)
    $writer = New-Object IO.StreamWriter($newEntry.Open(), (New-Object Text.UTF8Encoding($false)))
    $document.Save($writer)
    $writer.Dispose()
} finally {
    $archive.Dispose()
    $stream.Dispose()
}

Write-Output "SUBMISSION_REPORT=$output"
