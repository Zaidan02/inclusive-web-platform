param(
    [string] $OutputPath
)

$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $scriptDirectory '..\..'))
$baseGenerator = Join-Path $scriptDirectory 'New-FinalEngineeringPresentation.ps1'

if (-not $OutputPath) {
    $OutputPath = Join-Path $repositoryRoot 'artifacts\Inclusive_Web_Platform_FINAL_SOFTWARE_ENGINEERING_LIFECYCLE_PRESENTATION_Zaidan_Charbel_2026-09-14.pptx'
}

$finalOutputPath = $OutputPath
$finalPdfPath = [IO.Path]::ChangeExtension($finalOutputPath, '.pdf')
$lifecyclePreviewDirectory = Join-Path $repositoryRoot 'artifacts\final-software-lifecycle-presentation-preview'
$baseBuildDirectory = Join-Path $repositoryRoot 'artifacts\_presentation-build'
$baseOutputPath = Join-Path $baseBuildDirectory 'final-engineering-base.pptx'

# Generate the validated engineering deck first. Dot-sourcing keeps its visual
# helper functions, palette and evidence paths available for the lifecycle edit.
New-Item -ItemType Directory -Force -Path $baseBuildDirectory | Out-Null
. $baseGenerator -OutputPath $baseOutputPath

# The base generator sets its own output variables in the shared dot-sourced
# scope. Restore the lifecycle destinations before opening and saving the edit.
$OutputPath = $finalOutputPath
$pdfPath = $finalPdfPath

$powerPoint = New-Object -ComObject PowerPoint.Application
$powerPoint.Visible = -1
$presentation = $powerPoint.Presentations.Open($baseOutputPath, $false, $false, $false)

function Set-TextByGeometry(
    $Slide,
    [double] $MinTop,
    [double] $MaxTop,
    [double] $MinLeft,
    [double] $MaxLeft,
    [string] $Text
) {
    foreach ($shape in $Slide.Shapes) {
        try {
            if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1 -and
                $shape.Top -ge $MinTop -and $shape.Top -le $MaxTop -and
                $shape.Left -ge $MinLeft -and $shape.Left -le $MaxLeft) {
                $shape.TextFrame.TextRange.Text = $Text
                return
            }
        } catch {}
    }
}

function Set-SectionLabel($Slide, [string] $Text) {
    Set-TextByGeometry $Slide 18 48 30 180 $Text.ToUpperInvariant()
}

function Set-SlideTitle($Slide, [string] $Text) {
    Set-TextByGeometry $Slide 45 82 30 120 $Text
}

function Set-SlideSubtitle($Slide, [string] $Text) {
    Set-TextByGeometry $Slide 88 118 30 120 $Text
}

function Update-FooterNumbers($Presentation) {
    for ($i = 2; $i -le $Presentation.Slides.Count; $i++) {
        $slide = $Presentation.Slides.Item($i)
        foreach ($shape in $slide.Shapes) {
            try {
                if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1 -and
                    $shape.Top -ge 495 -and $shape.Left -ge 820 -and
                    $shape.TextFrame.TextRange.Text.Trim() -match '^\d{2}$') {
                    $shape.TextFrame.TextRange.Text = ([string]$i).PadLeft(2, '0')
                }
            } catch {}
        }
    }
}

# The previous roadmap is replaced by a lifecycle backbone. The three original
# opening evidence slides then become the business/problem introduction.
$presentation.Slides.Item(2).Delete()

# 5 - Software lifecycle
$slide = Add-FinalBaseSlide 'Cycle de vie du logiciel' 'An iterative lifecycle with V-model traceability' 5 'The lifecycle is evolutionary; verification and validation are prepared from the specification stage and repeated after material change.'
$lifeTitles = @('Needs','Specification','Design','Programming','Tests + debugging','Documentation','Deployment + maintenance','Conclusion')
$lifeTexts = @('Stakeholders, context, problem','FR, NFR, data, acceptance','Architecture, interfaces, algorithms','Components, integration, configuration','Static + dynamic V&V','SRS, design, tests, operations','Staging, correction, evolution','Evidence, limits, next cycle')
$lifeColors = @($rust,$blue,$green,$plum,$amber,$blue,$green,$rust)
$lifeX = @(48,270,492,714,48,270,492,714)
$lifeY = @(155,155,155,155,330,330,330,330)
for ($i=0; $i -lt 8; $i++) {
    [void](Add-Box $slide $lifeX[$i] $lifeY[$i] 198 132 $white $line 5)
    [void](Add-Box $slide $lifeX[$i] $lifeY[$i] 198 7 $lifeColors[$i] $lifeColors[$i])
    [void](Add-Text $slide ('0{0}' -f ($i+1)) ($lifeX[$i]+16) ($lifeY[$i]+20) 32 20 11 $lifeColors[$i] $true 'Aptos')
    [void](Add-Text $slide $lifeTitles[$i] ($lifeX[$i]+52) ($lifeY[$i]+18) 130 28 11.5 $navy $true 'Aptos Display')
    [void](Add-Text $slide $lifeTexts[$i] ($lifeX[$i]+16) ($lifeY[$i]+66) 166 43 8.7 $ink $false 'Aptos' 2)
}
[void](Add-Text $slide 'Chosen process: evolutionary prototyping + iterative increments | Quality control: requirement-to-test traceability inspired by the V-model' 118 478 724 18 9.2 $navy $true 'Aptos' 2)
$slide.MoveTo(5)

# 6 - Needs elicitation
$slide = Add-FinalBaseSlide 'Expression des besoins' 'Needs came from documents, prototypes and real users' 6 'The target need was refined from multiple sources; stakeholder feedback did not replace standards or measurable engineering evidence.'
Add-Card $slide 'People and stakeholders' "Candidates with varied access needs`nEmployers and hospitality teams`nVerifier and administrator roles`nSupervisors and institutional context" 48 150 270 145 $blue
Add-Card $slide 'Documents and domain sources' "Phase I artefacts and feedback`nWCAG 2.1 and accessibility research`nHospitality job descriptions and tasks`nSecurity, privacy and deployment constraints" 345 150 270 145 $green
Add-Card $slide 'Elicitation techniques' "Background reading`nIterative prototyping and review`nScenario-based task observation`nArc en Ciel and JAWS evaluation" 642 150 270 145 $rust
[void](Add-ImageContained $slide $arcGroupPath 48 322 270 145 'Arc en Ciel stakeholder observation session')
[void](Add-Box $slide 345 322 567 145 $navy $navy 5)
[void](Add-Text $slide 'Needs that shaped the product' 373 344 290 24 16 $green $true 'Aptos Display')
[void](Add-Text $slide "Low literacy and digital confidence -> simple flows and voice support`nMotor or visual barriers -> keyboard, reflow and assistive-technology support`nPrivacy and trust -> consent, private evidence and human confirmation`nEmployer uncertainty -> controlled tasks and explainable compatibility" 373 383 505 68 9.5 $white $false 'Aptos')
$slide.MoveTo(6)

# 8 - SRS quality and traceability
$slide = Add-FinalBaseSlide 'Specifications du logiciel' 'Requirements were measurable, reviewable and traceable' 8 'The SRS states what the system must do and how well it must do it, without prematurely prescribing implementation.'
[void](Add-Text $slide 'SRS quality criteria used' 48 144 250 22 14 $navy $true 'Aptos Display')
$qualityTags = @('Unambiguous','Complete','Consistent','Verifiable','Modifiable','Traceable','Maintainable')
$tagX = 48
foreach ($tag in $qualityTags) {
    $tagWidth = if ($tag.Length -gt 11) { 108 } else { 94 }
    [void](Add-Tag $slide $tag $tagX 177 $tagWidth $blue)
    $tagX += $tagWidth + 8
}
$headers=@('NEED / REQUIREMENT','DESIGN + IMPLEMENTATION','TEST / EVIDENCE')
$tx=@(48,340,650);$tw=@(292,310,262)
for($i=0;$i -lt 3;$i++){[void](Add-Box $slide $tx[$i] 238 $tw[$i] 30 $navy $navy);[void](Add-Text $slide $headers[$i] ($tx[$i]+8) 247 ($tw[$i]-16) 13 8 $white $true 'Aptos' 2)}
$traceRows=@(
    @('Accessible candidate workflow','Semantic React controls + translated UI','18/18 workflows + JAWS'),
    @('Role isolation and private evidence','Symfony JWT/RBAC + private storage','51/51 route probes; 19/20 security'),
    @('Explainable compatibility','Versioned deterministic scoring policy','45/45 staging decisions'),
    @('Multilingual human-controlled AI','Consent + schema validation + review','60 cases; 53 pass; 7 retained defects')
)
$y=268
for($r=0;$r -lt $traceRows.Count;$r++){
    $fill=if($r%2 -eq 0){$white}else{$mist}
    for($c=0;$c -lt 3;$c++){[void](Add-Box $slide $tx[$c] $y $tw[$c] 48 $fill $line);[void](Add-Text $slide $traceRows[$r][$c] ($tx[$c]+10) ($y+10) ($tw[$c]-20) 28 8.5 $ink ($c -eq 0) 'Aptos')}
    $y+=48
}
[void](Add-Text $slide 'Traceability chain: stakeholder need -> specification -> design decision -> code/service -> test oracle -> retained evidence' 138 478 684 18 9.2 $rust $true 'Aptos' 2)
$slide.MoveTo(8)

# 15 - Programming, integration and refactoring
$slide = Add-FinalBaseSlide 'La programmation' 'Implementation separated concerns and protected behaviour' 15 'Coding was one lifecycle activity: integration, configuration management, refactoring and repeatable tests were developed with it.'
Add-Card $slide 'Implemented components' "React/Vite presentation layer`nSymfony/Doctrine business boundary`nPython deterministic scoring`nPython voice/profile assistance`nPostgreSQL and object storage" 48 150 270 250 $blue
Add-Card $slide 'Configuration and integration' "Version-controlled staging branch`nDocker service boundaries`nrender.yaml infrastructure as code`nEnvironment-only secrets and JWT keys`nVersioned migrations and datasets" 345 150 270 250 $green
Add-Card $slide 'Refactoring discipline' "External behaviour preserved`nSmaller cohesive services`nAdapters localise OpenAI changes`nCommand registry limits voice actions`nRegression tests before and after fixes" 642 150 270 250 $rust
[void](Add-Box $slide 100 432 760 48 $navy $navy 4)
[void](Add-Text $slide 'Design objective: low coupling, high cohesion and localised change - not simply more source code.' 130 447 700 18 10 $white $true 'Aptos' 2)
$slide.MoveTo(15)

# Normalize this line explicitly because Windows PowerShell can reinterpret an
# em dash when the generator is executed under a legacy code page.
foreach ($shape in $slide.Shapes) {
    try {
        if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1 -and
            $shape.TextFrame.TextRange.Text.StartsWith('Design objective:')) {
            $shape.TextFrame.TextRange.Text = 'Design objective: low coupling, high cohesion and localised change - not simply more source code.'
        }
    } catch {}
}

# Replace the earlier AI-only cost slide with a lifecycle-aware cost and
# maintenance view. After the insertions above, it is slide 29.
$presentation.Slides.Item(29).Delete()
$slide = Add-FinalBaseSlide 'Cost estimation and maintenance' 'Cost is effort plus infrastructure, external services and change' 29 'The prototype used free staging resources; production planning must estimate both fixed engineering effort and variable operational demand.'
Add-Card $slide 'Estimation approach' "Bottom-up by subsystem and lifecycle activity`nCross-check with analogous deployments`nUse scenarios for active users and AI calls`nNo unsupported COCOMO claim without calibrated effort history" 48 150 270 238 $blue
Add-Card $slide 'Main cost drivers' "Human engineering and verification effort`nNon-sleeping compute and managed database`nStorage, email and monitoring`nOpenAI transcription and structured suggestions`nAccessibility and security maintenance" 345 150 270 238 $green
Add-Card $slide 'Controls and trade-offs' "Per-user daily AI and voice quotas`nRate limits, cooldowns and budget alerts`nLower-cost model routing and manual fallback`nMeasure queries before caching`nCache only repeated non-sensitive reads" 642 150 270 238 $rust
[void](Add-Box $slide 94 424 772 58 $navy $navy 4)
[void](Add-Text $slide 'Maintenance categories: corrective defects | adaptive provider/platform change | perfective features | preventive refactoring and monitoring' 120 442 720 25 9.5 $white $true 'Aptos' 2)
$slide.MoveTo(29)

# 30 - Documentation
$slide = Add-FinalBaseSlide 'Documentation' 'Every lifecycle stage produced a reviewable artefact' 30 'Documentation supports communication, verification, change control, deployment and future maintenance.'
$docTitles=@('Needs + SRS','Design','Implementation','V&V evidence','Operations')
$docTexts=@('Report requirements`nFR/NFR + WCAG','Architecture`nData + flows + patterns','Source + migrations`nrender.yaml + Docker','Test register`nJSON + screenshots','Deployment guide`nLimits + recovery')
$docColors=@($rust,$blue,$green,$plum,$amber)
$docX=@(48,225,402,579,756)
for($i=0;$i -lt 5;$i++){Add-FlowStep $slide $docTitles[$i] $docTexts[$i] $docX[$i] 175 150 190 $docColors[$i] ($i -lt 4)}
[void](Add-Box $slide 115 405 730 66 $white $line 4)
[void](Add-Text $slide 'Repository evidence audit' 140 423 180 18 11 $navy $true 'Aptos Display')
[void](Add-Text $slide '26 engineering Markdown documents | 40 JSON evidence files | 181 PNG evidence images | final report + 310-case workbook' 320 421 500 30 9 $ink $true 'Aptos' 2)
$slide.MoveTo(30)

# Re-label the visible story so the course lifecycle is the presentation's
# actual hierarchy rather than a decorative roadmap.
$sectionLabels = @{
    2='Business need | Expression des besoins'; 3='Background research | Expression des besoins';
    4='Research gap | Expression des besoins'; 5='Cycle de vie du logiciel';
    6='Needs elicitation | Expression des besoins'; 7='Engineering objectives | Expression des besoins';
    8='Software specification | Specifications'; 9='Software specification | Specifications';
    10='Software specification | Specifications'; 11='Accessibility specification | Specifications';
    12='Architectural design | Conception'; 13='Detailed design | Conception';
    14='Security design | Conception'; 15='Implementation quality | Programmation';
    16='Deployment and configuration | Programmation'; 17='Candidate workflow | Programmation';
    18='AI evidence | Programmation'; 19='Voice interaction | Programmation';
    20='Decision algorithm | Programmation'; 21='Employer workflow | Programmation';
    22='Integrated workflow | Programmation'; 23='Tests et mise au point';
    24='Tests et mise au point'; 25='Mesures et metriques'; 26='Mise au point';
    27='Validation utilisateur'; 28='Mesures et metriques';
    29='Estimation du cout et maintenance'; 30='Documentation'; 31='Conclusion'
}
foreach($index in $sectionLabels.Keys){Set-SectionLabel $presentation.Slides.Item([int]$index) $sectionLabels[$index]}

Set-SlideTitle $presentation.Slides.Item(23) 'Verification and validation across the lifecycle'
Set-SlideSubtitle $presentation.Slides.Item(23) 'Verification asks whether specifications were implemented correctly; validation asks whether the right system was built for users and context.'

Update-FooterNumbers $presentation

# Concise notes keep the expanded lifecycle story inside the same 15 minutes.
$notes = @{
1='15 seconds - Zaidan. Introduce the project as a complete software-engineering lifecycle, not only a web interface.'
2='25 seconds - Zaidan. State the three business numbers and the precise problem: capability and opportunity remain disconnected. The platform reduces recruitment barriers; it does not claim to create jobs.'
3='20 seconds - Zaidan. Explain the evolution from physical processes to online portals and AI assistance, with new accessibility, privacy and opacity risks.'
4='25 seconds - Zaidan. Compare solution categories and identify the integration gap: accessible interaction, task evidence, explainability and human control.'
5='30 seconds - Zaidan. Name the course lifecycle stages. Explain that JoIn used evolutionary prototyping and iterative increments, with V-model-style requirement-to-test traceability inside each cycle.'
6='30 seconds - Zaidan. Present elicitation sources and techniques. The Arc en Ciel and JAWS sessions are later validation evidence, while early prototypes, documents and stakeholder feedback refined the needs.'
7='25 seconds - Zaidan. Translate the needs into the delivered scope and engineering scale. The staging figures are implementation evidence, not production or employment-impact claims.'
8='30 seconds - Zaidan. State the seven SRS qualities from the course, then trace one example across need, design and test. Requirements describe what and how well, not premature implementation choices.'
9='25 seconds - Zaidan. Walk across the four actors and their use-case responsibilities. Mention nominal flows, rejected roles and error extensions.'
10='25 seconds - Zaidan. Define NFRs as measurable quality constraints and identify the principal trade-off: stronger security and external services can affect response time.'
11='35 seconds - Zaidan. Define POUR and Level AA. Show implemented examples and explicitly retain the open contrast and high-zoom findings; this is a target with evidence, not a conformance certificate.'
12='35 seconds - Zaidan. Walk across the architecture and trust boundaries. React presents; Symfony authorises; storage, scoring and AI services have separate responsibilities.'
13='25 seconds - Zaidan. Connect the patterns to course goals: low coupling, high cohesion, localised change and traceable decisions.'
14='30 seconds - Zaidan. Explain backend-controlled RBAC, private evidence, consent and auditability. End with the retained oversized-upload issue.'
15='25 seconds - Zaidan. Close the first half: programming included integration, configuration and regression-safe refactoring, not only writing code. Hand over to Charbel.'
16='20 seconds - Charbel. Show the deployed Render and Supabase topology. render.yaml is configuration management and infrastructure as code; HTTPS supports remote microphone testing.'
17='25 seconds - Charbel. Trace editable text, consent, schema-constrained suggestions, human review and Symfony validation. Nothing is saved without confirmation.'
18='20 seconds - Charbel. Give the multilingual AI result: 53 of 60 passed, seven extraction defects retained, and no unsafe automatic persistence.'
19='30 seconds - Charbel. Separate transcription quality from action safety. The deterministic registry authorises commands; noise and dictated character sequences sometimes require correction.'
20='35 seconds - Charbel. Explain the deterministic formula, feasibility factors and explicit gates. Forty-five of forty-five staging decisions matched their expected oracle.'
21='20 seconds - Charbel. Employers choose a controlled role, then configure actual requirements, priority tasks and available assistance for work or training.'
22='20 seconds - Charbel. Trace candidate, compatibility, application, employer decision and immutable audit history.'
23='30 seconds - Charbel. Define verification versus validation, then show the layered static, service, integration, system and human evidence. Testing was planned from the specifications.'
24='30 seconds - Charbel. Lead with all 310 executed. Explain 274 first passes, 15 noisy partials corrected on repetition or editing, 21 retained failures and 289 final passes: 93.2 percent.'
25='25 seconds - Charbel. Do not read every rate. Seven areas reached 100 percent; AI, security and especially performance define the remaining work.'
26='20 seconds - Charbel. A successful test campaign exposes defects. Link each finding to corrective work and non-regression retesting.'
27="30 seconds - Charbel. Distinguish the 20-person Arc en Ciel session from Noelle Marie Gabrielle's JAWS workflow. These validate relevance for tested users, not universal accessibility."
28='25 seconds - Charbel. Apply the course measurement process: define objective, method and reference. Correctness held under shared load, but latency targets exposed free-tier limits.'
29='35 seconds - Charbel. Define cost as engineering effort plus infrastructure, external services and maintenance. Explain bottom-up subsystem estimates, usage scenarios, AI quotas and why a general cache was deferred.'
30='25 seconds - Charbel. Show the artefact chain from needs to operations. Documentation and evidence support communication, reproduction, maintenance and change control.'
31='20 seconds - Charbel. Conclude with the delivered engineering contribution and limitations, then transition directly to the five-minute demonstration.'
}
foreach($index in $notes.Keys){Add-Notes $presentation.Slides.Item([int]$index) $notes[$index]}
Add-Notes $presentation.Slides.Item(32) 'Leave this slide visible during questions. Slides 33 to 37 are hidden appendix evidence.'

for($i=33;$i -le 37;$i++){$presentation.Slides.Item($i).SlideShowTransition.Hidden=-1}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null
New-Item -ItemType Directory -Force -Path $lifecyclePreviewDirectory | Out-Null
Get-ChildItem -LiteralPath $lifecyclePreviewDirectory -Filter 'Slide*.PNG' -File -ErrorAction SilentlyContinue | Remove-Item -Force
$presentation.SaveAs($OutputPath, 24)
$presentation.SaveAs($pdfPath, 32)
try { $presentation.SaveAs($lifecyclePreviewDirectory, 18) } catch {}

$presentation.Close()
$powerPoint.Quit()
[Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null
[Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null
[GC]::Collect()
[GC]::WaitForPendingFinalizers()

$basePdfPath = [IO.Path]::ChangeExtension($baseOutputPath, '.pdf')
foreach ($temporaryPath in @($baseOutputPath, $basePdfPath)) {
    if (Test-Path -LiteralPath $temporaryPath) {
        Remove-Item -LiteralPath $temporaryPath -Force
    }
}
if ((Test-Path -LiteralPath $baseBuildDirectory) -and
    -not (Get-ChildItem -LiteralPath $baseBuildDirectory -Force | Select-Object -First 1)) {
    Remove-Item -LiteralPath $baseBuildDirectory -Force
}

Write-Output "Presentation: $OutputPath"
Write-Output "PDF: $pdfPath"
Write-Output "Preview: $lifecyclePreviewDirectory"
