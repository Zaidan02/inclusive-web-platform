param(
    [string] $PresentationPath,
    [string] $PreviewPath
)

$ErrorActionPreference = 'Stop'
$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $scriptDirectory '..\..'))
if (-not $PresentationPath) { $PresentationPath = Join-Path $repositoryRoot 'artifacts\FYP_Final_Presentation.pptx' }
if (-not $PreviewPath) { $PreviewPath = Join-Path $repositoryRoot 'artifacts\FYP_Final_Presentation_FINAL_NATIVE_preview\Slide2.PNG' }

$target = [IO.Path]::GetFullPath($PresentationPath)
$powerPoint = [Runtime.InteropServices.Marshal]::GetActiveObject('PowerPoint.Application')
$presentation = $null

try {
    foreach ($candidate in $powerPoint.Presentations) {
        if ([string]::Equals([IO.Path]::GetFullPath($candidate.FullName), $target, [StringComparison]::OrdinalIgnoreCase)) {
            $presentation = $candidate
            break
        }
    }
    if (-not $presentation) { throw "The open PowerPoint instance does not contain: $target" }
    if ($presentation.Slides.Count -ne 21) { throw "Expected 21 slides, found $($presentation.Slides.Count)." }

    $overview = $presentation.Slides.Item(2)
    try { $overview.Shapes.Item('Content Placeholder 6').Delete() } catch {}

    $leftText = "1. Problem Context and Background Research`r2. Software Life Cycle and Development Methodology`r3. Requirements Elicitation`r4. Software Requirements Specification`r   Functional, non-functional and WCAG requirements`r5. Software Design and Architecture"
    $overview.Shapes.Item('Overview left').Left = 44
    $overview.Shapes.Item('Overview left').Top = 112
    $overview.Shapes.Item('Overview left').Width = 306
    $overview.Shapes.Item('Overview left').Height = 236
    $overview.Shapes.Item('Overview left').TextFrame.TextRange.Text = $leftText
    $overview.Shapes.Item('Overview left').TextFrame.TextRange.Font.Name = 'Arial'
    $overview.Shapes.Item('Overview left').TextFrame.TextRange.Font.Size = 17
    $overview.Shapes.Item('Overview left').TextFrame.TextRange.Font.Bold = -1

    $overview.Shapes.Item('Overview right').TextFrame.TextRange.Text = "6. Implementation and Cloud Deployment`r7. Project Management`r8. Testing, Debugging and Performance Evaluation`r9. Cost Estimation, Maintenance and Documentation`r10. Conclusion and Live Demonstration"
    $overview.Shapes.Item('Overview right').Left = 375
    $overview.Shapes.Item('Overview right').Top = 112
    $overview.Shapes.Item('Overview right').Width = 300
    $overview.Shapes.Item('Overview right').Height = 236
    $overview.Shapes.Item('Overview right').TextFrame.TextRange.Font.Name = 'Arial'
    $overview.Shapes.Item('Overview right').TextFrame.TextRange.Font.Size = 17
    $overview.Shapes.Item('Overview right').TextFrame.TextRange.Font.Bold = -1

    $rightArrow = [char]0x2192
    $flowText = "Software Life Cycle  $rightArrow  Requirements Elicitation  $rightArrow  Software Specification`rSystem Design  $rightArrow  Implementation  $rightArrow  Project Management  $rightArrow  Testing and Debugging`rDocumentation  $rightArrow  Conclusion"
    $overview.Shapes.Item('Engineering lifecycle flow').Left = 44
    $overview.Shapes.Item('Engineering lifecycle flow').Top = 365
    $overview.Shapes.Item('Engineering lifecycle flow').Width = 631
    $overview.Shapes.Item('Engineering lifecycle flow').Height = 104
    $overview.Shapes.Item('Engineering flow heading').Left = 82
    $overview.Shapes.Item('Engineering flow heading').Top = 379
    $overview.Shapes.Item('Engineering flow heading').Width = 556
    $overview.Shapes.Item('Engineering flow heading').Height = 18
    $overview.Shapes.Item('Engineering flow sequence').TextFrame.TextRange.Text = $flowText
    $overview.Shapes.Item('Engineering flow sequence').Left = 62
    $overview.Shapes.Item('Engineering flow sequence').Top = 405
    $overview.Shapes.Item('Engineering flow sequence').Width = 596
    $overview.Shapes.Item('Engineering flow sequence').Height = 54
    $overview.Shapes.Item('Engineering flow sequence').TextFrame.TextRange.Font.Name = 'Arial'
    $overview.Shapes.Item('Engineering flow sequence').TextFrame.TextRange.Font.Size = 13
    $overview.Shapes.Item('Engineering flow sequence').TextFrame.TextRange.Font.Bold = -1
    $overview.Shapes.Item('Engineering flow sequence').TextFrame.TextRange.ParagraphFormat.Alignment = 2

    $presentation.Save()
    $overview.Export([IO.Path]::GetFullPath($PreviewPath), 'PNG', 1200, 900)
} finally {
    if ($presentation) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) }
    if ($powerPoint) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

Write-Output "Updated live presentation: $target"
Write-Output 'Overview now includes Project Management as section 7.'
