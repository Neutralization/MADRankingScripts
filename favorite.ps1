param (
    [string]$RankNum = [Math]::Floor(
        ((Get-Date).ToFileTime() / 10000000 - 11644473600 - 1428681600) / 3600 / 24 / 7)
)
$ProgressPreference = 'SilentlyContinue'
$TruePath = Split-Path $MyInvocation.MyCommand.Path
$CookieFile = "$($TruePath)/cookies.txt"
$StampFile = "$($TruePath)/DATA/stamp.json"
$ReplyFile = "$($TruePath)/$($RankNum)_rankdoor.csv"
$UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0'
$Session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$Session.UserAgent = $UserAgent
if (Test-Path $CookieFile) {
    $Cookies = Get-Content -Path $CookieFile
    $Cookies | ForEach-Object {
        if (!$_.StartsWith('#') -and $_.StartsWith('.bilibili.com')) {
            $Cookie = $_.Split("`t")
            $Name = $Cookie[5]
            $Value = $Cookie[6]
            $Path = $Cookie[2]
            $Domain = $Cookie[0]
            $Session.Cookies.Add((New-Object System.Net.Cookie($Name, $Value, $Path, $Domain)))
        }
    }
}
$CSRF = $Session.Cookies.GetCookies('https://www.bilibili.com')['bili_jct'].Value
$Headers = @{'User-Agent' = $UserAgent }
$MID = 398300398

function ConvertTo-AID {
    param (
        [parameter(position = 1)]$Source,
        [parameter(position = 2)]$Target = $true
    )
    # 如何看待 2020 年 3 月 23 日哔哩哔哩将稿件的「av 号」变更为「BV 号」？ - mcfx的回答 - 知乎
    # https://www.zhihu.com/question/381784377/answer/1099438784
    #
    # https://github.com/Colerar/abv
    $ALPHABET = 'FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf'.ToCharArray()
    $table = @{}
    0..57 | ForEach-Object {
        $table[$ALPHABET[$_]] = $_
    }
    $XOR_CODE = 23442827791579
    $MASK_CODE = 2251799813685247
    $MAX_AID = [Int64]1 -shl 51
    $BASE = 58
    $BV_LEN = 12

    function bv2av {
        param (
            [string]$bvid
        )
        $bv_list = $bvid.ToCharArray()
        $bv_list[3], $bv_list[9] = $bv_list[9], $bv_list[3]
        $bv_list[4], $bv_list[7] = $bv_list[7], $bv_list[4]
        $tmp = 0
        foreach ($char in $bv_list[3..$BV_LEN]) {
            $idx = $table[$char]
            $tmp = $tmp * $BASE + $idx
        }
        $avid = ($tmp -band $MASK_CODE) -bxor $XOR_CODE
        return $avid
    }
    function av2bv {
        param (
            [string]$avid
        )
        $bv_list = 'BV1000000000'.ToCharArray()
        $bv_idx = $BV_LEN - 1
        $tmp = ($MAX_AID -bor $avid) -bxor $XOR_CODE
        while ($tmp -ne 0) {
            $bv_list[$bv_idx] = $ALPHABET[$tmp % $BASE]
            $tmp = [Math]::Truncate($tmp / $BASE)
            $bv_idx -= 1
        }
        $bv_list[3], $bv_list[9] = $bv_list[9], $bv_list[3]
        $bv_list[4], $bv_list[7] = $bv_list[7], $bv_list[4]
        return -join $bv_list
    }
    if ($Target) {
        return bv2av $Source
    } else {
        return av2bv $Source
    }
}

function Add-TimeStamp {
    param (
        [parameter(position = 1)]$AVID
    )
    $AID = $AVID.Substring(2)
    $Body = @{
        'aid' = $AID
    }
    $Result = (
        Invoke-WebRequest -Uri 'https://api.bilibili.com/x/web-interface/view' `
            -Headers $Headers `
            -Body $Body
    ).Content | ConvertFrom-Json
    if ($Result.message -ne 0) {
        Write-Host $Result.message
        return 1
    } else {
        $CID = $Result.data.pages[0].cid
        Write-Host "取得视频 CID $($CID)"
    }
    $Stamp = Get-Content $StampFile -Encoding 'UTF-8'
    $StampString = $Stamp | ConvertFrom-Json | ConvertTo-Json -Compress
    Write-Debug $StampString
    $Body = @{
        'aid'       = $AID
        'cid'       = $CID
        'type'      = '2'
        'cards'     = $StampString
        'permanent' = 'false'
        'csrf'      = $CSRF
    }
    $Result = (
        Invoke-WebRequest -Uri 'https://member.bilibili.com/x/web/card/submit' `
            -Method Post `
            -WebSession $Session `
            -Headers $Headers `
            -ContentType 'application/x-www-form-urlencoded' `
            -Body $Body
    ).Content | ConvertFrom-Json
    if ($Result.message -ne 0) {
        Write-Host $Result.message
        return 1
    } else {
        Write-Host '添加视频分段章节成功'
    }
}

function Get-FIDList {
    $FIDData = @{}
    $Result = (
        Invoke-WebRequest -Uri "https://api.bilibili.com/x/v3/fav/folder/created/list-all?up_mid=$($MID)&jsonp=jsonp" `
            -Headers $Headers
    ).Content | ConvertFrom-Json
    $Result.data.list | ForEach-Object {
        $FIDData[$_.title] = $_.id
    }
    return $FIDData
}

function Get-SelfAID {
    $Body = @{
        'status'      = 'is_pubing,pubed,not_pubed'
        'pn'          = '1'
        'ps'          = '10'
        'keyword'     = "周刊MAD排行榜No.$($RankNum)"
        'coop'        = '1'
        'interactive' = '1'
    }
    $Result = (
        Invoke-WebRequest -Uri 'https://member.bilibili.com/x/web/archives' `
            -WebSession $Session `
            -Headers $Headers `
            -Body $Body
    ).Content | ConvertFrom-Json
    Write-Host "周刊MAD排行榜No.$($RankNum) - $($Result.data.arc_audits[0].Archive.bvid)"
    $SelfAID = "av$($Result.data.arc_audits[0].Archive.aid)"
    return $SelfAID
}

function Add-Favourite {
    param (
        [parameter(position = 1)]$FID,
        [parameter(position = 2)]$AVID
    )
    if ($AVID -match '^[aA]') {
        $AID = $AVID.Substring(2)
    } else {
        $AID = ConvertTo-AID $AVID $true
    }
    $Body = @{
        'rid'           = $AID
        'type'          = '2'
        'add_media_ids' = $FID
        'del_media_ids' = ''
        'platform'      = 'web'
        'eab_x'         = '2'
        'ramval'        = '0'
        'ga'            = '1'
        'gaia_source'   = 'web_normal'
        'csrf'          = $CSRF
    }
    $Result = (
        Invoke-WebRequest -Uri 'https://api.bilibili.com/x/v3/fav/resource/deal' `
            -Method POST `
            -WebSession $Session `
            -Headers $Headers `
            -Body $Body
    ).Content | ConvertFrom-Json
    if ($Result.message -ne 0) {
        Write-Host $Result.message
        return 1
    } else {
        Write-Host "收藏视频 av$($AID) 成功"
    }
}

function Get-Ranking {
    param (
        [parameter(position = 1)]$Part
    )
    $RankVideos = Get-Content $ReplyFile | ConvertFrom-Csv -Header 'rank', 'av'
    $First = $RankVideos | Where-Object rank -EQ $Part | Select-Object -ExpandProperty av
    return $First
}

function Set-TopReply {
    param (
        [parameter(position = 1)]$AVID,
        [parameter(position = 2)]$RPID
    )
    $AID = $AVID.Substring(2)
    $Body = @{
        'oid'    = $AID
        'type'   = '1'
        'rpid'   = $RPID
        'action' = '1'
        'csrf'   = $CSRF
    }
    $Result = (
        Invoke-WebRequest -Uri 'https://api.bilibili.com/x/v2/reply/top' `
            -Method Post `
            -WebSession $Session `
            -Headers $Headers `
            -ContentType 'application/x-www-form-urlencoded' `
            -Body $Body
    ).Content | ConvertFrom-Json
    if ($Result.message -ne 0) {
        Write-Host $Result.message
        return 1
    } else {
        Write-Host "评论置顶成功`nhttps://www.bilibili.com/video/av$($AID)#reply$($RPID)"
    }
}

function Add-Reply {
    param (
        [parameter(position = 1)]$AVID,
        [parameter(position = 2)]$Parent,
        [parameter(position = 3)]$Message
    )
    $AID = $AVID.Substring(2)
    $Body = @{
        'plat'           = '1'
        'oid'            = $AID
        'type'           = '1'
        'message'        = $Message
        'root'           = $Parent
        'parent'         = $Parent
        'at_name_to_mid' = '{}'
        'gaia_source'    = 'main_web'
        'csrf'           = $CSRF
        'statistics'     = "{'appId':100,'platform':5}"
    }
    $Result = (
        Invoke-WebRequest -Uri 'https://api.bilibili.com/x/v2/reply/add' `
            -Method Post `
            -WebSession $Session `
            -Headers $Headers `
            -ContentType 'application/x-www-form-urlencoded' `
            -Body $Body
    ).Content | ConvertFrom-Json
    if ($Result.message -ne 0) {
        Write-Host $Result.message
        return 1
    } else {
        $RPID = $Result.data.rpid
        Write-Host "评论发送成功`nhttps://www.bilibili.com/video/av$($AID)#reply$($RPID)"
        return $RPID
    }
}

function Get-RankList {
    function Join-RankList {
        param (
            [array]$LineList
        )
        $Strings = @()
        $LineList | ForEach-Object {
            if ($null -eq $_.Split(',')[1]) {
                $CurrentLine = "$($_.Split(',')[0])"
            } else {
                $CurrentLine = "$($_.Split(',')[0])`t$($_.Split(',')[1])"
            }
            $Strings += $CurrentLine
        }
        $RankString = $Strings -join "`n"
        return $RankString
    }

    $SplitList = Get-Content $ReplyFile -Encoding 'UTF8BOM'
    $RankList = Join-RankList $SplitList
    return $RankList
}

function Set-MasterPiece {
    param (
        [parameter(position = 1)]$AVID
    )
    $AID = $AVID.Substring(2)
    $Body = @{
        'vmid' = $MID
    }
    $Result = (
        Invoke-WebRequest -Uri 'https://api.bilibili.com/x/space/masterpiece' `
            -Body $Body `
            -WebSession $Session `
            -Headers $Headers
    ).Content | ConvertFrom-Json
    if ($Result.message -ne 0) {
        Write-Host $Result.message
        return 1
    } else {
        $BeforeAID = $Result.data | Where-Object -Property 'title' -Like '*周刊MAD排行榜*' | Select-Object -ExpandProperty 'aid'
        if ($null -eq $BeforeAID) {
            Write-Host '目前没有代表作'
        } else {
            Write-Host "目前代表作 av$($BeforeAID)"
            $Body = @{
                'aid'  = $BeforeAID
                'csrf' = $CSRF
            }
            $Result = (
                Invoke-WebRequest -Uri 'https://api.bilibili.com/x/space/masterpiece/cancel' `
                    -Method Post `
                    -WebSession $Session `
                    -Headers $Headers `
                    -ContentType 'application/x-www-form-urlencoded' `
                    -Body $Body
            ).Content | ConvertFrom-Json
            if ($Result.message -ne 0) {
                Write-Host $Result.message
                return 1
            } else {
                Write-Host "取消代表作 av$($BeforeAID) 成功"
            }
        }
        $Body = @{
            'aid'  = $AID
            'csrf' = $CSRF
        }
        $Result = (
            Invoke-WebRequest -Uri 'https://api.bilibili.com/x/space/masterpiece/add' `
                -Method Post `
                -WebSession $Session `
                -Headers $Headers `
                -ContentType 'application/x-www-form-urlencoded' `
                -Body $Body
        ).Content | ConvertFrom-Json
        if ($Result.message -ne 0) {
            Write-Host $Result.message
            return 1
        } else {
            Write-Host "设置新代表作 av$($AID) 成功"
        }
    }
}

function Main {
    $FIDData = Get-FIDList
    $SelfAID = Get-SelfAID
    Add-TimeStamp $SelfAID
    Add-Favourite $FIDData['MAD 合集'] $SelfAID
    $Top1 = Get-Ranking 1
    Add-Favourite $FIDData['MAD 一位'] $Top1
    Get-Ranking '旧作' | ForEach-Object {
        Add-Favourite $FIDData['MAD 旧作推荐'] $_
    }
    Get-Ranking '新作' | ForEach-Object {
        Add-Favourite $FIDData['MAD 新作推荐'] $_
    }
    Set-MasterPiece $SelfAID
    $RankList = Get-RankList
    $ROOT = Add-Reply $SelfAID '0' $RankList
    Start-Sleep -Seconds 1
    Set-TopReply $SelfAID $ROOT
}

Main