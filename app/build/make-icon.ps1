# Generates build/icon.png (1024x1024) for electron-builder.
# electron-builder converts it to .ico (Windows) and .icns (macOS) itself.
Add-Type -AssemblyName System.Drawing

$outDir = $PSScriptRoot
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$outFile = Join-Path $outDir 'icon.png'

$S = 1024
$bmp = New-Object System.Drawing.Bitmap($S, $S)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)

function New-RoundRect([int]$x, [int]$y, [int]$w, [int]$h, [int]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

# --- background: rounded square, dark blue gradient ---
$bgPath = New-RoundRect 32 32 ($S - 64) ($S - 64) 200
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Rectangle(0, 0, $S, $S)),
  [System.Drawing.Color]::FromArgb(255, 24, 30, 46),
  [System.Drawing.Color]::FromArgb(255, 10, 12, 20),
  55)
$g.FillPath($bgBrush, $bgPath)

# --- soft glow behind the keyboard ---
$glowPath = New-RoundRect 150 250 724 470 90
$glowBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Rectangle(150, 250, 724, 470)),
  [System.Drawing.Color]::FromArgb(90, 0, 229, 255),
  [System.Drawing.Color]::FromArgb(90, 255, 0, 180),
  45)
$g.FillPath($glowBrush, $glowPath)

# --- keyboard body ---
$kbPath = New-RoundRect 186 296 652 334 56
$kbBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Rectangle(186, 296, 652, 334)),
  [System.Drawing.Color]::FromArgb(255, 45, 54, 74),
  [System.Drawing.Color]::FromArgb(255, 26, 32, 46),
  90)
$g.FillPath($kbBrush, $kbPath)
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(120, 255, 255, 255)), 4
$g.DrawPath($pen, $kbPath)

# --- keys: 4 rows, rainbow ---
$rows = 3
$keyW = 54
$keyH = 54
$gap = 14
$startX = 213
$startY = 330
$keyCount = 9
for ($r = 0; $r -lt $rows; $r++) {
  for ($c = 0; $c -lt $keyCount; $c++) {
    $t = ($r * $keyCount + $c) / [double]($rows * $keyCount - 1)
    $hue = 300 - 300 * $t
    $rr = [int](127 + 128 * [Math]::Cos($hue * [Math]::PI / 180))
    $gg = [int](127 + 128 * [Math]::Cos(($hue - 120) * [Math]::PI / 180))
    $bb = [int](127 + 128 * [Math]::Cos(($hue - 240) * [Math]::PI / 180))
    $rr = [Math]::Max(0, [Math]::Min(255, $rr))
    $gg = [Math]::Max(0, [Math]::Min(255, $gg))
    $bb = [Math]::Max(0, [Math]::Min(255, $bb))
    $col = [System.Drawing.Color]::FromArgb(255, $rr, $gg, $bb)
    $kx = $startX + $c * ($keyW + $gap)
    $ky = $startY + $r * ($keyH + $gap)
    $kp = New-RoundRect $kx $ky $keyW $keyH 14
    $kb = New-Object System.Drawing.SolidBrush $col
    $g.FillPath($kb, $kp)
    $hl = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      (New-Object System.Drawing.Rectangle($kx, $ky, $keyW, $keyH)),
      [System.Drawing.Color]::FromArgb(90, 255, 255, 255),
      [System.Drawing.Color]::FromArgb(0, 255, 255, 255),
      90)
    $g.FillPath($hl, $kp)
  }
}

# --- space bar ---
$sbPath = New-RoundRect 213 540 598 54 14
$sbBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Rectangle(213, 540, 598, 54)),
  [System.Drawing.Color]::FromArgb(255, 0, 229, 255),
  [System.Drawing.Color]::FromArgb(255, 123, 97, 255),
  0)
$g.FillPath($sbBrush, $sbPath)

$bmp.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Output "wrote $outFile"
