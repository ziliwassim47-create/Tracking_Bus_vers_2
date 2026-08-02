$ErrorActionPreference = 'Stop'

$iconNames = @(
    'arrow-left',
    'bell',
    'bell-ring',
    'bus-front',
    'circle-plus',
    'clock',
    'clock-3',
    'clock-alert',
    'graduation-cap',
    'history',
    'house',
    'info',
    'layout-dashboard',
    'log-in',
    'log-out',
    'mail',
    'map',
    'map-pin',
    'map-pinned',
    'phone',
    'play',
    'plus',
    'route',
    'send',
    'share-2',
    'shield-check',
    'square',
    'steering-wheel',
    'sunrise',
    'sunset',
    'timer',
    'triangle-alert',
    'user',
    'user-check',
    'user-plus',
    'user-round',
    'users',
    'users-round'
)

$sourceOverrides = @{
    # Lucide ne fournit pas de volant automobile. Tabler utilise la même
    # grille de 24 px et le même trait de 2 px pour ce pictogramme.
    'steering-wheel' = 'https://unpkg.com/@tabler/icons@1.91.0/icons/steering-wheel.svg'
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$targetDirectory = Join-Path $projectRoot 'www\assets\icons'
$workDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "tracking-bus-icons-$([guid]::NewGuid())"
$svgDirectory = Join-Path $workDirectory 'svg'
$chromeCandidates = @(
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
)
$browser = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $browser) {
    throw 'Google Chrome ou Microsoft Edge est nécessaire pour convertir les SVG en PNG.'
}

New-Item -ItemType Directory -Path $svgDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null

try {
    foreach ($iconName in $iconNames) {
        $sourceUri = if ($sourceOverrides.ContainsKey($iconName)) {
            $sourceOverrides[$iconName]
        } else {
            "https://unpkg.com/lucide-static@1.27.0/icons/$iconName.svg"
        }
        $svgPath = Join-Path $svgDirectory "$iconName.svg"
        Invoke-WebRequest -Uri $sourceUri -OutFile $svgPath

        $svg = Get-Content -Raw -LiteralPath $svgPath
        $svg = $svg `
            -replace 'width="24"', 'width="64"' `
            -replace 'height="24"', 'height="64"' `
            -replace 'viewBox="0 0 24 24"', 'viewBox="-3 -3 30 30"' `
            -replace 'stroke="currentColor"', 'stroke="#000000"'
        Set-Content -LiteralPath $svgPath -Value $svg -Encoding utf8
    }

    $cells = foreach ($iconName in $iconNames) {
        "<img src=""svg/$iconName.svg"" alt="""">"
    }
    $sheetHtml = @"
<!doctype html>
<meta charset="utf-8">
<style>
* { box-sizing: border-box; }
html, body {
    width: 512px;
    height: 384px;
    margin: 0;
    overflow: hidden;
    background: transparent;
}
body {
    display: grid;
    grid-template-columns: repeat(8, 64px);
    grid-auto-rows: 64px;
}
img {
    display: block;
    width: 64px;
    height: 64px;
}
</style>
$($cells -join [Environment]::NewLine)
"@

    $sheetHtmlPath = Join-Path $workDirectory 'sheet.html'
    $sheetPngPath = Join-Path $workDirectory 'sheet.png'
    Set-Content -LiteralPath $sheetHtmlPath -Value $sheetHtml -Encoding utf8

    $browserArguments = @(
        '--headless',
        '--disable-gpu',
        '--hide-scrollbars',
        '--default-background-color=00000000',
        '--window-size=512,384',
        "--screenshot=$sheetPngPath",
        "file:///$($sheetHtmlPath.Replace('\', '/'))"
    )
    $browserProcess = Start-Process `
        -FilePath $browser `
        -ArgumentList $browserArguments `
        -Wait `
        -PassThru `
        -WindowStyle Hidden

    if ($browserProcess.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $sheetPngPath)) {
        throw "La conversion des icônes a échoué (code $($browserProcess.ExitCode))."
    }

    Add-Type -AssemblyName System.Drawing
    $sheet = [System.Drawing.Bitmap]::FromFile($sheetPngPath)
    try {
        for ($index = 0; $index -lt $iconNames.Count; $index += 1) {
            $x = ($index % 8) * 64
            $y = [Math]::Floor($index / 8) * 64
            $rectangle = New-Object System.Drawing.Rectangle($x, $y, 64, 64)
            $iconBitmap = $sheet.Clone($rectangle, $sheet.PixelFormat)
            try {
                $outputPath = Join-Path $targetDirectory "$($iconNames[$index]).png"
                $iconBitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
            } finally {
                $iconBitmap.Dispose()
            }
        }
    } finally {
        $sheet.Dispose()
    }

    Invoke-WebRequest `
        -Uri 'https://raw.githubusercontent.com/lucide-icons/lucide/main/LICENSE' `
        -OutFile (Join-Path $targetDirectory 'LUCIDE-LICENSE.txt')
    Invoke-WebRequest `
        -Uri 'https://raw.githubusercontent.com/tabler/tabler-icons/main/LICENSE' `
        -OutFile (Join-Path $targetDirectory 'TABLER-LICENSE.txt')

    Write-Output "$($iconNames.Count) icônes PNG ont été générées dans $targetDirectory."
} finally {
    if (Test-Path -LiteralPath $workDirectory) {
        Remove-Item -LiteralPath $workDirectory -Recurse -Force
    }
}
