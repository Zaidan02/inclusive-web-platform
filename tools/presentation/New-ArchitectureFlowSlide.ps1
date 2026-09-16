param(
    [string] $OutputPath
)

$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $scriptDirectory '..\..'))
$helperScript = Join-Path $scriptDirectory 'New-ProgressPresentation.ps1'

if (-not $OutputPath) {
    $OutputPath = Join-Path $repositoryRoot 'artifacts\JoIn_Hospitality_IMPLEMENTED_ARCHITECTURE_FLOW_SLIDE.pptx'
}

$pdfOutputPath = [IO.Path]::ChangeExtension($OutputPath, '.pdf')
$pngOutputPath = [IO.Path]::ChangeExtension($OutputPath, '.png')

# Reuse the presentation palette and drawing helpers used by the main deck.
. $helperScript -OutputPath $OutputPath -HelpersOnly

$universityLogoPath = Join-Path $repositoryRoot 'artifacts\submitted-progress-assets\page_1_image_0.png'

function Add-ArchitectureCard(
    $Slide,
    [string] $Title,
    [string] $Text,
    [double] $X,
    [double] $Y,
    [double] $Width,
    [double] $Height,
    [int] $Accent
) {
    [void](Add-Box $Slide $X $Y $Width $Height $white $Accent 5)
    [void](Add-Box $Slide $X $Y 7 $Height $Accent $Accent)
    [void](Add-Text $Slide $Title ($X + 18) ($Y + 16) ($Width - 34) 27 16 $navy $true 'Aptos Display' 2)
    [void](Add-Text $Slide $Text ($X + 18) ($Y + 58) ($Width - 34) ($Height - 70) 9.6 $ink $false 'Aptos' 2)
}

$slide = $presentation.Slides.Add(1, 12)
$slide.Background.Fill.ForeColor.RGB = $warmLight
$slide.Background.Fill.Solid()

[void](Add-Box $slide 0 0 960 8 $blue $blue)
[void](Add-Text $slide 'ARCHITECTURAL DESIGN | SOFTWARE DESIGN' 48 27 500 18 9 $rust $true 'Aptos')
[void](Add-Text $slide 'Implemented logical architecture and trust boundaries' 48 50 820 43 27 $navy $true 'Aptos Display')
[void](Add-Text $slide 'Provider-neutral view: persistence stays behind Symfony; voice uses one protected backend path and one bounded browser path.' 48 96 830 28 10.2 $muted $false 'Aptos')
if (Test-Path -LiteralPath $universityLogoPath) {
    $logo = Add-Image $slide $universityLogoPath 858 22 56 25 'Universite Saint-Joseph and ESIB mark'
    $logo.Line.Visible = 0
}

# Main components.
[void](Add-Text $slide 'Users' 26 266 58 18 10 $navy $true 'Aptos Display' 2)
Add-ArchitectureCard $slide 'React / Vite' "Accessible interface`nRole workspaces`nJWT client`nExecutes approved voice actions" 95 175 165 205 $blue
Add-ArchitectureCard $slide 'Symfony API' "JWT + RBAC`nValidation`nWorkflow orchestration`nOnly persistence gateway" 340 155 205 210 $rust

# Persistence is one logical layer with two physically distinct responsibilities.
[void](Add-Box $slide 650 130 260 105 $white $green 5)
[void](Add-Box $slide 650 130 7 105 $green $green)
[void](Add-Text $slide 'Persistence Layer' 670 144 220 24 15 $navy $true 'Aptos Display' 2)
[void](Add-Line $slide 780 174 780 221 $line 1)
[void](Add-Text $slide "PostgreSQL`nUsers, profiles, jobs,`napplications, catalogue" 666 179 104 42 8.2 $ink $false 'Aptos' 2)
[void](Add-Text $slide "Object storage`nPrivate documents`nPublic employer logos" 790 179 104 42 8.2 $ink $false 'Aptos' 2)

Add-ArchitectureCard $slide 'Scoring Service' "Deterministic, versioned rules`nExplainable JSON; no OpenAI" 650 255 260 110 $amber
Add-ArchitectureCard $slide 'Voice / Profile Service' "Transcription and NLP`nSchema-constrained suggestions`nBounded command proposals" 340 385 205 100 $wine
Add-ArchitectureCard $slide 'OpenAI API' "External provider`nNo database authority`nReplaceable adapter" 650 385 260 100 $blue

# Implemented call paths. Response arrows are implied to keep the slide readable.
[void](Add-Line $slide 78 276 95 276 $line 2.3 $true)
[void](Add-Line $slide 260 250 340 250 $blue 2.3 $true)
[void](Add-Text $slide 'JWT API' 276 231 48 16 8.2 $blue $true 'Aptos' 2)

[void](Add-Line $slide 545 185 650 182 $green 2.3 $true)
[void](Add-Text $slide 'Doctrine + storage adapter' 548 160 98 20 7.6 $green $true 'Aptos' 2)

[void](Add-Line $slide 545 300 650 305 $amber 2.3 $true)
[void](Add-Text $slide 'Service token' 566 282 67 16 7.8 $amber $true 'Aptos' 2)

[void](Add-Line $slide 440 365 440 385 $wine 2.3 $true)
[void](Add-Text $slide 'Protected profile suggestions' 448 370 123 18 7.5 $wine $true 'Aptos')

[void](Add-Line $slide 260 350 340 437 $wine 2.3 $true)
[void](Add-Text $slide 'Audio + navigation' 248 381 92 18 7.5 $wine $true 'Aptos' 2)

[void](Add-Line $slide 545 440 650 437 $blue 2.3 $true)
[void](Add-Text $slide 'Provider API' 570 420 58 16 7.8 $blue $true 'Aptos' 2)

[void](Add-Line $slide 48 508 912 508 $line 0.8)
[void](Add-Text $slide 'INCLUSIVE WEB PLATFORM | FINAL ENGINEERING PRESENTATION | 14 SEP 2026' 48 515 710 14 7.2 $muted $false 'Aptos')
[void](Add-Text $slide 'ARCH' 866 514 46 14 8 $rust $true 'Aptos' 3)

Add-Notes $slide "Users interact through React. Standard application requests go to Symfony, which owns authentication, authorization, validation, workflow and persistence. Symfony calls the deterministic scoring service and the protected profile-extraction endpoint. For live transcription and navigation, React calls the voice service directly. Only the voice/profile service calls OpenAI. Neither Python service accesses persistence directly."

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null
$presentation.SaveAs($OutputPath, 24)
$presentation.SaveAs($pdfOutputPath, 32)
$slide.Export($pngOutputPath, 'PNG', 1920, 1080)

$presentation.Close()
$powerPoint.Quit()
[Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null
[Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null
[GC]::Collect()
[GC]::WaitForPendingFinalizers()

Write-Output "Presentation: $OutputPath"
Write-Output "PDF: $pdfOutputPath"
Write-Output "PNG: $pngOutputPath"
