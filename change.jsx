// @include 'json2/json2.js';

WEEK_NUM = Math.floor((Date.now() / 1000 - 1428681600) / 3600 / 24 / 7);

app.beginUndoGroup('Update Everything');
for (n = 1; n <= app.project.items.length; n++) {
    if (app.project.items[n] instanceof FolderItem && app.project.items[n].name.match(/^No./g)) {
        app.project.items[n].remove();
    }
}

file = new File(WEEK_NUM + '期数据.json');
file.open('r');
content = file.read();
file.close();
AllData = JSON.parse(content);

CoverSize = [160, 100];
PartSize = [1030, 570];
CompSize = [1280, 720];
CompFPS = 30;

WeeklyFolder = app.project.items.addFolder('No.' + WEEK_NUM);

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
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

for (i = 0; i < 20; i++) {
    FileFullPath = './VIDEO/av' + AllData[i].av + '.mp4';
    FootageFile = new ImportOptions(File(FileFullPath));
    FootageFile.ImportAs = ImportAsType.FOOTAGE;
    FileItem = app.project.importFile(FootageFile);
    FileItem.name = AllData[i].av;
    FileItem.parentFolder = WeeklyFolder;
}

for (i = 20; i < 100; i++) {
    FileFullPath = './COVER/' + AllData[i].rank + '_av' + AllData[i].av + '.jpg';
    FootageFile = new ImportOptions(File(FileFullPath));
    FootageFile.ImportAs = ImportAsType.FOOTAGE;
    FileItem = app.project.importFile(FootageFile);
    FileItem.name = AllData[i].rank + '_av' + AllData[i].av;
    FileItem.parentFolder = WeeklyFolder;
}

for (i = 0; i < 106; i++) {
    if (AllData[i] != undefined) {
        FileFullPath = './TEXT/' + AllData[i].rank + '_av' + AllData[i].av + '.png';
        FootageFile = new ImportOptions(File(FileFullPath));
        FootageFile.ImportAs = ImportAsType.FOOTAGE;
        FileItem = app.project.importFile(FootageFile);
        FileItem.name = AllData[i].rank + '_TEXT';
        FileItem.parentFolder = WeeklyFolder;
    }
}

for (i = 100; i < 106; i++) {
    if (AllData[i] != undefined) {
        FileFullPath = './VIDEO/av' + AllData[i].av + '.mp4';
        FootageFile = new ImportOptions(File(FileFullPath));
        FootageFile.ImportAs = ImportAsType.FOOTAGE;
        FileItem = app.project.importFile(FootageFile);
        FileItem.name = AllData[i].av;
        FileItem.parentFolder = WeeklyFolder;
    }
}

watermark = new ImportOptions(File('./水印.png'));
watermark.ImportAs = ImportAsType.FOOTAGE;
water = app.project.importFile(watermark);
water.name = 'WaterMark';
water.parentFolder = WeeklyFolder;

ResourceID = {};
for (n = 1; n <= app.project.items.length; n++) {
    ResourceID[app.project.items[n].name] = n;
}

OPComp = app.project.items[ResourceID.OP];
OPComp.layer(8).property('Source Text').expression = 'text.sourceText="No.' + WEEK_NUM + '";';

DateComp = app.project.items[ResourceID['TEXT-03']];
today = new Date();
sdate = new Date(Date.now() - (today.getDay() + 8) * 24 * 3600 * 1000);
start = sdate.getFullYear() + '年' + (sdate.getMonth() + 1) + '月' + sdate.getDate() + '日凌晨';
edate = new Date(Date.now() - (today.getDay() + 1) * 24 * 3600 * 1000);
end = edate.getFullYear() + '年' + (edate.getMonth() + 1) + '月' + edate.getDate() + '日凌晨';
DateComp.layer(4).property('Source Text').expression = 'text.sourceText="\\n\\t\\t' + start + '——' + end + '";';

for (i = 19; i >= 0; i--) {
    TEXTCompName = 'TEXT-UI ' + (i + 1);
    TEXTComp = app.project.items[ResourceID[TEXTCompName]];
    // 总分
    TEXTComp.layer(6).property('Source Text').expression = 'text.sourceText="' + numberWithCommas(AllData[i]['分']) + '";';
    // 收藏
    TEXTComp.layer(7).property('Source Text').expression = 'text.sourceText="' + numberWithCommas(AllData[i]['藏']) + '";';
    // 弹幕
    TEXTComp.layer(8).property('Source Text').expression = 'text.sourceText="' + numberWithCommas(AllData[i]['弹']) + '";';
    // 评论
    TEXTComp.layer(9).property('Source Text').expression = 'text.sourceText="' + numberWithCommas(AllData[i]['评']) + '";';
    // 播放
    TEXTComp.layer(10).property('Source Text').expression = 'text.sourceText="' + numberWithCommas(AllData[i]['点']) + '";';
    // 排名
    TEXTComp.layer(13).property('Source Text').expression = 'text.sourceText="' + AllData[i].rank + '";';
    // 日期
    TEXTComp.layer(14).property('Source Text').expression = 'text.sourceText="' + AllData[i].pubdate + '";';
    // 标题
    // TEXTComp.layer(15).property('Source Text').expression = 'text.sourceText=\'' + AllData[i].title + '\';';
    TEXTComp.layer(15).property('Source Text').expression.enabled = false;
    TEXTComp.layer(15).enabled = false;
    if (AllData[i].title[0].match(/[\u0000-\u00FF\u4E00-\u9FA5]/g)) {
        TEXTComp.layer(15).property('Position').setValue([153, 690]);
    } else if (AllData[i].title.match(/^[\uD800-\uDBFF][\uDC00-\uDFFF]/g)) {
        TEXTComp.layer(15).property('Position').setValue([153, 690]);
    } else {
        TEXTComp.layer(15).property('Position').setValue([133, 690]);
    }
    // UP
    TEXTComp.layer(16).property('Source Text').expression = 'text.sourceText="' + AllData[i].up + '";';
    // ID
    TEXTComp.layer(17).property('Source Text').expression = 'text.sourceText="' + AllData[i].av + '";';
    // 上周排名
    TEXTComp.layer(11).property('Source Text').expression = 'text.sourceText="' + AllData[i].last + '";';
    // NEW
    if (AllData[i].last != 'null') {
        if (AllData[i].last == AllData[i].rank) {
            TEXTComp.layer(2).enabled = false;
            TEXTComp.layer(3).enabled = true;
            TEXTComp.layer(4).enabled = false;
            TEXTComp.layer(5).enabled = false;
            TEXTComp.layer(13).effect(1).enabled = false;
            TEXTComp.layer(13).effect(2).enabled = false;
            TEXTComp.layer(13).effect(3).enabled = true;
        } else if (AllData[i].last < AllData[i].rank) {
            TEXTComp.layer(2).enabled = false;
            TEXTComp.layer(3).enabled = false;
            TEXTComp.layer(4).enabled = true;
            TEXTComp.layer(5).enabled = false;
            TEXTComp.layer(13).effect(1).enabled = false;
            TEXTComp.layer(13).effect(2).enabled = true;
            TEXTComp.layer(13).effect(3).enabled = false;
        } else if (AllData[i].last > AllData[i].rank) {
            TEXTComp.layer(2).enabled = false;
            TEXTComp.layer(3).enabled = false;
            TEXTComp.layer(4).enabled = false;
            TEXTComp.layer(5).enabled = true;
            TEXTComp.layer(13).effect(1).enabled = true;
            TEXTComp.layer(13).effect(2).enabled = false;
            TEXTComp.layer(13).effect(3).enabled = false;
        }
    } else {
        TEXTComp.layer(2).enabled = true;
        TEXTComp.layer(3).enabled = false;
        TEXTComp.layer(4).enabled = false;
        TEXTComp.layer(5).enabled = true;
    }

    TitleImgLayer = TEXTComp.layers.add(app.project.items[ResourceID[AllData[i].rank + '_TEXT']], 40);
    if (AllData[i].title[0].match(/[\u0000-\u00FF\u4E00-\u9FA5]/g)) {
        TitleImgLayer.property('Position').setValue([754, 736]);
    } else if (AllData[i].title.match(/^[\uD800-\uDBFF][\uDC00-\uDFFF]/g)) {
        TitleImgLayer.property('Position').setValue([754, 736]);
    } else {
        TitleImgLayer.property('Position').setValue([734, 736]);
    }

    if (i + 1 < 4) {
        UICompName = 'UI-TOP' + (i + 1);
    } else {
        UICompName = 'UI ' + (i + 1);
    }
    UIComp = app.project.items[ResourceID[UICompName]];
    MatteLayer = UIComp.layer(36);
    VideoLayer = UIComp.layers.add(app.project.items[ResourceID[AllData[i].av]], 30);
    delay = 0;
    if (i + 1 < 4) {
        delay = 1 + 7 / CompFPS;
        FullVideoLayer = UIComp.layers.add(app.project.items[ResourceID[AllData[i].av]], 80);
        FullVideoLayer.startTime = 0 - AllData[i].offset + delay;
        FullVideoLayer.inPoint = 1;
        FullVideoLayer.outPoint = 72 + delay;
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
        TrueDuration = app.project.items[ResourceID[AllData[i].av]].duration;
        if (UIComp.duration < TrueDuration){
            TrueDuration = UIComp.duration;
        }
        FullVideoLayer.property('Opacity').setValueAtTime(FullVideoLayer.inPoint + 20 - 1 / CompFPS, 0);
        FullVideoLayer.property('Opacity').setValueAtTime(FullVideoLayer.inPoint + 20, 100);
        FullVideoLayer.property('Opacity').setValueAtTime(TrueDuration - 3, 100);
        FullVideoLayer.property('Opacity').setValueAtTime(TrueDuration, 0);
        AddAudioProperty(FullVideoLayer, 1, 1, FullVideoLayer.inPoint, 1);
        AddAudioProperty(FullVideoLayer, 1, 3, TrueDuration - 3, 2);
        MarkLayer = UIComp.layers.add(app.project.items[ResourceID.WaterMark], 80);
        MarkLayer.property('Opacity').setValueAtTime(FullVideoLayer.inPoint + 20 - 1 / CompFPS, 0);
        MarkLayer.property('Opacity').setValueAtTime(FullVideoLayer.inPoint + 20, 100);
        MarkLayer.property('Opacity').setValueAtTime(TrueDuration - 3, 100);
        MarkLayer.property('Opacity').setValueAtTime(TrueDuration, 0);
    }
    VideoLayer.startTime = 0 - AllData[i].offset + delay;
    VideoLayer.inPoint = 0 + delay;
    VideoLayer.outPoint = 21 + delay;
    VideoLayer.moveAfter(MatteLayer);
    VideoLayer.trackMatteType = TrackMatteType.ALPHA;
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
        AddAudioProperty(VideoLayer, 1, 1.5, VideoLayer.outPoint - 1.5, 2);
    }
}

for (i = 100; i < 106; i++) {
    if (AllData[i] != undefined && AllData[i].rank > -4) {
        TEXTCompName = 'old' + AllData[i].rank;
        UIComp = 'UI-PICK UP old' + AllData[i].rank;
    } else if (AllData[i] != undefined && AllData[i].rank > -7) {
        TEXTCompName = 'new' + AllData[i].rank;
        UIComp = 'UI-PICK UP new' + AllData[i].rank;
    } else {
        continue;
    }
    TEXTComp = app.project.items[ResourceID[TEXTCompName]];
    PICKUIComp = app.project.items[ResourceID[UIComp]];
    // ID
    TEXTComp.layer(20).property('Source Text').expression = 'text.sourceText="' + AllData[i].av + '";';
    // 标题
    // TEXTComp.layer(19).property('Source Text').expression = 'text.sourceText="' + AllData[i].title + '";';
    TEXTComp.layer(19).property('Source Text').expression.enabled = false;
    TEXTComp.layer(19).enabled = false;
    // UP主
    TEXTComp.layer(18).property('Source Text').expression = 'text.sourceText="' + AllData[i].up + '";';
    // 日期
    TEXTComp.layer(17).property('Source Text').expression = 'text.sourceText="' + AllData[i].pubdate + '";';
    // 特点
    TEXTComp.layer(3).property('Source Text').expression = 'text.sourceText="' + AllData[i].type + '";';
    // 推荐语
    TEXTComp.layer(2).property('Source Text').expression = 'text.sourceText="　　' + AllData[i].comment.substring(1) + '";';
    TEXTComp.layer(1).property('Source Text').expression = 'text.sourceText="' + AllData[i].comment.substring(0, 1) + '";';

    TitleImgLayer = TEXTComp.layers.add(app.project.items[ResourceID[AllData[i].rank + '_TEXT']], 40);
    if (AllData[i].title[0].match(/[\u0000-\u00FF\u4E00-\u9FA5]/g)) {
        TitleImgLayer.property('Position').setValue([754, 736]);
    } else if (AllData[i].title.match(/^[\uD800-\uDBFF][\uDC00-\uDFFF]/g)) {
        TitleImgLayer.property('Position').setValue([754, 736]);
    } else {
        TitleImgLayer.property('Position').setValue([734, 736]);
    }
    MatteLayer = PICKUIComp.layer(38);
    VideoLayer = PICKUIComp.layers.add(app.project.items[ResourceID[AllData[i].av]], 30);
    VideoLayer.startTime = 0 - AllData[i].offset;
    VideoLayer.inPoint = 0;
    VideoLayer.outPoint = 40;
    VideoLayer.moveAfter(MatteLayer);
    VideoLayer.trackMatteType = TrackMatteType.ALPHA;
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
    AddAudioProperty(VideoLayer, 1, 1, VideoLayer.inPoint, 1);
    AddAudioProperty(VideoLayer, 1, 1.5, VideoLayer.outPoint - 1.5, 2);

}

for (i = 1; i < 4; i++) {
    TopCompName = 'TOP' + i + '-3';
    TopComp = app.project.items[ResourceID[TopCompName]];
    TopComp.layer(3).property('Source Text').expression = 'text.sourceText="' + i + '";';
    TopComp.layer(2).property('Source Text').expression = 'text.sourceText="' + numberWithCommas(AllData[i]['分'] - AllData[i + 1]['分']) + '";';
}

for (i = 1; i <= 16; i++) {
    SUBCompName = 'SUBRANK ' + i;
    SUBComp = app.project.items[ResourceID[SUBCompName]];
    for (l = 1; l <= 5; l++) {
        Index = 19 + (i - 1) * 5 + l;
        // id
        SUBComp.layer(l + 0).property('Source Text').expression = 'text.sourceText="' + AllData[Index].av + '";';
        // 日期
        SUBComp.layer(l + 5).property('Source Text').expression = 'text.sourceText="' + AllData[Index].pubdate + '";';
        // 排名
        SUBComp.layer(l + 10).property('Source Text').expression = 'text.sourceText="' + AllData[Index].rank + '";';
        // 标题
        // SUBComp.layer(l + 15).property('Source Text').expression = 'text.sourceText=\'' + AllData[Index].title + '\';';
        SUBComp.layer(l + 15).property('Source Text').expression.enabled = false;
        SUBComp.layer(l + 15).enabled = false;
        // UP
        SUBComp.layer(l + 20).property('Source Text').expression = 'text.sourceText="' + AllData[Index].up + '";';
        // 总分
        SUBComp.layer(l + 25).property('Source Text').expression = 'text.sourceText="' + numberWithCommas(AllData[Index]['分']) + '";';
        // 上周排名
        SUBComp.layer(l + 30).property('Source Text').expression = 'text.sourceText="' + AllData[Index].last + '";';
        // NEW
        if (AllData[Index].last != 'null') {
            if (AllData[Index].last == AllData[Index].rank) {
                SUBComp.layer(l + 35).enabled = false;
                SUBComp.layer(l + 40).enabled = true;
                SUBComp.layer(l + 45).enabled = false;
                SUBComp.layer(l + 50).enabled = false;
                SUBComp.layer(l + 10).effect(1).enabled = false;
                SUBComp.layer(l + 10).effect(2).enabled = false;
                SUBComp.layer(l + 10).effect(3).enabled = true;
            } else if (AllData[Index].last > AllData[Index].rank) {
                SUBComp.layer(l + 35).enabled = false;
                SUBComp.layer(l + 40).enabled = false;
                SUBComp.layer(l + 45).enabled = false;
                SUBComp.layer(l + 50).enabled = true;
                SUBComp.layer(l + 10).effect(1).enabled = true;
                SUBComp.layer(l + 10).effect(2).enabled = false;
                SUBComp.layer(l + 10).effect(3).enabled = false;
            } else if (AllData[Index].last < AllData[Index].rank) {
                SUBComp.layer(l + 35).enabled = false;
                SUBComp.layer(l + 40).enabled = false;
                SUBComp.layer(l + 45).enabled = true;
                SUBComp.layer(l + 50).enabled = false;
                SUBComp.layer(l + 10).effect(1).enabled = false;
                SUBComp.layer(l + 10).effect(2).enabled = true;
                SUBComp.layer(l + 10).effect(3).enabled = false;
            }
        } else {
            SUBComp.layer(l + 35).enabled = true;
            SUBComp.layer(l + 40).enabled = false;
            SUBComp.layer(l + 45).enabled = false;
            SUBComp.layer(l + 50).enabled = false;
            SUBComp.layer(l + 10).effect(1).enabled = false;
            SUBComp.layer(l + 10).effect(2).enabled = false;
            SUBComp.layer(l + 10).effect(3).enabled = false;
        }
    }
    for (l = 1; l <= 5; l++) {
        Index = 19 + (i - 1) * 5 + l;
        STitleImgLayer = SUBComp.layers.add(app.project.items[ResourceID[AllData[Index].rank + '_TEXT']], 6);
        if (AllData[Index].title[0].match(/[\u0000-\u00FF\u4E00-\u9FA5]/g)) {
            STitleImgLayer.property('Position').setValue([677, 129 + (l - 1) * 142]);
        } else if (AllData[Index].title.match(/^[\uD800-\uDBFF][\uDC00-\uDFFF]/g)) {
            STitleImgLayer.property('Position').setValue([677, 129 + (l - 1) * 142]);
        } else {
            STitleImgLayer.property('Position').setValue([667, 129 + (l - 1) * 142]);
        }
        STitleImgLayer.outPoint = SUBComp.layer(2).outPoint;
        CoverName = AllData[Index].rank + '_av' + AllData[Index].av;
        CoverLayer = SUBComp.layers.add(app.project.items[ResourceID[CoverName]], 6);
        CoverLayer.property('Position').setValue([1176.5, 95 + (l - 1) * 142]);
        CoverLayer.outPoint = SUBComp.layer(2).outPoint;
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
app.endUndoGroup();