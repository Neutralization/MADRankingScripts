# MADRankingScripts

涉及周刊 MAD 排行榜制作相关的脚本

## 流程简述

1. 由神秘的 bilibiliran 提供周刊所需数据
2. 执行 `tojson.py` 生成供 AE 读取的 json 文件
3. 选取周榜中所展示的视频片段，在 json 文件中记录素材片段起始时间
4. 执行 `toimg.py` 生成视频标题的图片素材（文本图层 Unicode 支持问题）
5. 打开任意一期工程文件, 执行脚本 `change.jsx` 生成新一期工程，导出渲染
6. 执行 `timestamp.py` 提交播放器分段章节

## Todo

- [ ] 重构1080P工程
