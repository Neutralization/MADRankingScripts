param (
    [string]$RankNum = [Math]::Round(((Get-Date).ToFileTime() / 10000000 - 11644473600 - 1428681600) / 3600 / 24 / 7)
)
$ProgressPreference = 'SilentlyContinue'
$TruePath = Split-Path $MyInvocation.MyCommand.Path
$DataFolder = "$($TruePath)/DATA"
$DownloadFolder = "$($TruePath)/FOOTAGE/VIDEO"
$FootageFolder = "$($TruePath)/FOOTAGE/No.$($RankNum)/VIDEO"

if (Test-Path -Path 'C:/Windows/System32/nvcuvid.dll') { $Nvdia = $true } else { $Nvdia = $false }
if ((WMIC CPU Get Name) -match 'Intel') { $Intel = $true } else { $Intel = $false }

function Normailze {
    param (
        [parameter(position = 1)]$FileName,
        [parameter(position = 2)]$Offset,
        [parameter(position = 3)]$Length
    )
    $Target = 'loudnorm=I=-23.0:LRA=+7.0:tp=-1.0'
    $Length = $Length + 5
    $AudioArg = "-y -hide_banner -ss $($Offset) -t $($Length) -i $($DownloadFolder)/$($FileName).mp4 -af $($Target):print_format=json -f null -"
    $AudioInfo = "$($DownloadFolder)/$($FileName).log"
    Write-Host "$(Get-Date -Format 'MM/dd HH:mm:ss') - 分析 $($FileName) 音频数据" -ForegroundColor Green
    Start-Process -NoNewWindow -Wait -FilePath 'ffmpeg.exe' -RedirectStandardError $AudioInfo -ArgumentList $AudioArg
    $AudioData = Get-Content -Path $AudioInfo | Select-Object -Last 12 | ConvertFrom-Json
    Write-Debug "$(Get-Date -Format 'MM/dd HH:mm:ss') - $($AudioData)"
    $Source = "measured_I=$($AudioData.input_i):measured_LRA=$($AudioData.input_lra):measured_tp=$($AudioData.input_tp):measured_thresh=$($AudioData.input_thresh):offset=$($AudioData.target_offset)"
    Write-Debug "$(Get-Date -Format 'MM/dd HH:mm:ss') - $($Source)"
    if ($Nvdia) {
        # Nvidia CUDA
        Write-Debug "$(Get-Date -Format 'MM/dd HH:mm:ss') - 使用 Nvidia CUDA 加速转码"
        $VideoArg = -join @(
            "-y -hide_banner -loglevel error -ss $($Offset) -t $($Length) -hwaccel_output_format cuda -c:v h264_cuvid "
            "-i $($DownloadFolder)/$($FileName).mp4 "
            "-vf scale='ceil((min(1,gt(iw,1920)+gt(ih,1080))*(gte(a,1920/1080)*1920+lt(a,1920/1080)*((1080*iw)/ih))+not(min(1,gt(iw,1920)+gt(ih,1080)))*iw)/2)*2:ceil((min(1,gt(iw,1920)+gt(ih,1080))*(lte(a,1920/1080)*1080+gt(a,1920/1080)*((1920*ih)/iw))+not(min(1,gt(iw,1920)+gt(ih,1080)))*ih)/2)*2' "
            "-af $($Target):print_format=summary:linear=true:$($Source) -ar 48000 "
            "-c:v h264_nvenc -b:v 10M -c:a aac -b:a 320k -r 30 $($FootageFolder)/$($FileName).mp4"
        )
    } elseif ($Intel) {
        # Intel QSV
        Write-Debug "$(Get-Date -Format 'MM/dd HH:mm:ss') - 使用 Intel QSV 加速转码"
        $VideoArg = -join @(
            "-y -hide_banner -loglevel error -ss $($Offset) -t $($Length) -init_hw_device qsv=hw -filter_hw_device hw "
            "-i $($DownloadFolder)/$($FileName).mp4 -vf hwupload=extra_hw_frames=64,format=qsv "
            "-vf scale='ceil((min(1,gt(iw,1920)+gt(ih,1080))*(gte(a,1920/1080)*1920+lt(a,1920/1080)*((1080*iw)/ih))+not(min(1,gt(iw,1920)+gt(ih,1080)))*iw)/2)*2:ceil((min(1,gt(iw,1920)+gt(ih,1080))*(lte(a,1920/1080)*1080+gt(a,1920/1080)*((1920*ih)/iw))+not(min(1,gt(iw,1920)+gt(ih,1080)))*ih)/2)*2' "
            "-af $($Target):print_format=summary:linear=true:$($Source) -ar 48000 "
            "-c:v h264_qsv -b:v 10M -c:a aac -b:a 320k -r 30 $($FootageFolder)/$($FileName).mp4"
        )
    } else {
        # x264
        Write-Debug "$(Get-Date -Format 'MM/dd HH:mm:ss') - 使用 CPU x264 转码"
        $VideoArg = -join @(
            "-y -hide_banner -loglevel error -ss $($Offset) -t $($Length) -i $($DownloadFolder)/$($FileName).mp4 "
            "-vf scale='ceil((min(1,gt(iw,1920)+gt(ih,1080))*(gte(a,1920/1080)*1920+lt(a,1920/1080)*((1080*iw)/ih))+not(min(1,gt(iw,1920)+gt(ih,1080)))*iw)/2)*2:ceil((min(1,gt(iw,1920)+gt(ih,1080))*(lte(a,1920/1080)*1080+gt(a,1920/1080)*((1920*ih)/iw))+not(min(1,gt(iw,1920)+gt(ih,1080)))*ih)/2)*2' "
            "-af $($Target):print_format=summary:linear=true:$($Source) -ar 48000 "
            "-c:v libx264 -b:v 10M -c:a aac -b:a 320k -r 30 $($FootageFolder)/$($FileName).mp4"
        )
    }
    Write-Host "$(Get-Date -Format 'MM/dd HH:mm:ss') - 截取视频并标准化音频" -ForegroundColor Green
    Start-Process -NoNewWindow -Wait -FilePath 'ffmpeg.exe' -ArgumentList $VideoArg
    Write-Host "$(Get-Date -Format 'MM/dd HH:mm:ss') - $($FileName) 操作完成`n" -ForegroundColor Green
}

function Main {
    if (!(Test-Path "$($TruePath)/FOOTAGE/No.$($RankNum)/VIDEO")) {
        New-Item -ItemType 'Directory' -Path "$($TruePath)/FOOTAGE/No.$($RankNum)/VIDEO"
    }
    $RankVideos = @()
    $LocalVideos = @()
    Get-ChildItem "$($FootageFolder)/*.mp4" | ForEach-Object { $LocalVideos += $_.BaseName }
    if ($RankNum -eq 'pickup') {
        $JsonData = Get-Content -Path 'pickup.json'
    } else {
        $JsonData = Get-Content -Path "$($DataFolder)/$($RankNum)期数据.json"
    }
    $JsonData | ConvertFrom-Json | ForEach-Object {
        if ($_.rank -le 0) {
            $RankVideos += @{n = "av$($_.av)"; o = $_.offset; l = 40 }
        } elseif ($_.rank -le 3) {
            $RankVideos += @{n = "av$($_.av)"; o = $_.offset; l = 70 }
        } elseif ($_.rank -le 20) {
            $RankVideos += @{n = "av$($_.av)"; o = $_.offset; l = 20 }
        } elseif ($_.rank -ge 1000) {
            $RankVideos += @{n = "av$($_.av)"; o = $_.offset; l = 40 }
        }
    }
    $RankVideos | ForEach-Object {
        if (($LocalVideos -notcontains $_.n) -or ((Get-Item "$($FootageFolder)/$($_.n).mp4").length -eq 0)) {
            Normailze $_.n $_.o $_.l # -Debug
        } else {
            Write-Host "$(Get-Date -Format 'MM/dd HH:mm:ss') - $($_.n) 已存在，跳过处理" -ForegroundColor Green
        }
        
    }

    Add-Type -AssemblyName Microsoft.VisualBasic
    Get-ChildItem "$($DownloadFolder)/*.log" | ForEach-Object {
        [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile(
            "$($_)", 'OnlyErrorDialogs', 'SendToRecycleBin')
    }
}

Main