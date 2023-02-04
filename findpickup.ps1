Get-ChildItem ".\VIDEO\" | Where-Object { $_.Extension -in ".mp4" } | ForEach-Object {
    ffmpeg -y -hide_banner -ss 00:04:00 -i ".\VIDEO\$($_.BaseName).mp4" -f image2 -r 0.1 -t 07:00 ".\VIDEO\$($_.BaseName)_%03d.jpg"
    python .\findpickup.py "$($_.BaseName)"
}
python .\toocr.py