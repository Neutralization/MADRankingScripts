// @include 'json2/json2.js';
app.beginUndoGroup("Update Everything")
file = new File('378期数据.json');
file.open('r');
content = file.read();
file.close();
AllData = JSON.parse(content);

CoverSize = [154, 96]
PartSize = [1030, 570]
CompSize = [1280, 720]
CompFPS = 30

function AddAudioProperty(Target, Ptype, Duration, Offset, Direction) {
    NewProperty = Target.property('Audio Levels');
    if (Ptype == 1) {
        // 1/4 circle
        if (Direction == 1) {
            // fade in
            for (t = Offset; t <= Offset + Duration; t += Duration / CompFPS) {
                NewProperty.setValueAtTime(t, [
                    (Math.sqrt(1 - Math.pow(1 - (t - Offset) / Duration, 2)) - 1) * 50,
                    (Math.sqrt(1 - Math.pow(1 - (t - Offset) / Duration, 2)) - 1) * 50,
                ]);
            }
            NewProperty.setValueAtTime(Offset, [-Infinity, -Infinity]);
        }
        if (Direction == 2) {
            // fade out
            for (t = Offset; t <= Offset + Duration; t += Duration / CompFPS) {
                NewProperty.setValueAtTime(t, [
                    (Math.sqrt(1 - Math.pow((t - Offset) / Duration, 2)) - 1) * 50,
                    (Math.sqrt(1 - Math.pow((t - Offset) / Duration, 2)) - 1) * 50,
                ]);
            }
            NewProperty.setValueAtTime(Offset + Duration, [-Infinity, -Infinity]);
        }
    }
    if (Ptype == 2) {
        // sin
        if (Direction == 1) {
            // fade in
            for (t = Offset; t <= Offset + Duration; t += Duration / CompFPS) {
                NewProperty.setValueAtTime(t, [
                    ((Math.cos((Math.PI * (t - Offset)) / Duration) + 1) / 2) * -50,
                    ((Math.cos((Math.PI * (t - Offset)) / Duration) + 1) / 2) * -50,
                ]);
            }
            NewProperty.setValueAtTime(Offset, [-Infinity, -Infinity]);
        }
        if (Direction == 2) {
            // fade out
            for (t = Offset; t <= Offset + Duration; t += Duration / CompFPS) {
                NewProperty.setValueAtTime(t, [
                    ((Math.cos((Math.PI * (t - Offset)) / Duration + Math.PI) + 1) / 2) * -50,
                    ((Math.cos((Math.PI * (t - Offset)) / Duration + Math.PI) + 1) / 2) * -50,
                ]);
            }
            NewProperty.setValueAtTime(Offset + Duration, [-Infinity, -Infinity]);
        }
    }
    return NewProperty;
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

for (i = 0; i < 20; i++) {
    FileFullPath = './VIDEO/av' + AllData[i]["av"] + '.mp4'
    FootageFile = new ImportOptions(File(FileFullPath));
    FootageFile.ImportAs = ImportAsType.FOOTAGE;
    FileItem = app.project.importFile(FootageFile);
    FileItem.name = AllData[i]["av"];
}

for (i = 20; i < 100; i++) {
    FileFullPath = './COVER/' + AllData[i]["rank"] + '_av' + AllData[i]["av"] + '.jpg'
    FootageFile = new ImportOptions(File(FileFullPath));
    FootageFile.ImportAs = ImportAsType.FOOTAGE;
    FileItem = app.project.importFile(FootageFile);
    FileItem.name = AllData[i]["rank"] + '_av' + AllData[i]["av"];
}

ResourceID = {};
for (n = 1; n <= app.project.items.length; n++) {
    ResourceID[app.project.items[n].name] = n;
}

for (i = 19; i >= 0; i--) {
    // alert('TEXT-UI ' + (i + 1));
    // alert(AllData[i]["title"]);
    TEXTCompName = 'TEXT-UI ' + (i + 1);
    TEXTComp = app.project.items[ResourceID[TEXTCompName]];
    datadict = {
        6: "分",
        7: "藏",
        8: "弹",
        9: "评",
        10: "点",
        13: "rank",
        14: "pubdate",
        15: "title",
        16: "up",
        17: "av",
    }
    // 总分
    TEXTComp.layer(6).property('Source Text').expression = 'text.sourceText="' + numberWithCommas(AllData[i]["分"]) + '";';
    // 收藏
    TEXTComp.layer(7).property('Source Text').expression = 'text.sourceText="' + numberWithCommas(AllData[i]["藏"]) + '";';
    // 弹幕
    TEXTComp.layer(8).property('Source Text').expression = 'text.sourceText="' + numberWithCommas(AllData[i]["弹"]) + '";';
    // 评论
    TEXTComp.layer(9).property('Source Text').expression = 'text.sourceText="' + numberWithCommas(AllData[i]["评"]) + '";';
    // 播放
    TEXTComp.layer(10).property('Source Text').expression = 'text.sourceText="' + numberWithCommas(AllData[i]["点"]) + '";';
    // 排名
    TEXTComp.layer(13).property('Source Text').expression = 'text.sourceText="' + AllData[i]["rank"] + '";';
    // 日期
    TEXTComp.layer(14).property('Source Text').expression = 'text.sourceText="' + AllData[i]["pubdate"] + '";';
    // 标题
    TEXTComp.layer(15).property('Source Text').expression = 'text.sourceText="' + AllData[i]["title"] + '";';
    // UP
    TEXTComp.layer(16).property('Source Text').expression = 'text.sourceText="' + AllData[i]["up"] + '";';
    // ID
    TEXTComp.layer(17).property('Source Text').expression = 'text.sourceText="' + AllData[i]["av"] + '";';

    if (i + 1 < 4) {
        UICompName = 'UI-TOP' + (i + 1);
    } else {
        UICompName = 'UI ' + (i + 1);
    }
    UIComp = app.project.items[ResourceID[UICompName]];
    MatteLayer = UIComp.layer(36)
    VideoLayer = UIComp.layers.add(app.project.items[ResourceID[AllData[i]["av"]]], 30)
    delay = 0
    if (i + 1 < 4) {
        delay = 2 + 7 / CompFPS
        FullVideoLayer = UIComp.layers.add(app.project.items[ResourceID[AllData[i]["av"]]], 70)
        FullVideoLayer.startTime = 1 - AllData[i]["offset"] + delay;
        FullVideoLayer.inPoint = 1
        FullVideoLayer.outPoint = 72 + delay
        OrigSize = FullVideoLayer.sourceRectAtTime(FullVideoLayer.inPoint, false);
        if (OrigSize.width / OrigSize.height >= 16 / 9) {
            FullVideoLayer.property('Scale').setValue([
                (CompSize[0] / OrigSize.width) * 100,
                (CompSize[0] / OrigSize.width) * 100,
            ]);
        } else {
            FullVideoLayer.property('Scale').setValue([
                (CompSize[1] / OrigSize.height) * 100,
                (CompSize[1] / OrigSize.height) * 100,
            ]);
        }
        FullVideoLayer.property('Position').setValue([640, 360]);
        FullVideoLayer.property('Opacity').setValueAtTime(FullVideoLayer.inPoint + 21 - 1 / CompFPS, 0)
        FullVideoLayer.property('Opacity').setValueAtTime(FullVideoLayer.inPoint + 21, 100)
        FullVideoLayer.property('Opacity').setValueAtTime(UIComp.duration - 3, 100)
        FullVideoLayer.property('Opacity').setValueAtTime(UIComp.duration, 0)
        AddAudioProperty(FullVideoLayer, 1, 1, FullVideoLayer.inPoint, 1);
        AddAudioProperty(FullVideoLayer, 1, 3, UIComp.duration - 3, 2);
    }
    VideoLayer.startTime = 1 - AllData[i]["offset"] + delay;
    VideoLayer.inPoint = 0.5 + delay
    VideoLayer.outPoint = 22 + delay
    VideoLayer.moveAfter(MatteLayer)
    VideoLayer.trackMatteType = TrackMatteType.ALPHA
    OrigSize = VideoLayer.sourceRectAtTime(VideoLayer.inPoint, false);
    if (OrigSize.width / OrigSize.height >= 16 / 9) {
        VideoLayer.property('Scale').setValue([
            (PartSize[0] / OrigSize.width) * 100,
            (PartSize[0] / OrigSize.width) * 100,
        ]);
    } else {
        VideoLayer.property('Scale').setValue([
            (PartSize[1] / OrigSize.height) * 100,
            (PartSize[1] / OrigSize.height) * 100,
        ]);
    }
    VideoLayer.property('Position').setValue([739, 334]);
    if (i + 1 < 4) {
        VideoLayer.audioEnabled = false;
    } else {
        AddAudioProperty(VideoLayer, 1, 1, VideoLayer.inPoint, 1);
        AddAudioProperty(VideoLayer, 1, 1, VideoLayer.outPoint - 1.5, 2);
    }
}

for (i = 1; i < 4; i++) {
    TopCompName = 'TOP' + i + '-3';
    TopComp = app.project.items[ResourceID[TopCompName]];
    TopComp.layer(3).property('Source Text').expression = 'text.sourceText="' + i + '";';
    TopComp.layer(2).property('Source Text').expression = 'text.sourceText="' + numberWithCommas(AllData[i]["分"] - AllData[i + 1]["分"]) + '";';
}
app.endUndoGroup()
app.beginUndoGroup("Update SUBthing")
for (i = 1; i <= 16; i++) {
    SUBCompName = 'SUBRANK ' + i;
    SUBComp = app.project.items[ResourceID[SUBCompName]];
    for (l = 1; l <= 5; l++) {
        // id
        SUBComp.layer(l + 0).property('Source Text').expression = 'text.sourceText="' + AllData[19 + (i - 1) * 5 + l]["av"] + '";';
        // 日期
        SUBComp.layer(l + 5).property('Source Text').expression = 'text.sourceText="' + AllData[19 + (i - 1) * 5 + l]["pubdate"] + '";';
        // 排名
        SUBComp.layer(l + 10).property('Source Text').expression = 'text.sourceText="' + AllData[19 + (i - 1) * 5 + l]["rank"] + '";';
        // 标题
        SUBComp.layer(l + 15).property('Source Text').expression = 'text.sourceText="' + AllData[19 + (i - 1) * 5 + l]["title"] + '";';
        // UP
        SUBComp.layer(l + 20).property('Source Text').expression = 'text.sourceText="' + AllData[19 + (i - 1) * 5 + l]["up"] + '";';
        // 总分
        SUBComp.layer(l + 25).property('Source Text').expression = 'text.sourceText="' + numberWithCommas(AllData[19 + (i - 1) * 5 + l]["分"]) + '";';
        // 排名
        SUBComp.layer(l + 30).property('Source Text').expression = 'text.sourceText="null";';
    }
    for (l = 1; l <= 5; l++) {
        CoverName = AllData[19 + (i - 1) * 5 + l]["rank"] + '_av' + AllData[19 + (i - 1) * 5 + l]["av"]
        CoverLayer = SUBComp.layers.add(app.project.items[ResourceID[CoverName]], 6)
        CoverLayer.property('Position').setValue([1176.5, 95 + (l - 1) * 142])
        OrigSize = CoverLayer.sourceRectAtTime(CoverLayer.inPoint, false);
        if (OrigSize.width / OrigSize.height >= 16 / 9) {
            CoverLayer.property('Scale').setValue([
                (CoverSize[0] / OrigSize.width) * 100,
                (CoverSize[0] / OrigSize.width) * 100,
            ]);
        } else {
            CoverLayer.property('Scale').setValue([
                (CoverSize[1] / OrigSize.height) * 100,
                (CoverSize[1] / OrigSize.height) * 100,
            ]);
        }
    }
}
app.endUndoGroup()