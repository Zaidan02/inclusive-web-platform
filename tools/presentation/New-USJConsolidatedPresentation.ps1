param(
    [string] $OutputPath
)

$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $scriptDirectory '..\..'))
$helperScript = Join-Path $scriptDirectory 'New-ProgressPresentation.ps1'
if (-not $OutputPath) {
    $OutputPath = Join-Path $repositoryRoot 'artifacts\Inclusive_Web_Platform_USJ_CONSOLIDATED_FINAL_PRESENTATION_Zaidan_Charbel_2026-09-14.pptx'
}
$pdfPath = [IO.Path]::ChangeExtension($OutputPath, '.pdf')
$previewDirectory = Join-Path $repositoryRoot 'artifacts\usj-consolidated-presentation-preview'

# Creates the PowerPoint application, a blank 16:9 presentation, the palette,
# and the low-level drawing helpers used below.
. $helperScript -OutputPath $OutputPath -HelpersOnly

$usjLogoPath = Join-Path $repositoryRoot 'artifacts\submitted-progress-assets\page_1_image_0.png'
$joinLogoPath = Join-Path $repositoryRoot 'artifacts\submitted-progress-assets\page_1_image_1.png'
$candidateMatchPath = Join-Path $repositoryRoot 'docs\presentation\assets\03-candidate-matching.png'
$candidateProfilePath = Join-Path $repositoryRoot 'docs\presentation\assets\04-candidate-profile.png'
$employerRequirementsPath = Join-Path $repositoryRoot 'docs\presentation\assets\05-employer-requirements.png'
$renderEvidencePath = Join-Path $repositoryRoot 'artifacts\report-evidence\final-evidence\EV-DEP-RENDER-001-services-user.png'
$supabaseStoragePath = Join-Path $repositoryRoot 'artifacts\report-evidence\final-evidence\EV-DEP-SUPABASE-002-storage-user.png'
$aiEnglishPath = Join-Path $repositoryRoot 'artifacts\report-evidence\final-evidence\EV-AI-SCREEN-EN-001.png'
$aiFrenchPath = Join-Path $repositoryRoot 'artifacts\report-evidence\final-evidence\EV-AI-SCREEN-FR-001.png'
$aiArabicPath = Join-Path $repositoryRoot 'artifacts\report-evidence\final-evidence\EV-AI-SCREEN-AR-001.png'
$arcGroupPath = Join-Path $repositoryRoot 'artifacts\report-evidence\human-evaluation\EV-HUM-002-P02-group-session.jpeg'
$arcP01Path = Join-Path $repositoryRoot 'artifacts\report-evidence\human-evaluation\EV-HUM-001-P01-arabic-profile.jpeg'
$noellePath = Join-Path $repositoryRoot 'artifacts\report-evidence\final-evidence\EV-HUM-NOELLE-001-JAWS.png'

$taupe = ConvertTo-Rgb '#B7AA9B'
$taupeLight = ConvertTo-Rgb '#E8E1D8'
$softBlue = ConvertTo-Rgb '#EAF2FC'
$softGreen = ConvertTo-Rgb '#EAF6F1'
$softRust = ConvertTo-Rgb '#FAEFEA'
$softAmber = ConvertTo-Rgb '#FBF3E6'

# Keep every textbox inside its requested geometry and expand compact `n
# markers into real line breaks.
function Add-Text($Slide, [string] $Text, [double] $X, [double] $Y, [double] $Width, [double] $Height, [double] $Size = 18, [int] $Color = $ink, [bool] $Bold = $false, [string] $Font = 'Aptos', [int] $Align = 1) {
    $shape = $Slide.Shapes.AddTextbox(1, $X, $Y, $Width, $Height)
    $shape.TextFrame.MarginLeft = 0
    $shape.TextFrame.MarginRight = 0
    $shape.TextFrame.MarginTop = 0
    $shape.TextFrame.MarginBottom = 0
    $shape.TextFrame.WordWrap = -1
    $shape.TextFrame.AutoSize = 0
    try { $shape.TextFrame2.AutoSize = 0 } catch {}
    $shape.TextFrame.TextRange.Text = ($Text -replace '`n', "`n")
    $shape.TextFrame.TextRange.Font.Name = $Font
    $shape.TextFrame.TextRange.Font.Size = $Size
    $shape.TextFrame.TextRange.Font.Color.RGB = $Color
    $shape.TextFrame.TextRange.Font.Bold = if ($Bold) { -1 } else { 0 }
    $shape.TextFrame.TextRange.ParagraphFormat.Alignment = $Align
    return $shape
}

function Add-ImageContainedLarge(
    $Slide,
    [string] $Path,
    [double] $X,
    [double] $Y,
    [double] $Width,
    [double] $Height,
    [string] $AltText,
    [bool] $Frame = $true
) {
    if (-not (Test-Path $Path)) { return $null }
    if ($Frame) { [void](Add-Box $Slide $X $Y $Width $Height $white $line 4) }
    $picture = $Slide.Shapes.AddPicture($Path, $false, $true, 0, 0, -1, -1)
    $picture.LockAspectRatio = -1
    $aspect = $picture.Width / $picture.Height
    $frameAspect = ($Width - 8) / ($Height - 8)
    if ($aspect -ge $frameAspect) { $picture.Width = $Width - 8 } else { $picture.Height = $Height - 8 }
    $picture.Left = $X + (($Width - $picture.Width) / 2)
    $picture.Top = $Y + (($Height - $picture.Height) / 2)
    $picture.AlternativeText = $AltText
    return $picture
}

function Add-ImageTopCrop(
    $Slide,
    [string] $Path,
    [double] $X,
    [double] $Y,
    [double] $Width,
    [double] $Height,
    [string] $AltText
) {
    if (-not (Test-Path $Path)) { return $null }
    [void](Add-Box $Slide $X $Y $Width $Height $white $line 5)
    $picture = $Slide.Shapes.AddPicture($Path, $false, $true, 0, 0, -1, -1)
    $picture.LockAspectRatio = -1
    $naturalWidth = $picture.Width
    $naturalHeight = $picture.Height
    $innerWidth = $Width - 8
    $innerHeight = $Height - 8
    $scale = $innerWidth / $naturalWidth
    $crop = $picture.PictureFormat.Crop
    $crop.ShapeWidth = $innerWidth
    $crop.ShapeHeight = $innerHeight
    $crop.PictureWidth = $naturalWidth * $scale
    $crop.PictureHeight = $naturalHeight * $scale
    $crop.PictureOffsetX = 0
    # Align the image top with the crop frame so the language, transcript,
    # consent and first structured suggestion remain legible.
    $crop.PictureOffsetY = (($crop.PictureHeight - $crop.ShapeHeight) / 2)
    $picture.Left = $X + 4
    $picture.Top = $Y + 4
    $picture.AlternativeText = $AltText
    return $picture
}

function Add-USJMotif($Slide) {
    [void](Add-Line $Slide 22 27 710 27 $taupe 2)
    $motifX = @(716, 758, 800, 842)
    $motifColors = @($navy, $navy, $taupe, $navy)
    for ($i = 0; $i -lt $motifX.Count; $i++) {
        [void](Add-Box $Slide $motifX[$i] 16 22 22 $motifColors[$i] $motifColors[$i])
    }
    if (Test-Path $usjLogoPath) {
        [void](Add-ImageContainedLarge $Slide $usjLogoPath 880 9 62 38 'Universite Saint-Joseph de Beyrouth and ESIB logo' $false)
    }
}

function Add-USJBaseSlide([string] $Section, [string] $Title, [int] $Number, [string] $Subtitle = '') {
    $slide = $presentation.Slides.Add($presentation.Slides.Count + 1, 12)
    $slide.Background.Fill.ForeColor.RGB = $white
    $slide.Background.Fill.Solid()
    Add-USJMotif $slide
    [void](Add-Text $slide $Section.ToUpperInvariant() 42 48 330 18 11 $rust $true 'Aptos')
    [void](Add-Text $slide $Title 42 70 850 38 28 $navy $true 'Aptos Display')
    if ($Subtitle) { [void](Add-Text $slide $Subtitle 42 110 856 30 18 $muted $false 'Aptos') }
    [void](Add-Box $slide 0 512 705 28 $taupe $taupe)
    [void](Add-Text $slide 'INCLUSIVE WEB PLATFORM  |  FINAL ENGINEERING PRESENTATION' 28 519 650 15 10 $white $true 'Aptos')
    $footerX = @(735, 775, 815, 855)
    foreach ($x in $footerX) { [void](Add-Box $slide $x 512 22 28 $taupe $taupe) }
    [void](Add-Box $slide 908 512 52 28 $taupe $taupe)
    [void](Add-Text $slide ([string]$Number) 921 517 24 16 11 $white $true 'Aptos' 3)
    return $slide
}

function Add-LargeCard(
    $Slide,
    [string] $Title,
    [string] $Text,
    [double] $X,
    [double] $Y,
    [double] $Width,
    [double] $Height,
    [int] $Accent,
    [int] $Fill = $white,
    [bool] $Dark = $false
) {
    [void](Add-Box $Slide $X $Y $Width $Height $Fill $line 6)
    [void](Add-Box $Slide $X $Y 8 $Height $Accent $Accent 3)
    $titleColor = if ($Dark) { $white } else { $Accent }
    $bodyColor = if ($Dark) { $white } else { $ink }
    [void](Add-Text $Slide $Title ($X + 22) ($Y + 16) ($Width - 38) 27 20 $titleColor $true 'Aptos Display')
    [void](Add-Text $Slide ($Text -replace '`n', "`n") ($X + 22) ($Y + 55) ($Width - 40) ($Height - 66) 18 $bodyColor $false 'Aptos')
}

function Add-CompactMetric($Slide, [string] $Value, [string] $Label, [double] $X, [double] $Y, [double] $Width, [int] $Accent) {
    [void](Add-Box $Slide $X $Y $Width 100 $white $line 5)
    [void](Add-Box $Slide $X $Y 7 100 $Accent $Accent)
    [void](Add-Text $Slide $Value ($X + 18) ($Y + 10) ($Width - 30) 31 25 $navy $true 'Aptos Display')
    [void](Add-Text $Slide $Label ($X + 18) ($Y + 48) ($Width - 32) 46 18 $muted $false 'Aptos')
}

function Add-FlowBox($Slide, [string] $Title, [string] $Text, [double] $X, [double] $Y, [double] $Width, [double] $Height, [int] $Accent, [bool] $Arrow = $false) {
    [void](Add-Box $Slide $X $Y $Width $Height $white $Accent 5)
    [void](Add-Box $Slide $X $Y $Width 7 $Accent $Accent)
    [void](Add-Text $Slide $Title ($X + 10) ($Y + 19) ($Width - 20) 25 18 $navy $true 'Aptos Display' 2)
    [void](Add-Text $Slide $Text ($X + 10) ($Y + 55) ($Width - 20) ($Height - 63) 18 $ink $false 'Aptos' 2)
    if ($Arrow) { [void](Add-Line $Slide ($X + $Width + 4) ($Y + ($Height / 2)) ($X + $Width + 24) ($Y + ($Height / 2)) $taupe 2.3 $true) }
}

function Add-SourceLine($Slide, [string] $Text) {
    [void](Add-Text $Slide $Text 42 491 830 12 9 $muted $false 'Aptos')
}

# 1 - Title
$slide = $presentation.Slides.Add(1, 12)
$slide.Background.Fill.ForeColor.RGB = $white
$slide.Background.Fill.Solid()
if (Test-Path $usjLogoPath) { [void](Add-ImageContainedLarge $slide $usjLogoPath 48 24 260 93 'Universite Saint-Joseph de Beyrouth and ESIB logo' $false) }
if (Test-Path $joinLogoPath) { [void](Add-ImageContainedLarge $slide $joinLogoPath 742 50 130 115 'JoIn Hospitality logo' $false) }
[void](Add-Box $slide 730 0 18 540 $navy $navy)
[void](Add-Box $slide 770 0 10 540 $taupe $taupe)
[void](Add-Box $slide 812 0 18 540 $navy $navy)
[void](Add-Box $slide 852 0 10 540 $taupe $taupe)
[void](Add-Text $slide 'INCLUSIVE EMPLOYMENT PLATFORM' 48 145 620 22 18 $rust $true 'Aptos')
[void](Add-Text $slide 'Accessible, AI-Assisted Recruitment for Persons with Physical Disabilities' 48 182 630 104 34 $navy $true 'Aptos Display')
[void](Add-Text $slide 'Final Engineering Presentation' 48 300 590 34 23 $blue $true 'Aptos Display')
[void](Add-Text $slide "Zaidan MANSOUR  |  Charbel RIZK`nComputer and Communications Engineering - Software Engineering" 48 362 620 58 18 $ink $true 'Aptos')
[void](Add-Text $slide "Supervisors: Dr. Jean Yves Youssef | Dr. Roger Obeid | Dr. Rima Kilany`n14 September 2026" 48 442 640 48 18 $muted $false 'Aptos')
[void](Add-Box $slide 0 512 705 28 $taupe $taupe)
[void](Add-Text $slide 'UNIVERSITE SAINT-JOSEPH DE BEYROUTH  |  ESIB' 28 519 640 15 10 $white $true 'Aptos')
Add-Notes $slide '20 seconds. Introduce both presenters, the supervisors, and the project. State that the platform connects verified abilities to real hospitality tasks while keeping people in control.'

# 2 - Problem
$slide = Add-USJBaseSlide 'Context and problem' 'Capability and opportunity remain disconnected' 2 'Inaccessible processes hide ability and reduce trust in task-level decisions.'
Add-CompactMetric $slide '1.3B' 'people with significant disability' 42 158 245 $blue
Add-CompactMetric $slide '30% lower' 'labour-market participation' 357 158 245 $rust
Add-CompactMetric $slide '>80%' 'inclusive-employer barrier' 672 158 245 $wine
[void](Add-Box $slide 100 282 760 150 $navy $navy 7)
[void](Add-Text $slide 'The engineering problem is not a lack of ability.' 135 310 690 34 25 $white $true 'Aptos Display' 2)
[void](Add-Text $slide 'It is the distance between accessible recruitment, verified candidate profiles, real job tasks, workplace support and employers prepared to evaluate ability.' 145 362 670 55 19 (ConvertTo-Rgb '#DDE7F5') $false 'Aptos' 2)
Add-SourceLine $slide 'Sources retained from the report: WHO; ILO Global Disability Summit 2025; Business Disability Forum / Evenbreak survey.'
Add-Notes $slide '55 seconds. Give the three numbers, then frame the issue carefully. JoIn reduces recruitment barriers; it does not claim to create jobs or solve unemployment by itself.'

# 3 - Related work
$slide = Add-USJBaseSlide 'Background research' 'Related approaches and the remaining gap' 3 'The project combines strengths that usually appear in separate solutions.'
Add-LargeCard $slide 'General portals' 'Large reach`nFamiliar workflow`nGeneric candidate profiles' 42 160 205 260 $blue $softBlue
Add-LargeCard $slide 'Inclusive portals' 'Targeted visibility`nEmployer awareness`nLimited task-level evidence' 266 160 205 260 $green $softGreen
Add-LargeCard $slide 'AI screening' 'Speed and scale`nBias and privacy risks`nOften opaque decisions' 490 160 205 260 $amber $softAmber
Add-LargeCard $slide 'Human coaching' 'Contextual judgement`nAdaptation expertise`nDifficult to scale digitally' 714 160 205 260 $wine $softRust
[void](Add-Text $slide 'JoIn gap: one accessible workflow joining controlled hospitality tasks, candidate abilities, workplace assistance, explainable matching and human review.' 85 444 790 40 19 $navy $true 'Aptos' 2)
Add-Notes $slide '50 seconds. Compare solution categories, not brands. The research gap is integration: accessible interaction, task evidence, explainability and human control in one workflow.'

# 4 - Lifecycle overview
$slide = Add-USJBaseSlide 'Genie logiciel' 'An iterative lifecycle with V-model traceability' 4 'Evolutionary delivery uses V-model traceability after every material change.'
$phases = @(
    @{X=42;N='01';T='Discover';D='Needs`nResearch`nStakeholders';C=$rust},
    @{X=270;N='02';T='Specify + design';D='FR / NFR`nArchitecture`nRisk controls';C=$blue},
    @{X=498;N='03';T='Build + integrate';D='React / Symfony`nPython services`nCloud staging';C=$green},
    @{X=726;N='04';T='Verify + evolve';D='Tests`nHuman validation`nMaintenance';C=$wine}
)
foreach($p in $phases) {
    [void](Add-Box $slide $p.X 165 190 238 $white $p.C 6)
    [void](Add-Text $slide $p.N ($p.X + 18) 184 44 28 24 $p.C $true 'Aptos Display')
    [void](Add-Text $slide $p.T ($p.X + 68) 187 104 28 20 $navy $true 'Aptos Display')
    [void](Add-Text $slide $p.D ($p.X + 24) 244 142 92 18 $ink $false 'Aptos' 2)
    if ($p.X -lt 700) { [void](Add-Line $slide ($p.X + 194) 284 ($p.X + 224) 284 $taupe 2.5 $true) }
}
[void](Add-Box $slide 122 428 716 52 $navy $navy 5)
[void](Add-Text $slide 'Traceability: stakeholder need -> requirement -> design -> code -> test oracle -> retained evidence' 150 444 660 22 18 $white $true 'Aptos' 2)
Add-Notes $slide '55 seconds. Name the course lifecycle. Explain that JoIn used evolutionary prototyping and iterative increments, with V-model-style requirement-to-test traceability in each cycle.'

# 5 - Needs and delivered scope
$slide = Add-USJBaseSlide 'Expression des besoins' 'Needs came from people, evidence and prototypes' 5 'Stakeholder needs shaped a focused, measurable Phase II delivery.'
Add-LargeCard $slide 'People' 'Candidates with varied access needs`nEmployers and hospitality teams`nVerifier and administrator roles' 42 158 266 198 $blue $softBlue
Add-LargeCard $slide 'Evidence' 'Phase I artefacts`nWCAG and domain research`nArc en Ciel and JAWS sessions' 347 158 266 198 $green $softGreen
Add-LargeCard $slide 'Techniques' 'Background study`nScenario observation`nIterative prototype review' 652 158 266 198 $rust $softRust
Add-CompactMetric $slide '4 roles' 'authorized workspaces' 42 383 200 $blue
Add-CompactMetric $slide '15 roles' 'hospitality positions' 267 383 200 $rust
Add-CompactMetric $slide '923' 'catalogue tasks' 492 383 200 $green
Add-CompactMetric $slide '3' 'interface languages' 717 383 200 $wine
Add-Notes $slide '55 seconds. Explain the sources and elicitation techniques, then use the four figures as delivery evidence. They describe the staging prototype, not production impact.'

# 6 - Functional requirements
$slide = Add-USJBaseSlide 'Specifications du logiciel' 'Functional requirements implemented by role' 6 'Four authorized workspaces coordinate one auditable recruitment workflow.'
Add-LargeCard $slide 'Candidate' 'Verify identity`nBuild accessible profile`nMatch, explore and apply' 42 160 205 270 $blue $softBlue
Add-LargeCard $slide 'Employer' 'Publish job or training`nSet tasks and support`nReview applications' 266 160 205 270 $green $softGreen
Add-LargeCard $slide 'Verifier' 'Review private evidence`nApprove or reject`nRecord an auditable decision' 490 160 205 270 $wine $softRust
Add-LargeCard $slide 'Administrator' 'Manage users and catalogue`nImport validated datasets`nMaintain controlled definitions' 714 160 205 270 $rust $softAmber
[void](Add-Text $slide 'Nominal, rejected-role and recovery flows were specified and tested.' 170 455 620 24 19 $navy $true 'Aptos' 2)
Add-Notes $slide '55 seconds. Walk across the four roles. Mention job and training opportunities, and stress that authorization is enforced by the backend rather than trusted to the interface.'

# 7 - Constraints and standards
$slide = Add-USJBaseSlide 'Specifications du logiciel' 'Quality constraints, standards and measurable evidence' 7 'Non-functional requirements were connected to controls and test evidence.'
Add-LargeCard $slide 'Accessibility' 'WCAG 2.1 AA target`nKeyboard + screen reader`nResponsive reflow' 42 160 205 256 $blue $softBlue
Add-LargeCard $slide 'Security + privacy' 'JWT and server RBAC`nPrivate evidence`nConsent and erasure' 266 160 205 256 $wine $softRust
Add-LargeCard $slide 'Reliability' 'Health endpoints`nRepeatable p50 / p95`nTransparent limitations' 490 160 205 256 $rust $softAmber
Add-LargeCard $slide 'Maintainability' 'Component boundaries`nVersioned policy`nThree stable locales' 714 160 205 256 $green $softGreen
[void](Add-Box $slide 85 434 790 52 $navy $navy 4)
[void](Add-Text $slide 'Constraint trade-off: stronger controls and external services can affect latency; correctness and performance are reported separately.' 105 441 750 42 18 $white $true 'Aptos' 2)
Add-Notes $slide '60 seconds. Define NFRs as measurable qualities. State WCAG as a target, not a certificate, and introduce the main trade-off between security/external dependencies and response time.'

# 8 - Architecture
$slide = Add-USJBaseSlide 'Conception' 'Cloud architecture with explicit trust boundaries' 8 'React presents; Symfony authorizes; specialist services stay isolated.'
Add-FlowBox $slide 'React / Vite' 'Accessible UI`nEN | FR | AR' 36 205 145 145 $blue $true
Add-FlowBox $slide 'Symfony API' 'JWT + RBAC`nValidation' 220 185 150 185 $rust $true
Add-FlowBox $slide 'PostgreSQL' 'Confirmed data`nAudit history' 410 150 150 125 $green $false
Add-FlowBox $slide 'Scoring' 'Deterministic`nExplainable' 410 315 150 125 $amber $false
Add-FlowBox $slide 'Voice + profile' 'Transcription`nStructured AI' 605 185 150 185 $wine $true
Add-FlowBox $slide 'OpenAI' 'External`nReplaceable' 795 205 125 145 $blue $false
[void](Add-Line $slide 370 230 410 210 $green 2 $true)
[void](Add-Line $slide 370 315 410 375 $amber 2 $true)
[void](Add-Line $slide 560 210 605 230 $wine 2 $true)
[void](Add-Text $slide 'Trust boundary: only Symfony may persist confirmed profile data or submit an official scoring payload.' 100 457 760 24 18 $navy $true 'Aptos' 2)
Add-Notes $slide '65 seconds. Walk left to right. React never authorizes itself. Symfony validates identity, role and payload. AI and scoring are separate services with different responsibilities.'

# 9 - Design and security
$slide = Add-USJBaseSlide 'Conception detaillee' 'Design decisions control complexity and sensitive data' 9 'Patterns address coupling, opacity, unsafe action and lost decision history.'
Add-LargeCard $slide 'Layered services' 'Controller - service - repository`nLow coupling and cohesive change' 42 160 410 122 $blue $softBlue
Add-LargeCard $slide 'Adapters + policy' 'Replaceable OpenAI boundary`nVersioned deterministic scoring' 508 160 410 122 $green $softGreen
Add-LargeCard $slide 'Command registry' 'Allowlisted voice actions`nRole and page authorization' 42 310 410 122 $rust $softAmber
Add-LargeCard $slide 'Privacy + audit' 'Private document storage`nConsent, retention and snapshots' 508 310 410 122 $wine $softRust
[void](Add-Text $slide 'Evidence: 51/51 route probes passed; one oversized-upload defect remains recorded.' 100 455 760 32 18 $navy $true 'Aptos' 2)
Add-Notes $slide '60 seconds. Connect each design choice to its risk. Finish with the security evidence and keep the open upload defect visible; a successful campaign should still expose defects.'

# 10 - Implementation and deployment
$slide = Add-USJBaseSlide 'Programmation et integration' 'Implemented services running on shared cloud staging' 10 'Versioned components deploy independently through infrastructure as code.'
[void](Add-ImageContainedLarge $slide $renderEvidencePath 42 155 410 240 'Render Blueprint showing deployed frontend, API, scoring, and voice profile services')
[void](Add-ImageContainedLarge $slide $supabaseStoragePath 508 155 410 240 'Supabase storage showing purpose-specific buckets and upload controls')
[void](Add-Text $slide 'Render Blueprint' 42 405 410 24 20 $navy $true 'Aptos Display' 2)
[void](Add-Text $slide 'React static site | Symfony API | scoring | voice/profile' 65 435 364 42 18 $ink $false 'Aptos' 2)
[void](Add-Text $slide 'Supabase data layer' 508 405 410 24 20 $navy $true 'Aptos Display' 2)
[void](Add-Text $slide 'PostgreSQL | private evidence | public employer logos' 531 435 364 42 18 $ink $false 'Aptos' 2)
Add-Notes $slide '60 seconds. Point to the four Render resources and the purpose-specific storage buckets. render.yaml and Docker boundaries make the integration reproducible. This is staging evidence, not a production SLA.'

# 11 - AI profile
$slide = Add-USJBaseSlide 'Programmation' 'AI-assisted profile: multilingual, advisory and reversible' 11 'The candidate remains in control from transcription to persistence.'
$aiSteps = @(
    @{X=42;T='Describe';D='Type or speak';C=$blue},
    @{X=218;T='Edit';D='Correct transcript';C=$green},
    @{X=394;T='Consent';D='Approve AI use';C=$rust},
    @{X=570;T='Review';D='Select or reject';C=$wine},
    @{X=746;T='Confirm';D='Backend saves';C=$amber}
)
for($i=0;$i -lt $aiSteps.Count;$i++){ $s=$aiSteps[$i]; Add-FlowBox $slide $s.T $s.D $s.X 158 145 106 $s.C ($i -lt $aiSteps.Count-1) }
[void](Add-ImageTopCrop $slide $aiEnglishPath 42 290 250 145 'English profile transcript, consent and structured suggestions')
[void](Add-ImageTopCrop $slide $aiFrenchPath 355 290 250 145 'French profile transcript, consent and structured suggestions')
[void](Add-ImageTopCrop $slide $aiArabicPath 668 290 250 145 'Arabic RTL profile transcript, consent and structured suggestions')
[void](Add-Box $slide 250 439 460 50 $navy $navy 4)
[void](Add-Text $slide '53/60 passed | 7 extraction defects retained | no automatic persistence' 270 445 420 40 18 $white $true 'Aptos' 2)
Add-Notes $slide '65 seconds. Explain editable transcript, explicit consent, review and backend validation. Then show deployed English, French and Arabic output. The principal retained weakness was preference extraction, not unsafe persistence.'

# 12 - Voice navigation
$slide = Add-USJBaseSlide 'Programmation' 'Voice navigation: flexible understanding, restricted execution' 12 'Natural language proposes an action; only the deterministic registry may authorize it.'
$voiceSteps = @(
    @{X=42;T='Record';D='Bounded audio';C=$blue},
    @{X=218;T='Transcribe';D='Editable text';C=$green},
    @{X=394;T='Interpret';D='Schema output';C=$rust},
    @{X=570;T='Authorize';D='Role + page';C=$wine},
    @{X=746;T='Execute';D='Fixed React action';C=$amber}
)
for($i=0;$i -lt $voiceSteps.Count;$i++){ $s=$voiceSteps[$i]; Add-FlowBox $slide $s.T $s.D $s.X 172 145 112 $s.C ($i -lt $voiceSteps.Count-1) }
Add-LargeCard $slide 'Safety boundary' 'Unknown routes and cross-role actions are rejected. Submission and reset require confirmation.' 42 320 410 125 $wine $softRust
Add-LargeCard $slide 'Evidence and limits' '57/57 registry checks passed. Noise and dictated email characters can still require correction.' 508 320 410 125 $green $softGreen
[void](Add-Text $slide 'Every voice operation keeps a keyboard and mouse equivalent.' 210 462 540 22 18 $navy $true 'Aptos' 2)
Add-Notes $slide '60 seconds. Separate acoustic quality from action safety. The deterministic registry authorizes commands; manual observations still show noise and character-by-character limitations.'

# 13 - Matching
$slide = Add-USJBaseSlide 'Algorithme de decision' 'Deterministic compatibility is explainable by construction' 13 'Controlled assessments produce reproducible task-level reasons.'
[void](Add-Box $slide 42 158 465 272 $navy $navy 7)
[void](Add-Text $slide 'Compatibility score' 72 184 405 28 22 $white $true 'Aptos Display')
[void](Add-Text $slide 'Sum(adjusted weight x feasibility factor)' 72 235 395 24 18 $white $true 'Aptos' 2)
[void](Add-Line $slide 92 270 457 270 (ConvertTo-Rgb '#DDE7F5') 1.5)
[void](Add-Text $slide 'Sum(adjusted weight) x 100' 72 284 395 24 18 $white $true 'Aptos' 2)
[void](Add-Text $slide "1.00 feasible`n0.75 feasible with offered assistance`n0.00 avoid; unsafe mandatory tasks remain gates" 78 330 390 86 18 (ConvertTo-Rgb '#DDE7F5') $false 'Aptos')
[void](Add-ImageContainedLarge $slide $candidateMatchPath 552 158 366 215 'Candidate compatibility result with task-level explanation')
Add-CompactMetric $slide '45 / 45' 'scoring cases passed' 590 390 290 $green
Add-Notes $slide '65 seconds. Explain the numerator, denominator and feasibility factors. The policy is appropriate because it is versionable, testable and individually explainable. Forty-five staging oracle cases passed.'

# 14 - Employer and recruitment flow
$slide = Add-USJBaseSlide 'Workflow integre' 'From controlled opportunity to auditable outcome' 14 'Candidates and employers contribute bounded choices; AI never creates a hiring decision.'
Add-FlowBox $slide 'Employer defines' 'Role, tasks, support' 42 175 175 132 $green $true
Add-FlowBox $slide 'Candidate explores' 'Jobs, training or both' 260 175 175 132 $blue $true
Add-FlowBox $slide 'System explains' 'Compatibility + gates' 478 175 175 132 $rust $true
Add-FlowBox $slide 'Humans decide' 'Application + outcome' 696 175 175 132 $wine $false
[void](Add-ImageContainedLarge $slide $employerRequirementsPath 260 338 440 118 'Employer job or training requirements and workplace assistance screen')
[void](Add-Text $slide 'Audit snapshot preserves score context and status history.' 175 463 610 28 18 $navy $true 'Aptos' 2)
Add-Notes $slide '55 seconds. Trace the four steps. Employers define actual requirements and assistance. The candidate chooses. The engine explains. Employers remain responsible for selection, with an auditable snapshot.'

# 15 - Project management
$slide = Add-USJBaseSlide ' Project management' 'Iterative delivery from definition to evidence' 15 'A June-September plan controlled through versioned evidence and explicit risks.'
$lanes = @(
    @{Y=160;T='Discover + define';D='Needs, stakeholders, FR / NFR';S=135;W=285;C=$blue;Date='JUN'},
    @{Y=228;T='Design';D='Alternatives, UML / C4, prototype';S=250;W=300;C=$rust;Date='JUL'},
    @{Y=296;T='Build + integrate';D='Catalogue, backend, AI, voice, scoring';S=390;W=380;C=$green;Date='JUL-AUG'},
    @{Y=364;T='Verify + deliver';D='Tests, users, staging, report, defence';S=575;W=343;C=$wine;Date='AUG-SEP'}
)
foreach($l in $lanes) {
    [void](Add-Text $slide $l.Date 42 ($l.Y + 8) 80 22 18 $muted $true 'Aptos')
    [void](Add-Box $slide $l.S $l.Y $l.W 58 $l.C $l.C 5)
    [void](Add-Text $slide $l.T ($l.S + 14) ($l.Y + 7) ($l.W - 28) 20 18 $white $true 'Aptos Display')
    [void](Add-Text $slide $l.D ($l.S + 14) ($l.Y + 31) ($l.W - 28) 22 18 $white $false 'Aptos')
}
[void](Add-Line $slide 42 436 918 436 $taupe 2)
[void](Add-Text $slide 'Controls' 42 449 82 24 18 $rust $true 'Aptos')
[void](Add-Text $slide 'Focused Git commits | staging-deployment | render.yaml | requirement-to-test evidence | retained risks' 130 445 788 42 18 $navy $true 'Aptos')
Add-Notes $slide '70 seconds. Explain the overlap: requirements informed design while prototypes refined needs; build and integration overlapped; verification intensified before delivery. Project control used focused commits, a staging branch, infrastructure as code, traceability and explicit risk reporting.'

# 16 - V&V strategy
$slide = Add-USJBaseSlide 'Tests et mise au point' 'Verification and validation across the lifecycle' 16 'Verification checks the specification; validation checks the user need.'
$levels = @(
    @{X=42;Y=355;W=876;T='Human validation';D='Arc en Ciel session | JAWS workflow | stakeholder observation';C=$wine},
    @{X=100;Y=292;W=760;T='System + staging';D='Browser E2E | security routes | performance | deployed origins';C=$rust},
    @{X=158;Y=229;W=644;T='Service + integration';D='API workflows | scoring oracles | voice registry | AI matrix';C=$green},
    @{X=216;Y=166;W=528;T='Static + component';D='Build, lint, syntax, schema and unit checks';C=$blue}
)
foreach($l in $levels) {
    [void](Add-Box $slide $l.X $l.Y $l.W 48 $white $l.C 5)
    [void](Add-Text $slide $l.T ($l.X + 18) ($l.Y + 12) 210 22 18 $l.C $true 'Aptos Display')
    [void](Add-Text $slide $l.D ($l.X + 235) ($l.Y + 7) ($l.W - 253) 38 18 $ink $false 'Aptos')
}
[void](Add-Text $slide 'Documentation: SRS -> architecture -> code/configuration -> test register -> evidence -> operational limits' 75 441 810 44 18 $navy $true 'Aptos' 2)
Add-Notes $slide '60 seconds. Define verification versus validation, then show the layered evidence. Testing was not an end-of-project activity; it was traced from specifications and repeated after corrections.'

# 17 - Results and defects
$slide = Add-USJBaseSlide 'Mesures et mise au point' '310 cases completed; findings remained visible' 17 'The campaign records corrections and retained limitations, not only passes.'
Add-CompactMetric $slide '93.2%' 'final pass rate' 42 158 205 $green
Add-CompactMetric $slide '274' 'first-run passes' 266 158 205 $blue
Add-CompactMetric $slide '15' 'noisy partials corrected' 490 158 205 $amber
Add-CompactMetric $slide '21' 'retained failures' 714 158 205 $wine
Add-LargeCard $slide 'Accessibility' 'Profile contrast`n200% zoom overflow' 42 285 270 142 $blue $softBlue
Add-LargeCard $slide 'Security + AI' 'Oversized upload path`nBoth-preference omission' 345 285 270 142 $wine $softRust
Add-LargeCard $slide 'Performance' 'Staging write p95`nFree-tier latency' 648 285 270 142 $rust $softAmber
[void](Add-Text $slide 'All 310 were executed; no case remained blocked or not run.' 190 457 580 22 18 $navy $true 'Aptos' 2)
Add-Notes $slide '65 seconds. Explain the arithmetic: 274 first passes, 15 partial noisy-transcription cases corrected, and 21 retained failures produce 289 final passes out of 310. Highlight the three defect groups.'

# 18 - Human and accessibility validation
$slide = Add-USJBaseSlide 'Validation utilisateur' 'The platform was evaluated with its intended users' 18 'Human evidence supports tested users, not a universal accessibility claim.'
[void](Add-ImageContainedLarge $slide $arcP01Path 42 160 250 220 'Participant using the Arabic candidate profile during the Arc en Ciel session')
[void](Add-ImageContainedLarge $slide $arcGroupPath 355 160 250 220 'Arc en Ciel group session with twenty participants')
[void](Add-ImageContainedLarge $slide $noellePath 668 160 250 220 'Noelle Marie Gabrielle using JAWS on her adapted device')
[void](Add-Text $slide 'Arabic workflow' 42 392 250 22 18 $blue $true 'Aptos Display' 2)
[void](Add-Text $slide '20-person session' 355 392 250 22 18 $green $true 'Aptos Display' 2)
[void](Add-Text $slide 'JAWS workflow' 668 392 250 22 18 $wine $true 'Aptos Display' 2)
[void](Add-Box $slide 95 430 770 56 $navy $navy 4)
[void](Add-Text $slide 'JAWS registration and application completed; open contrast and zoom findings remain reported.' 118 438 724 42 18 $white $true 'Aptos' 2)
Add-Notes $slide '65 seconds. Distinguish the 20-person Arc en Ciel session from the focused JAWS workflow. These validate relevance and identify issues; they do not establish universal WCAG conformance.'

# 19 - Performance, cost, maintenance and future work
$slide = Add-USJBaseSlide 'Delivery et maintenance' 'Measured constraints guide the next engineering cycle' 19 'Latency and production governance define the remaining work.'
Add-LargeCard $slide 'Measured now' '144/144 shared-load responses`n100% functional availability`nLatency target not consistent' 42 160 270 235 $blue $softBlue
Add-LargeCard $slide 'Cost controls' 'Bottom-up by subsystem`nAI and voice quotas`nMeasure before caching' 345 160 270 235 $green $softGreen
Add-LargeCard $slide 'Next cycle' 'Fix five material findings`nMonitoring, backups and email`nRepeat controlled user tests' 648 160 270 235 $rust $softAmber
[void](Add-Box $slide 92 426 776 54 $navy $navy 4)
[void](Add-Text $slide 'Maintenance: corrective defects | adaptive change | perfective features | preventive refactoring' 115 435 730 42 18 $white $true 'Aptos' 2)
Add-Notes $slide '65 seconds. Separate functional correctness from latency. Cost includes effort, infrastructure, external services and maintenance. The next cycle begins with known defects and production governance, not an unsupported cache or scaling claim.'

# 20 - Conclusion
$slide = Add-USJBaseSlide 'Conclusion' 'A validated bridge from ability to opportunity' 20 'Three ideas to retain.'
Add-LargeCard $slide '1. Human control' 'AI suggests; candidates confirm; employers and verifiers decide.' 42 170 270 210 $blue $softBlue
Add-LargeCard $slide '2. Explainable engineering' 'Deterministic matching, explicit trust boundaries and auditable outcomes.' 345 170 270 210 $green $softGreen
Add-LargeCard $slide '3. Evidence with limits' 'Cloud staging, 310 cases and human sessions - with open findings retained.' 648 170 270 210 $rust $softAmber
[void](Add-Text $slide 'Questions?' 280 420 400 44 30 $navy $true 'Aptos Display' 2)
[void](Add-Text $slide 'Opportunity should be shaped by ability.' 280 466 400 22 18 $rust $true 'Aptos' 2)
Add-Notes $slide '45 seconds. Conclude with only three ideas: people remain in control, the engineering decisions are explainable, and the evidence is transparent about limits. Then invite questions while facing the jury.'

# Save editable PowerPoint, PDF, and a high-resolution slide preview.
$outputDirectory = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
New-Item -ItemType Directory -Force -Path $previewDirectory | Out-Null

$presentation.SaveAs($OutputPath, 24)
$presentation.SaveAs($pdfPath, 32)
try { $presentation.SaveAs($previewDirectory, 18) } catch {}
$presentation.Close()
$powerPoint.Quit()
[Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null
[Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null

Write-Output "Created: $OutputPath"
Write-Output "Created: $pdfPath"
Write-Output "Preview: $previewDirectory"
