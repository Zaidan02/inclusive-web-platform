param(
    [string] $OutputPath
)

$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $scriptDirectory '..\..'))
$templatePath = Join-Path $repositoryRoot 'artifacts\JoIn_Hospitality_IMPLEMENTED_ARCHITECTURE_FLOW_SLIDE.pptx'

if (-not $OutputPath) {
    $OutputPath = Join-Path $repositoryRoot 'artifacts\JoIn_Hospitality_COST_CONTROL_AND_FUTURE_SOLUTION_SLIDE.pptx'
}

if (-not (Test-Path -LiteralPath $templatePath)) {
    throw "The standalone presentation template was not found: $templatePath"
}

function ConvertTo-Emu([double] $Points) {
    return [long][Math]::Round($Points * 12700)
}

function ConvertTo-XmlText([string] $Value) {
    return [Security.SecurityElement]::Escape($Value)
}

function New-RectangleXml(
    [int] $Id,
    [string] $Name,
    [double] $X,
    [double] $Y,
    [double] $Width,
    [double] $Height,
    [string] $Fill,
    [string] $Border,
    [bool] $Rounded = $false,
    [double] $BorderWidth = 0.8
) {
    $shapeType = if ($Rounded) { 'roundRect' } else { 'rect' }
    $xEmu = ConvertTo-Emu $X
    $yEmu = ConvertTo-Emu $Y
    $widthEmu = ConvertTo-Emu $Width
    $heightEmu = ConvertTo-Emu $Height
    $lineWidth = [long][Math]::Round($BorderWidth * 12700)
    return @"
<p:sp><p:nvSpPr><p:cNvPr id="$Id" name="$(ConvertTo-XmlText $Name)"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="$xEmu" y="$yEmu"/><a:ext cx="$widthEmu" cy="$heightEmu"/></a:xfrm><a:prstGeom prst="$shapeType"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="$Fill"/></a:solidFill><a:ln w="$lineWidth"><a:solidFill><a:srgbClr val="$Border"/></a:solidFill></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>
"@
}

function New-TextBoxXml(
    [int] $Id,
    [string] $Name,
    [string] $Text,
    [double] $X,
    [double] $Y,
    [double] $Width,
    [double] $Height,
    [double] $FontSize,
    [string] $Color,
    [bool] $Bold = $false,
    [string] $Font = 'Aptos',
    [string] $Align = 'l'
) {
    $xEmu = ConvertTo-Emu $X
    $yEmu = ConvertTo-Emu $Y
    $widthEmu = ConvertTo-Emu $Width
    $heightEmu = ConvertTo-Emu $Height
    $fontSizeValue = [int][Math]::Round($FontSize * 100)
    $boldAttribute = if ($Bold) { ' b="1"' } else { '' }
    $paragraphs = @()
    foreach ($lineText in ($Text -split "`r?`n")) {
        $escapedText = ConvertTo-XmlText $lineText
        $paragraphs += "<a:p><a:pPr algn=`"$Align`"/><a:r><a:rPr lang=`"en-US`" sz=`"$fontSizeValue`"$boldAttribute><a:solidFill><a:srgbClr val=`"$Color`"/></a:solidFill><a:latin typeface=`"$(ConvertTo-XmlText $Font)`"/></a:rPr><a:t>$escapedText</a:t></a:r></a:p>"
    }
    $paragraphXml = $paragraphs -join ''
    return @"
<p:sp><p:nvSpPr><p:cNvPr id="$Id" name="$(ConvertTo-XmlText $Name)"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="$xEmu" y="$yEmu"/><a:ext cx="$widthEmu" cy="$heightEmu"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr vert="horz" wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0"><a:spAutoFit/></a:bodyPr><a:lstStyle/>$paragraphXml</p:txBody></p:sp>
"@
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPath) | Out-Null
Copy-Item -LiteralPath $templatePath -Destination $OutputPath -Force

Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$archive = [IO.Compression.ZipFile]::Open($OutputPath, [IO.Compression.ZipArchiveMode]::Update)
try {
    $existingSlideEntry = $archive.GetEntry('ppt/slides/slide1.xml')
    $reader = [IO.StreamReader]::new($existingSlideEntry.Open())
    try { $existingSlideXml = $reader.ReadToEnd() } finally { $reader.Dispose() }
    $pictureMatch = [regex]::Match($existingSlideXml, '<p:pic>.*?</p:pic>', [Text.RegularExpressions.RegexOptions]::Singleline)
    $logoPictureXml = if ($pictureMatch.Success) { $pictureMatch.Value } else { '' }

    $shapeParts = [Collections.Generic.List[string]]::new()
    $shapeParts.Add((New-RectangleXml 100 'Background' 0 0 960 540 'FBFAF7' 'FBFAF7'))
    $shapeParts.Add((New-RectangleXml 101 'Top blue rule' 0 0 960 8 '1565D8' '1565D8'))
    $shapeParts.Add((New-TextBoxXml 102 'Section' 'COST ESTIMATION AND CONTROL' 48 27 500 18 9 'A64B2A' $true))
    $shapeParts.Add((New-TextBoxXml 103 'Title' 'Cost control today, sustainable scaling tomorrow' 48 50 820 43 27 '0B1F49' $true 'Aptos Display'))
    $shapeParts.Add((New-TextBoxXml 104 'Subtitle' 'Paid AI is optional and bounded; essential recruitment workflows remain available without it.' 48 96 830 28 10.2 '5D6B80'))
    if ($logoPictureXml) { $shapeParts.Add($logoPictureXml) }

    $cardX = @(48, 345, 642)
    $cardColors = @('157A55', '1565D8', 'A64B2A')
    $cardTitles = @('Where cost comes from', 'How cost is controlled', 'Future solution')
    $cardTexts = @(
        "+ Fixed: compute, database and storage`n+ Variable: transcription and AI suggestions`n+ Ongoing: email, monitoring and backups`n+ Continuous: accessibility, security and maintenance",
        "+ Deterministic rules before AI`n+ Daily quotas and request-size limits`n+ Lower-cost model routing`n+ Browser speech synthesis first`n+ Usage records, alerts and manual fallback",
        "+ Prefilter 20-40 relevant catalogue tasks`n+ Optimize queries, then selectively cache`n+ Separate staging and production budgets`n+ Emergency AI circuit breaker`n+ Evaluate self-hosted options at higher scale"
    )
    for ($index = 0; $index -lt 3; $index++) {
        $baseId = 110 + ($index * 10)
        $shapeParts.Add((New-RectangleXml $baseId "Card $($index + 1)" $cardX[$index] 150 270 258 'FFFFFF' 'CBD5E1' $true))
        $shapeParts.Add((New-RectangleXml ($baseId + 1) "Card accent $($index + 1)" $cardX[$index] 150 7 258 $cardColors[$index] $cardColors[$index]))
        $shapeParts.Add((New-TextBoxXml ($baseId + 2) "Card title $($index + 1)" $cardTitles[$index] ($cardX[$index] + 24) 177 220 34 15.5 $cardColors[$index] $true 'Aptos Display'))
        $shapeParts.Add((New-TextBoxXml ($baseId + 3) "Card content $($index + 1)" $cardTexts[$index] ($cardX[$index] + 24) 235 220 145 10.1 '17243A'))
    }

    $shapeParts.Add((New-RectangleXml 150 'Pilot guardrails' 80 430 800 56 '0B1F49' '0B1F49' $true))
    $shapeParts.Add((New-TextBoxXml 151 'Pilot label' 'PILOT GUARDRAILS' 104 444 120 18 9.5 '157A55' $true))
    $shapeParts.Add((New-TextBoxXml 152 'Pilot limits' "3 profile suggestions/day | 5 transcriptions/day (max 90 s)`n60 voice commands/day | 10 page questions/day" 225 441 625 32 9.3 'FFFFFF' $true 'Aptos' 'ctr'))

    $shapeParts.Add((New-RectangleXml 160 'Footer rule' 48 508 864 0.8 'CBD5E1' 'CBD5E1'))
    $shapeParts.Add((New-TextBoxXml 161 'Footer' 'INCLUSIVE WEB PLATFORM | FINAL ENGINEERING PRESENTATION | 14 SEP 2026' 48 515 710 14 7.2 '5D6B80'))
    $shapeParts.Add((New-TextBoxXml 162 'Slide code' 'COST' 866 514 46 14 8 'A64B2A' $true 'Aptos' 'r'))

    $slideXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
        '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
        ($shapeParts -join '') +
        '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>'

    $existingSlideEntry.Delete()
    $newSlideEntry = $archive.CreateEntry('ppt/slides/slide1.xml', [IO.Compression.CompressionLevel]::Optimal)
    $writer = [IO.StreamWriter]::new($newSlideEntry.Open(), [Text.UTF8Encoding]::new($false))
    try { $writer.Write($slideXml) } finally { $writer.Dispose() }

    $notesEntry = $archive.GetEntry('ppt/notesSlides/notesSlide1.xml')
    if ($notesEntry) {
        $notesReader = [IO.StreamReader]::new($notesEntry.Open())
        try { $notesXml = $notesReader.ReadToEnd() } finally { $notesReader.Dispose() }
        $speech = 'Our cost model separates fixed platform costs from variable AI usage and continuous maintenance. Predictable actions are processed locally, while paid AI is bounded by quotas, request limits and usage monitoring. Future scaling will reduce prompt size, optimize database access and evaluate self-hosted alternatives, while essential workflows remain available without paid AI.'
        $notesXml = [regex]::Replace($notesXml, 'Users interact through React\..*?directly\.', (ConvertTo-XmlText $speech))
        $notesEntry.Delete()
        $newNotesEntry = $archive.CreateEntry('ppt/notesSlides/notesSlide1.xml', [IO.Compression.CompressionLevel]::Optimal)
        $notesWriter = [IO.StreamWriter]::new($newNotesEntry.Open(), [Text.UTF8Encoding]::new($false))
        try { $notesWriter.Write($notesXml) } finally { $notesWriter.Dispose() }
    }
} finally {
    $archive.Dispose()
}

Write-Output "Presentation: $OutputPath"
Write-Output 'Created without opening or automating PowerPoint.'
