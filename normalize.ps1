param (
    [string]$RankNum = [Math]::Floor(
        ((Get-Date).ToFileTime() / 10000000 - 11644473600 - 1428681600) / 3600 / 24 / 7)
)
$ProgressPreference = 'SilentlyContinue'
$TruePath = Split-Path $MyInvocation.MyCommand.Path
$DataFolder = "${TruePath}/DATA"
$DownloadFolder = "${TruePath}/FOOTAGE/VIDEO"
$FootageFolder = "${TruePath}/FOOTAGE/No.${RankNum}/VIDEO"

$tmp = Start-Process -NoNewWindow -Wait -PassThru -FilePath 'ffmpeg.exe' -ArgumentList '-loglevel error -f lavfi -i color=black:s=1920x1080 -vframes 1 -an -c:v h264_nvenc -f null -' -RedirectStandardError '.\NUL'
if ($tmp.ExitCode -eq 0 ) { $Nvdia = $true } else { $Nvdia = $false }
$tmp = Start-Process -NoNewWindow -Wait -PassThru -FilePath 'ffmpeg.exe' -ArgumentList '-loglevel error -f lavfi -i color=black:s=1920x1080 -vframes 1 -an -c:v h264_qsv -f null -' -RedirectStandardError '.\NUL'
if ($tmp.ExitCode -eq 0 ) { $Intel = $true } else { $Intel = $false }
$Encoder = if ($Nvdia) { 'h264_nvenc' } else { if ($Intel) { 'h264_qsv' } else { 'libx264' } }

function Normalize {
    param (
        [parameter(position = 1)]$FileName,
        [parameter(position = 2)]$Offset,
        [parameter(position = 3)]$Length
    )
    $Target = 'loudnorm=I=-23.0:LRA=+7.0:tp=-1.0'
    $Length = $Length + 5
    $AudioArg = @(
        '-y', '-hide_banner',
        '-ss', "${Offset}",
        '-t', "${Length}",
        '-i', "${DownloadFolder}/${FileName}.mp4",
        '-af', "${Target}:print_format=json",
        '-f', 'null', '-'
    )
    $AudioInfo = "${DownloadFolder}/${FileName}.log"
    & ffmpeg.exe $AudioArg 2> $AudioInfo
    $AudioData = [Regex]::Match((Get-Content -Raw $AudioInfo), '(?s)({.+?})\r?\n').Value | ConvertFrom-Json
    $Source = "measured_I=$($AudioData.input_i):measured_LRA=$($AudioData.input_lra):measured_tp=$($AudioData.input_tp):measured_thresh=$($AudioData.input_thresh):offset=$($AudioData.target_offset)"
    $VideoArg = @(
        '-y', '-hide_banner', '-loglevel', 'error',
        '-ss', "${Offset}",
        '-t', "${Length}",
        '-i', "${DownloadFolder}/${FileName}.mp4",
        '-vf', "scale='ceil((min(1,gt(iw,1920)+gt(ih,1080))*(gte(a,1920/1080)*1920+lt(a,1920/1080)*((1080*iw)/ih))+not(min(1,gt(iw,1920)+gt(ih,1080)))*iw)/2)*2:ceil((min(1,gt(iw,1920)+gt(ih,1080))*(lte(a,1920/1080)*1080+gt(a,1920/1080)*((1920*ih)/iw))+not(min(1,gt(iw,1920)+gt(ih,1080)))*ih)/2)*2'",
        '-af', "${Target}:print_format=summary:linear=true:${Source}", '-ar', '48000',
        '-c:v', "${Encoder}", '-b:v', '10M',
        '-c:a', 'aac', '-b:a', '320k', '-r', '60',
        "${FootageFolder}/${FileName}.mp4"
    )
    [Console]::Out.WriteLine("$($PSStyle.Foreground.Green)$(Get-Date -Format 'MM/dd HH:mm:ss') - ${FileName} 截取视频并标准化音频音量$($PSStyle.Reset)")
    & ffmpeg.exe @VideoArg 2> $null
}

function Main {
    param (
        [string]$RankNum
    )
    if (!(Test-Path "${FootageFolder}")) {
        New-Item -ItemType 'Directory' -Path $FootageFolder
    }
    $RankVideos = @()
    $LocalVideos = @()
    Get-ChildItem "${FootageFolder}/*.mp4" | ForEach-Object { $LocalVideos += $_.BaseName }
    if ($RankNum -eq 'pickup') {
        $JsonData = Get-Content -Path 'pickup.json'
    } else {
        $JsonData = Get-Content -Path "${DataFolder}/${RankNum}期数据.json"
    }
    $JsonData | ConvertFrom-Json | ForEach-Object {
        if ($_.rank -le 0) {
            $RankVideos += @{name = "av$($_.av)"; offset = $_.offset; length = 40 }
        } elseif ($_.rank -le 3) {
            $RankVideos += @{name = "av$($_.av)"; offset = $_.offset; length = 70 }
        } elseif ($_.rank -le 20) {
            $RankVideos += @{name = "av$($_.av)"; offset = $_.offset; length = 20 }
        } elseif ($_.rank -ge 1000) {
            $RankVideos += @{name = "av$($_.av)"; offset = $_.offset; length = 40 }
        }
    }

    $normalizeDef = ${Function:Normalize}.ToString()
    $RankVideos | ForEach-Object -ThrottleLimit 4 -Parallel {
        $name = $_.name
        $offset = $_.offset
        $length = [int]$_.length
        $FootageFolder = $using:FootageFolder
        $DownloadFolder = $using:DownloadFolder
        $LocalVideos = $using:LocalVideos
        $Encoder = $using:Encoder
        if (($LocalVideos -notcontains $name) -or ((Get-Item "${FootageFolder}/${name}.mp4").length -eq 0)) {
            ${Function:Normalize} = [ScriptBlock]::Create($using:normalizeDef)
            Normalize -FileName $name -Offset $offset -Length $length
        } else {
            [Console]::Out.WriteLine("$($PSStyle.Foreground.Yellow)$(Get-Date -Format 'MM/dd HH:mm:ss') - ${name} 已存在，跳过处理$($PSStyle.Reset)")
        }
    }

    Add-Type -AssemblyName Microsoft.VisualBasic
    Get-ChildItem "${DownloadFolder}/*.log" | ForEach-Object {
        [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile(
            "$($_)", 'OnlyErrorDialogs', 'SendToRecycleBin')
    }
}

Main -RankNum $RankNum
