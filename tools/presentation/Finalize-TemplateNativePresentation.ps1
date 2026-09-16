param(
    [string] $TemplatePath,
    [string] $ContentPath,
    [string] $TargetPath,
    [string] $PreviewDirectory
)

$ErrorActionPreference = 'Stop'
$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $scriptDirectory '..\..'))
$artifactDirectory = Join-Path $repositoryRoot 'artifacts'

if (-not $TemplatePath) { $TemplatePath = Join-Path $artifactDirectory 'FYP_Final_Presentation_3_SLIDE_BASE_BACKUP.pptx' }
if (-not $ContentPath) { $ContentPath = Join-Path $artifactDirectory 'FYP_Final_Presentation_WITH_ARCHITECTURE.pptx' }
if (-not $TargetPath) { $TargetPath = Join-Path $artifactDirectory 'FYP_Final_Presentation.pptx' }
if (-not $PreviewDirectory) { $PreviewDirectory = Join-Path $artifactDirectory 'FYP_Final_Presentation_FINAL_NATIVE_preview' }

$template = [IO.Path]::GetFullPath($TemplatePath)
$content = [IO.Path]::GetFullPath($ContentPath)
$target = [IO.Path]::GetFullPath($TargetPath)
$preview = [IO.Path]::GetFullPath($PreviewDirectory)
$working = Join-Path $artifactDirectory 'FYP_Final_Presentation.native-working.pptx'
$backup = Join-Path $artifactDirectory 'FYP_Final_Presentation_DUPLICATED_23_SLIDE_BACKUP.pptx'

foreach ($path in @($template, $content, $target)) {
    if (-not (Test-Path -LiteralPath $path)) { throw "Required presentation not found: $path" }
}
if (Test-Path -LiteralPath (Join-Path $artifactDirectory '~$FYP_Final_Presentation.pptx')) {
    throw 'FYP_Final_Presentation.pptx is open in PowerPoint. Close it before rebuilding the native-template deck.'
}

if (-not (Test-Path -LiteralPath $backup)) {
    Copy-Item -LiteralPath $target -Destination $backup
}
Copy-Item -LiteralPath $template -Destination $working -Force

if (-not (Test-Path -LiteralPath $preview)) { New-Item -ItemType Directory -Path $preview | Out-Null }
Get-ChildItem -LiteralPath $preview -File -Filter 'Slide*.PNG' | Remove-Item -Force

function Set-ShapeText($Shape, [string] $Text, [double] $Size, [bool] $Bold = $false, [int] $Color = 0x491F09) {
    $Shape.TextFrame.TextRange.Text = $Text
    $Shape.TextFrame.TextRange.Font.Name = 'Arial'
    $Shape.TextFrame.TextRange.Font.Size = $Size
    $Shape.TextFrame.TextRange.Font.Bold = if ($Bold) { -1 } else { 0 }
    $Shape.TextFrame.TextRange.Font.Color.RGB = $Color
}

function Add-TextBox(
    $Slide,
    [string] $Text,
    [double] $Left,
    [double] $Top,
    [double] $Width,
    [double] $Height,
    [double] $Size,
    [int] $Color,
    [bool] $Bold = $false,
    [int] $Alignment = 1,
    [string] $Name = ''
) {
    $shape = $Slide.Shapes.AddTextbox(1, $Left, $Top, $Width, $Height)
    if ($Name) { $shape.Name = $Name }
    $shape.TextFrame.MarginLeft = 0
    $shape.TextFrame.MarginRight = 0
    $shape.TextFrame.MarginTop = 0
    $shape.TextFrame.MarginBottom = 0
    $shape.TextFrame.WordWrap = -1
    $shape.TextFrame.AutoSize = 0
    Set-ShapeText $shape $Text $Size $Bold $Color
    $shape.TextFrame.TextRange.ParagraphFormat.Alignment = $Alignment
    return $shape
}

$navy = 0x491F09
$blue = 0xD86515
$white = 0xFFFFFF
$line = 0xDED6CC

$sectionMap = @{
    'CONTEXT AND PROBLEM' = 'PROBLEM CONTEXT'
    'BACKGROUND RESEARCH' = 'BACKGROUND RESEARCH'
    'GENIE LOGICIEL' = 'SOFTWARE LIFE CYCLE AND DEVELOPMENT METHODOLOGY'
    'EXPRESSION DES BESOINS' = 'REQUIREMENTS ELICITATION'
    'SPECIFICATIONS DU LOGICIEL' = 'SOFTWARE REQUIREMENTS SPECIFICATION'
    'CONCEPTION' = 'SOFTWARE DESIGN AND ARCHITECTURE'
    'ARCHITECTURAL DESIGN | SOFTWARE DESIGN' = 'SOFTWARE DESIGN AND ARCHITECTURE'
    'CONCEPTION DETAILLEE' = 'SOFTWARE DESIGN AND ARCHITECTURE | DETAILED DESIGN'
    'PROGRAMMATION ET INTEGRATION' = 'IMPLEMENTATION AND CLOUD DEPLOYMENT'
    'PROGRAMMATION' = 'IMPLEMENTATION'
    'ALGORITHME DE DECISION' = 'SOFTWARE DESIGN AND ARCHITECTURE | DECISION ALGORITHM'
    'WORKFLOW INTEGRE' = 'IMPLEMENTATION | INTEGRATED WORKFLOW'
    'PROJECT MANAGEMENT' = 'PROJECT MANAGEMENT'
    'TESTS ET MISE AU POINT' = 'TESTING, DEBUGGING AND PERFORMANCE EVALUATION'
    'MESURES ET MISE AU POINT' = 'TESTING, DEBUGGING AND PERFORMANCE EVALUATION'
    'VALIDATION UTILISATEUR' = 'TESTING, DEBUGGING AND PERFORMANCE EVALUATION | USER VALIDATION'
    'DELIVERY ET MAINTENANCE' = 'COST ESTIMATION, MAINTENANCE AND DOCUMENTATION'
    'CONCLUSION' = 'CONCLUSION'
}

$powerPoint = $null
$presentation = $null
try {
    $powerPoint = New-Object -ComObject PowerPoint.Application
    $presentation = $powerPoint.Presentations.Open($working, 0, 0, 0)
    if ($presentation.Slides.Count -ne 3) { throw "Expected three native template slides, found $($presentation.Slides.Count)." }

    $contentLayout = $presentation.Slides.Item(2).CustomLayout
    $inserted = $presentation.Slides.InsertFromFile($content, 3, 1, 20)
    if ($inserted -ne 20) { throw "Expected to import 20 content slides, imported $inserted." }

    # Native title slide: retain every template object and change text only.
    $titleSlide = $presentation.Slides.Item(1)
    Set-ShapeText $titleSlide.Shapes.Item('Title 1') 'Inclusive Employment Platform' 30 $true $navy
    Set-ShapeText $titleSlide.Shapes.Item('Text Placeholder 3') "Accessible, AI-Assisted Recruitment`rfor Persons with Physical Disabilities`r`rZaidan Mansour | Charbel Rizk" 16 $false $navy
    Set-ShapeText $titleSlide.Shapes.Item('Text Placeholder 2') "Final Engineering Presentation`r14 September 2026" 13 $true $navy
    Set-ShapeText $titleSlide.Shapes.Item('Text Placeholder 4') "Supervised by:`rDr. Jean Yves Youssef`rDr. Roger Obeid | Dr. Rima Kilany" 12 $false $navy

    # Native overview slide: keep its title/footer placeholders and replace only its sample body.
    $overview = $presentation.Slides.Item(2)
    Set-ShapeText $overview.Shapes.Item('Title 5') 'Presentation Overview' 26 $true $navy
    $overview.Shapes.Item('Content Placeholder 6').Delete()
    Set-ShapeText $overview.Shapes.Item('Date Placeholder 3') 'MDP25-xx' 9 $false $white
    Set-ShapeText $overview.Shapes.Item('Footer Placeholder 8') 'Inclusive Web Platform' 9 $false $white
    Set-ShapeText $overview.Shapes.Item('Slide Number Placeholder 9') '2' 9 $false $white

    $leftOverview = "1. Problem Context and Background Research`r2. Software Life Cycle and Development Methodology`r3. Requirements Elicitation`r4. Software Requirements Specification`r   Functional, non-functional and WCAG requirements`r5. Software Design and Architecture"
    $rightOverview = "6. Implementation and Cloud Deployment`r7. Project Management`r8. Testing, Debugging and Performance Evaluation`r9. Cost Estimation, Maintenance and Documentation`r10. Conclusion and Live Demonstration"
    [void](Add-TextBox $overview $leftOverview 44 112 306 236 17 $navy $true 1 'Overview left')
    [void](Add-TextBox $overview $rightOverview 375 112 300 236 17 $navy $true 1 'Overview right')
    $flowBox = $overview.Shapes.AddShape(5, 44, 365, 631, 104)
    $flowBox.Name = 'Engineering lifecycle flow'
    $flowBox.Fill.ForeColor.RGB = $navy
    $flowBox.Fill.Solid()
    $flowBox.Line.ForeColor.RGB = $navy
    [void](Add-TextBox $overview 'ENGINEERING FLOW' 82 379 556 18 13.5 $white $true 2 'Engineering flow heading')
    $rightArrow = [char]0x2192
    $engineeringFlow = "Software Life Cycle  $rightArrow  Requirements Elicitation  $rightArrow  Software Specification  $rightArrow  System Design`rImplementation  $rightArrow  Project Management  $rightArrow  Testing and Debugging  $rightArrow  Documentation  $rightArrow  Conclusion"
    [void](Add-TextBox $overview $engineeringFlow 62 411 596 43 14 $white $true 2 'Engineering flow sequence')

    # Remove the unused native blank slide and the imported duplicate title slide.
    $presentation.Slides.Item(4).Delete()
    $presentation.Slides.Item(3).Delete()
    if ($presentation.Slides.Count -ne 21) { throw "Expected 21 slides after removing duplicates, found $($presentation.Slides.Count)." }

    # Clean every imported slide: one native template master, no imported header/footer layer.
    for ($slideIndex = 3; $slideIndex -le $presentation.Slides.Count; $slideIndex++) {
        $slide = $presentation.Slides.Item($slideIndex)
        $slide.CustomLayout = $contentLayout

        for ($shapeIndex = $slide.Shapes.Count; $shapeIndex -ge 1; $shapeIndex--) {
            $shape = $slide.Shapes.Item($shapeIndex)
            $hasText = $false
            $text = ''
            try {
                $hasText = ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1)
                if ($hasText) { $text = $shape.TextFrame.TextRange.Text.Trim() }
            } catch {}

            # Imported 16:9 decorations were uniformly scaled and vertically centered.
            # Delete their top motif/logo and their footer; the native master supplies both once.
            if ($shape.Top -ge 448 -or ($shape.Top -lt 95 -and -not $hasText)) {
                $shape.Delete()
                continue
            }

            $key = $text.ToUpperInvariant().Trim()
            if ($sectionMap.ContainsKey($key)) {
                $shape.TextFrame.TextRange.Text = $sectionMap[$key]
                $shape.Left = 36
                $shape.Top = 48
                $shape.Width = 500
                $shape.Height = 17
                $shape.TextFrame.TextRange.Font.Name = 'Arial'
                $shape.TextFrame.TextRange.Font.Size = 10.5
                $shape.TextFrame.TextRange.Font.Bold = -1
            } elseif (($shape.Top -ge 100 -and $shape.Top -le 132) -and $hasText) {
                $shape.Left = 36
                $shape.Top = 70
                $shape.Width = 648
                $shape.Height = 38
                $shape.TextFrame.TextRange.Font.Name = 'Arial'
                $shape.TextFrame.TextRange.Font.Size = if ($text.Length -gt 58) { 21 } else { 23 }
                $shape.TextFrame.TextRange.Font.Bold = -1
            } elseif (($shape.Top -gt 132 -and $shape.Top -le 158) -and $hasText) {
                $shape.Left = 36
                $shape.Top = 111
                $shape.Width = 648
                $shape.Height = 30
                $shape.TextFrame.TextRange.Font.Name = 'Arial'
                $shape.TextFrame.TextRange.Font.Size = 13.5
            }
        }

        # Fill the native footer band once with consistent project metadata and numbering.
        [void](Add-TextBox $slide 'MDP25-xx' 13 519 84 14 8.5 $white $false 1 'Native footer code')
        [void](Add-TextBox $slide 'Inclusive Web Platform' 135 519 450 14 8.5 $white $false 2 'Native footer title')
        [void](Add-TextBox $slide ([string]$slideIndex) 623 519 84 14 8.5 $white $false 3 'Native slide number')
    }

    $presentation.Save()
    $presentation.Close()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation)
    $presentation = $null

    Copy-Item -LiteralPath $working -Destination $target -Force
    $presentation = $powerPoint.Presentations.Open($target, -1, 0, 0)
    if ($presentation.Slides.Count -ne 21) { throw "Saved file has $($presentation.Slides.Count) slides instead of 21." }
    $presentation.Export($preview, 'PNG', 1200, 900)
    $presentation.Close()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation)
    $presentation = $null
} finally {
    if ($presentation) {
        try { $presentation.Close() } catch {}
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation)
    }
    if ($powerPoint) {
        try { $powerPoint.Quit() } catch {}
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint)
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

if (Test-Path -LiteralPath $working) { Remove-Item -LiteralPath $working -Force }

Write-Output "Created: $target"
Write-Output 'Slides: 21 (native title + overview + 19 content slides)'
Write-Output 'Design: one native template master; imported header/footer layer removed'
Write-Output 'Language: all section headers standardized in English'
Write-Output "Backup: $backup"
Write-Output "Preview directory: $preview"
