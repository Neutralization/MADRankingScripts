# MADRankingScripts

涉及周刊 MAD 排行榜制作相关的脚本

## 工作环境 (Windows 10/11)

- [Adobe After Effects](https://www.adobe.com/products/aftereffects.html)
    > 支持版本 CS6 ~ 2026  
    需要在 AE 首选项中打开`允许脚本写入文件和访问网络`  
- [Adobe Media Encoder](https://www.adobe.com/products/media-encoder.html) / [Voukoder](https://www.voukoder.org/forum/thread/783-downloads-instructions/)
- [aria2c](https://aria2.github.io/) / [FFmpeg](https://ffmpeg.org/)
    > [winget](https://github.com/microsoft/winget-cli) install aria2.aria2 Gyan.FFmpeg  
    > 其他方式需添加 `aria2c` `ffmpeg` 路径到系统 `$PATH` 变量  
- [PowerShell](https://docs.microsoft.com/zh-cn/powershell/)
    > 安装 [powershell-yaml](https://www.powershellgallery.com/packages/powershell-yaml) 模块  
    > Install-Module -Name powershell-yaml  
- [Python](https://www.python.org/)
    > uv sync  
- [json2.js](https://github.com/douglascrockford/JSON-js)

## 获取 Cookie

注意使用 `Netscape HTTP Cookie File` 格式保存为 `cookies.txt`

- Chrome 安装 [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
- Edge 安装 [Export Cookies File](https://microsoftedge.microsoft.com/addons/detail/export-cookies-file/hbglikhfdcfhdfikmocdflffaecbnedo)
- Firefox 安装 [Export Cookies](https://addons.mozilla.org/en-US/firefox/addon/export-cookies-txt/)

## 流程简述

-  由神秘的 bilibiliran 提供周刊所需数据
-  执行 `tojson.py` 生成供 AE 读取的 json 文件
-  执行 `toimg.py` 生成周榜中使用到的所有图片素材
-  执行 `download.ps1` 下载周榜中使用到的所有视频素材
-  选取周榜中所展示的视频片段，在 json 文件中记录素材片段起始时间
-  执行 `normalize.ps1` 裁剪视频，同时标准化音频音量
-  启动 After Effects, 执行脚本 `change.jsx` 自动导入素材生成周刊工程文件
-  执行 `favorite.ps1` 提交播放器分段章节，添加视频到收藏夹

## Todo

- [ ] 重构1080P工程
