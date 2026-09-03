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
    $OutputPath = Join-Path $presentationDirectory 'Inclusive_Web_Platform_Engineering_Progress_Presentation_2026-08-26.pptx'
}
$pdfPath = [IO.Path]::ChangeExtension($OutputPath, '.pdf')

. $baseGenerator -OutputPath $OutputPath -HelpersOnly

function Add-SimpleBaseSlide([string] $Section, [string] $Title, [int] $Number, [string] $Subtitle = '') {
    $slide = $presentation.Slides.Add($presentation.Slides.Count + 1, 12)
    $slide.Background.Fill.ForeColor.RGB = $warmLight
    $slide.Background.Fill.Solid()
    [void](Add-Box $slide 0 0 960 8 $blue $blue)
    [void](Add-Text $slide $Section.ToUpperInvariant() 48 28 400 18 9 $rust $true 'Aptos')
    [void](Add-Text $slide $Title 48 52 850 42 28 $navy $true 'Aptos Display')
    if ($Subtitle) { [void](Add-Text $slide $Subtitle 48 96 850 26 11 $muted $false 'Aptos') }
    [void](Add-Line $slide 48 508 912 508 $line 0.8)
    [void](Add-Text $slide 'INCLUSIVE WEB PLATFORM | PROGRESS PRESENTATION | 26 AUG 2026' 48 515 700 14 7.5 $muted $false 'Aptos')
    [void](Add-Text $slide ([string]$Number).PadLeft(2, '0') 874 514 38 14 8 $rust $true 'Aptos' 3)
    return $slide
}

function Add-StatusPill($Slide, [string] $Text, [double] $X, [double] $Y, [int] $Color) {
    [void](Add-Box $Slide $X $Y 88 22 $Color $Color 3)
    [void](Add-Text $Slide $Text $X ($Y + 5) 88 13 8.5 $white $true 'Aptos' 2)
}

function Add-RequirementCard($Slide, [string] $Title, [string] $Detail, [double] $X, [double] $Y, [int] $Accent) {
    [void](Add-Box $Slide $X $Y 270 105 $white $line 4)
    [void](Add-Box $Slide $X $Y 6 105 $Accent $Accent)
    [void](Add-Text $Slide $Title ($X + 22) ($Y + 17) 220 24 14 $navy $true 'Aptos Display')
    [void](Add-Text $Slide $Detail ($X + 22) ($Y + 51) 220 42 10 $muted $false 'Aptos')
}

# Slide 1 - Title
$slide = $presentation.Slides.Add(1, 12)
$slide.Background.Fill.ForeColor.RGB = $warmLight
$slide.Background.Fill.Solid()
[void](Add-Box $slide 0 0 960 540 $warmLight $warmLight)
[void](Add-Box $slide 0 0 18 540 $blue $blue)
[void](Add-Text $slide 'FINAL YEAR PROJECT | PHASE II' 64 54 430 20 10 $rust $true 'Aptos')
[void](Add-Text $slide 'Inclusive Web Platform' 64 108 650 60 38 $navy $true 'Aptos Display')
[void](Add-Text $slide 'Implementation Progress' 64 174 600 42 26 $blue $true 'Aptos Display')
[void](Add-Text $slide 'A practical digital bridge connecting persons with disabilities to real hospitality jobs, training, employers, and support.' 64 250 640 70 17 $ink $false 'Aptos')
[void](Add-Box $slide 64 346 770 1 $line $line)
[void](Add-Text $slide 'Zaidan Mansour | Charbel Rizk' 64 378 540 24 14 $ink $true 'Aptos')
[void](Add-Text $slide 'Supervisors: Dr. Jean Yves Youssef | Dr. Roger Obeid | Dr. Rima Kilany' 64 411 700 24 10.5 $muted $false 'Aptos')
[void](Add-Text $slide '26 August 2026' 64 475 220 18 9.5 $rust $true 'Aptos')
if (Test-Path $logoPath) { [void](Add-Image $slide $logoPath 782 60 105 105 'JoIn Hospitality logo') }
[void](Add-Tag $slide 'PROGRESS REVIEW' 750 200 140 $navy)
[void](Add-Text $slide "Connect people.`nSupport decisions.`nKeep humans in control." 750 252 160 95 14.5 $navy $true 'Aptos Display')
Add-Notes $slide '45 seconds. Introduce the team and say: this project is not a magical hiring system; it is a practical bridge that makes real opportunities and support easier to reach.'

# Slide 2 - Purpose
$slide = Add-SimpleBaseSlide 'Project purpose' 'A bridge to real opportunities - not a replacement for people' 2 'Technology organizes access and communication; employers, candidates, families, and experts make the decisions.'
[void](Add-Box $slide 48 150 260 286 $white $line 5)
Add-Tag $slide 'WHAT EXISTS' 72 172 110 $green
[void](Add-Text $slide 'Real people and real hospitality businesses' 72 218 210 48 17 $navy $true 'Aptos Display')
[void](Add-Text $slide "Persons with disabilities`nFamilies and associations`nEmployers and training providers`nJoIn inclusion expertise" 72 292 210 105 11.5 $ink $false 'Aptos')
[void](Add-Box $slide 350 150 260 286 $navy $navy 5)
Add-Tag $slide 'THE PLATFORM' 374 172 112 $rust
[void](Add-Text $slide 'Makes connection easier and clearer' 374 218 210 48 17 $white $true 'Aptos Display')
[void](Add-Text $slide "Shows opportunities`nStructures abilities and tasks`nExplains compatibility`nSupports communication" 374 292 210 105 11.5 $white $false 'Aptos')
[void](Add-Box $slide 652 150 260 286 $white $line 5)
Add-Tag $slide 'HUMAN CONTROL' 676 172 120 $wine
[void](Add-Text $slide 'People remain responsible for every outcome' 676 218 210 48 17 $navy $true 'Aptos Display')
[void](Add-Text $slide "The platform does not invent jobs.`nIt does not diagnose disability.`nIt does not automatically hire or reject.`nIt helps people approach businesses." 676 292 210 112 11.5 $ink $false 'Aptos')
Add-Notes $slide '85 seconds. This is the central message: the project digitizes and scales connection. It does not replace the candidate, employer, family, association, or inclusion expert.'

# Slide 3 - Requirements
$slide = Add-SimpleBaseSlide 'Project scope' 'Functional and non-functional requirements' 3 'The engineering scope includes both user capabilities and measurable quality constraints.'
[void](Add-Box $slide 48 145 412 315 $white $line 5)
[void](Add-Text $slide 'Functional requirements' 74 170 280 28 18 $blue $true 'Aptos Display')
$candidateItems = @(
    'Secure accounts and authorized verification',
    'Candidate, company, and employer profiles',
    'AI-assisted editable profile workflow',
    'Explainable matching and applications',
    'Employer, verifier, and admin operations',
    'Keyboard and optional voice navigation'
)
$y = 216
foreach ($item in $candidateItems) {
    [void](Add-Text $slide '+' 74 $y 18 18 12 $blue $true 'Aptos')
    [void](Add-Text $slide $item 102 $y 320 28 11 $ink $false 'Aptos')
    $y += 39
}
[void](Add-Box $slide 500 145 412 315 $white $line 5)
[void](Add-Text $slide 'Non-functional requirements' 526 170 320 28 18 $green $true 'Aptos Display')
$managementItems = @(
    'WCAG 2.1 AA target and responsive design',
    'Security, privacy, consent, and role isolation',
    'English, French, Arabic, and RTL behavior',
    'Transparent and auditable decisions',
    'Reliability, automated tests, and monitoring',
    'Measured response-time and performance improvement'
)
$y = 216
foreach ($item in $managementItems) {
    [void](Add-Text $slide '+' 526 $y 18 18 12 $green $true 'Aptos')
    [void](Add-Text $slide $item 554 $y 320 28 11 $ink $false 'Aptos')
    $y += 39
}
Add-Notes $slide '70 seconds. Define functional requirements as actions and non-functional requirements as the quality and engineering constraints applied to those actions.'

# Slide 4 - Implemented feature map
$slide = Add-SimpleBaseSlide 'Completed platform' 'Implemented feature summary' 4 'The current prototype already connects the four user roles through protected and accessible workflows.'
$featureCards = @(
    @{X=48;Y=145;Title='AI profile builder';Text='Voice or text -> editable transcript -> consent -> reviewable suggestions';Color=$blue},
    @{X=266;Y=145;Title='Candidate verification';Text='Email confirmation plus private disability-card review by an authorized verifier';Color=$wine},
    @{X=484;Y=145;Title='Security controls';Text='JWT session, server-confirmed role, protected routes and APIs, private storage';Color=$rust},
    @{X=702;Y=145;Title='Matching + applications';Text='Deterministic task score, explanations, applications, and stored outcomes';Color=$green},
    @{X=48;Y=300;Title='Employer tools';Text='Company profile, vacancy creation, requirements, important tasks, assistance';Color=$green},
    @{X=266;Y=300;Title='Admin + verifier';Text='Users, applications, candidate evidence decisions, and dataset catalogue';Color=$wine},
    @{X=484;Y=300;Title='Accessible navigation';Text='Keyboard, arrow-key support, visible focus, status announcements, optional voice';Color=$blue},
    @{X=702;Y=300;Title='Multilingual UI';Text='English, French, Arabic, RTL layout, stable codes, and locale tests';Color=$rust}
)
foreach($item in $featureCards){
    [void](Add-Box $slide $item.X $item.Y 202 126 $white $line 4)
    [void](Add-Box $slide $item.X $item.Y 6 126 $item.Color $item.Color)
    [void](Add-Text $slide $item.Title ($item.X+18) ($item.Y+15) 168 26 13 $item.Color $true 'Aptos Display')
    [void](Add-Text $slide $item.Text ($item.X+18) ($item.Y+52) 168 60 9.3 $ink $false 'Aptos')
}
Add-Notes $slide '75 seconds. Summarize the platform feature by feature. Emphasize that these workflows are integrated, not isolated mock-up pages.'

# Slide 5 - Architecture and security
$slide = Add-SimpleBaseSlide 'Technical design' 'Architecture and security boundaries' 5 'The browser never grants authority; Symfony validates identity, role, data, and every protected operation.'
[void](Add-Box $slide 60 210 190 120 $white $blue 4)
[void](Add-Box $slide 60 210 7 120 $blue $blue)
[void](Add-Text $slide 'React frontend' 82 232 145 26 15 $navy $true 'Aptos Display')
[void](Add-Text $slide "Accessible screens`nEnglish | French | Arabic" 82 273 145 40 10 $muted $false 'Aptos')
[void](Add-Box $slide 330 210 210 120 $white $rust 4)
[void](Add-Box $slide 330 210 7 120 $rust $rust)
[void](Add-Text $slide 'Symfony backend' 352 232 165 26 15 $navy $true 'Aptos Display')
[void](Add-Text $slide "Security | validation`nBusiness workflows" 352 273 165 40 10 $muted $false 'Aptos')
[void](Add-Box $slide 650 150 230 100 $white $green 4)
[void](Add-Box $slide 650 150 7 100 $green $green)
[void](Add-Text $slide 'PostgreSQL' 672 171 180 24 15 $navy $true 'Aptos Display')
[void](Add-Text $slide "Users | profiles`nJobs | applications" 672 207 180 34 10 $muted $false 'Aptos')
[void](Add-Box $slide 650 300 230 100 $white $wine 4)
[void](Add-Box $slide 650 300 7 100 $wine $wine)
[void](Add-Text $slide 'Python services' 672 321 180 24 15 $navy $true 'Aptos Display')
[void](Add-Text $slide "AI profile assistance`nDeterministic scoring" 672 357 180 34 10 $muted $false 'Aptos')
[void](Add-Line $slide 250 270 330 270 $blue 2 $true)
[void](Add-Line $slide 540 245 650 200 $green 2 $true)
[void](Add-Line $slide 540 295 650 350 $wine 2 $true)
[void](Add-Text $slide 'REST / JSON' 262 246 58 14 7.5 $muted $true 'Aptos' 2)
[void](Add-Box $slide 150 420 660 68 $navy $navy 4)
[void](Add-Text $slide 'Trust boundary: Symfony confirms the session and role, protects private evidence, validates input, and controls calls to both Python services.' 178 437 604 38 11 $white $true 'Aptos' 2)
Add-Notes $slide '75 seconds. Walk left to right, then explain the security boundary. Frontend route checks improve experience, but backend authorization remains decisive.'

# Slide 6 - Scoring decision
$slide = Add-SimpleBaseSlide 'Engineering decision 1' 'Why deterministic scoring instead of machine learning?' 6 'The current evidence is a controlled expert catalogue, not a labelled history of successful and unsuccessful hires.'
[void](Add-Box $slide 48 145 500 320 $navy $navy 5)
Add-Tag $slide 'CHOSEN: VERSIONED RULES' 74 169 175 $rust
[void](Add-Text $slide 'Task score' 74 214 180 24 17 $white $true 'Aptos Display')
[void](Add-Text $slide 'Sum(adjusted weight x feasibility factor) / Sum(adjusted weight) x 100' 74 246 420 42 13 $white $true 'Aptos')
[void](Add-Text $slide "Feasibility factor: 1.00 feasible | 0.75 with offered support | 0.00 avoid`nHighlighted task: weight x 1.5`nCombined result: tasks + practical abilities (25%) + education (10%) when configured`nRequired education/ability and mandatory unsafe tasks remain explicit eligibility gates" 74 308 420 112 10.5 (ConvertTo-Rgb '#DDE7F5') $false 'Aptos')
[void](Add-Box $slide 590 145 322 320 $white $line 5)
[void](Add-Text $slide 'Deterministic rules' 616 169 260 24 16 $green $true 'Aptos Display')
[void](Add-Text $slide "+ Uses expert task assessments`n+ Every factor is visible`n+ Reproducible and auditable`n+ Works with the current controlled dataset" 616 205 260 92 10.5 $ink $false 'Aptos')
[void](Add-Line $slide 616 312 878 312 $line 0.8)
[void](Add-Text $slide 'Machine learning now' 616 330 260 24 16 $wine $true 'Aptos Display')
[void](Add-Text $slide "+ Needs representative labelled outcomes`n+ May reproduce historical hiring bias`n+ Harder to explain individual factors`n+ No suitable training evidence currently exists" 616 366 260 86 10.5 $ink $false 'Aptos')
Add-Notes $slide '95 seconds. Explain the formula at a high level. The decision is engineering and governance driven: current expert evidence supports versioned rules; it does not support training a defensible predictive model.'

# Slide 7 - Localization decision
$slide = Add-SimpleBaseSlide 'Engineering decision 2' 'Why i18next with react-i18next?' 7 'The interface changes language at runtime while IDs, roles, permissions, and scoring inputs remain stable.'
$localeOptions = @(
    @{X=48;Title='Custom React context';Status='NOT SELECTED';Text='Few dependencies, but we would rebuild fallback, plural rules, namespaces, formatting, and missing-key checks.';Color=$wine},
    @{X=345;Title='Duplicated pages';Status='NOT SELECTED';Text='Simple for one screen, but triples maintenance, creates translation drift, and complicates routing and testing.';Color=$amber},
    @{X=642;Title='i18next + React';Status='SELECTED';Text='Runtime switching, namespaces, fallback, interpolation, plural rules, React hooks, and gradual route migration.';Color=$green}
)
foreach($item in $localeOptions){
    [void](Add-Box $slide $item.X 150 270 250 $white $line 5)
    [void](Add-Box $slide $item.X 150 270 8 $item.Color $item.Color)
    [void](Add-Text $slide $item.Title ($item.X+22) 178 225 28 17 $navy $true 'Aptos Display')
    [void](Add-Text $slide $item.Status ($item.X+22) 222 225 18 8.5 $item.Color $true 'Aptos')
    [void](Add-Text $slide $item.Text ($item.X+22) 260 225 105 10.5 $ink $false 'Aptos')
}
[void](Add-Box $slide 120 425 720 48 $navy $navy 4)
[void](Add-Text $slide 'Implemented: 3 locales x 7 namespaces | Arabic RTL | English fallback | stable codes/IDs | locale parity tests' 145 440 670 22 11 $white $true 'Aptos' 2)
Add-Notes $slide '85 seconds. Compare the maintenance cost and language correctness. i18next was selected because it fits React and supports gradual migration without changing business rules or routes.'

# Slide 8 - Cloud AI decision
$slide = Add-SimpleBaseSlide 'Engineering decision 3' 'Why cloud Whisper-1 and OpenAI services?' 8 'The current prototype prioritizes multilingual quality and rapid delivery without maintaining local speech-model infrastructure.'
$aiOptions = @(
    @{X=48;Title='Browser speech API';Status='REJECTED';Text='Low backend work, but browser support, language quality, behavior, and availability vary by device.';Color=$amber},
    @{X=345;Title='Self-hosted Whisper';Status='DEFERRED';Text='More infrastructure control and offline potential, but requires CPU/GPU capacity, model operations, updates, and load testing.';Color=$wine},
    @{X=642;Title='OpenAI whisper-1';Status='SELECTED NOW';Text='Multilingual transcription, consistent API, no model hosting, and a replaceable service boundary. Trade-offs: network, cost, and latency.';Color=$green}
)
foreach($item in $aiOptions){
    [void](Add-Box $slide $item.X 145 270 190 $white $line 5)
    [void](Add-Box $slide $item.X 145 270 8 $item.Color $item.Color)
    [void](Add-Text $slide $item.Title ($item.X+22) 169 225 26 16 $navy $true 'Aptos Display')
    [void](Add-Text $slide $item.Status ($item.X+22) 208 225 18 8.5 $item.Color $true 'Aptos')
    [void](Add-Text $slide $item.Text ($item.X+22) 241 225 78 9.8 $ink $false 'Aptos')
}
[void](Add-Box $slide 48 360 864 95 $navy $navy 4)
[void](Add-Text $slide 'Current controlled flow' 72 378 180 20 11 $white $true 'Aptos')
[void](Add-Text $slide 'Audio -> whisper-1 transcript -> schema-constrained interpretation -> deterministic registry authorization -> permitted UI action -> cloud TTS or browser fallback' 72 408 815 32 11 $white $true 'Aptos' 2)
Add-Notes $slide '95 seconds. State the trade-off honestly. Cloud services accelerated delivery and removed local model operations, but introduce network latency, provider cost, and availability concerns. The service boundary keeps future replacement possible.'

# Slide 9 - Completed evidence
$slide = Add-SimpleBaseSlide 'Completed evidence' 'Running workflows and automated verification' 9 'The screens are connected to protected backend services and supported by repeatable tests.'
[void](Add-Image $slide (Join-Path $assetDirectory '04-candidate-profile.png') 48 145 270 165 'Candidate profile with editable AI-assisted transcript')
[void](Add-Image $slide (Join-Path $assetDirectory '05-employer-requirements.png') 345 145 270 165 'Employer vacancy requirements form')
[void](Add-Image $slide (Join-Path $assetDirectory '07-verifier.png') 642 145 270 165 'Authorized verifier dashboard')
[void](Add-Text $slide 'AI profile + consent' 48 325 270 22 13 $navy $true 'Aptos Display' 2)
[void](Add-Text $slide 'Employer requirements' 345 325 270 22 13 $navy $true 'Aptos Display' 2)
[void](Add-Text $slide 'Authorized verification' 642 325 270 22 13 $navy $true 'Aptos Display' 2)
Add-Metric $slide '23 / 23' 'API integration checks' 48 375 195 $green
Add-Metric $slide '26 / 26' 'Browser E2E scenarios' 270 375 195 $green
Add-Metric $slide '17 / 17' 'Scoring unit tests' 492 375 195 $green
Add-Metric $slide '3 x 7' 'Locales x namespaces' 714 375 198 $blue
Add-Notes $slide '70 seconds. Use this slide as evidence. Mention route security, profile consent, employer control, and verifier authorization, then read the automated totals.'

# Slide 10 - Current work
$slide = Add-SimpleBaseSlide 'In progress' 'What we are improving now' 10 'Current work focuses on stabilization, interface quality, accessibility retesting, catalogue semantics, and richer profiles.'
$currentCards = @(
    @{X=48;Title='Stability + security';Text='Resolve workflow and API issues`nRetest wrong-role and anonymous access`nImprove validation, errors, and notifications';Color=$blue},
    @{X=345;Title='Design + accessibility';Text='Modernize role dashboards`nImprove responsive flow and visual hierarchy`nRetest keyboard, zoom, screen reader, and RTL';Color=$rust},
    @{X=642;Title='Catalogue + profiles';Text='Validate 7 active -> 15 expected roles`nPreserve Personal Education hierarchy`nImprove candidate and company information';Color=$green}
)
foreach($item in $currentCards){
    [void](Add-Box $slide $item.X 150 270 225 $white $line 5)
    [void](Add-Box $slide $item.X 150 270 8 $item.Color $item.Color)
    [void](Add-Text $slide $item.Title ($item.X+22) 180 225 26 17 $item.Color $true 'Aptos Display')
    [void](Add-Text $slide ($item.Text -replace '`n',"`n") ($item.X+22) 235 225 105 10.5 $ink $false 'Aptos')
}
[void](Add-Text $slide 'Manual evidence still required: native 200% zoom, documented NVDA/browser pairing, and representative-user validation.' 120 410 720 35 10.5 $rust $true 'Aptos' 2)
Add-Notes $slide '80 seconds. Use the terms stabilization, refinement, and retesting. Catalogue work is semantic validation, not only file upload.'

# Slide 11 - Performance plan
$slide = Add-SimpleBaseSlide 'Performance objective' 'Reduce AI, voice-navigation, and page response time' 11 'The objective is measurable improvement in both actual latency and the waiting experienced by the user.'
$latencyCards = @(
    @{X=48;Title='1. Measure first';Text='Timestamp recording, upload, transcription, classification, registry/action, TTS, API, query, and render stages. Report p50 and p95 before/after.';Color=$blue},
    @{X=345;Title='2. Optimize AI path';Text='Trim silence and payloads, bound page context/history, cancel stale requests, keep clients warm, use deterministic shortcuts safely, and keep speech fallback.';Color=$rust},
    @{X=642;Title='3. Optimize platform';Text='Profile database queries, paginate large data, keep route splitting, optimize assets, add indexes, and cache only safe repeated data when measurements justify it.';Color=$green}
)
foreach($item in $latencyCards){
    [void](Add-Box $slide $item.X 150 270 260 $white $line 5)
    [void](Add-Box $slide $item.X 150 270 8 $item.Color $item.Color)
    [void](Add-Text $slide $item.Title ($item.X+22) 180 225 28 17 $item.Color $true 'Aptos Display')
    [void](Add-Text $slide $item.Text ($item.X+22) 235 225 135 10.5 $ink $false 'Aptos')
}
[void](Add-Box $slide 160 435 640 42 $navy $navy 4)
[void](Add-Text $slide 'Performance claim only after repeatable baseline, change, retest, and documented result.' 185 447 590 20 10.5 $white $true 'Aptos' 2)
Add-Notes $slide '90 seconds. This is a planned engineering cycle, not an unsupported speed claim. A cache is one possible optimization after measurement; sensitive candidate or AI output must not be cached casually.'

# Slide 12 - Roadmap and demo
$slide = Add-SimpleBaseSlide 'Next phase' 'Remaining product work and demonstration' 12 'The operational core remains; the next phase broadens access, improves employer support, and prepares validated delivery.'
[void](Add-Box $slide 48 145 500 320 $white $line 5)
Add-Tag $slide 'REMAINING PRODUCT WORK' 74 169 168 $rust
[void](Add-Text $slide "1  Candidate chooses Job, Training, or Both`n`n2  Visitors browse jobs, training, and companies safely`n`n3  Employer records adaptation / assistance for each task`n`n4  Upgrade company, candidate, and employer profiles`n`n5  Complete and validate the 15-role catalogue`n`n6  Finish accessibility evidence, monitoring, capacity tests, and deployment" 74 218 430 200 11 $ink $false 'Aptos')
[void](Add-Box $slide 590 145 322 320 $navy $navy 5)
Add-Tag $slide '5-MINUTE DEMO' 616 169 118 $green
[void](Add-Text $slide "00:00  Candidate profile + consent`n01:00  Match score + explanation`n02:00  Employer requirements + assistance`n03:00  Admin catalogue`n04:00  Language + keyboard + protected route" 616 220 260 120 11.5 $white $false 'Aptos')
[void](Add-Text $slide 'The platform connects people to real businesses and supports human decisions instead of replacing them.' 616 376 260 60 13 $white $true 'Aptos Display' 2)
Add-Notes $slide '80 seconds. Summarize the roadmap, then introduce the demo. The closing statement returns to the project purpose: connection and support, not automatic hiring.'

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null
$presentation.SaveAs($OutputPath, 24)
$presentation.SaveAs($pdfPath, 32)
$presentation.Close()
$powerPoint.Quit()
[Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null
[Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null

Write-Output "Presentation: $OutputPath"
Write-Output "PDF: $pdfPath"
