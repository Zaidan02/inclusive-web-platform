param(
    [string] $OutputPath
)

$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $scriptDirectory '..\..'))
$helperScript = Join-Path $scriptDirectory 'New-ProgressPresentation.ps1'

if (-not $OutputPath) {
    $OutputPath = Join-Path $repositoryRoot 'artifacts\JoIn_Hospitality_FUTURE_WORK_AND_CONCLUSION_SLIDES.pptx'
}

$pdfOutputPath = [IO.Path]::ChangeExtension($OutputPath, '.pdf')
$previewDirectory = Join-Path $repositoryRoot 'artifacts\JoIn_Hospitality_FUTURE_WORK_AND_CONCLUSION_SLIDES_PNG'

# This helper refuses to run if an interactive PowerPoint process is open.
. $helperScript -OutputPath $OutputPath -HelpersOnly

$universityLogoPath = Join-Path $repositoryRoot 'artifacts\submitted-progress-assets\page_1_image_0.png'

function Add-FinalFrame($Slide, [string] $Section, [string] $Title, [string] $Subtitle, [string] $Number) {
    $Slide.Background.Fill.ForeColor.RGB = $warmLight
    $Slide.Background.Fill.Solid()
    [void](Add-Box $Slide 0 0 960 8 $blue $blue)
    [void](Add-Text $Slide $Section.ToUpperInvariant() 48 27 500 18 9 $rust $true 'Aptos')
    [void](Add-Text $Slide $Title 48 50 820 43 27 $navy $true 'Aptos Display')
    [void](Add-Text $Slide $Subtitle 48 96 830 28 10.2 $muted $false 'Aptos')
    if (Test-Path -LiteralPath $universityLogoPath) {
        $logo = Add-Image $Slide $universityLogoPath 858 22 56 25 'Universite Saint-Joseph and ESIB mark'
        $logo.Line.Visible = 0
    }
    [void](Add-Line $Slide 48 508 912 508 $line 0.8)
    [void](Add-Text $Slide 'INCLUSIVE WEB PLATFORM | FINAL ENGINEERING PRESENTATION | 14 SEP 2026' 48 515 710 14 7.2 $muted $false 'Aptos')
    [void](Add-Text $Slide $Number 866 514 46 14 8 $rust $true 'Aptos' 3)
}

function Add-RoadmapCard(
    $Slide,
    [string] $Phase,
    [string] $Title,
    [string] $Text,
    [double] $X,
    [int] $Accent
) {
    [void](Add-Box $Slide $X 155 270 262 $white $line 5)
    [void](Add-Box $Slide $X 155 7 262 $Accent $Accent)
    [void](Add-Tag $Slide $Phase ($X + 21) 174 92 $Accent)
    [void](Add-Text $Slide $Title ($X + 21) 216 228 42 16 $Accent $true 'Aptos Display')
    [void](Add-Text $Slide $Text ($X + 21) 274 228 124 10.2 $ink $false 'Aptos')
}

# Slide 1 - Future work
$slide = $presentation.Slides.Add(1, 12)
Add-FinalFrame $slide 'Future work' 'From validated staging prototype to production readiness' 'Future development is prioritised by measured defects, operational risk and real user needs.' 'F1'

Add-RoadmapCard $slide 'NEAR TERM' 'Quality and accessibility' "+ Correct retained AI extraction, contrast, reflow and upload findings`n+ Independent WCAG 2.1 AA audit`n+ Broader JAWS, NVDA, mobile and real-user validation" 48 $green
Add-RoadmapCard $slide 'MEDIUM TERM' 'Production and cost control' "+ Non-sleeping services, monitoring and recovery`n+ Per-user AI/voice quotas and budget alerts`n+ Profile queries, add indexes, then cache only repeated non-sensitive reads" 345 $blue
Add-RoadmapCard $slide 'LONG TERM' 'Product evolution' "+ Accessible RAG chatbot using verified knowledge`n+ Human-controlled AI interview preparation`n+ More hospitality roles, training programs and employer partnerships" 642 $rust

[void](Add-Box $slide 102 442 756 43 $navy $navy 4)
[void](Add-Text $slide 'Scale and automation will follow measured evidence; accessibility, explainability and human control remain mandatory.' 128 454 704 18 10 $white $true 'Aptos' 2)
Add-Notes $slide '30 seconds. Future work is ordered by engineering risk. First close retained quality and accessibility findings. Next strengthen production operations and control paid AI usage. Only then expand the product with a verified-knowledge chatbot and human-controlled interview assistance.'

# Slide 2 - Conclusion
$slide = $presentation.Slides.Add(2, 12)
Add-FinalFrame $slide 'Conclusion' 'A validated bridge from ability to opportunity' 'The contribution is a tested engineering platform with explicit evidence, limitations and human control.' 'F2'

[void](Add-Box $slide 48 150 500 306 $white $line 5)
[void](Add-Box $slide 48 150 7 306 $green $green)
[void](Add-Text $slide 'Delivered engineering contribution' 76 174 420 28 17 $green $true 'Aptos Display')
[void](Add-Text $slide "+ Accessible English, French and Arabic role workflows`n+ Protected Symfony security and business boundary`n+ Deterministic, explainable task-level matching`n+ Candidate-controlled AI and bounded voice assistance`n+ PostgreSQL data and purpose-specific object storage`n+ Repeatable cloud staging and retained verification evidence" 76 226 430 176 11 $ink $false 'Aptos')

[void](Add-Box $slide 580 150 332 306 $navy $navy 5)
[void](Add-Text $slide 'Evidence at final evaluation' 605 174 282 28 17 $white $true 'Aptos Display' 2)
[void](Add-Text $slide '4' 610 229 62 32 25 $white $true 'Aptos Display' 2)
[void](Add-Text $slide 'protected roles' 682 236 90 18 9.4 (ConvertTo-Rgb '#DDE7F5') $true 'Aptos')
[void](Add-Text $slide '3' 610 281 62 32 25 $white $true 'Aptos Display' 2)
[void](Add-Text $slide 'interface languages' 682 288 130 18 9.4 (ConvertTo-Rgb '#DDE7F5') $true 'Aptos')
[void](Add-Text $slide '310' 610 333 62 32 25 $white $true 'Aptos Display' 2)
[void](Add-Text $slide 'executed staging cases' 682 340 160 18 9.4 (ConvertTo-Rgb '#DDE7F5') $true 'Aptos')
[void](Add-Text $slide '93.2%' 610 385 75 32 23 $green $true 'Aptos Display' 2)
[void](Add-Text $slide 'final staging pass rate' 696 392 155 18 9.4 (ConvertTo-Rgb '#DDE7F5') $true 'Aptos')
[void](Add-Text $slide 'Human validation: 20-person Arc en Ciel session plus a separate JAWS workflow.' 610 426 270 22 8.6 $green $true 'Aptos' 2)

[void](Add-Text $slide 'JoIn Hospitality demonstrates that inclusive recruitment can be engineered through accessible interaction, task-level evidence, deterministic decisions and human oversight.' 100 475 760 23 10.5 $navy $true 'Aptos' 2)
Add-Notes $slide '25 seconds. Conclude that the project is more than a user interface: it combines accessible interaction, protected workflows, explainable matching, controlled AI, deployment and measured verification. The evidence supports technical feasibility and practical relevance without claiming universal accessibility or production scale.'

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null
New-Item -ItemType Directory -Force -Path $previewDirectory | Out-Null

$presentation.SaveAs($OutputPath, 24)
$presentation.SaveAs($pdfOutputPath, 32)
$presentation.Slides.Item(1).Export((Join-Path $previewDirectory 'Future-Work.png'), 'PNG', 1920, 1080)
$presentation.Slides.Item(2).Export((Join-Path $previewDirectory 'Conclusion.png'), 'PNG', 1920, 1080)

$presentation.Close()
$powerPoint.Quit()
[Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null
[Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null
[GC]::Collect()
[GC]::WaitForPendingFinalizers()

Write-Output "Presentation: $OutputPath"
Write-Output "PDF: $pdfOutputPath"
Write-Output "Previews: $previewDirectory"

