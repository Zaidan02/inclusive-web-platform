param(
    [string] $OutputPath
)

$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $scriptDirectory '..\..'))
$presentationDirectory = Join-Path $repositoryRoot 'docs\presentation'
$assetDirectory = Join-Path $presentationDirectory 'assets'
$baseGenerator = Join-Path $scriptDirectory 'New-ProgressPresentation.ps1'

if (-not $OutputPath) {
    $OutputPath = Join-Path $repositoryRoot 'artifacts\Inclusive_Web_Platform_FINAL_ENGINEERING_PRESENTATION_Zaidan_Charbel_2026-09-14.pptx'
}

$pdfPath = [IO.Path]::ChangeExtension($OutputPath, '.pdf')
$previewDirectory = Join-Path $repositoryRoot 'artifacts\final-presentation-preview'

. $baseGenerator -OutputPath $OutputPath -HelpersOnly

$universityLogoPath = Join-Path $repositoryRoot 'artifacts\submitted-progress-assets\page_1_image_0.png'
$joinLogoPath = Join-Path $repositoryRoot 'artifacts\submitted-progress-assets\page_1_image_1.png'
$renderEvidencePath = Join-Path $repositoryRoot 'artifacts\report-evidence\final-evidence\EV-DEP-RENDER-001-services-user.png'
$supabaseSchemaPath = Join-Path $repositoryRoot 'artifacts\report-evidence\final-evidence\EV-DEP-SUPABASE-001-schema-user.png'
$supabaseStoragePath = Join-Path $repositoryRoot 'artifacts\report-evidence\final-evidence\EV-DEP-SUPABASE-002-storage-user.png'
$noellePath = Join-Path $repositoryRoot 'artifacts\report-evidence\final-evidence\EV-HUM-NOELLE-001-JAWS.png'
$arcGroupPath = Join-Path $repositoryRoot 'artifacts\report-evidence\human-evaluation\EV-HUM-002-P02-group-session.jpeg'
$arcP01Path = Join-Path $repositoryRoot 'artifacts\report-evidence\human-evaluation\EV-HUM-001-P01-arabic-profile.jpeg'
$aiEnglishPath = Join-Path $repositoryRoot 'artifacts\report-evidence\final-evidence\EV-AI-SCREEN-EN-001.png'
$aiFrenchPath = Join-Path $repositoryRoot 'artifacts\report-evidence\final-evidence\EV-AI-SCREEN-FR-001.png'
$aiArabicPath = Join-Path $repositoryRoot 'artifacts\report-evidence\final-evidence\EV-AI-SCREEN-AR-001.png'
$candidateMatchPath = Join-Path $assetDirectory '03-candidate-matching.png'
$candidateProfilePath = Join-Path $assetDirectory '04-candidate-profile.png'
$employerRequirementsPath = Join-Path $assetDirectory '05-employer-requirements.png'
$verifierPath = Join-Path $assetDirectory '07-verifier.png'
$mobileCandidatePath = Join-Path $repositoryRoot 'docs\testing\staging-2026-09-10\wcag-screenshots\candidate-width-375.png'
$zoomCandidatePath = Join-Path $repositoryRoot 'docs\testing\staging-2026-09-10\wcag-screenshots\candidate-zoom-200.png'

function Add-FinalBaseSlide([string] $Section, [string] $Title, [int] $Number, [string] $Subtitle = '') {
    $slide = $presentation.Slides.Add($presentation.Slides.Count + 1, 12)
    $slide.Background.Fill.ForeColor.RGB = $warmLight
    $slide.Background.Fill.Solid()
    [void](Add-Box $slide 0 0 960 8 $blue $blue)
    [void](Add-Text $slide $Section.ToUpperInvariant() 48 27 480 18 9 $rust $true 'Aptos')
    [void](Add-Text $slide $Title 48 50 820 43 28 $navy $true 'Aptos Display')
    if ($Subtitle) {
        [void](Add-Text $slide $Subtitle 48 96 830 27 10.5 $muted $false 'Aptos')
    }
    if (Test-Path $universityLogoPath) {
        [void](Add-ImageContained $slide $universityLogoPath 855 22 58 25 'Universite Saint-Joseph and ESIB mark' $false)
    }
    [void](Add-Line $slide 48 508 912 508 $line 0.8)
    [void](Add-Text $slide 'INCLUSIVE WEB PLATFORM | FINAL ENGINEERING PRESENTATION | 14 SEP 2026' 48 515 710 14 7.2 $muted $false 'Aptos')
    [void](Add-Text $slide ([string]$Number).PadLeft(2, '0') 874 514 38 14 8 $rust $true 'Aptos' 3)
    return $slide
}

function Add-ImageContained(
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
    if ($Frame) { [void](Add-Box $Slide $X $Y $Width $Height $white $line 3) }
    $picture = $Slide.Shapes.AddPicture($Path, $false, $true, 0, 0, -1, -1)
    $picture.LockAspectRatio = -1
    $pictureAspect = $picture.Width / $picture.Height
    $frameAspect = ($Width - 6) / ($Height - 6)
    if ($pictureAspect -ge $frameAspect) {
        $picture.Width = $Width - 6
    } else {
        $picture.Height = $Height - 6
    }
    $picture.Left = $X + (($Width - $picture.Width) / 2)
    $picture.Top = $Y + (($Height - $picture.Height) / 2)
    $picture.AlternativeText = $AltText
    return $picture
}

function Add-Card(
    $Slide,
    [string] $Title,
    [string] $Text,
    [double] $X,
    [double] $Y,
    [double] $Width,
    [double] $Height,
    [int] $Accent,
    [bool] $Dark = $false
) {
    $fill = if ($Dark) { $navy } else { $white }
    $titleColor = if ($Dark) { $white } else { $Accent }
    $textColor = if ($Dark) { ConvertTo-Rgb '#DDE7F5' } else { $ink }
    [void](Add-Box $Slide $X $Y $Width $Height $fill $line 5)
    [void](Add-Box $Slide $X $Y 7 $Height $Accent $Accent)
    [void](Add-Text $Slide $Title ($X + 21) ($Y + 16) ($Width - 38) 29 15 $titleColor $true 'Aptos Display')
    [void](Add-Text $Slide ($Text -replace '`n', "`n") ($X + 21) ($Y + 55) ($Width - 38) ($Height - 68) 10.2 $textColor $false 'Aptos')
}

function Add-FlowStep(
    $Slide,
    [string] $Title,
    [string] $Text,
    [double] $X,
    [double] $Y,
    [double] $Width,
    [double] $Height,
    [int] $Accent,
    [bool] $ArrowAfter = $false
) {
    [void](Add-Box $Slide $X $Y $Width $Height $white $Accent 5)
    [void](Add-Box $Slide $X $Y $Width 7 $Accent $Accent)
    [void](Add-Text $Slide $Title ($X + 10) ($Y + 23) ($Width - 20) 40 12 $navy $true 'Aptos Display' 2)
    [void](Add-Text $Slide ($Text -replace '`n', "`n") ($X + 11) ($Y + 72) ($Width - 22) ($Height - 84) 9.2 $ink $false 'Aptos' 2)
    if ($ArrowAfter) {
        [void](Add-Line $Slide ($X + $Width + 4) ($Y + ($Height / 2)) ($X + $Width + 25) ($Y + ($Height / 2)) $line 2.3 $true)
    }
}

function Add-Source($Slide, [string] $Text, [double] $Y = 486) {
    [void](Add-Text $Slide $Text 48 $Y 820 14 6.8 $muted $false 'Aptos')
}

function Add-TopExcerpt(
    $Slide,
    [string] $Path,
    [double] $X,
    [double] $Y,
    [double] $Width,
    [double] $Height,
    [string] $AltText
) {
    if (-not (Test-Path $Path)) { return }
    [void](Add-Box $Slide $X $Y $Width $Height $white $line 4)
    $picture = $Slide.Shapes.AddPicture($Path, $false, $true, 0, 0, -1, -1)
    $picture.LockAspectRatio = -1
    $picture.Width = $Width - 10
    $picture.Left = $X + 5
    $picture.Top = $Y + 5
    $picture.AlternativeText = $AltText
    # The lower part of the tall evidence screenshot is masked so the prompt,
    # consent control and first structured suggestions remain legible.
    [void](Add-Box $Slide $X ($Y + $Height) $Width (500 - ($Y + $Height)) $warmLight $warmLight)
    [void](Add-Line $Slide $X ($Y + $Height) ($X + $Width) ($Y + $Height) $line 0.8)
}

function Add-Bar(
    $Slide,
    [string] $Label,
    [double] $Rate,
    [double] $X,
    [double] $Y,
    [double] $Width,
    [int] $Color
) {
    [void](Add-Text $Slide $Label $X $Y 160 17 8.8 $ink $true 'Aptos')
    [void](Add-Box $Slide ($X + 165) ($Y + 2) ($Width - 220) 12 $mist $mist 2)
    [void](Add-Box $Slide ($X + 165) ($Y + 2) (($Width - 220) * $Rate) 12 $Color $Color 2)
    [void](Add-Text $Slide ('{0:N1}%' -f ($Rate * 100)) ($X + $Width - 50) ($Y - 1) 50 17 8.8 $Color $true 'Aptos' 3)
}

# 1 - Title
$slide = $presentation.Slides.Add(1, 12)
$slide.Background.Fill.ForeColor.RGB = $warmLight
$slide.Background.Fill.Solid()
[void](Add-Box $slide 0 0 960 8 $blue $blue)
if (Test-Path $universityLogoPath) { [void](Add-ImageContained $slide $universityLogoPath 48 28 250 82 'Universite Saint-Joseph and ESIB logo' $false) }
if (Test-Path $joinLogoPath) { [void](Add-ImageContained $slide $joinLogoPath 790 24 120 105 'JoIn Hospitality logo' $false) }
[void](Add-Text $slide 'INCLUSIVE EMPLOYMENT PLATFORM' 48 150 864 20 10 $rust $true 'Aptos' 2)
[void](Add-Text $slide 'Accessible, AI-Assisted Recruitment for Persons with Physical Disabilities' 82 184 796 80 31 $navy $true 'Aptos Display' 2)
[void](Add-Text $slide 'Final Engineering Presentation' 180 282 600 34 22 $blue $true 'Aptos Display' 2)
[void](Add-Text $slide "Presented by`nZaidan MANSOUR | Charbel RIZK`nComputer and Communications Engineering - Software Engineering" 260 342 440 68 12 $ink $true 'Aptos' 2)
[void](Add-Text $slide "Supervisors`nDr. Jean Yves Youssef | Dr. Roger Obeid | Dr. Rima Kilany" 48 430 430 46 9.5 $muted $false 'Aptos')
[void](Add-Text $slide '14 September 2026' 730 450 180 18 9.5 $rust $true 'Aptos' 3)
[void](Add-Line $slide 48 498 912 498 $line 0.8)
[void](Add-Text $slide 'UNIVERSITE SAINT-JOSEPH DE BEYROUTH | ESIB' 48 509 500 14 7.2 $muted $false 'Aptos')
Add-Notes $slide '20 seconds - Zaidan. Introduce the team and state: this is an accessibility, software architecture, explainable matching, deployment and verification project; AI assists but does not make hiring decisions.'

# 2 - Outline
$slide = Add-FinalBaseSlide 'Presentation map' 'Engineering defence roadmap' 2 'Concise slides keep the technical evidence readable while respecting the 15-minute limit.'
$stages = @(
    @{X=48;N='01';T='Problem + research';D='Need, related work, research gap';C=$rust},
    @{X=193;N='02';T='Requirements';D='FR, NFR and WCAG target';C=$blue},
    @{X=338;N='03';T='Design';D='Architecture, data, security';C=$green},
    @{X=483;N='04';T='Implementation';D='AI, voice, matching, workflows';C=$wine},
    @{X=628;N='05';T='Verification';D='Automated, staging and human tests';C=$amber},
    @{X=773;N='06';T='Delivery';D='Deployment, cost, limits, demo';C=$rust}
)
foreach ($stage in $stages) {
    [void](Add-Box $slide $stage.X 165 125 225 $white $line 5)
    [void](Add-Box $slide $stage.X 165 125 8 $stage.C $stage.C)
    [void](Add-Text $slide $stage.N ($stage.X + 17) 189 90 25 19 $stage.C $true 'Aptos Display')
    [void](Add-Text $slide $stage.T ($stage.X + 17) 235 90 46 13.5 $navy $true 'Aptos Display')
    [void](Add-Text $slide $stage.D ($stage.X + 17) 310 92 56 9.3 $ink $false 'Aptos')
}
[void](Add-Box $slide 190 425 580 42 $navy $navy 4)
[void](Add-Text $slide 'Slides 1-12: Zaidan | Slides 13-27: Charbel | Then: 5-minute live demonstration' 212 438 536 18 10 $white $true 'Aptos' 2)
Add-Notes $slide '20 seconds - Zaidan. Give the jury the route: evidence of need, requirements, technical design, implemented workflows, measured verification, then delivery and demo.'

# 3 - Problem
$slide = Add-FinalBaseSlide 'Problem and urgency' 'Capability and opportunity remain disconnected' 3 'Digital recruitment can reproduce exclusion when accessibility, trust and task-level ability are missing.'
Add-Metric $slide '1.3B' 'people experience significant disability worldwide' 48 150 250 $blue
Add-Metric $slide '30% lower' 'labour-market participation than persons without disabilities' 355 150 250 $rust
Add-Metric $slide '>80%' 'of 700+ surveyed candidates named identifying inclusive employers as the greatest barrier' 662 150 250 $wine
[void](Add-Box $slide 98 260 764 150 $navy $navy 6)
[void](Add-Text $slide 'The engineering problem is not a lack of ability.' 130 292 700 32 22 $white $true 'Aptos Display' 2)
[void](Add-Text $slide 'It is the distance between candidates, accessible recruitment processes, structured job tasks, workplace support and employers prepared to evaluate ability.' 145 345 670 50 13 (ConvertTo-Rgb '#DDE7F5') $false 'Aptos' 2)
Add-Source $slide 'Sources: WHO Disability and Health (1.3B / 16%); ILO Global Disability Summit 2025 (30% participation gap); Business Disability Forum / Evenbreak survey (>700 respondents).'
Add-Notes $slide '35 seconds - Zaidan. State the three numbers, then frame the problem carefully: the platform reduces barriers and distance; it does not claim to create jobs or solve unemployment by itself.'

# 4 - Background evolution
$slide = Add-FinalBaseSlide 'Background research' 'From disability-as-deficit to accessible decision support' 4 'The project follows the social and rights-based view: barriers can be changed through work design and technology.'
$timeline = @(
    @{X=48;T='Medical / deficit focus';D='Recruitment starts from limitation.';C=$wine},
    @{X=218;T='Social / rights model';D='Barriers exist in processes and environments.';C=$rust},
    @{X=388;T='Online job portals';D='Visibility increases, but profiles stay generic.';C=$blue},
    @{X=558;T='AI recruitment';D='Scale increases, with bias and opacity risks.';C=$amber},
    @{X=728;T='JoIn approach';D='Ability-to-task evidence with human control.';C=$green}
)
for ($i=0; $i -lt $timeline.Count; $i++) {
    $item=$timeline[$i]
    [void](Add-Box $slide $item.X 180 145 190 $white $item.C 5)
    [void](Add-Box $slide $item.X 180 145 8 $item.C $item.C)
    [void](Add-Text $slide ('0' + ($i + 1)) ($item.X + 16) 202 40 18 12 $item.C $true 'Aptos')
    [void](Add-Text $slide $item.T ($item.X + 16) 239 112 48 13 $navy $true 'Aptos Display')
    [void](Add-Text $slide $item.D ($item.X + 16) 305 112 45 9.2 $ink $false 'Aptos')
    if ($i -lt ($timeline.Count - 1)) { [void](Add-Line $slide ($item.X + 148) 275 ($item.X + 167) 275 $line 2.2 $true) }
}
[void](Add-Text $slide 'Software contribution: change the recruitment interaction and explanation, not the candidate.' 160 415 640 30 14 $navy $true 'Aptos Display' 2)
Add-Notes $slide '30 seconds - Zaidan. Explain the evolution without presenting it as a dated hardware history. The design follows a rights-based view: inaccessible processes are engineering barriers that can be redesigned.'

# 5 - Related work
$slide = Add-FinalBaseSlide 'Background research' 'Related approaches and the remaining gap' 5 'A synthesis of solution categories studied in Phase I and Phase II; not an exhaustive commercial benchmark.'
Add-Card $slide 'General job platforms' "Strength: reach and familiar workflows.`nGap: generic profiles and limited disability-specific support." 48 150 195 190 $blue
Add-Card $slide 'Inclusive job portals' "Strength: targeted visibility and employer awareness.`nGap: listings may not explain task-level feasibility." 263 150 195 190 $green
Add-Card $slide 'Automated AI screening' "Strength: speed and scale.`nGap: data quality, bias, privacy and individual explainability." 478 150 195 190 $amber
Add-Card $slide 'Human coaching' "Strength: contextual judgement and adaptation.`nGap: intensive case-by-case work is difficult to scale digitally." 693 150 195 190 $wine
[void](Add-Box $slide 120 376 720 72 $navy $navy 5)
[void](Add-Text $slide 'Research gap' 145 393 120 20 11 $rust $true 'Aptos')
[void](Add-Text $slide 'One accessible workflow joining controlled hospitality tasks, candidate abilities, workplace assistance, explainable matching and human review.' 270 389 540 42 11.5 $white $true 'Aptos')
Add-Notes $slide '35 seconds - Zaidan. Compare categories, not brands. The gap is integration: accessibility plus task evidence plus human control in one workflow.'

# 6 - Contribution
$slide = Add-FinalBaseSlide 'Final contribution' 'What Phase II delivered' 6 'The final prototype expands Phase I into a multilingual, multimodal and cloud-deployed engineering system.'
$metrics = @(
    @{V='4';L='authorized user roles';C=$blue},
    @{V='15';L='hospitality positions';C=$rust},
    @{V='923';L='catalogue tasks';C=$green},
    @{V='14,453';L='task assessments';C=$wine},
    @{V='74';L='published opportunities';C=$amber},
    @{V='3';L='interface languages';C=$blue}
)
$x=48
foreach($metric in $metrics){ Add-Metric $slide $metric.V $metric.L $x 145 132 $metric.C; $x+=146 }
[void](Add-ImageContained $slide $candidateMatchPath 48 250 405 210 'Candidate matching and opportunity exploration screen')
[void](Add-Card $slide 'Integrated outcome' "Candidate-controlled AI profile assistance`nJobs, hospitality training, or both`nDeterministic explainable compatibility`nEmployer requirements and assistance`nVerifier and administrator oversight`nEnglish, French and Arabic with RTL" 488 250 424 210 $navy $true)
Add-Notes $slide '35 seconds - Zaidan. Use the numbers as evidence of engineering scale, then summarize the integrated contribution. The 74 opportunities are the recorded staging snapshot, not a production employment claim.'

# 7 - Functional requirements
$slide = Add-FinalBaseSlide 'Requirements' 'Functional requirements implemented by role' 7 'The platform is a coordinated workflow, not a collection of disconnected pages.'
$roles = @(
    @{X=48;T='Candidate';D='Register and verify email`nSubmit private evidence`nBuild or reset profile`nChoose work, training or both`nMatch, explore and apply';C=$blue},
    @{X=264;T='Employer';D='Manage company profile`nPublish job or training offer`nSet education and abilities`nPrioritize tasks and assistance`nReview and update applications';C=$green},
    @{X=480;T='Verifier';D='Access authorized requests`nRetrieve private evidence`nApprove or reject verification`nRecord auditable decisions';C=$wine},
    @{X=696;T='Administrator';D='Manage users and catalogue`nImport validated role datasets`nInspect jobs and applications`nMaintain controlled definitions';C=$rust}
)
foreach($role in $roles){Add-Card $slide $role.T $role.D $role.X 150 200 292 $role.C}
Add-Notes $slide '35 seconds - Zaidan. Walk across the four roles. Emphasize server-authorized workflows and that training opportunities are handled alongside work offers.'

# 8 - NFR
$slide = Add-FinalBaseSlide 'Requirements' 'Non-functional requirements and measurable qualities' 8 'Quality attributes were connected to controls and evidence rather than treated as general promises.'
Add-Card $slide 'Accessibility' "WCAG 2.1 AA target`nKeyboard and assistive technology`nResponsive reflow and reduced motion`nClear status and error recovery" 48 150 200 292 $blue
Add-Card $slide 'Security + privacy' "JWT and server-side RBAC`nPrivate documents and bounded uploads`nConsent, export, withdrawal and erasure`nAudit events without sensitive payloads" 264 150 200 292 $wine
Add-Card $slide 'Reliability + performance' "Health endpoints and Docker boundaries`nRepeatable p50 / p95 measurements`nNo silent rollback on email failure`nTransparent cold-start and latency limits" 480 150 200 292 $rust
Add-Card $slide 'Maintainability + i18n' "Component-based React interface`nController-service-repository backend`nVersioned scoring policy`nThree locales with stable codes and IDs" 696 150 200 292 $green
Add-Notes $slide '35 seconds - Zaidan. Define NFRs as measurable engineering qualities. State that final evidence includes both passes and open findings.'

# 9 - WCAG
$slide = Add-FinalBaseSlide 'Accessibility standard' 'WCAG 2.1 Level AA: target, implementation and evidence' 9 'WCAG organizes success criteria under four principles; Level AA includes all applicable Level A and AA criteria.'
$principles = @(
    @{X=48;T='Perceivable';D='Labels and alternatives`nStructure and headings`nStatus not based on colour alone`nContrast target';C=$blue},
    @{X=264;T='Operable';D='Keyboard workflows`nVisible focus`nNo pointer-only critical path`nReduced-motion support';C=$green},
    @{X=480;T='Understandable';D='Consistent navigation`nInstructions and linked errors`nConfirmation and recovery`nPlain-language feedback';C=$rust},
    @{X=696;T='Robust';D='Semantic controls`nARIA status / alert patterns`nStable focus management`nJAWS-tested workflow';C=$wine}
)
foreach($p in $principles){Add-Card $slide $p.T $p.D $p.X 145 200 215 $p.C}
[void](Add-Box $slide 48 382 864 76 $navy $navy 4)
[void](Add-Text $slide 'Evidence' 68 399 70 18 10 $green $true 'Aptos')
[void](Add-Text $slide '18/18 accessibility workflow cases completed | 104 automated route-layout scenarios | JAWS registration and application completed' 140 397 735 20 9.5 $white $true 'Aptos')
[void](Add-Text $slide 'Honest boundary: 16 scenarios retained axe findings and 2 high-zoom scenarios showed overflow; therefore this is a WCAG 2.1 AA target, not a full conformance claim.' 68 426 806 24 8.4 (ConvertTo-Rgb '#F4D8CC') $false 'Aptos')
Add-Source $slide 'Standard: W3C Web Content Accessibility Guidelines (WCAG) 2.1, Recommendation, Level A and AA success criteria.' 486
Add-Notes $slide '45 seconds - Zaidan. Define POUR, show implemented examples, then state the conformance boundary. This honesty is stronger engineering evidence than claiming that an automated scan proves compliance.'

# 10 - Architecture
$slide = Add-FinalBaseSlide 'System design' 'Cloud architecture and explicit trust boundaries' 10 'The browser presents the interface; Symfony remains the authoritative security and business-workflow boundary.'
Add-FlowStep $slide 'React / Vite' "Static frontend`nRole workspaces`ni18next + RTL" 48 188 140 150 $blue $true
Add-FlowStep $slide 'Symfony API' "JWT + RBAC`nValidation`nWorkflow orchestration" 218 172 150 182 $rust $true
Add-FlowStep $slide 'Supabase' "PostgreSQL`nPrivate documents`nPublic employer logos" 408 135 150 130 $green $false
Add-FlowStep $slide 'Scoring service' "Deterministic`nVersioned rules`nExplainable JSON" 408 305 150 130 $amber $false
Add-FlowStep $slide 'Voice / profile' "Transcription`nSchema-constrained AI`nSafe command registry" 610 172 150 182 $wine $true
Add-FlowStep $slide 'OpenAI API' "External provider`nNo database authority`nReplaceable adapter" 794 188 118 150 $blue $false
[void](Add-Line $slide 368 235 408 200 $green 2 $true)
[void](Add-Line $slide 368 282 408 370 $amber 2 $true)
[void](Add-Line $slide 558 200 610 235 $wine 2 $true)
[void](Add-Box $slide 155 451 650 33 $navy $navy 3)
[void](Add-Text $slide 'Shared service tokens protect Symfony-to-Python calls; secrets stay server-side and HTTPS protects public origins.' 175 461 610 15 9.2 $white $true 'Aptos' 2)
Add-Notes $slide '45 seconds - Zaidan. Walk left to right. React never authorizes itself. Symfony validates the session, role and payload. AI and scoring are separate services with different responsibilities.'

# 11 - Patterns
$slide = Add-FinalBaseSlide 'System design' 'Design patterns used to control complexity' 11 'The implementation combines patterns at the presentation, application, integration and decision layers.'
$patterns = @(
    @{X=48;Y=145;T='Layered / MVC';D='React presentation, Symfony APIs, Doctrine persistence, isolated Python services.';C=$blue},
    @{X=338;Y=145;T='Controller-Service-Repository';D='HTTP, orchestration and data access remain separately testable.';C=$green},
    @{X=628;Y=145;T='Adapter / Gateway';D='OpenAI is accessed through bounded replaceable service contracts.';C=$wine},
    @{X=48;Y=292;T='Strategy / Policy';D='Versioned weights, assistance factors and eligibility gates.';C=$rust},
    @{X=338;Y=292;T='Command Registry + FSM';D='Allowlisted voice actions and mutually exclusive interaction states.';C=$amber},
    @{X=628;Y=292;T='Audit + Immutable Snapshot';D='Consent, verification, status events and score context remain traceable.';C=$blue}
)
foreach($p in $patterns){Add-Card $slide $p.T $p.D $p.X $p.Y 270 122 $p.C}
[void](Add-Text $slide 'Engineering value: lower coupling, safer external AI, reproducible decisions and independent verification.' 150 452 660 25 12 $navy $true 'Aptos Display' 2)
Add-Notes $slide '35 seconds - Zaidan. Do not define every textbook term. Show how each pattern solves a concrete project risk: coupling, unsafe AI actions, opaque matching or lost decision history.'

# 12 - Security
$slide = Add-FinalBaseSlide 'Security and privacy' 'Sensitive data is controlled by the backend, not the interface' 12 'Frontend checks improve usability; Symfony authorization remains decisive for every protected request.'
Add-Card $slide 'Identity and role isolation' "Email verification`nJWT via X-Auth-Token`nCandidate | Employer | Verifier | Admin`nAnonymous, forged and cross-role rejection" 48 148 260 240 $blue
Add-Card $slide 'Private evidence and uploads' "Private candidate-verification bucket`nPrivate application documents`nPublic employer logos only`nMIME and size restrictions" 350 148 260 240 $wine
Add-Card $slide 'Consent and auditability' "Explicit AI consent`nNo unconfirmed suggestion saved`nExport, withdrawal and account erasure`nAudited status and verifier decisions" 652 148 260 240 $green
[void](Add-Box $slide 110 414 740 50 $navy $navy 4)
[void](Add-Text $slide 'Evidence: 51/51 prerequisite route checks passed | Final security register: 19/20 | Open upload-validation defect retained' 135 429 690 21 10 $white $true 'Aptos' 2)
Add-Notes $slide '40 seconds - Zaidan. End the first half here. Distinguish the 51 route checks from the 20-case security quality register, where one oversized-upload behavior remains open.'

# 13 - Deployment
$slide = Add-FinalBaseSlide 'Implemented deployment' 'Render and Supabase staging topology' 13 'The deployed system proves multi-service integration over public HTTPS; it is a staging prototype, not a production SLA.'
[void](Add-ImageContained $slide $renderEvidencePath 48 145 420 235 'Render Blueprint showing four deployed services')
[void](Add-ImageContained $slide $supabaseStoragePath 492 145 420 235 'Supabase storage buckets and upload restrictions')
[void](Add-Text $slide 'Render Blueprint' 48 391 420 18 11 $navy $true 'Aptos Display' 2)
[void](Add-Text $slide 'React static site + Symfony API + voice/profile service + scoring service' 65 415 386 30 9.2 $ink $false 'Aptos' 2)
[void](Add-Text $slide 'Supabase data layer' 492 391 420 18 11 $navy $true 'Aptos Display' 2)
[void](Add-Text $slide 'SSL PostgreSQL pooler + three purpose-specific storage buckets' 509 415 386 30 9.2 $ink $false 'Aptos' 2)
Add-Notes $slide '25 seconds - Charbel. Begin the implementation half with deployment evidence. Services run in Frankfurt except the global static frontend. HTTPS enables remote microphone access.'

# 14 - AI profile flow
$slide = Add-FinalBaseSlide 'Candidate workflow' 'AI-assisted profile: advisory, consent-gated and reversible' 14 'The candidate can type or speak; every AI result remains a suggestion until explicit confirmation.'
$steps = @(
    @{X=48;T='Describe';D='Select EN, FR or AR; type or record.';C=$blue},
    @{X=192;T='Edit transcript';D='Correct speech-to-text before processing.';C=$green},
    @{X=336;T='Consent';D='Approve sending the text to the assistant.';C=$rust},
    @{X=480;T='Interpret';D='Return schema-constrained suggestions.';C=$wine},
    @{X=624;T='Review';D='Accept, edit or reject every item.';C=$amber},
    @{X=768;T='Confirm';D='Symfony validates and saves selected values only.';C=$blue}
)
for($i=0;$i -lt $steps.Count;$i++){ $s=$steps[$i]; Add-FlowStep $slide $s.T $s.D $s.X 175 120 190 $s.C ($i -lt $steps.Count-1) }
[void](Add-ImageContained $slide $candidateProfilePath 275 390 410 82 'Candidate profile builder with optional AI assistance')
Add-Notes $slide '30 seconds - Charbel. The important sequence is editable transcript, explicit consent, structured suggestions, human selection, backend validation. Profile reset allows a candidate to start again.'

# 15 - Multilingual AI evidence
$slide = Add-FinalBaseSlide 'AI profile evidence' 'Structured suggestions in English, French and Arabic' 15 'Sixty gold-standard narratives covered clean and imperfect wording, abilities, preferences, positions, tasks and safety boundaries.'
Add-TopExcerpt $slide $aiEnglishPath 48 145 270 235 'English AI profile suggestion evidence'
Add-TopExcerpt $slide $aiFrenchPath 345 145 270 235 'French AI profile suggestion evidence'
Add-TopExcerpt $slide $aiArabicPath 642 145 270 235 'Arabic RTL AI profile suggestion evidence'
[void](Add-Text $slide 'ENGLISH' 48 392 270 18 10 $blue $true 'Aptos' 2)
[void](Add-Text $slide 'FRENCH' 345 392 270 18 10 $green $true 'Aptos' 2)
[void](Add-Text $slide 'ARABIC + RTL' 642 392 270 18 10 $rust $true 'Aptos' 2)
[void](Add-Box $slide 155 430 650 44 $navy $navy 4)
[void](Add-Text $slide '53/60 passed (88.3%) | 7 failures retained | Main weakness: explicit Both work-and-training preference could be omitted' 175 443 610 20 9.5 $white $true 'Aptos' 2)
Add-Notes $slide '25 seconds - Charbel. Show real deployed outputs, then give the honest result. The assistant did not save any item during the matrix. The principal defect was preference extraction, not unsafe automatic persistence.'

# 16 - Voice path
$slide = Add-FinalBaseSlide 'Voice interaction' 'Bounded voice-navigation execution path' 16 'Natural language proposes an action; only the deterministic registry may authorize and execute it.'
$voiceSteps = @(
    @{X=28;T='Record';D='WebM / Opus';C=$blue},
    @{X=158;T='Transcribe';D='Whisper-1';C=$green},
    @{X=288;T='Classify';D='Navigate / action / question';C=$rust},
    @{X=418;T='Propose';D='Canonical command';C=$wine},
    @{X=548;T='Authorize';D='Page + role registry';C=$amber},
    @{X=678;T='Execute';D='Fixed React behavior';C=$blue},
    @{X=808;T='Feedback';D='Visual + spoken';C=$green}
)
for($i=0;$i -lt $voiceSteps.Count;$i++){ $s=$voiceSteps[$i]; Add-FlowStep $slide $s.T $s.D $s.X 180 112 155 $s.C ($i -lt $voiceSteps.Count-1) }
[void](Add-Box $slide 58 367 844 92 $white $line 4)
[void](Add-Text $slide 'Safety boundary' 78 386 110 18 10 $wine $true 'Aptos')
[void](Add-Text $slide 'Unregistered routes and cross-role actions are rejected. Submission and reset require confirmation. Context is sanitized and bounded to six turns.' 200 382 670 28 9.5 $ink $false 'Aptos')
[void](Add-Text $slide 'Evidence: 57/57 automated registry/action-safety checks passed. Quiet commands worked reliably; background noise and dictated email characters required correction in some trials.' 78 424 790 24 8.7 $navy $true 'Aptos')
Add-Notes $slide '35 seconds - Charbel. Separate acoustic quality from action safety. The automated suite proves authorization logic, while manual observations show noise and character-sequence limitations.'

# 17 - Matching
$slide = Add-FinalBaseSlide 'Core decision engine' 'Deterministic compatibility: explainable by construction' 17 'Matching uses controlled expert assessments rather than a learned model trained on unavailable employment outcomes.'
[void](Add-Box $slide 48 145 500 300 $navy $navy 6)
[void](Add-Text $slide 'Task score' 76 174 180 24 17 $white $true 'Aptos Display')
[void](Add-Text $slide 'Sum(adjusted weight x feasibility factor)' 76 220 420 24 13 $white $true 'Aptos')
[void](Add-Line $slide 76 251 444 251 (ConvertTo-Rgb '#DDE7F5') 1.3)
[void](Add-Text $slide 'Sum(adjusted weight)  x 100' 76 266 420 24 13 $white $true 'Aptos')
[void](Add-Text $slide "Feasibility: 1.00 feasible | 0.75 with offered assistance | 0.00 avoid`nImportant task multiplier: 1.5`nPractical abilities: 25% and education: 10% when configured`nUnsafe mandatory tasks and required abilities remain explicit gates" 76 320 425 90 9.8 (ConvertTo-Rgb '#DDE7F5') $false 'Aptos')
[void](Add-ImageContained $slide $candidateMatchPath 590 145 322 220 'Candidate compatibility results with explanation')
Add-Metric $slide '45 / 45' 'staging formula, eligibility and determinism cases passed' 590 382 322 $green
Add-Notes $slide '40 seconds - Charbel. Explain the numerator and denominator, then the three feasibility factors. State why deterministic policy is appropriate: versionable expert evidence, reproducibility and individual explanations.'

# 18 - Employer flow
$slide = Add-FinalBaseSlide 'Employer workflow' 'From controlled role to published job or training program' 18 'Employers configure the real opportunity; the catalogue supplies consistent tasks and matching inputs.'
$empSteps = @(
    @{X=48;T='Choose type';D='Job or hospitality training';C=$blue},
    @{X=192;T='Choose role';D='One of 15 controlled positions';C=$green},
    @{X=336;T='Load tasks';D='Approved catalogue duties';C=$rust},
    @{X=480;T='Set requirements';D='Education and practical abilities';C=$wine},
    @{X=624;T='Set support';D='Important tasks and assistance';C=$amber},
    @{X=768;T='Publish';D='Backend validation and matching';C=$blue}
)
for($i=0;$i -lt $empSteps.Count;$i++){ $s=$empSteps[$i]; Add-FlowStep $slide $s.T $s.D $s.X 175 120 180 $s.C ($i -lt $empSteps.Count-1) }
[void](Add-ImageContained $slide $employerRequirementsPath 275 382 410 95 'Employer job or training requirements screen')
Add-Notes $slide '25 seconds - Charbel. Emphasize employer control. A role supplies consistent tasks, while the employer supplies actual requirements, priorities and available support for that opportunity.'

# 19 - End-to-end workflow
$slide = Add-FinalBaseSlide 'Integrated workflow' 'Human-controlled recruitment and auditable outcomes' 19 'Each role contributes a bounded decision; no single AI response creates an employment outcome.'
Add-FlowStep $slide 'Candidate' "Verified profile`nInterests + abilities`nChooses opportunity" 48 178 150 190 $blue $true
Add-FlowStep $slide 'Compatibility' "Deterministic score`nTask explanation`nEligibility gates" 238 178 150 190 $green $true
Add-FlowStep $slide 'Application' "Candidate confirms`nDocuments stay private`nSnapshot recorded" 428 178 150 190 $rust $true
Add-FlowStep $slide 'Employer' "Reviews application`nChanges status`nOffers human decision" 618 178 150 190 $wine $true
Add-FlowStep $slide 'Outcome audit' "Previous/new status`nActor + timestamp`nNotification result" 808 178 104 190 $amber $false
[void](Add-Text $slide 'Verifier authorizes disability-card evidence | Administrator maintains controlled catalogues and users' 140 418 680 24 11 $navy $true 'Aptos Display' 2)
Add-Notes $slide '25 seconds - Charbel. Trace one application from verified candidate to employer decision. The stored compatibility snapshot and chronological status events preserve what happened and when.'

# 20 - Verification strategy
$slide = Add-FinalBaseSlide 'Verification methodology' 'Evidence was layered from functions to real users' 20 'Passing sign-in alone was a prerequisite; evaluation focused on output correctness, safety, accessibility and quality.'
$layers = @(
    @{Y=392;X=120;W=720;T='Human and assistive-technology evaluation';D='20-person Arc en Ciel session + separate JAWS workflow';C=$wine},
    @{Y=332;X=165;W=630;T='Cloud staging quality register';D='310 planned and executed cases across ten areas';C=$rust},
    @{Y=272;X=210;W=540;T='Browser end-to-end and integration';D='26/26 browser scenarios + 25/25 API checks';C=$blue},
    @{Y=212;X=255;W=450;T='Service and decision tests';D='57/57 voice/action safety + 17/17 scoring';C=$green},
    @{Y=152;X=300;W=360;T='Static and contract checks';D='Schemas, translations, syntax, routes and build';C=$amber}
)
foreach($l in $layers){[void](Add-Box $slide $l.X $l.Y $l.W 48 $white $l.C 4);[void](Add-Box $slide $l.X $l.Y 7 48 $l.C $l.C);[void](Add-Text $slide $l.T ($l.X+18) ($l.Y+8) ($l.W*0.54) 18 10.5 $l.C $true 'Aptos');[void](Add-Text $slide $l.D ($l.X+($l.W*0.56)) ($l.Y+8) ($l.W*0.41) 28 8.4 $ink $false 'Aptos')}
Add-Notes $slide '25 seconds - Charbel. Explain why multiple layers are needed. Unit tests prove rules, browser tests prove workflows, staging proves deployment integration, and real users expose barriers automation misses.'

# 21 - Overall test result
$slide = Add-FinalBaseSlide 'Final verification' 'All 310 planned staging cases were completed' 21 'The register preserves first-run failures and noisy partials instead of hiding them behind the final result.'
[void](Add-Box $slide 48 150 290 290 $navy $navy 7)
[void](Add-Text $slide '93.2%' 78 188 230 70 45 $white $true 'Aptos Display' 2)
[void](Add-Text $slide 'FINAL PASS RATE' 78 267 230 22 11 $green $true 'Aptos' 2)
[void](Add-Text $slide "289 final passes`n21 retained failures`n0 blocked / not run" 78 320 230 74 13 (ConvertTo-Rgb '#DDE7F5') $true 'Aptos' 2)
[void](Add-Text $slide 'First execution' 390 155 250 25 16 $navy $true 'Aptos Display')
Add-Metric $slide '274' 'passed directly' 390 205 150 $green
Add-Metric $slide '15' 'partial in noisy transcription' 566 205 150 $amber
Add-Metric $slide '21' 'failed and retained' 742 205 150 $wine
[void](Add-Box $slide 390 320 502 90 $white $line 4)
[void](Add-Text $slide 'Retest interpretation' 412 339 180 20 11 $rust $true 'Aptos')
[void](Add-Text $slide 'The 15 noisy cases passed after repetition or manual correction. Failures were not silently reclassified; they remain visible in the workbook and report.' 412 369 450 31 9.3 $ink $false 'Aptos')
[void](Add-Text $slide 'Evidence: JoIn Final Test Register - Master Register, Dashboard, Defects and Evidence Index.' 390 434 500 16 7.5 $muted $false 'Aptos')
Add-Notes $slide '35 seconds - Charbel. Lead with 310 executed and 93.2 percent final pass. Explain exactly how 15 noisy partials became final passes, and that the 21 failures remain visible.'

# 22 - Per-area result
$slide = Add-FinalBaseSlide 'Final verification' 'Results by engineering test area' 22 'Final pass rate is useful only when read together with each area, target and open defect.'
Add-Bar $slide 'AI profile suggestions' 0.883 48 145 405 $rust
Add-Bar $slide 'Voice transcription' 1.0 48 180 405 $green
Add-Bar $slide 'Voice navigation' 1.0 48 215 405 $green
Add-Bar $slide 'Matching engine' 1.0 48 250 405 $green
Add-Bar $slide 'Complete workflows' 1.0 48 285 405 $green
Add-Bar $slide 'Security + privacy' 0.95 507 145 405 $rust
Add-Bar $slide 'Accessibility' 1.0 507 180 405 $green
Add-Bar $slide 'Multilingual + RTL' 1.0 507 215 405 $green
Add-Bar $slide 'Browser + device' 1.0 507 250 405 $green
Add-Bar $slide 'Performance + reliability' 0.519 507 285 405 $wine
[void](Add-Box $slide 85 355 790 100 $navy $navy 4)
[void](Add-Text $slide 'Read the pattern, not only the average' 110 374 300 20 12 $white $true 'Aptos Display')
[void](Add-Text $slide 'Strong functional correctness and language coverage. Improvement work is concentrated in AI preference extraction, one upload behavior, and staging latency under load.' 110 408 730 32 10 (ConvertTo-Rgb '#DDE7F5') $false 'Aptos')
Add-Notes $slide '30 seconds - Charbel. Do not read every bar. Say that seven areas reached 100 percent final pass, while AI, security and especially performance expose the main improvement priorities.'

# 23 - Findings
$slide = Add-FinalBaseSlide 'Engineering findings' 'Testing produced actionable defects, not only pass counts' 23 'A final-year engineering project should explain what failed, why it matters and what should change next.'
$findings = @(
    @{X=48;Y=145;T='AI preference extraction';D='Explicit Both work-and-training wording was intermittently omitted.';C=$rust},
    @{X=338;Y=145;T='Contrast and zoom reflow';D='Helper text contrast and high-zoom candidate header overflow need remediation.';C=$blue},
    @{X=628;Y=145;T='Oversized upload behavior';D='PHP could drop the file while an application record was still created.';C=$wine},
    @{X=48;Y=292;T='Write-operation latency';D='Publishing and application p95 exceeded the one-second target in four cases.';C=$amber},
    @{X=338;Y=292;T='Free-tier cold starts';D='Healthy services may require warm-up; temporary 503s were observed.';C=$green},
    @{X=628;Y=292;T='Acoustic robustness';D='Noise and dictated email characters can require repetition or editing.';C=$rust}
)
foreach($f in $findings){Add-Card $slide $f.T $f.D $f.X $f.Y 270 122 $f.C}
[void](Add-Text $slide 'Engineering response: preserve failures, prioritize by risk, correct, retest and retain traceable evidence.' 140 452 680 24 12 $navy $true 'Aptos Display' 2)
Add-Notes $slide '25 seconds - Charbel. These findings demonstrate the value of testing. Prioritize the upload defect and accessibility issues; latency and acoustic quality require capacity and controlled-environment follow-up.'

# 24 - Human evaluation
$slide = Add-FinalBaseSlide 'Human-centred validation' 'The platform was evaluated with its intended users' 24 'Human evidence complements automated checks; photographs document sessions but do not prove universal accessibility.'
[void](Add-ImageContained $slide $noellePath 48 145 265 245 'Noelle Marie Gabrielle testing with JAWS on her adapted device')
[void](Add-ImageContained $slide $arcGroupPath 347 145 265 245 'Arc en Ciel group accessibility and usability session')
[void](Add-ImageContained $slide $arcP01Path 646 145 265 245 'Participant P01 interacting with the Arabic profile workflow')
[void](Add-Text $slide 'JAWS evaluation' 48 401 265 18 11 $navy $true 'Aptos Display' 2)
[void](Add-Text $slide 'Noelle completed navigation, registration and job-application interaction on her adapted device.' 58 427 245 36 8.7 $ink $false 'Aptos' 2)
[void](Add-Text $slide 'Arc en Ciel: 20 participants' 347 401 265 18 11 $navy $true 'Aptos Display' 2)
[void](Add-Text $slide 'Users with different needs interacted with the main platform workflows in a real setting.' 357 427 245 36 8.7 $ink $false 'Aptos' 2)
[void](Add-Text $slide 'Accessibility in context' 646 401 265 18 11 $navy $true 'Aptos Display' 2)
[void](Add-Text $slide 'Simple steps, Arabic support and voice assistance helped broaden participation.' 656 427 245 36 8.7 $ink $false 'Aptos' 2)
Add-Notes $slide '35 seconds - Charbel. Explain the two separate activities: 20-person Arc en Ciel session and focused JAWS evaluation with Noelle. Avoid claiming this proves universal usability or full WCAG conformance.'

# 25 - Performance and reliability
$slide = Add-FinalBaseSlide 'Performance and reliability' 'Functionality held; free-tier latency did not always meet the target' 25 'Availability and response-time quality were evaluated separately.'
[void](Add-Box $slide 48 150 400 250 $white $green 5)
[void](Add-Text $slide 'Functional reliability' 72 176 330 24 17 $green $true 'Aptos Display')
Add-Metric $slide '144 / 144' 'shared-load responses succeeded with zero 5xx' 72 222 160 $green
Add-Metric $slide '96 / 96' 'publish/application mutations returned HTTP 201' 252 222 160 $green
[void](Add-Text $slide 'The deployed services produced the expected functional output after health warm-up.' 72 325 330 42 10 $ink $false 'Aptos')
[void](Add-Box $slide 512 150 400 250 $white $wine 5)
[void](Add-Text $slide 'Latency and dependency limits' 536 176 330 24 17 $wine $true 'Aptos Display')
Add-Metric $slide '3 / 9' 'shared-load latency cases met threshold' 536 222 160 $wine
Add-Metric $slide '4 / 6' 'write p95 checks exceeded one second' 716 222 160 $amber
[void](Add-Text $slide 'Free-service cold starts and external AI availability remain staging constraints. Local bundle budgets passed after removing a blocking external font request.' 536 325 330 58 10 $ink $false 'Aptos')
[void](Add-Text $slide 'Conclusion: functionally usable staging evidence, but no production availability or capacity claim.' 140 435 680 26 12 $navy $true 'Aptos Display' 2)
Add-Notes $slide '30 seconds - Charbel. Separate correctness from speed. All shared-load responses succeeded, but most latency targets did not. This supports the prototype while defining production hardening work.'

# 26 - Cost and roadmap
$slide = Add-FinalBaseSlide 'Cost, scalability and roadmap' 'Control paid AI first; scale only from measured bottlenecks' 26 'The prototype uses free staging resources, but production must govern API usage, capacity and sensitive-data handling.'
Add-Card $slide 'Current bounded design' "10 MB maximum voice payload`n500-character voice transcript bound`n4,000-character profile narrative`nSix sanitized context turns`nManual edit and confirmation fallback" 48 145 250 260 $blue
Add-Card $slide 'Production cost controls' "Per-user daily AI and voice quotas`nRate limits and cooldowns`nBudget alarms and usage dashboards`nLower-cost model for classification`nBrowser speech fallback where suitable" 355 145 250 260 $green
Add-Card $slide 'Measured scaling plan' "Warm non-sleeping capacity when justified`nProfile slow queries and database writes`nQueue burst work where appropriate`nCache only safe public catalogues`nNever casually cache private profile output" 662 145 250 260 $rust
[void](Add-Box $slide 120 430 720 44 $navy $navy 4)
[void](Add-Text $slide 'Why no cache yet? Measurements point first to cold starts, external AI and write paths; sensitive and mutable data require careful invalidation.' 145 443 670 20 9.6 $white $true 'Aptos' 2)
Add-Notes $slide '30 seconds - Charbel. Distinguish implemented bounds from proposed production quotas. Caching was deferred because measurement did not yet prove it was the correct first fix and because private mutable data creates safety and invalidation risks.'

# 27 - Conclusion and demo
$slide = Add-FinalBaseSlide 'Conclusion' 'A validated bridge from ability to opportunity' 27 'The project demonstrates technical feasibility and practical relevance while keeping its limitations explicit.'
[void](Add-Box $slide 48 145 510 300 $white $line 5)
[void](Add-Text $slide 'Delivered' 72 169 160 24 17 $green $true 'Aptos Display')
[void](Add-Text $slide "+ Four protected role workflows`n+ Multilingual and RTL interface`n+ Candidate-controlled AI and voice assistance`n+ Deterministic task-level matching`n+ Jobs and hospitality training programs`n+ Render/Supabase cloud staging`n+ 310-case register plus human validation" 72 215 430 184 11 $ink $false 'Aptos')
[void](Add-Box $slide 590 145 322 300 $navy $navy 5)
[void](Add-Text $slide '5-minute demonstration' 616 169 260 24 17 $white $true 'Aptos Display')
[void](Add-Text $slide "00:00  Candidate profile + consent`n01:00  Match score + explanation`n02:00  Employer job/training workflow`n03:00  Verifier/admin + deployment evidence`n04:00  Language, keyboard and voice path" 616 220 260 112 10.5 $white $false 'Aptos')
[void](Add-Text $slide 'If the paid AI dependency is unavailable, use the retained multilingual screenshots and continue the deterministic live workflows.' 616 360 260 54 10 $green $true 'Aptos' 2)
Add-Notes $slide '20 seconds - Charbel. Close with the engineering contribution and transition directly into the demonstration. Do not attempt a paid AI call if the provider has no credit; use retained evidence and demonstrate the remaining live workflows.'

# 28 - Q&A
$slide = $presentation.Slides.Add($presentation.Slides.Count + 1, 12)
$slide.Background.Fill.ForeColor.RGB = $navy
$slide.Background.Fill.Solid()
[void](Add-Box $slide 0 0 960 540 $navy $navy)
if (Test-Path $universityLogoPath) { [void](Add-ImageContained $slide $universityLogoPath 48 35 230 72 'Universite Saint-Joseph and ESIB logo' $false) }
if (Test-Path $joinLogoPath) { [void](Add-ImageContained $slide $joinLogoPath 790 30 120 100 'JoIn Hospitality logo' $false) }
[void](Add-Text $slide 'Thank you' 150 184 660 60 42 $white $true 'Aptos Display' 2)
[void](Add-Text $slide 'Questions?' 250 260 460 44 26 $green $true 'Aptos Display' 2)
[void](Add-Text $slide 'https://join-hospitality-zm-staging.onrender.com/' 225 354 510 24 12 (ConvertTo-Rgb '#DDE7F5') $false 'Aptos' 2)
[void](Add-Text $slide 'Accessible recruitment | Explainable matching | Human control' 210 420 540 20 11 $white $true 'Aptos' 2)
Add-Notes $slide 'Leave this slide visible during questions.'

# 29 - Hidden appendix: detailed register
$slide = Add-FinalBaseSlide 'Appendix A' 'Detailed 310-case verification register' 29 'Backup evidence for jury questions; excluded from the timed presentation.'
$slide.SlideShowTransition.Hidden = -1
$headers = @('TEST AREA','EXECUTED','FINAL PASS','FAIL','FINAL RATE')
$x = @(48,455,565,675,765)
$w = @(407,110,110,90,147)
for($i=0;$i -lt $headers.Count;$i++){[void](Add-Box $slide $x[$i] 138 $w[$i] 28 $navy $navy);[void](Add-Text $slide $headers[$i] ($x[$i]+8) 146 ($w[$i]-16) 13 8 $white $true 'Aptos' 2)}
$registerRows = @(
    @('AI Profile Suggestions','60','53','7','88.3%'),
    @('Voice Transcription','30','30','0','100.0%'),
    @('Voice Navigation','60','60','0','100.0%'),
    @('Matching Engine','45','45','0','100.0%'),
    @('Complete Workflows','20','20','0','100.0%'),
    @('Security and Privacy','20','19','1','95.0%'),
    @('Accessibility','18','18','0','100.0%'),
    @('Multilingual and RTL','18','18','0','100.0%'),
    @('Browser and Device','12','12','0','100.0%'),
    @('Performance and Reliability','27','14','13','51.9%'),
    @('TOTAL','310','289','21','93.2%')
)
$y=166
for($r=0;$r -lt $registerRows.Count;$r++){
    $fill=if($r -eq $registerRows.Count-1){ConvertTo-Rgb '#E3EAF4'}elseif($r%2 -eq 0){$white}else{ConvertTo-Rgb '#F4F6F9'}
    $bold=($r -eq $registerRows.Count-1)
    for($c=0;$c -lt 5;$c++){
        $cellAlignment = if($c -eq 0){1}else{2}
        [void](Add-Box $slide $x[$c] $y $w[$c] 28 $fill $line)
        [void](Add-Text $slide $registerRows[$r][$c] ($x[$c]+8) ($y+7) ($w[$c]-16) 14 8.6 $ink $bold 'Aptos' $cellAlignment)
    }
    $y+=28
}
[void](Add-Text $slide 'First run: 274 pass, 15 partial noisy-transcription cases and 21 fail. The 15 partials passed after repetition or manual correction.' 80 480 800 16 8.3 $muted $false 'Aptos' 2)
Add-Notes $slide 'Appendix only. Use if the jury asks for the exact denominator and per-area counts.'

# 30 - Hidden appendix: WCAG mapping
$slide = Add-FinalBaseSlide 'Appendix B' 'Selected WCAG 2.1 AA evidence mapping' 30 'Representative criteria; the complete matrix remains in the report and WCAG audit evidence.'
$slide.SlideShowTransition.Hidden = -1
$wcagRows = @(
    @('1.1.1 / 1.3.1','Text alternatives; information and relationships','Semantic headings, labels, descriptions and image alternatives'),
    @('1.4.3','Contrast (minimum)','Implemented generally; helper-text contrast finding remains open'),
    @('1.4.10 / 1.4.12','Reflow and text spacing','320-1440 px and spacing tests; two high-zoom overflow cases retained'),
    @('2.1.1','Keyboard','Critical candidate, employer, verifier and admin workflows completed'),
    @('2.4.3 / 2.4.7','Focus order and visible focus','Logical tab order, focused recovery and visible focus treatment'),
    @('3.2 / 3.3','Predictability and input assistance','Consistent navigation, instructions, validation and confirmation'),
    @('4.1.2 / 4.1.3','Name, role, value and status messages','Native controls plus accessible status / alert announcements'),
    @('Manual AT evidence','JAWS workflow','Navigation, registration and application completed on adapted device')
)
$wx=@(48,180,420);$ww=@(132,240,492)
foreach($i in 0..2){[void](Add-Box $slide $wx[$i] 145 $ww[$i] 32 $navy $navy)}
[void](Add-Text $slide 'CRITERION' 56 154 116 14 8 $white $true 'Aptos' 2)
[void](Add-Text $slide 'REQUIREMENT' 188 154 224 14 8 $white $true 'Aptos' 2)
[void](Add-Text $slide 'PLATFORM EVIDENCE / BOUNDARY' 428 154 476 14 8 $white $true 'Aptos' 2)
$y=177
for($r=0;$r -lt $wcagRows.Count;$r++){
    $fill=if($r%2 -eq 0){$white}else{ConvertTo-Rgb '#F4F6F9'}
    foreach($c in 0..2){[void](Add-Box $slide $wx[$c] $y $ww[$c] 37 $fill $line);[void](Add-Text $slide $wcagRows[$r][$c] ($wx[$c]+8) ($y+7) ($ww[$c]-16) 24 8.2 $ink ($c -eq 0) 'Aptos')}
    $y+=37
}
[void](Add-Box $slide 95 482 770 20 $navy $navy 2)
[void](Add-Text $slide 'Conformance statement: target and evidence only; an independent audit and closure of open findings are required before claiming full WCAG 2.1 AA conformance.' 110 487 740 11 7.6 $white $true 'Aptos' 2)
Add-Notes $slide 'Appendix only. Use if the jury asks which specific WCAG success criteria were considered.'

# 31 - Hidden appendix: voice trace
$slide = Add-FinalBaseSlide 'Appendix C' 'Verified voice trace and rejected-command example' 31 'Illustrative redacted console structure using the implemented labels and registered actions.'
$slide.SlideShowTransition.Hidden = -1
[void](Add-Box $slide 48 145 864 276 (ConvertTo-Rgb '#101725') (ConvertTo-Rgb '#101725') 4)
$trace = @(
    '[VOICE AUDIO] Exact uploaded recording: { type: audio/webm;codecs=opus, bytes: 18432, durationMs: 2300 }',
    '[VOICE STT] Transcript: Open my profile',
    '[VOICE CLASSIFIER] Category: { category: navigation, language: en, confidence: 0.99 }',
    '[VOICE INTENT] Proposal: { command: NAVIGATE, target: candidate_profile, language: en }',
    '[VOICE ROUTER] Decision: { status: authorized, action: { type: route_and_tab, value: /candidate, tab: PROFILE } }',
    '[VOICE FEEDBACK] Text: Opening your profile.',
    '',
    'Rejected example: Open the secret admin page -> target absent from candidate registry -> no action executed.'
)
[void](Add-Text $slide ($trace -join "`n") 68 166 824 230 10 (ConvertTo-Rgb '#D9F2E6') $false 'Consolas')
[void](Add-Box $slide 100 444 760 42 $white $line 4)
[void](Add-Text $slide 'Raw audio bytes and API keys are not logged. Sensitive values are redacted. Request IDs correlate the bounded pipeline stages.' 125 457 710 18 9 $navy $true 'Aptos' 2)
Add-Notes $slide 'Appendix only. Use if the jury asks how a natural-language command becomes a controlled React action.'

# 32 - Hidden appendix: data evidence
$slide = Add-FinalBaseSlide 'Appendix D' 'Deployed relational model and storage separation' 32 'The screenshots provide deployment evidence without exposing credentials or secret values.'
$slide.SlideShowTransition.Hidden = -1
[void](Add-ImageContained $slide $supabaseSchemaPath 48 145 560 300 'Supabase schema visualizer for deployed relational data')
[void](Add-ImageContained $slide $supabaseStoragePath 632 145 280 180 'Supabase purpose-specific storage buckets')
[void](Add-Card $slide 'Recorded staging data' "9 accounts across four roles`n15 job definitions`n923 controlled tasks`n14,453 disability-task assessments`n74 published opportunities" 632 342 280 126 $green)
Add-Notes $slide 'Appendix only. Use if the jury asks for database proof, dataset scale or storage isolation.'

# 33 - Hidden appendix: references
$slide = Add-FinalBaseSlide 'Appendix E' 'Principal references and evidence locations' 33 'Full citations and traceability appear in the submitted final report.'
$slide.SlideShowTransition.Hidden = -1
Add-Card $slide 'Research and standards' "WHO - Disability and Health (1.3 billion / 16%)`nILO - Advancing disability inclusion in the global labour market (2025)`nILOSTAT - Labour market indicators for persons with disabilities`nW3C - Web Content Accessibility Guidelines 2.1`nBusiness Disability Forum / Evenbreak candidate survey" 48 145 410 260 $blue
Add-Card $slide 'Project evidence' "Final engineering report - September 2026`nJoIn Final Test Register - 310 cases`ndocs/testing/staging-2026-09-10/`ndocs/wcag-audit/`nrender.yaml and staging-deployment branch`nhttps://join-hospitality-zm-staging.onrender.com/" 502 145 410 260 $green
[void](Add-Text $slide 'Evidence policy: automated logs, screenshots, human observations and team-confirmed manual cases remain explicitly distinguished.' 120 442 720 28 11 $navy $true 'Aptos Display' 2)
Add-Notes $slide 'Appendix only. Use if the jury asks for source traceability.'

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null
New-Item -ItemType Directory -Force -Path $previewDirectory | Out-Null

$presentation.SaveAs($OutputPath, 24)
$presentation.SaveAs($pdfPath, 32)
try { $presentation.SaveAs($previewDirectory, 18) } catch {}

$presentation.Close()
$powerPoint.Quit()
[Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null
[Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null
[GC]::Collect()
[GC]::WaitForPendingFinalizers()

Write-Output "Presentation: $OutputPath"
Write-Output "PDF: $pdfPath"
Write-Output "Preview: $previewDirectory"
