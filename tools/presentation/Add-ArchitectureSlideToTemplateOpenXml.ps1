param(
    [string] $TemplatePath,
    [string] $OutputPath
)

$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $scriptDirectory '..\..'))
if (-not $TemplatePath) { $TemplatePath = Join-Path $repositoryRoot 'artifacts\FYP_Final_Presentation.pptx' }
if (-not $OutputPath) { $OutputPath = Join-Path $repositoryRoot 'artifacts\FYP_Final_Presentation_WITH_ARCHITECTURE.pptx' }

$resolvedTemplate = [IO.Path]::GetFullPath($TemplatePath)
$resolvedOutput = [IO.Path]::GetFullPath($OutputPath)
if (-not (Test-Path -LiteralPath $resolvedTemplate)) { throw "Template not found: $resolvedTemplate" }

Add-Type -AssemblyName System.IO.Compression

function Escape-Xml([string] $Text) {
    return [Security.SecurityElement]::Escape($Text)
}

function Emu([double] $Inches) {
    return [int64][Math]::Round($Inches * 914400)
}

$script:shapeId = 1
function Next-ShapeId { $script:shapeId++; return $script:shapeId }

function New-BoxXml(
    [string] $Name,
    [double] $X,
    [double] $Y,
    [double] $W,
    [double] $H,
    [string] $LineColor,
    [string] $FillColor = 'FFFFFF',
    [string] $Geometry = 'roundRect'
) {
    $id = Next-ShapeId
    $xv=Emu $X; $yv=Emu $Y; $wv=Emu $W; $hv=Emu $H
    return @"
<p:sp><p:nvSpPr><p:cNvPr id="$id" name="$(Escape-Xml $Name)"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="$xv" y="$yv"/><a:ext cx="$wv" cy="$hv"/></a:xfrm><a:prstGeom prst="$Geometry"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="$FillColor"/></a:solidFill><a:ln w="12700"><a:solidFill><a:srgbClr val="$LineColor"/></a:solidFill><a:prstDash val="solid"/></a:ln></p:spPr></p:sp>
"@
}

function New-TextXml(
    [string] $Name,
    [string[]] $Lines,
    [double] $X,
    [double] $Y,
    [double] $W,
    [double] $H,
    [int] $FontSize,
    [string] $Color = '0B1F49',
    [bool] $Bold = $false,
    [string] $Align = 'ctr',
    [string] $Anchor = 'ctr',
    [string] $Typeface = 'Arial Narrow'
) {
    $id = Next-ShapeId
    $xv=Emu $X; $yv=Emu $Y; $wv=Emu $W; $hv=Emu $H
    $boldValue = if ($Bold) { '1' } else { '0' }
    $fontSizeHundredths = $FontSize * 100
    $paragraphs = New-Object Text.StringBuilder
    foreach ($line in $Lines) {
        $escaped = Escape-Xml $line
        $paragraphXml = '<a:p><a:pPr algn="{0}"/><a:r><a:rPr lang="en-US" sz="{1}" b="{2}"><a:solidFill><a:srgbClr val="{3}"/></a:solidFill><a:latin typeface="{4}"/></a:rPr><a:t>{5}</a:t></a:r><a:endParaRPr lang="en-US" sz="{1}"/></a:p>' -f $Align,$fontSizeHundredths,$boldValue,$Color,$Typeface,$escaped
        [void]$paragraphs.Append($paragraphXml)
    }
    return @"
<p:sp><p:nvSpPr><p:cNvPr id="$id" name="$(Escape-Xml $Name)"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="$xv" y="$yv"/><a:ext cx="$wv" cy="$hv"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="$Anchor"/><a:lstStyle/>$($paragraphs.ToString())</p:txBody></p:sp>
"@
}

function New-LineXml(
    [string] $Name,
    [double] $X,
    [double] $Y,
    [double] $W,
    [double] $H,
    [string] $Color,
    [bool] $Arrow = $true,
    [int] $Weight = 2
) {
    $id = Next-ShapeId
    $flipH = $false
    $flipV = $false
    if ($W -lt 0) { $X += $W; $W = -$W; $flipH = $true }
    if ($H -lt 0) { $Y += $H; $H = -$H; $flipV = $true }
    $xv=Emu $X; $yv=Emu $Y; $wv=Emu $W; $hv=Emu $H
    $flipAttributes = ''
    if ($flipH) { $flipAttributes += ' flipH="1"' }
    if ($flipV) { $flipAttributes += ' flipV="1"' }
    $arrowXml = if ($Arrow) { '<a:tailEnd type="triangle" w="sm" len="sm"/>' } else { '' }
    return @"
<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="$id" name="$(Escape-Xml $Name)"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm$flipAttributes><a:off x="$xv" y="$yv"/><a:ext cx="$wv" cy="$hv"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="$($Weight * 12700)"><a:solidFill><a:srgbClr val="$Color"/></a:solidFill><a:prstDash val="solid"/>$arrowXml</a:ln></p:spPr></p:cxnSp>
"@
}

function Read-ZipEntryText($Archive, [string] $Name) {
    $entry = $Archive.GetEntry($Name)
    if (-not $entry) { throw "Missing package part: $Name" }
    $reader = New-Object IO.StreamReader($entry.Open())
    try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
}

function Write-ZipEntryText($Archive, [string] $Name, [string] $Text) {
    $existing = $Archive.GetEntry($Name)
    if ($existing) { $existing.Delete() }
    $entry = $Archive.CreateEntry($Name, [IO.Compression.CompressionLevel]::Optimal)
    $writer = New-Object IO.StreamWriter($entry.Open(), (New-Object Text.UTF8Encoding($false)))
    try { $writer.Write($Text) } finally { $writer.Dispose() }
}

function Save-XmlPart($Archive, [string] $Name, [xml] $Document) {
    $settings = New-Object Xml.XmlWriterSettings
    $settings.Encoding = New-Object Text.UTF8Encoding($false)
    $settings.Indent = $false
    $settings.OmitXmlDeclaration = $false
    $settings.NewLineHandling = [Xml.NewLineHandling]::None
    $existing = $Archive.GetEntry($Name)
    if ($existing) { $existing.Delete() }
    $entry = $Archive.CreateEntry($Name, [IO.Compression.CompressionLevel]::Optimal)
    $writer = [Xml.XmlWriter]::Create($entry.Open(), $settings)
    try { $Document.Save($writer) } finally { $writer.Dispose() }
}

# Copy the last saved version even when PowerPoint currently holds the template open.
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resolvedOutput) | Out-Null
$inputStream = [IO.File]::Open($resolvedTemplate, 'Open', 'Read', 'ReadWrite')
try {
    $outputStream = [IO.File]::Open($resolvedOutput, 'Create', 'Write', 'None')
    try { $inputStream.CopyTo($outputStream) } finally { $outputStream.Dispose() }
} finally { $inputStream.Dispose() }

$navy='0B1F49'; $blue='1565D8'; $rust='A64B2A'; $green='157A55'; $amber='C27A19'; $wine='563A4B'; $muted='5D6B80'; $line='C7D1DE'; $light='CBD5E1'
$shapes = New-Object Text.StringBuilder

[void]$shapes.Append((New-TextXml 'Section label' @('ARCHITECTURAL DESIGN | SOFTWARE DESIGN') 0.50 0.28 7.3 0.25 18 $rust $true 'l' 'ctr'))
[void]$shapes.Append((New-TextXml 'Slide title' @('Implemented architecture and trust boundaries') 0.50 0.62 8.75 0.43 26 $navy $true 'l' 'ctr'))

# Users and browser presentation layer.
[void]$shapes.Append((New-TextXml 'Users label' @('Users') 0.05 3.15 0.65 0.34 19 $navy $true 'r' 'ctr'))
[void]$shapes.Append((New-LineXml 'Users to React' 0.70 3.32 0.15 0.00 $light $true 2))
[void]$shapes.Append((New-BoxXml 'React Vite boundary' 0.85 2.05 1.86 2.65 $blue 'FFFFFF'))
[void]$shapes.Append((New-TextXml 'React Vite heading' @('React / Vite') 0.96 2.32 1.64 0.38 20 $navy $true))
[void]$shapes.Append((New-TextXml 'React Vite responsibilities' @('Accessible UI','Role workspaces','JWT client','Approved actions') 1.01 2.88 1.54 1.45 19 $navy $false))

# Authoritative API boundary.
[void]$shapes.Append((New-LineXml 'React to Symfony' 2.71 3.32 0.74 0.00 $blue $true 3))
[void]$shapes.Append((New-TextXml 'JWT API label' @('JWT') 2.82 2.97 0.52 0.32 19 $blue $true))
[void]$shapes.Append((New-BoxXml 'Symfony API boundary' 3.45 1.70 2.20 3.00 $rust 'FFFFFF'))
[void]$shapes.Append((New-TextXml 'Symfony API heading' @('Symfony API') 3.68 2.02 1.74 0.38 20 $navy $true))
[void]$shapes.Append((New-TextXml 'Symfony API responsibilities' @('JWT + RBAC','Validation','Workflow control','Persistence gateway') 3.68 2.72 1.74 1.45 19 $navy $false))

# Persistence layer.
[void]$shapes.Append((New-LineXml 'Symfony to persistence' 5.65 2.55 1.00 -0.38 $green $true 3))
[void]$shapes.Append((New-TextXml 'Persistence adapter label' @('Doctrine') 5.56 1.90 1.10 0.32 19 $green $true))
[void]$shapes.Append((New-BoxXml 'Persistence layer boundary' 6.65 1.48 2.85 1.35 $green 'FFFFFF'))
[void]$shapes.Append((New-TextXml 'Persistence heading' @('Persistence Layer') 6.90 1.67 2.35 0.36 20 $navy $true))
[void]$shapes.Append((New-TextXml 'Persistence responsibilities' @('PostgreSQL: domain data','Object store: files / logos') 6.84 2.10 2.47 0.62 19 $navy $false))

# Deterministic scoring service.
[void]$shapes.Append((New-LineXml 'Symfony to scoring' 5.65 3.50 1.00 0.00 $amber $true 3))
[void]$shapes.Append((New-TextXml 'Scoring token label' @('Service token') 5.48 3.07 1.28 0.32 19 $amber $true))
[void]$shapes.Append((New-BoxXml 'Scoring service boundary' 6.65 3.00 2.85 1.35 $amber 'FFFFFF'))
[void]$shapes.Append((New-TextXml 'Scoring service heading' @('Scoring Service') 6.92 3.18 2.31 0.36 20 $navy $true))
[void]$shapes.Append((New-TextXml 'Scoring responsibilities' @('Deterministic + versioned','Explainable | no OpenAI') 6.84 3.62 2.47 0.62 19 $navy $false))

# Voice/profile service and external provider.
[void]$shapes.Append((New-LineXml 'React to voice service' 2.71 4.28 0.74 1.40 $wine $true 3))
[void]$shapes.Append((New-TextXml 'Audio navigation label' @('Audio / nav') 2.34 4.55 1.05 0.32 19 $wine $true))
[void]$shapes.Append((New-LineXml 'Symfony to voice service' 4.55 4.70 0.00 0.15 $wine $true 3))
[void]$shapes.Append((New-TextXml 'Protected suggestions label' @('Protected') 4.65 4.43 1.10 0.32 19 $wine $true 'l' 'ctr'))
[void]$shapes.Append((New-BoxXml 'Voice profile service boundary' 3.45 4.85 2.20 1.95 $wine 'FFFFFF'))
[void]$shapes.Append((New-TextXml 'Voice profile service heading' @('Voice / Profile') 3.60 5.08 1.90 0.38 20 $navy $true))
[void]$shapes.Append((New-TextXml 'Voice profile responsibilities' @('NLP transcription','Schema-bounded','Bounded commands') 3.66 5.55 1.78 1.05 19 $navy $false))
[void]$shapes.Append((New-LineXml 'Voice service to OpenAI' 5.65 5.72 1.00 0.00 $blue $true 3))
[void]$shapes.Append((New-TextXml 'Provider API label' @('Provider') 5.42 5.30 1.23 0.32 19 $blue $true))
[void]$shapes.Append((New-BoxXml 'OpenAI API boundary' 6.65 4.85 2.85 1.95 $blue 'FFFFFF'))
[void]$shapes.Append((New-TextXml 'OpenAI API heading' @('OpenAI API') 7.22 5.08 1.70 0.38 20 $navy $true))
[void]$shapes.Append((New-TextXml 'OpenAI responsibilities' @('External provider','No DB authority','Replaceable adapter') 6.94 5.55 2.27 1.05 19 $navy $false))

# Footer content sits on the inherited template footer band.
[void]$shapes.Append((New-TextXml 'Footer left' @('MDP25-xx') 0.18 7.12 1.10 0.22 10 'FFFFFF' $false 'l' 'ctr'))
[void]$shapes.Append((New-TextXml 'Footer center' @('Inclusive Web Platform') 3.35 7.12 3.30 0.22 10 'FFFFFF' $false 'ctr' 'ctr'))
[void]$shapes.Append((New-TextXml 'Footer number' @('4') 9.23 7.12 0.42 0.22 10 'FFFFFF' $false 'r' 'ctr'))

$slideXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld name="Implemented logical architecture"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>$($shapes.ToString())</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>
"@

$fileStream = [IO.File]::Open($resolvedOutput, 'Open', 'ReadWrite', 'None')
try {
    $archive = New-Object IO.Compression.ZipArchive($fileStream, [IO.Compression.ZipArchiveMode]::Update, $false)
    try {
        Write-ZipEntryText $archive 'ppt/slides/slide4.xml' $slideXml
        Write-ZipEntryText $archive 'ppt/slides/_rels/slide4.xml.rels' '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout2.xml"/></Relationships>'

        [xml]$presentationRels = Read-ZipEntryText $archive 'ppt/_rels/presentation.xml.rels'
        $relNs = 'http://schemas.openxmlformats.org/package/2006/relationships'
        $numbers = @($presentationRels.Relationships.Relationship.Id | ForEach-Object { if ($_ -match '^rId(\d+)$') { [int]$Matches[1] } })
        $newRelId = 'rId' + ((($numbers | Measure-Object -Maximum).Maximum) + 1)
        $newRel = $presentationRels.CreateElement('Relationship', $relNs)
        $newRel.SetAttribute('Id', $newRelId)
        $newRel.SetAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide')
        $newRel.SetAttribute('Target', 'slides/slide4.xml')
        [void]$presentationRels.DocumentElement.AppendChild($newRel)
        Save-XmlPart $archive 'ppt/_rels/presentation.xml.rels' $presentationRels

        [xml]$presentationXml = Read-ZipEntryText $archive 'ppt/presentation.xml'
        $nsm = New-Object Xml.XmlNamespaceManager($presentationXml.NameTable)
        $nsm.AddNamespace('p','http://schemas.openxmlformats.org/presentationml/2006/main')
        $nsm.AddNamespace('r','http://schemas.openxmlformats.org/officeDocument/2006/relationships')
        $slideList = $presentationXml.SelectSingleNode('//p:sldIdLst', $nsm)
        $maxSlideId = ($slideList.ChildNodes | ForEach-Object { [int]$_.GetAttribute('id') } | Measure-Object -Maximum).Maximum
        $slideId = $presentationXml.CreateElement('p','sldId','http://schemas.openxmlformats.org/presentationml/2006/main')
        $slideId.SetAttribute('id', [string]($maxSlideId + 1))
        [void]$slideId.SetAttribute('id','http://schemas.openxmlformats.org/officeDocument/2006/relationships',$newRelId)
        [void]$slideList.AppendChild($slideId)
        Save-XmlPart $archive 'ppt/presentation.xml' $presentationXml

        [xml]$contentTypes = Read-ZipEntryText $archive '[Content_Types].xml'
        $ctNs = 'http://schemas.openxmlformats.org/package/2006/content-types'
        $override = $contentTypes.CreateElement('Override', $ctNs)
        $override.SetAttribute('PartName','/ppt/slides/slide4.xml')
        $override.SetAttribute('ContentType','application/vnd.openxmlformats-officedocument.presentationml.slide+xml')
        [void]$contentTypes.DocumentElement.AppendChild($override)
        Save-XmlPart $archive '[Content_Types].xml' $contentTypes

        [xml]$appXml = Read-ZipEntryText $archive 'docProps/app.xml'
        $slidesNode = $appXml.SelectSingleNode('/*[local-name()="Properties"]/*[local-name()="Slides"]')
        if ($slidesNode) {
            $slidesNode.InnerText = '4'
            Save-XmlPart $archive 'docProps/app.xml' $appXml
        }
    } finally { $archive.Dispose() }
} finally { $fileStream.Dispose() }

Write-Output "Template: $resolvedTemplate"
Write-Output "Created:  $resolvedOutput"
Write-Output 'Added editable architecture flow as slide 4.'
