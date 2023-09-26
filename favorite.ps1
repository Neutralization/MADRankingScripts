param (
    [string]$RankNum = [Math]::Floor(((Get-Date).ToFileTime() / 10000000 - 11644473600 - 1428681600) / 3600 / 24 / 7)
)
$ProgressPreference = 'SilentlyContinue'

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
            $Session.Cookies.Add($SingleCookie);
        }
    }
    $Headers = @{}
    $Headers.Add('Cookie', $CookieString)
    $Headers.Add('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:65.0) Gecko/20100101 Firefox/65.0')
    $Headers.Add('Referer', 'https://www.bilibili.com')

    $CSRF = $Session.Cookies.GetCookies('https://www.bilibili.com')['bili_jct'].Value
    $Params = @{rid = $AVID; type = 2; add_media_ids = $FID; del_media_ids = ''; jsonp = 'jsonp'; csrf = $CSRF; platform = 'web' }
    $Result = (Invoke-WebRequest -Uri 'https://api.bilibili.com/x/v3/fav/resource/deal' -Method 'POST' -Headers $Headers -Body $Params).Content | ConvertFrom-Json
    Write-Host $Result
}

$FIDData = @{}
$FIDList = (Invoke-WebRequest -Uri 'https://api.bilibili.com/x/v3/fav/folder/created/list-all?up_mid=398300398&jsonp=jsonp' -Headers $Headers).Content | ConvertFrom-Json
$FIDList.data.list | ForEach-Object {
    $FIDData[$_.title] = $_.id
}

$Self = (Invoke-WebRequest -Uri "https://api.bilibili.com/x/space/wbi/arc/search?mid=398300398&ps=30&tid=0&pn=1&keyword=%E5%91%A8%E5%88%8AMAD%E6%8E%92%E8%A1%8C%E6%A6%9CNo.$($RankNum)&order=pubdate&platform=web" -Headers $Headers).Content | ConvertFrom-Json
Write-Host $Self.data.list.vlist[0].bvid
AddFavourite $FIDData['MAD 合集'] $Self.data.list.vlist[0].aid
Start-Sleep -Seconds 1

$RankVideos = Get-Content './rankdoor.csv' | ConvertFrom-Csv -Header 'rank', 'av'

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