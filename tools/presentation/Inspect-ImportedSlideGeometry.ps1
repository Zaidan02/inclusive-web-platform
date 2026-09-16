param([string] $Path)
$ErrorActionPreference='Stop'
if (-not $Path) {
  $scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
  $repositoryRoot = [IO.Path]::GetFullPath((Join-Path $scriptDirectory '..\..'))
  $Path = Join-Path $repositoryRoot 'artifacts\FYP_Final_Presentation.pptx'
}
$app=New-Object -ComObject PowerPoint.Application
$pres=$app.Presentations.Open($Path,-1,0,0)
try {
  "SIZE=$($pres.PageSetup.SlideWidth)x$($pres.PageSetup.SlideHeight) SLIDES=$($pres.Slides.Count)"
  foreach($slideIndex in @(1,2,4,5,13,14)) {
    $slide=$pres.Slides.Item($slideIndex)
    "SLIDE=$slideIndex SHAPES=$($slide.Shapes.Count)"
    foreach($shape in $slide.Shapes) {
      $text=''
      try { if($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1){$text=($shape.TextFrame.TextRange.Text -replace '[\r\n]+',' ').Trim()} } catch {}
      if($text -or $shape.Top -lt 45 -or $shape.Top -gt 360) {
        $font=''
        try {$font=[math]::Round($shape.TextFrame.TextRange.Font.Size,1)} catch {}
        "{0} | L={1:N1} T={2:N1} W={3:N1} H={4:N1} FS={5} | {6}" -f $shape.Name,$shape.Left,$shape.Top,$shape.Width,$shape.Height,$font,($text.Substring(0,[Math]::Min(80,$text.Length)))
      }
    }
  }
} finally {
  $pres.Close();$app.Quit()
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($pres)
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($app)
  [GC]::Collect();[GC]::WaitForPendingFinalizers()
}
