param(
    [string] $OutputPath,
    [switch] $HelpersOnly
)

$ErrorActionPreference = 'Stop'

function ConvertTo-Rgb([string] $Hex) {
    $value = $Hex.TrimStart('#')
    $red = [Convert]::ToInt32($value.Substring(0, 2), 16)
    $green = [Convert]::ToInt32($value.Substring(2, 2), 16)
    $blue = [Convert]::ToInt32($value.Substring(4, 2), 16)
    return $red + ($green * 256) + ($blue * 65536)
}

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $scriptDirectory '..\..'))
$presentationDirectory = Join-Path $repositoryRoot 'docs\presentation'
$assetDirectory = Join-Path $presentationDirectory 'assets'
if (-not $OutputPath) {
    $OutputPath = Join-Path $presentationDirectory 'Inclusive_Web_Platform_Progress_Presentation_2026-08-25.pptx'
}
$pdfPath = [IO.Path]::ChangeExtension($OutputPath, '.pdf')
$logoPath = Join-Path $repositoryRoot 'frontend\src\assets\john-logo.png'

$navy = ConvertTo-Rgb '#0B1F49'
$ink = ConvertTo-Rgb '#17243A'
$blue = ConvertTo-Rgb '#1565D8'
$rust = ConvertTo-Rgb '#A64B2A'
$green = ConvertTo-Rgb '#157A55'
$amber = ConvertTo-Rgb '#C27A19'
$wine = ConvertTo-Rgb '#563A4B'
$warm = ConvertTo-Rgb '#F5F1E8'
$warmLight = ConvertTo-Rgb '#FBFAF7'
$white = ConvertTo-Rgb '#FFFFFF'
$mist = ConvertTo-Rgb '#E9EEF5'
$muted = ConvertTo-Rgb '#5D6B80'
$line = ConvertTo-Rgb '#CBD5E1'

# PowerPoint COM can reuse an already-running interactive instance. Calling
# Quit() on that instance would close presentations the user is editing, so
# generation must never start while PowerPoint is open.
$activePowerPointProcesses = @(Get-Process POWERPNT -ErrorAction SilentlyContinue)
if ($activePowerPointProcesses.Count -gt 0) {
    throw 'PowerPoint is already running. Save and close every PowerPoint window before running this presentation generator.'
}

$powerPoint = New-Object -ComObject PowerPoint.Application
$powerPoint.Visible = -1
$presentation = $powerPoint.Presentations.Add()
$presentation.PageSetup.SlideWidth = 960
$presentation.PageSetup.SlideHeight = 540

function Add-Box($Slide, [double] $X, [double] $Y, [double] $Width, [double] $Height, [int] $Fill, [int] $Border = $line, [double] $Radius = 0) {
    $type = if ($Radius -gt 0) { 5 } else { 1 }
    $shape = $Slide.Shapes.AddShape($type, $X, $Y, $Width, $Height)
    $shape.Fill.ForeColor.RGB = $Fill
    $shape.Fill.Solid()
    $shape.Line.ForeColor.RGB = $Border
    $shape.Line.Weight = 0.8
    return $shape
}

function Add-Text($Slide, [string] $Text, [double] $X, [double] $Y, [double] $Width, [double] $Height, [double] $Size = 18, [int] $Color = $ink, [bool] $Bold = $false, [string] $Font = 'Aptos', [int] $Align = 1) {
    $shape = $Slide.Shapes.AddTextbox(1, $X, $Y, $Width, $Height)
    $shape.TextFrame.MarginLeft = 0
    $shape.TextFrame.MarginRight = 0
    $shape.TextFrame.MarginTop = 0
    $shape.TextFrame.MarginBottom = 0
    $shape.TextFrame.WordWrap = -1
    $shape.TextFrame.TextRange.Text = $Text
    $shape.TextFrame.TextRange.Font.Name = $Font
    $shape.TextFrame.TextRange.Font.Size = $Size
    $shape.TextFrame.TextRange.Font.Color.RGB = $Color
    $shape.TextFrame.TextRange.Font.Bold = if ($Bold) { -1 } else { 0 }
    $shape.TextFrame.TextRange.ParagraphFormat.Alignment = $Align
    return $shape
}

function Add-Tag($Slide, [string] $Text, [double] $X, [double] $Y, [double] $Width, [int] $Fill, [int] $Color = $white) {
    [void] (Add-Box $Slide $X $Y $Width 24 $Fill $Fill 3)
    [void] (Add-Text $Slide $Text ($X + 8) ($Y + 5) ($Width - 16) 14 9 $Color $true 'Aptos' 2)
}

function Add-Image($Slide, [string] $Path, [double] $X, [double] $Y, [double] $Width, [double] $Height, [string] $AltText) {
    $image = $Slide.Shapes.AddPicture($Path, $false, $true, $X, $Y, $Width, $Height)
    $image.Line.Visible = -1
    $image.Line.ForeColor.RGB = $line
    $image.Line.Weight = 0.8
    $image.AlternativeText = $AltText
    return $image
}

function Add-Line($Slide, [double] $X1, [double] $Y1, [double] $X2, [double] $Y2, [int] $Color = $line, [double] $Weight = 1.5, [bool] $Arrow = $false) {
    $connector = $Slide.Shapes.AddLine($X1, $Y1, $X2, $Y2)
    $connector.Line.ForeColor.RGB = $Color
    $connector.Line.Weight = $Weight
    if ($Arrow) { $connector.Line.EndArrowheadStyle = 3 }
    return $connector
}

function Add-BaseSlide([string] $Section, [string] $Title, [int] $Number, [string] $Subtitle = '') {
    $slide = $presentation.Slides.Add($presentation.Slides.Count + 1, 12)
    $background = $slide.Background.Fill
    $background.ForeColor.RGB = $warmLight
    $background.Solid()
    [void] (Add-Box $slide 0 0 960 8 $rust $rust)
    [void] (Add-Text $slide $Section.ToUpperInvariant() 42 26 420 18 9 $rust $true 'Aptos')
    [void] (Add-Text $slide $Title 42 48 850 45 27 $navy $true 'Aptos Display')
    if ($Subtitle) { [void] (Add-Text $slide $Subtitle 42 91 850 28 11 $muted $false 'Aptos') }
    [void] (Add-Line $slide 42 508 918 508 $line 0.8)
    [void] (Add-Text $slide 'INCLUSIVE WEB PLATFORM | PROGRESS REVIEW | 25 AUG 2026' 42 515 700 14 7.5 $muted $false 'Aptos')
    [void] (Add-Text $slide ([string]$Number).PadLeft(2, '0') 880 514 38 14 8 $rust $true 'Aptos' 3)
    return $slide
}

function Add-Notes($Slide, [string] $Text) {
    try {
        foreach ($shape in $Slide.NotesPage.Shapes) {
            if ($shape.PlaceholderFormat.Type -eq 2) {
                $shape.TextFrame.TextRange.Text = $Text
                break
            }
        }
    } catch {}
}

function Add-Metric($Slide, [string] $Value, [string] $Label, [double] $X, [double] $Y, [double] $Width, [int] $Accent = $blue) {
    [void] (Add-Box $Slide $X $Y $Width 72 $white $line 4)
    [void] (Add-Box $Slide $X $Y 5 72 $Accent $Accent)
    [void] (Add-Text $Slide $Value ($X + 16) ($Y + 11) ($Width - 24) 30 22 $navy $true 'Aptos Display')
    [void] (Add-Text $Slide $Label ($X + 16) ($Y + 43) ($Width - 24) 18 9 $muted $false 'Aptos')
}

if (-not $HelpersOnly) {
# Slide 1 - Title
$slide = $presentation.Slides.Add(1, 12)
$slide.Background.Fill.ForeColor.RGB = $warmLight
$slide.Background.Fill.Solid()
[void] (Add-Box $slide 0 0 960 540 $warmLight $warmLight)
[void] (Add-Box $slide 650 0 310 540 $navy $navy)
[void] (Add-Box $slide 650 0 12 540 $rust $rust)
if (Test-Path $logoPath) { [void] (Add-Image $slide $logoPath 754 54 92 92 'JoIn Hospitality logo') }
[void] (Add-Text $slide 'FINAL YEAR PROJECT | PHASE II' 50 48 480 20 10 $rust $true 'Aptos')
[void] (Add-Text $slide 'Inclusive Web Platform' 50 92 540 64 38 $navy $true 'Aptos Display')
[void] (Add-Text $slide 'Technical Progress Review' 50 160 520 42 24 $blue $true 'Aptos Display')
[void] (Add-Text $slide 'A multimodal, accessibility-first recruitment platform matching the remaining abilities of persons with disabilities to real hospitality tasks.' 50 225 525 76 16 $ink $false 'Aptos')
[void] (Add-Tag $slide 'ENGINEERING BASELINE' 50 325 142 $rust)
[void] (Add-Text $slide 'Decoupled React | Symfony | PostgreSQL | Python service architecture' 50 360 540 25 12 $navy $true 'Aptos')
[void] (Add-Text $slide 'Zaidan Mansour | Charbel Rizk' 50 426 480 22 13 $ink $true 'Aptos')
[void] (Add-Text $slide 'Supervisors: Dr. Jean Yves Youssef | Dr. Roger Obeid | Dr. Rima Kilany' 50 454 560 34 10 $muted $false 'Aptos')
[void] (Add-Text $slide '25 August 2026' 50 500 220 16 9 $rust $true 'Aptos')
[void] (Add-Text $slide 'OPPORTUNITY' 704 190 210 28 20 $white $true 'Aptos Display' 2)
[void] (Add-Text $slide 'SHAPED BY' 704 228 210 28 20 $white $true 'Aptos Display' 2)
[void] (Add-Text $slide 'ABILITY.' 704 266 210 38 28 $blue $true 'Aptos Display' 2)
[void] (Add-Text $slide 'We empower | We connect | We adapt' 700 350 220 44 11 $white $false 'Aptos' 2)
Add-Notes $slide '40 seconds. Introduce the project, both team members, supervisors, and the engineering baseline. Open with: Opportunity should be shaped by ability.'

# Slide 2 - Problem and solution
$slide = Add-BaseSlide 'Context' 'A real inclusion gap - and a software opportunity' 2 'JoIn already brings hospitality and disability expertise; Phase II engineers the scalable digital bridge.'
[void] (Add-Box $slide 42 136 410 300 $white $line 5)
Add-Tag $slide 'THE OPERATIONAL GAP' 66 157 150 $wine
[void] (Add-Text $slide 'Traditional recruitment sees a profile before it sees task capacity.' 66 200 350 52 18 $navy $true 'Aptos Display')
[void] (Add-Text $slide "- Candidates face typing, navigation, literacy, and disclosure barriers.`n`n- Recruiters lack structured evidence about remaining abilities and workplace support.`n`n- Visibility alone does not explain which real duties can be performed." 66 270 350 142 12 $ink $false 'Aptos')
[void] (Add-Box $slide 492 136 426 300 $navy $navy 5)
Add-Tag $slide 'THE ENGINEERING RESPONSE' 516 157 170 $rust
[void] (Add-Text $slide 'Ability-led profiles. Real hospitality tasks. Human control.' 516 200 360 52 18 $white $true 'Aptos Display')
[void] (Add-Text $slide "1  Multimodal, accessible candidate journey`n`n2  Transparent deterministic compatibility`n`n3  Employer-defined requirements and assistance`n`n4  Human-reviewed AI suggestions - never automatic facts" 516 270 350 145 12 $white $false 'Aptos')
Add-Notes $slide '70 seconds. Use the consultant narrative only here: JoIn has inclusion expertise, adapted environments, and training. Our responsibility is the scalable software component.'

# Slide 3 - Requirements
$slide = Add-BaseSlide 'Scope' 'Target objectives and engineering requirements' 3 'The jury can evaluate progress against explicit functional and non-functional targets.'
$columns = @(
    @{ X = 42; Title = 'CORE WORKFLOWS'; Accent = $blue; Items = @('Secure role-based accounts', 'Candidate disability-card verification', 'Candidate and employer profiles', 'AI-assisted editable profile transcript', 'Published-job matching and applications', 'Administrator catalogue import') },
    @{ X = 337; Title = 'ENGINEERING QUALITIES'; Accent = $green; Items = @('WCAG 2.1 Level AA target', 'Keyboard, screen-reader, optional voice', 'English | French | Arabic UI', 'Responsive 320-1440 px layouts', 'Consent, privacy, private storage', 'Explainable and testable decisions') },
    @{ X = 632; Title = 'PROJECT EVIDENCE'; Accent = $rust; Items = @('Versioned architecture and API boundaries', 'Database migrations and relational model', 'Automated integration and E2E tests', 'Performance regression thresholds', 'Audit matrices and limitations', 'Reproducible Docker environment') }
)
foreach ($column in $columns) {
    [void] (Add-Box $slide $column.X 142 270 308 $white $line 5)
    [void] (Add-Box $slide $column.X 142 270 7 $column.Accent $column.Accent)
    [void] (Add-Text $slide $column.Title ($column.X + 20) 162 230 22 11 $column.Accent $true 'Aptos')
    $y = 205
    foreach ($item in $column.Items) {
        [void] (Add-Text $slide '+' ($column.X + 20) $y 18 18 11 $column.Accent $true 'Aptos')
        [void] (Add-Text $slide $item ($column.X + 44) $y 202 30 10.5 $ink $false 'Aptos')
        $y += 39
    }
}
Add-Notes $slide '60 seconds. Distinguish core workflows from non-functional requirements. Say WCAG AA is the target, not yet an unsupported conformance claim.'

# Slide 4 - Architecture
$slide = Add-BaseSlide 'Architecture' 'Decoupled services with explicit trust boundaries' 4 'Browser-to-API communication uses JSON over HTTP(S); internal services are isolated through Docker networking.'
$nodes = @(
    @{ X=42; Y=190; W=170; H=112; Name='React 19 + Vite'; Detail='Accessible multilingual UI`nRole workspaces`nBrowser session'; Fill=$white; Accent=$blue },
    @{ X=292; Y=170; W=200; H=152; Name='Symfony 8 | PHP 8.4'; Detail='REST controllers`nJWT + role authorization`nValidation | privacy | orchestration'; Fill=$navy; Accent=$rust },
    @{ X=572; Y=122; W=160; H=92; Name='PostgreSQL 16'; Detail='Accounts | profiles`nJobs | applications | audits'; Fill=$white; Accent=$green },
    @{ X=572; Y=242; W=160; H=92; Name='Python scoring'; Detail='Deterministic task rules`nExplainable JSON result'; Fill=$white; Accent=$rust },
    @{ X=758; Y=242; W=160; H=92; Name='AI / voice service'; Detail='ASR + structured suggestions`nEditable | consent-gated'; Fill=$white; Accent=$wine }
)
foreach($node in $nodes){
    [void] (Add-Box $slide $node.X $node.Y $node.W $node.H $node.Fill $node.Accent 4)
    [void] (Add-Box $slide $node.X $node.Y 6 $node.H $node.Accent $node.Accent)
    $titleColor = if($node.Fill -eq $navy){$white}else{$navy}
    $detailColor = if($node.Fill -eq $navy){ConvertTo-Rgb '#D7E1F2'}else{$muted}
    [void] (Add-Text $slide $node.Name ($node.X+18) ($node.Y+16) ($node.W-30) 22 13 $titleColor $true 'Aptos Display')
    [void] (Add-Text $slide ($node.Detail -replace '`n',"`n") ($node.X+18) ($node.Y+48) ($node.W-30) ($node.H-56) 9.5 $detailColor $false 'Aptos')
}
[void] (Add-Line $slide 212 246 292 246 $blue 2.2 $true)
[void] (Add-Text $slide 'REST | JSON | JWT' 217 224 72 15 7.5 $muted $true 'Aptos' 2)
[void] (Add-Line $slide 492 206 572 168 $green 2 $true)
[void] (Add-Line $slide 492 258 572 286 $rust 2 $true)
[void] (Add-Line $slide 732 286 758 286 $wine 2 $true)
[void] (Add-Text $slide 'Docker Compose: independently testable and replaceable service boundaries' 292 365 440 28 11 $navy $true 'Aptos' 2)
[void] (Add-Text $slide 'AI assists profile creation. The scoring service remains deterministic and separate.' 292 402 440 28 10 $rust $true 'Aptos' 2)
Add-Notes $slide '90 seconds. Walk left to right. Stress separation: OpenAI/ASR supports profile suggestions; deterministic scoring is a different service and remains explainable.'

# Slide 5 - Data model
$slide = Add-BaseSlide 'Data design' 'Relational model keeps evidence, choices, and outcomes separate' 5 'Simplified core ERD - only the relationships needed to explain the implemented workflow.'
$erd = @(
    @{X=42;Y=158;W=145;H=78;Name='USER';Fields='roles | email | status';Accent=$blue},
    @{X=242;Y=135;W=165;H=105;Name='CANDIDATE PROFILE';Fields='abilities | education`npreferences | consent';Accent=$green},
    @{X=462;Y=135;W=165;H=105;Name='JOB APPLICATION';Fields='status | documents`ncompatibility snapshot';Accent=$rust},
    @{X=682;Y=135;W=165;H=105;Name='JOB POST';Fields='requirements | support`nhighlighted tasks';Accent=$wine},
    @{X=682;Y=300;W=165;H=88;Name='JOB DEFINITION';Fields='catalogue role | active';Accent=$amber},
    @{X=462;Y=300;W=165;H=88;Name='TASK + ASSESSMENT';Fields='weight | feasibility`nsource evidence';Accent=$blue},
    @{X=42;Y=300;W=145;H=88;Name='VERIFICATION';Fields='private card | decision`nretention event';Accent=$wine}
)
foreach($entity in $erd){
    [void] (Add-Box $slide $entity.X $entity.Y $entity.W $entity.H $white $entity.Accent 3)
    [void] (Add-Box $slide $entity.X $entity.Y $entity.W 24 $entity.Accent $entity.Accent)
    [void] (Add-Text $slide $entity.Name ($entity.X+8) ($entity.Y+6) ($entity.W-16) 13 8.5 $white $true 'Aptos' 2)
    [void] (Add-Text $slide ($entity.Fields -replace '`n',"`n") ($entity.X+12) ($entity.Y+36) ($entity.W-24) ($entity.H-42) 9 $ink $false 'Aptos' 2)
}
[void] (Add-Line $slide 187 194 242 184 $blue 1.5 $true)
[void] (Add-Line $slide 407 184 462 184 $green 1.5 $true)
[void] (Add-Line $slide 627 184 682 184 $rust 1.5 $true)
[void] (Add-Line $slide 764 240 764 300 $wine 1.5 $true)
[void] (Add-Line $slide 682 344 627 344 $amber 1.5 $true)
[void] (Add-Line $slide 114 236 114 300 $wine 1.5 $true)
[void] (Add-Text $slide 'Design principle: the candidate profile is not overwritten by AI, the application keeps an auditable score snapshot, and catalogue evidence remains reusable across vacancies.' 128 424 704 42 11 $navy $true 'Aptos' 2)
Add-Notes $slide '60 seconds. Explain why these are separate entities: candidate facts, employer requirements, source catalogue evidence, and the application outcome must not be mixed.'

# Slide 6 - Progress table
$slide = Add-BaseSlide 'Progress' 'Current implementation status' 6 'Status reflects the running prototype and repository evidence on 25 August 2026.'
$headers = @('WORKSTREAM','STATUS','EVIDENCE / CURRENT POSITION')
$widths = @(245,120,483)
$xPositions = @(42,287,407)
for($i=0;$i -lt 3;$i++){ [void](Add-Box $slide $xPositions[$i] 135 $widths[$i] 30 $navy $navy); [void](Add-Text $slide $headers[$i] ($xPositions[$i]+10) 144 ($widths[$i]-20) 14 8.5 $white $true 'Aptos') }
$rows = @(
    @('Secure role workflows + verification','COMPLETED','Candidate, employer, admin, verifier; email + card review; protected routes/APIs'),
    @('AI-assisted profile workflow','COMPLETED','Voice/text -> editable transcript -> consent -> reviewable suggestions -> confirmation'),
    @('Task-based scoring + applications','COMPLETED','Deterministic rules, workplace support, explanations, stored application snapshots'),
    @('Responsive multilingual interface','COMPLETED','English, French, Arabic; keyboard-first role workspaces; accessible status messages'),
    @('Catalogue expansion','IN PROGRESS','7 active descriptions now; 15 target after all received workbooks are validated'),
    @('Personal Education hierarchy','IN PROGRESS','Common Read/Write/Count plus dynamic job-specific knowledge items'),
    @('Final WCAG + stakeholder evidence','REMAINING','Native 200% zoom, documented NVDA pairing, representative-user validation'),
    @('Production hardening','REMAINING','Cache layer, deployed capacity tests, monitoring, production configuration')
)
$y=165
foreach($row in $rows){
    $fill = if((($y-165)/39)%2 -eq 0){$white}else{ConvertTo-Rgb '#F1F4F8'}
    [void](Add-Box $slide 42 $y 848 39 $fill $line)
    [void](Add-Text $slide $row[0] 52 ($y+10) 225 22 9.5 $ink $true 'Aptos')
    $statusColor = if($row[1] -eq 'COMPLETED'){$green}elseif($row[1] -eq 'IN PROGRESS'){$amber}else{$muted}
    Add-Tag $slide $row[1] 297 ($y+8) 96 $statusColor
    [void](Add-Text $slide $row[2] 417 ($y+8) 460 26 8.7 $ink $false 'Aptos')
    $y += 39
}
Add-Notes $slide '75 seconds. This is the jury contract. Do not describe the whole feature history; focus on completed, current, and remaining work.'

# Slide 7 - Developed UI
$slide = Add-BaseSlide 'Implemented product' 'Completed workflows are visible and operational' 7 'Current interface captures - each screen is connected to protected backend services.'
$screens = @(
    @{Path='04-candidate-profile.png';X=42;Title='Candidate profile';Callout='Consent-gated AI | editable transcript | multilingual input';Color=$blue},
    @{Path='05-employer-requirements.png';X=344;Title='Employer vacancy';Callout='Controlled requirements | task importance | workplace support';Color=$green},
    @{Path='07-verifier.png';X=646;Title='Authorized verification';Callout='Private document review | explicit status | RBAC';Color=$wine}
)
foreach($screen in $screens){
    [void](Add-Image $slide (Join-Path $assetDirectory $screen.Path) $screen.X 142 270 169 $screen.Title)
    [void](Add-Box $slide $screen.X 311 270 116 $white $line 3)
    [void](Add-Box $slide $screen.X 311 6 116 $screen.Color $screen.Color)
    [void](Add-Text $slide $screen.Title ($screen.X+18) 327 230 22 13 $navy $true 'Aptos Display')
    [void](Add-Text $slide $screen.Callout ($screen.X+18) 361 230 48 9.5 $muted $false 'Aptos')
}
[void](Add-Text $slide 'Mouse, keyboard, optional voice, and responsive layouts remain equivalent paths to the same business operations.' 112 455 736 24 11 $rust $true 'Aptos' 2)
Add-Notes $slide '80 seconds. Do not say "this is the page." Explain the engineering protection behind each screenshot: consent, controlled data, authorization, and equivalent interaction modes.'

# Slide 8 - AI and scoring
$slide = Add-BaseSlide 'Technical focus' 'AI assistance and deterministic scoring are deliberately separated' 8 'This boundary prevents unreviewed model output from becoming a hiring fact or a hidden score.'
[void](Add-Text $slide 'PROFILE ASSISTANCE FLOW' 42 135 400 20 10 $wine $true 'Aptos')
$profileSteps=@('Speak or type','Edit transcript','Explicit consent','Structured JSON','Human confirmation')
$x=42
foreach($step in $profileSteps){
    [void](Add-Box $slide $x 170 142 54 $white $wine 3)
    [void](Add-Text $slide $step ($x+8) 187 126 18 9.5 $navy $true 'Aptos' 2)
    if($x -lt 710){[void](Add-Line $slide ($x+142) 197 ($x+160) 197 $wine 1.6 $true)}
    $x+=160
}
[void](Add-Text $slide 'Audio is transcribed and discarded | Suggestions remain reviewable | No automatic profile mutation' 42 238 846 20 9.5 $muted $false 'Aptos' 2)
[void](Add-Text $slide 'MATCHING FLOW' 42 286 400 20 10 $rust $true 'Aptos')
$matchSteps=@('Confirmed abilities','Published vacancy','Task evidence + weights','Support / requirements','Score + explanation')
$x=42
foreach($step in $matchSteps){
    [void](Add-Box $slide $x 321 142 54 $white $rust 3)
    [void](Add-Text $slide $step ($x+8) 338 126 22 9.2 $navy $true 'Aptos' 2)
    if($x -lt 710){[void](Add-Line $slide ($x+142) 348 ($x+160) 348 $rust 1.6 $true)}
    $x+=160
}
[void](Add-Box $slide 190 402 580 64 $navy $navy 4)
[void](Add-Text $slide 'Compatibility % = Sum(weight x factor) / Sum(weight) x 100' 210 418 540 20 14 $white $true 'Aptos' 2)
[void](Add-Text $slide 'Feasible 1.00 | Assistance 0.75 when offered | Avoid 0.00 | Required criteria are explicit gates' 210 444 540 14 8.5 (ConvertTo-Rgb '#D8E3F2') $false 'Aptos' 2)
Add-Notes $slide '105 seconds. This is the main technical deep dive. AI helps extract profile suggestions. It never calculates compatibility. The scoring engine applies documented mathematical rules and returns task-level explanations.'

# Slide 9 - Catalogue and current focus
$slide = Add-BaseSlide 'Data engineering' 'From Excel workbooks to a reviewable job catalogue' 9 'The admin workflow imports new roles transactionally and exposes source, task, and assessment evidence.'
[void](Add-Image $slide (Join-Path $assetDirectory '06-admin-catalogue.png') 42 137 520 325 'Administrator dataset catalogue showing active job descriptions and assessment totals')
[void](Add-Box $slide 590 137 328 325 $white $line 4)
Add-Tag $slide 'CURRENT WORK' 614 157 112 $amber
[void](Add-Text $slide '7 active now -> 15 target' 614 196 270 30 21 $navy $true 'Aptos Display')
[void](Add-Text $slide "- Multiple XLSX upload; duplicate-safe and transactional`n`n- Live source workbook, worksheet, task, and assessment inspection`n`n- 12 additional role workbooks received; remaining files require validation" 614 245 270 115 10.5 $ink $false 'Aptos')
[void](Add-Text $slide 'Personal Education is a hierarchy' 614 374 270 20 12 $rust $true 'Aptos')
[void](Add-Text $slide "Common: Read | Write | Count`nDynamic by interest: menu knowledge, selling-price policy, role-specific knowledge" 614 402 270 48 9.5 $muted $false 'Aptos')
Add-Notes $slide '80 seconds. State the live count shown in the screenshot. Explain why the remaining imports need semantic validation: Personal Education is a parent section, not a scoreable task.'

# Slide 10 - Challenges
$slide = Add-BaseSlide 'Engineering decisions' 'Challenges translated into explicit design solutions' 10 'Three examples show how requirements changed architecture - not only interface styling.'
$challenges=@(
    @{X=42;N='01';Title='Accessible complexity';Problem='Multiple role dashboards, dense forms, 200% zoom, keyboard focus, and screen-reader status.';Solution='Shared responsive foundations, visible focus, semantic controls, fixed rails, live-region notifications.';Color=$blue},
    @{X=337;N='02';Title='Sensitive decisions';Problem='Disability documents, AI suggestions, account approval, and application outcomes carry privacy risk.';Solution='Private storage, retention controls, explicit consent, human confirmation, backend RBAC, auditable outcomes.';Color=$wine},
    @{X=632;N='03';Title='Dataset semantics';Problem='Repeated labels and structural Excel rows can be mistaken for independent operational tasks.';Solution='Transactional extraction, source evidence, admin inspection, and hierarchy-preserving import now in progress.';Color=$rust}
)
foreach($item in $challenges){
    [void](Add-Box $slide $item.X 142 270 310 $white $line 4)
    [void](Add-Text $slide $item.N ($item.X+20) 162 42 38 26 $item.Color $true 'Aptos Display')
    [void](Add-Text $slide $item.Title ($item.X+70) 169 170 24 14 $navy $true 'Aptos Display')
    [void](Add-Text $slide 'CHALLENGE' ($item.X+20) 220 100 16 8 $muted $true 'Aptos')
    [void](Add-Text $slide $item.Problem ($item.X+20) 242 230 66 9.5 $ink $false 'Aptos')
    [void](Add-Line $slide ($item.X+20) 320 ($item.X+250) 320 $line 0.8)
    [void](Add-Text $slide 'APPLIED SOLUTION' ($item.X+20) 335 140 16 8 $item.Color $true 'Aptos')
    [void](Add-Text $slide $item.Solution ($item.X+20) 357 230 78 9.5 $ink $false 'Aptos')
}
Add-Notes $slide '75 seconds. Explain the trade-off in each card. The solution is not "we added a page"; it is a control or architectural boundary.'

# Slide 11 - Validation
$slide = Add-BaseSlide 'Verification' 'Automated evidence passes; final human evidence remains explicit' 11 'Measured locally against the current prototype - deployment and assistive-technology limits are not hidden.'
Add-Metric $slide '23 / 23' 'API integration checks passed' 42 138 196 $green
Add-Metric $slide '26 / 26' 'Browser E2E scenarios passed' 258 138 196 $green
Add-Metric $slide '17 / 17' 'Scoring unit tests passed' 474 138 196 $green
Add-Metric $slide '3 x 7' 'Locales x translation namespaces' 690 138 196 $blue
[void](Add-Box $slide 42 235 410 205 $white $line 4)
[void](Add-Text $slide 'FUNCTIONAL + SECURITY COVERAGE' 64 255 340 18 10 $navy $true 'Aptos')
[void](Add-Text $slide "+ Anonymous and wrong-role route rejection`n+ Candidate, employer, admin, verifier workflows`n+ Catalogue inspection and access control`n+ AI/profile and deterministic scoring contracts`n+ Build, PHP syntax, container and ESLint checks" 64 292 340 124 10.5 $ink $false 'Aptos')
[void](Add-Box $slide 480 235 406 205 $navy $navy 4)
[void](Add-Text $slide 'RECORDED LOCAL PERFORMANCE BASELINE' 502 255 340 18 10 $white $true 'Aptos')
[void](Add-Text $slide 'API p95 <= 245 ms' 502 294 170 26 17 $white $true 'Aptos Display')
[void](Add-Text $slide 'Page FCP p95 <= 552 ms' 682 294 180 26 16 $white $true 'Aptos Display')
[void](Add-Text $slide '0 configured threshold violations' 502 336 330 20 11 (ConvertTo-Rgb '#BCE7D2') $true 'Aptos')
[void](Add-Text $slide 'Limitation: local regression measurements are not production load tests.' 502 376 338 36 9.5 (ConvertTo-Rgb '#D8E3F2') $false 'Aptos')
[void](Add-Text $slide 'WCAG 2.1 AA remains a target until the post-remediation manual matrix and documented NVDA/browser pairing are complete.' 90 462 780 26 10 $rust $true 'Aptos' 2)
Add-Notes $slide '60 seconds. Read the metrics, then immediately state the limitation. This demonstrates engineering honesty and prevents an unsupported AA claim.'

# Slide 12 - Remaining + demo
$slide = Add-BaseSlide 'Next phase' 'Operational core complete; final phase expands validated coverage' 12 'The remaining work is refinement, evidence, and production readiness - not a restart of the architecture.'
[void](Add-Box $slide 42 137 425 320 $white $line 4)
Add-Tag $slide 'REMAINING WORK' 66 157 122 $rust
[void](Add-Text $slide "1  Import and validate all received job workbooks`n`n2  Preserve Personal Education hierarchy and show interest-specific questions`n`n3  Complete native zoom, NVDA/browser, and representative-user evidence`n`n4  Calibrate requirements with hospitality/inclusion experts`n`n5  Add cache, monitoring, deployed capacity tests, and production configuration" 66 204 365 222 11 $ink $false 'Aptos')
[void](Add-Box $slide 495 137 423 320 $navy $navy 4)
Add-Tag $slide '5-MINUTE LIVE DEMO' 519 157 142 $blue
[void](Add-Text $slide 'Candidate -> Employer -> Admin' 519 201 340 30 20 $white $true 'Aptos Display')
[void](Add-Text $slide "00:00  Verified candidate signs in`n00:40  Editable AI-assisted profile`n01:40  Compatibility result + explanation`n02:40  Employer requirements + assistance`n03:40  Admin dataset catalogue`n04:35  Security / language / keyboard proof" 519 250 340 145 11 (ConvertTo-Rgb '#E3EAF5') $false 'Aptos')
[void](Add-Text $slide 'Closing statement' 519 393 140 16 8 (ConvertTo-Rgb '#AFC5E4') $true 'Aptos')
[void](Add-Text $slide 'The platform now turns inclusion expertise into a secure, reviewable, and testable recruitment workflow.' 519 413 350 38 11 $white $true 'Aptos')
Add-Notes $slide '45 seconds, then begin the demo. Keep this slide visible while switching applications. If the live demo fails, use the screenshots on slides 7 and 9 as the fallback narrative.'

# Output. PowerPoint exposes document properties inconsistently for a new,
# unsaved COM presentation, so metadata is intentionally left to SaveAs.
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null
$presentation.SaveAs($OutputPath, 24)
$presentation.SaveAs($pdfPath, 32)
$presentation.Close()
$powerPoint.Quit()
[Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null
[Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null

Write-Output "Presentation: $OutputPath"
Write-Output "PDF: $pdfPath"
}
