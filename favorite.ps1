param (
    [string]$RankNum = [Math]::Floor(((Get-Date).ToFileTime() / 10000000 - 11644473600 - 1428681600) / 3600 / 24 / 7)
)
$ProgressPreference = 'SilentlyContinue'
$Session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$Cookie = Get-Content -Path './cookies.txt'
$Cookie | ForEach-Object {
    if (!$_.StartsWith('#') -and $_.StartsWith('.bilibili.com')) {
        $Single = $_.Split("`t")
        $SingleCookie = New-Object System.Net.Cookie
        $SingleCookie.Name = $Single[5]
        $SingleCookie.Value = $Single[6]
        $SingleCookie.Domain = "member$($Single[0])"
        $Session.Cookies.Add($SingleCookie)
    }
}
$Headers = @{
    'Accept'           = 'application/json, text/javascript, */*; q=0.01'
    'Accept-Language'  = 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2'
    'Accept-Encoding'  = 'gzip, deflate, br'
    'X-Requested-With' = 'XMLHttpRequest'
    'DNT'              = '1'
    'Connection'       = 'keep-alive'
    'Referer'          = 'https://member.bilibili.com/platform/upload-manager/article'
    'Sec-Fetch-Dest'   = 'empty'
    'Sec-Fetch-Mode'   = 'cors'
    'Sec-Fetch-Site'   = 'same-origin'
    'TE'               = 'trailers'
}
$Headers.Add('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0')
function AddFavourite {
    param (
        [parameter(position = 1)]$FID,
        [parameter(position = 2)]$AVID
    )
    $Session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $Cookie = Get-Content -Path './cookies.txt'
    $CookieString = ''
    $Cookie | ForEach-Object {
        if (!$_.StartsWith('#') -and $_.StartsWith('.bilibili.com')) {
            $Single = $_.Split("`t")
            $SingleCookie = New-Object System.Net.Cookie
            $SingleCookie.Name = $Single[5]
            $SingleCookie.Value = $Single[6]
            $SingleCookie.Domain = $Single[0]
            $CookieString += "$($Single[5])=$($Single[6]); "
            $Session.Cookies.Add($SingleCookie)
        }
    }
    $Headers = @{}
    $Headers.Add('Cookie', $CookieString)
    $Headers.Add('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:65.0) Gecko/20100101 Firefox/65.0')
    $Headers.Add('Referer', 'https://www.bilibili.com')

    $CSRF = $Session.Cookies.GetCookies('https://www.bilibili.com')['bili_jct'].Value
    $Params = @{
        'rid'           = $AVID
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
    $Result = (Invoke-WebRequest -Uri 'https://api.bilibili.com/x/v3/fav/resource/deal' -Method 'POST' -Headers $Headers -Body $Params).Content | ConvertFrom-Json
    Write-Host $Result
}

$FIDData = @{}
$FIDList = (Invoke-WebRequest -Uri 'https://api.bilibili.com/x/v3/fav/folder/created/list-all?up_mid=398300398&jsonp=jsonp' -Headers $Headers).Content | ConvertFrom-Json
$FIDList.data.list | ForEach-Object {
    $FIDData[$_.title] = $_.id
}

$Body = @{
    'status'      = 'is_pubing,pubed,not_pubed'
    'pn'          = '1'
    'ps'          = '10'
    'keyword'     = "周刊MAD排行榜No.$($RankNum)"
    'coop'        = '1'
    'interactive' = '1'
}
$Self = (Invoke-WebRequest -Uri 'https://member.bilibili.com/x/web/archives' -Headers $Headers -Body $Body -WebSession $Session).Content | ConvertFrom-Json
Write-Host $Self.data.arc_audits[0].Archive.bvid
AddFavourite $FIDData['MAD 合集'] $Self.data.arc_audits[0].Archive.aid
Start-Sleep -Seconds 1

$RankVideos = Get-Content "./$($RankNum)_rankdoor.csv" | ConvertFrom-Csv -Header 'rank', 'av'

$First = $RankVideos | Where-Object rank -EQ 1 | Select-Object -ExpandProperty av
Write-Host $First.Substring(2)
AddFavourite $FIDData['MAD 一位'] $First.Substring(2)
Start-Sleep -Seconds 1

$Old = $RankVideos | Where-Object rank -EQ '旧作' | Select-Object -ExpandProperty av
$Old | ForEach-Object {
    Write-Host $_.Substring(2)
    AddFavourite $FIDData['MAD 旧作推荐'] $_.Substring(2)
    Start-Sleep -Seconds 1
}

$New = $RankVideos | Where-Object rank -EQ '新作' | Select-Object -ExpandProperty av
$New | ForEach-Object {
    Write-Host $_.Substring(2)
    AddFavourite $FIDData['MAD 新作推荐'] $_.Substring(2)
    Start-Sleep -Seconds 1
}