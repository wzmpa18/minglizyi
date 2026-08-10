# 使用 .NET System.Drawing 生成标准PNG图标
# 紫色主题 #7B2FBE

Add-Type -AssemblyName System.Drawing

$baseDir = 'c:\Users\ZhuanZ\.trae-cn\work\6a77e1c41fcd195835455fc2\android\app\src\main\res'

function Create-Png {
    param(
        [string]$path,
        [int]$width,
        [int]$height,
        [int[]]$bgColor = @(123, 47, 190),   # #7B2FBE
        [int[]]$fgColor = @(255, 255, 255, 255)  # 白色
    )
    
    $bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    # 填充背景
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($bgColor[0], $bgColor[1], $bgColor[2]))
    $graphics.FillRectangle($bgBrush, 0, 0, $width, $height)
    
    # 绘制简单的"言"字图案 - 用圆形+文字
    $centerX = $width / 2
    $centerY = $height / 2
    $radius = [Math]::Min($width, $height) * 0.35
    
    # 绘制白色圆形
    $fgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255))
    $graphics.FillEllipse($fgBrush, [float]($centerX - $radius), [float]($centerY - $radius), [float]($radius * 2), [float]($radius * 2))
    
    # 绘制文字
    $fontSize = [int]([Math]::Min($width, $height) * 0.35)
    $font = New-Object System.Drawing.Font('Microsoft YaHei', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(123, 47, 190))
    
    $strFormat = New-Object System.Drawing.StringFormat
    $strFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $strFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $textRect = New-Object System.Drawing.RectangleF(0, [float]($centerY - $radius), $width, [float]($radius * 2))
    $graphics.DrawString('言', $font, $textBrush, $textRect, $strFormat)
    
    $graphics.Flush()
    
    # 保存为PNG
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bmp.Dispose()
    
    Write-Host "Generated: $path ($width x $height)"
}

function Create-Splash {
    param(
        [string]$path,
        [int]$width,
        [int]$height
    )
    
    $bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    # 紫色背景
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(123, 47, 190))
    $graphics.FillRectangle($bgBrush, 0, 0, $width, $height)
    
    # 中心绘制白色圆形+文字
    $centerX = $width / 2
    $centerY = $height / 2
    $radius = [Math]::Min($width, $height) * 0.25
    
    $fgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255))
    $graphics.FillEllipse($fgBrush, [float]($centerX - $radius), [float]($centerY - $radius), [float]($radius * 2), [float]($radius * 2))
    
    $fontSize = [int]($radius * 0.8)
    $font = New-Object System.Drawing.Font('Microsoft YaHei', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(123, 47, 190))
    
    $strFormat = New-Object System.Drawing.StringFormat
    $strFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $strFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $textRect = New-Object System.Drawing.RectangleF([float]($centerX - $radius), [float]($centerY - $radius), [float]($radius * 2), [float]($radius * 2))
    $graphics.DrawString('言', $font, $textBrush, $textRect, $strFormat)
    
    $graphics.Flush()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bmp.Dispose()
    
    Write-Host "Generated splash: $path ($width x $height)"
}

Write-Host '=== 开始生成PNG图标资源 ==='

# mipmap-mdpi: 48x48
$mdpiDir = Join-Path $baseDir 'mipmap-mdpi'
Create-Png (Join-Path $mdpiDir 'ic_launcher.png') 48 48
Create-Png (Join-Path $mdpiDir 'ic_launcher_round.png') 48 48
Create-Png (Join-Path $mdpiDir 'ic_launcher_foreground.png') 108 108

# mipmap-hdpi: 72x72
$hdpiDir = Join-Path $baseDir 'mipmap-hdpi'
Create-Png (Join-Path $hdpiDir 'ic_launcher.png') 72 72
Create-Png (Join-Path $hdpiDir 'ic_launcher_round.png') 72 72
Create-Png (Join-Path $hdpiDir 'ic_launcher_foreground.png') 162 162

# mipmap-xhdpi: 96x96
$xhdpiDir = Join-Path $baseDir 'mipmap-xhdpi'
Create-Png (Join-Path $xhdpiDir 'ic_launcher.png') 96 96
Create-Png (Join-Path $xhdpiDir 'ic_launcher_round.png') 96 96
Create-Png (Join-Path $xhdpiDir 'ic_launcher_foreground.png') 216 216

# mipmap-xxhdpi: 144x144
$xxhdpiDir = Join-Path $baseDir 'mipmap-xxhdpi'
Create-Png (Join-Path $xxhdpiDir 'ic_launcher.png') 144 144
Create-Png (Join-Path $xxhdpiDir 'ic_launcher_round.png') 144 144
Create-Png (Join-Path $xxhdpiDir 'ic_launcher_foreground.png') 324 324

# mipmap-xxxhdpi: 192x192
$xxxhdpiDir = Join-Path $baseDir 'mipmap-xxxhdpi'
Create-Png (Join-Path $xxxhdpiDir 'ic_launcher.png') 192 192
Create-Png (Join-Path $xxxhdpiDir 'ic_launcher_round.png') 192 192
Create-Png (Join-Path $xxxhdpiDir 'ic_launcher_foreground.png') 432 432

# Splash screens
# drawable: 480x800
Create-Splash (Join-Path $baseDir 'drawable\splash.png') 480 800

# drawable-port-hdpi: 720x1280
Create-Splash (Join-Path (Join-Path $baseDir 'drawable-port-hdpi') 'splash.png') 720 1280

# drawable-port-mdpi: 480x800
Create-Splash (Join-Path (Join-Path $baseDir 'drawable-port-mdpi') 'splash.png') 480 800

# drawable-port-xhdpi: 960x1600
Create-Splash (Join-Path (Join-Path $baseDir 'drawable-port-xhdpi') 'splash.png') 960 1600

# drawable-port-xxhdpi: 1280x1920
Create-Splash (Join-Path (Join-Path $baseDir 'drawable-port-xxhdpi') 'splash.png') 1280 1920

# drawable-port-xxxhdpi: 1440x2560
Create-Splash (Join-Path (Join-Path $baseDir 'drawable-port-xxxhdpi') 'splash.png') 1440 2560

# drawable-land-hdpi: 1280x720
Create-Splash (Join-Path (Join-Path $baseDir 'drawable-land-hdpi') 'splash.png') 1280 720

# drawable-land-mdpi: 800x480
Create-Splash (Join-Path (Join-Path $baseDir 'drawable-land-mdpi') 'splash.png') 800 480

# drawable-land-xhdpi: 1600x960
Create-Splash (Join-Path (Join-Path $baseDir 'drawable-land-xhdpi') 'splash.png') 1600 960

# drawable-land-xxhdpi: 1920x1280
Create-Splash (Join-Path (Join-Path $baseDir 'drawable-land-xxhdpi') 'splash.png') 1920 1280

# drawable-land-xxxhdpi: 2560x1440
Create-Splash (Join-Path (Join-Path $baseDir 'drawable-land-xxxhdpi') 'splash.png') 2560 1440

Write-Host ''
Write-Host '=== 所有PNG资源生成完成 ==='
