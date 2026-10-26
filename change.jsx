// @include 'json2/json2.js';
app.project.expressionEngine = 'extendscript';
app.project.workingSpace = 'Rec.709 Gamma 2.4';
app.project.bitsPerChannel = 8;

WEEK_NUM = Math.floor((Date.now() / 1000 - 1428681600) / 3600 / 24 / 7);

app.beginUndoGroup('Update Everything');
for (n = 1; n <= app.project.items.length; n++) {
    if (app.project.items[n] instanceof FolderItem && app.project.items[n].name.match(/^No./g)) {
        app.project.items[n].remove();
    }
}

file = new File('./DATA/' + WEEK_NUM + '期数据.json');
file.open('r');
content = file.read();
file.close();
AllData = JSON.parse(content);

// Rank-keyed lookup: JSON array order is not significant.
DataByRank = {};
for (i = 0; i < AllData.length; i++) {
    if (AllData[i] != undefined && AllData[i].rank != undefined) {
        DataByRank[AllData[i].rank] = AllData[i];
    }
}

CoverSize = [160, 100];
PartSize = [1024, 576];
CompSize = [1280, 720];
CompFPS = 30;

WeeklyFolder = app.project.items.addFolder('No.' + WEEK_NUM);
VideoFolder = app.project.items.addFolder('VIDEO');
VideoFolder.parentFolder = WeeklyFolder;
CoverFolder = app.project.items.addFolder('COVER');
CoverFolder.parentFolder = WeeklyFolder;
TextFolder = app.project.items.addFolder('TEXT');
TextFolder.parentFolder = WeeklyFolder;

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

for (i = 0; i < AllData.length; i++) {
    if (AllData[i] != undefined) {
        if (AllData[i].rank <= 20) {
            FileFullPath = './FOOTAGE/No.' + WEEK_NUM + '/VIDEO/av' + AllData[i].av + '.mp4';
        } else {
            FileFullPath = './FOOTAGE/No.' + WEEK_NUM + '/COVER/' + AllData[i].rank + '_av' + AllData[i].av + '.jpg';
        }
        FootageFile = new ImportOptions(File(FileFullPath));
        FootageFile.ImportAs = ImportAsType.FOOTAGE;
        FileItem = app.project.importFile(FootageFile);
        FileItem.pixelAspect = 1.0;
        if (AllData[i].rank <= 20) {
            FileItem.name = AllData[i].av;
            FileItem.parentFolder = VideoFolder;
        } else {
            FileItem.name = AllData[i].rank + '_av' + AllData[i].av;
            FileItem.parentFolder = CoverFolder;
        }
        // TEXT
        FileFullPath = './FOOTAGE/No.' + WEEK_NUM + '/TEXT/' + AllData[i].rank + '_av' + AllData[i].av + '.png';
        FootageFile = new ImportOptions(File(FileFullPath));
        FootageFile.ImportAs = ImportAsType.FOOTAGE;
        FileItem = app.project.importFile(FootageFile);
        FileItem.pixelAspect = 1.0;
        FileItem.name = AllData[i].rank + '_TEXT';
        FileItem.parentFolder = TextFolder;
    }
}

ResourceID = {};
for (n = 1; n <= app.project.items.length; n++) {
    ResourceID[app.project.items[n].name] = n;
}

CoverComp43 = app.project.items[ResourceID['封面-4/3']];
CoverComp43.layer(1).property('Source Text').expression = 'text.sourceText=' + WEEK_NUM + ';';
CoverComp169 = app.project.items[ResourceID['封面-16/9']];
CoverComp169.layer(1).property('Source Text').expression = 'text.sourceText=' + WEEK_NUM + ';';

OPComp = app.project.items[ResourceID.OP];
OPComp.layer(8).property('Source Text').expression = 'text.sourceText="No.' + WEEK_NUM + '";';

DateComp = app.project.items[ResourceID['TEXT-03']];
today = (WEEK_NUM * 7 * 24 * 3600 + 1428681600) * 1000;
sdate = new Date(today - 7 * 24 * 3600 * 1000);
start = sdate.getFullYear() + '年' + (sdate.getMonth() + 1) + '月' + sdate.getDate() + '日凌晨';
edate = new Date(today - 0 * 24 * 3600 * 1000);
end = edate.getFullYear() + '年' + (edate.getMonth() + 1) + '月' + edate.getDate() + '日凌晨';
DateComp.layer(4).property('Source Text').expression = 'text.sourceText="\\n\\t\\t' + start + '——' + end + '";';

for (i = 19; i >= 0; i--) {
    DataRecord = DataByRank[i + 1];
    if (DataRecord == undefined) {
        continue;
    }
    TEXTCompName = 'TEXT-UI ' + (i + 1);
    TEXTComp = app.project.items[ResourceID[TEXTCompName]];
    TEXTComp.layer("总分").property('Source Text').expression = 'text.sourceText="' + numberWithCommas(DataRecord['分']) + '";';
    TEXTComp.layer("收藏").property('Source Text').expression = 'text.sourceText="' + numberWithCommas(DataRecord['藏']) + '";';
    TEXTComp.layer("弹幕").property('Source Text').expression = 'text.sourceText="' + numberWithCommas(DataRecord['弹']) + '";';
    TEXTComp.layer("评论").property('Source Text').expression = 'text.sourceText="' + numberWithCommas(DataRecord['评']) + '";';
    TEXTComp.layer("播放").property('Source Text').expression = 'text.sourceText="' + numberWithCommas(DataRecord['点']) + '";';
    TEXTComp.layer("本周排名").property('Source Text').expression = 'text.sourceText="' + DataRecord.rank + '";';
    TEXTComp.layer("日期").property('Source Text').expression = 'text.sourceText="' + DataRecord.pubdate + '";';
    TEXTComp.layer("作品名").property('Source Text').expression = 'text.sourceText=\'' + DataRecord.title + '\';';
    TEXTComp.layer("作品名").property('Source Text').expression.enabled = false;
    TEXTComp.layer("作品名").enabled = false;
    TEXTComp.layer("上传者ID").property('Source Text').expression = 'text.sourceText="' + DataRecord.up + '";';
    TEXTComp.layer("AV号").property('Source Text').expression = 'text.sourceText="' + DataRecord.av + '";';
    if (DataRecord.av >= 10000000000) {
        TEXTComp.layer("Shape Layer 1").property('Position').setValue([767.5, 361.5]);
        TEXTComp.layer("上传者ID").property('Position').setValue([589, 656.4]);
    }

    // 上周排名
    TEXTComp.layer("上周排名").property('Source Text').expression = 'text.sourceText="' + DataRecord.last + '";';
    // NEW
    if (DataRecord.last != 'null') {
        if (DataRecord.last == DataRecord.rank) {
            TEXTComp.layer("NEW!").enabled = false;
            TEXTComp.layer("equal").enabled = true;
            TEXTComp.layer("down").enabled = false;
            TEXTComp.layer("up").enabled = false;
            TEXTComp.layer("本周排名").effect(1).enabled = false;
            TEXTComp.layer("本周排名").effect(2).enabled = false;
            TEXTComp.layer("本周排名").effect(3).enabled = true;
        } else if (DataRecord.last < DataRecord.rank) {
            TEXTComp.layer("NEW!").enabled = false;
            TEXTComp.layer("equal").enabled = false;
            TEXTComp.layer("down").enabled = true;
            TEXTComp.layer("up").enabled = false;
            TEXTComp.layer("本周排名").effect(1).enabled = false;
            TEXTComp.layer("本周排名").effect(2).enabled = true;
            TEXTComp.layer("本周排名").effect(3).enabled = false;
        } else if (DataRecord.last > DataRecord.rank) {
            TEXTComp.layer("NEW!").enabled = false;
            TEXTComp.layer("equal").enabled = false;
            TEXTComp.layer("down").enabled = false;
            TEXTComp.layer("up").enabled = true;
            TEXTComp.layer("本周排名").effect(1).enabled = true;
            TEXTComp.layer("本周排名").effect(2).enabled = false;
            TEXTComp.layer("本周排名").effect(3).enabled = false;
        }
    } else {
        TEXTComp.layer("NEW!").enabled = true;
        TEXTComp.layer("equal").enabled = false;
        TEXTComp.layer("down").enabled = false;
        TEXTComp.layer("up").enabled = true;
        TEXTComp.layer("本周排名").effect(1).enabled = true;
        TEXTComp.layer("本周排名").effect(2).enabled = false;
        TEXTComp.layer("本周排名").effect(3).enabled = false;
    }

    TitleImgLayer = TEXTComp.layers.add(app.project.items[ResourceID[DataRecord.rank + '_TEXT']], 40);
    OrigSize = TitleImgLayer.sourceRectAtTime(TitleImgLayer.inPoint, false);
    TitleImgLayer.property('Position').setValue([235 + OrigSize.width / 2, 636 + OrigSize.height / 2]);

    if (i + 1 < 4) {
        UICompName = 'UI-TOP' + (i + 1);
    } else {
        UICompName = 'UI ' + (i + 1);
    }
    UIComp = app.project.items[ResourceID[UICompName]];
    if (UIComp.layer(1).name == 'WaterMark.png') {
        UIComp.layer(1).remove();
    }
    MatteLayer = UIComp.layer("Screen-Matte 2");
    VideoLayer = UIComp.layers.add(app.project.items[ResourceID[DataRecord.av]], 30);
    delay = 0.5;
    if (i + 1 < 4) {
        delay = 1 + 7 / CompFPS;
        FullVideoLayer = UIComp.layers.add(app.project.items[ResourceID[DataRecord.av]], 80);
        // FullVideoLayer.startTime = 0 - AllData[i].offset + delay;
        FullVideoLayer.startTime = 0 + delay;
        FullVideoLayer.inPoint = 0 + delay;
        FullVideoLayer.outPoint = 72 + delay;
        OrigSize = FullVideoLayer.sourceRectAtTime(FullVideoLayer.inPoint, false);
        if (OrigSize.width / OrigSize.height >= CompSize[0] / CompSize[1]) {
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
        FullVideoLayer.property('Position').setValue([CompSize[0] / 2, CompSize[1] / 2]);
        TrueDuration = app.project.items[ResourceID[DataRecord.av]].duration;
        if (UIComp.duration < TrueDuration) {
            TrueDuration = UIComp.duration;
        }
        FullVideoLayer.property('Opacity').setValueAtTime(FullVideoLayer.inPoint + 20 - 1 / CompFPS, 0);
        FullVideoLayer.property('Opacity').setValueAtTime(FullVideoLayer.inPoint + 20, 100);
        FullVideoLayer.property('Opacity').setValueAtTime(TrueDuration - 3, 100);
        FullVideoLayer.property('Opacity').setValueAtTime(TrueDuration, 0);
        AddAudioProperty(FullVideoLayer, 1, 1, FullVideoLayer.inPoint, 1);
        AddAudioProperty(FullVideoLayer, 1, 3, TrueDuration - 3, 2);
        MarkLayer = UIComp.layers.add(app.project.items[ResourceID['WaterMark.png']], 80);
        MarkLayer.property('Opacity').setValueAtTime(FullVideoLayer.inPoint + 20 - 1 / CompFPS, 0);
        MarkLayer.property('Opacity').setValueAtTime(FullVideoLayer.inPoint + 20, 100);
        MarkLayer.property('Opacity').setValueAtTime(TrueDuration - 3, 100);
        MarkLayer.property('Opacity').setValueAtTime(TrueDuration, 0);
    }
    // VideoLayer.startTime = 0 - AllData[i].offset + delay;
    VideoLayer.startTime = 0 + delay;
    VideoLayer.inPoint = 0 + delay;
    VideoLayer.outPoint = 21 + delay;
    VideoLayer.moveAfter(MatteLayer);
    VideoLayer.trackMatteType = TrackMatteType.ALPHA;
    OrigSize = VideoLayer.sourceRectAtTime(VideoLayer.inPoint, false);
    if (OrigSize.width / OrigSize.height >= PartSize[0] / PartSize[1]) {
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
    VideoLayer.property('Position').setValue([738, 327]);
    if (i + 1 < 4) {
        VideoLayer.audioEnabled = false;
    } else {
        AddAudioProperty(VideoLayer, 1, 1, VideoLayer.inPoint, 1);
        AddAudioProperty(VideoLayer, 1, 1.5, VideoLayer.outPoint - 1.5, 2);
    }
}

for (i = -1; i >= -6; i--) {
    DataRecord = DataByRank[i];
    if (DataRecord == undefined) {
        continue;
    }
    if (DataRecord.rank > -4) {
        TEXTCompName = 'old' + DataRecord.rank;
        UIComp = 'UI-PICK UP old' + DataRecord.rank;
    } else if (DataRecord.rank > -7) {
        TEXTCompName = 'new' + DataRecord.rank;
        UIComp = 'UI-PICK UP new' + DataRecord.rank;
    } else {
        continue;
    }
    TEXTComp = app.project.items[ResourceID[TEXTCompName]];
    PICKUIComp = app.project.items[ResourceID[UIComp]];
    TEXTComp.layer("AV号").property('Source Text').expression = 'text.sourceText="' + DataRecord.av + '";';
    TEXTComp.layer("上传者ID").property('Source Text').expression = 'text.sourceText="' + DataRecord.up + '";';
    TEXTComp.layer("日期").property('Source Text').expression = 'text.sourceText="' + DataRecord.pubdate + '";';
    TEXTComp.layer("特点：").property('Source Text').expression = 'text.sourceText="' + DataRecord.type + '";';
    TEXTComp.layer(2).property('Source Text').expression = 'text.sourceText="　　' + DataRecord.comment.substring(1) + '";';
    TEXTComp.layer(1).property('Source Text').expression = 'text.sourceText="' + DataRecord.comment.substring(0, 1) + '";';
    if (DataRecord.av >= 10000000000) {
        TEXTComp.layer("Shape Layer 1").property('Position').setValue([767.5, 361.5]);
        TEXTComp.layer("上传者ID").property('Position').setValue([589, 656.4]);
    } else {
        TEXTComp.layer("Shape Layer 1").property('Position').setValue([667.5, 361.5]);
        TEXTComp.layer("上传者ID").property('Position').setValue([489, 656.4]);
    }
    // 标题
    TitleImgLayer = TEXTComp.layers.add(app.project.items[ResourceID[DataRecord.rank + '_TEXT']], 40);
    OrigSize = TitleImgLayer.sourceRectAtTime(TitleImgLayer.inPoint, false);
    TitleImgLayer.property('Position').setValue([235 + OrigSize.width / 2, 636 + OrigSize.height / 2]);
    MatteLayer = PICKUIComp.layer("Screen-Matte 2");
    VideoLayer = PICKUIComp.layers.add(app.project.items[ResourceID[DataRecord.av]], 30);
    // VideoLayer.startTime = 0 - DataRecord.offset;
    VideoLayer.startTime = 0.5;
    VideoLayer.inPoint = 0;
    VideoLayer.outPoint = 40;
    VideoLayer.moveAfter(MatteLayer);
    VideoLayer.trackMatteType = TrackMatteType.ALPHA;
    OrigSize = VideoLayer.sourceRectAtTime(VideoLayer.inPoint, false);
    if (OrigSize.width / OrigSize.height >= PartSize[0] / PartSize[1]) {
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
    VideoLayer.property('Position').setValue([738, 327]);
    AddAudioProperty(VideoLayer, 1, 1, VideoLayer.inPoint, 1);
    AddAudioProperty(VideoLayer, 1, 1.5, VideoLayer.outPoint - 1.5, 2);
}

for (i = 1; i < 4; i++) {
    TopCompName = 'TOP' + i + '-3';
    TopComp = app.project.items[ResourceID[TopCompName]];
    TopRecord = DataByRank[i + 1];
    NextTopRecord = DataByRank[i + 2];
    if (TopRecord == undefined || NextTopRecord == undefined) {
        continue;
    }
    TopComp.layer(3).property('Source Text').expression = 'text.sourceText="' + i + '";';
    TopComp.layer(2).property('Source Text').expression =
        'text.sourceText="' + numberWithCommas(TopRecord['分'] - NextTopRecord['分']) + '";';
}

for (i = 1; i <= 16; i++) {
    SUBCompName = 'SUBRANK ' + i;
    SUBComp = app.project.items[ResourceID[SUBCompName]];
    for (l = 1; l <= 5; l++) {
        Rank = 20 + (i - 1) * 5 + l;
        DataRecord = DataByRank[Rank];
        if (DataRecord == undefined) {
            continue;
        }
        SUBComp.layer("AV号 " + l).property('Source Text').expression = 'text.sourceText="' + DataRecord.av + '";';
        SUBComp.layer("日期 " + l).property('Source Text').expression = 'text.sourceText="' + DataRecord.pubdate + '";';
        SUBComp.layer("本周排名 " + l).property('Source Text').expression = 'text.sourceText="' + DataRecord.rank + '";';
        SUBComp.layer("上传者ID " + l).property('Source Text').expression = 'text.sourceText="' + DataRecord.up + '";';
        SUBComp.layer("总分 " + l).property('Source Text').expression = 'text.sourceText="' + numberWithCommas(DataRecord['分']) + '";';
        SUBComp.layer("上周排名 " + l).property('Source Text').expression = 'text.sourceText="' + DataRecord.last + '";';
        if (DataRecord.last != 'null') {
            if (DataRecord.last == DataRecord.rank) {
                SUBComp.layer("NEW! " + l).enabled = false;
                SUBComp.layer("equal " + l).enabled = true;
                SUBComp.layer("down " + l).enabled = false;
                SUBComp.layer("up " + l).enabled = false;
                SUBComp.layer("本周排名 " + l).effect(1).enabled = false;
                SUBComp.layer("本周排名 " + l).effect(2).enabled = false;
                SUBComp.layer("本周排名 " + l).effect(3).enabled = true;
            } else if (DataRecord.last > DataRecord.rank) {
                SUBComp.layer("NEW! " + l).enabled = false;
                SUBComp.layer("equal " + l).enabled = false;
                SUBComp.layer("down " + l).enabled = false;
                SUBComp.layer("up " + l).enabled = true;
                SUBComp.layer("本周排名 " + l).effect(1).enabled = true;
                SUBComp.layer("本周排名 " + l).effect(2).enabled = false;
                SUBComp.layer("本周排名 " + l).effect(3).enabled = false;
            } else if (DataRecord.last < DataRecord.rank) {
                SUBComp.layer("NEW! " + l).enabled = false;
                SUBComp.layer("equal " + l).enabled = false;
                SUBComp.layer("down " + l).enabled = true;
                SUBComp.layer("up " + l).enabled = false;
                SUBComp.layer("本周排名 " + l).effect(1).enabled = false;
                SUBComp.layer("本周排名 " + l).effect(2).enabled = true;
                SUBComp.layer("本周排名 " + l).effect(3).enabled = false;
            }
        } else {
            SUBComp.layer("NEW! " + l).enabled = true;
            SUBComp.layer("equal " + l).enabled = false;
            SUBComp.layer("down " + l).enabled = false;
            SUBComp.layer("up " + l).enabled = false;
            SUBComp.layer("本周排名 " + l).effect(1).enabled = false;
            SUBComp.layer("本周排名 " + l).effect(2).enabled = false;
            SUBComp.layer("本周排名 " + l).effect(3).enabled = false;
        }
    }
    for (l = 1; l <= 5; l++) {
        Rank = 20 + (i - 1) * 5 + l;
        DataRecord = DataByRank[Rank];
        if (DataRecord == undefined) {
            continue;
        }
        // 标题
        STitleImgLayer = SUBComp.layers.add(app.project.items[ResourceID[DataRecord.rank + '_TEXT']], 6);
        OrigSize = STitleImgLayer.sourceRectAtTime(STitleImgLayer.inPoint, false);
        STitleImgLayer.property('Position').setValue([157 + OrigSize.width / 2, 29 + OrigSize.height / 2 + (l - 1) * 142]);
        STitleImgLayer.outPoint = SUBComp.layer(2).outPoint;
        STitleImgLayer.mask.addProperty('Mask');
        STitleImgLayer.mask(1).maskMode = MaskMode.ADD;
        STitleImgLayer.mask(1).inverted = false;
        STitleImgLayer.mask(1).property(1).expression =
            'x=thisLayer.width>865?865:thisLayer.width;mask(1).maskPath=createPath(points=[[0,0],[x,0],[x,thisLayer.height],[0,thisLayer.height]],inTangents=[],outTangents=[],is_closed=true);';
        CoverName = DataRecord.rank + '_av' + DataRecord.av;
        CoverLayer = SUBComp.layers.add(app.project.items[ResourceID[CoverName]], 6);
        CoverLayer.property('Position').setValue([1175, 95 + (l - 1) * 142]);
        CoverLayer.outPoint = SUBComp.layer(2).outPoint;
        OrigSize = CoverLayer.sourceRectAtTime(CoverLayer.inPoint, false);
        if (OrigSize.width / OrigSize.height >= CoverSize[0] / CoverSize[1]) {
            CoverLayer.property('Scale').setValue([
                (CoverSize[1] / OrigSize.height) * 100,
                (CoverSize[1] / OrigSize.height) * 100,
            ]);
        } else {
            CoverLayer.property('Scale').setValue([
                (CoverSize[0] / OrigSize.width) * 100,
                (CoverSize[0] / OrigSize.width) * 100,
            ]);
        }
        CoverLayer.mask.addProperty('Mask');
        CoverLayer.mask(1).maskMode = MaskMode.ADD;
        CoverLayer.mask(1).inverted = false;
        CoverLayer.mask(1).property(1).expression =
            'if(thisLayer.width/thisLayer.height>=16/10){y1=0;y2=thisLayer.height;x1=(thisLayer.width-thisLayer.height/10*16)/2;x2=x1+thisLayer.height/10*16;}else{x1=0;x2=thisLayer.width;y1=(thisLayer.height-thisLayer.width/16*10)/2;y2=y1+thisLayer.width/16*10;}mask(1).maskPath=createPath(points=[[x1,y1],[x2,y1],[x2,y2],[x1,y2]],inTangents=[],outTangents=[],is_closed=true);';
    }
}
app.endUndoGroup();

app.project.consolidateFootage();
renderQueue = app.project.renderQueue;
render = renderQueue.items.add(CoverComp169);
render.outputModules[1].applyTemplate('JPEG 序列');
render.outputModules[1].file = new File('./封面_169_[#].jpg');
render = renderQueue.items.add(CoverComp43);
render.outputModules[1].applyTemplate('JPEG 序列');
render.outputModules[1].file = new File('./封面_43_[#].jpg');
render = renderQueue.items.add(app.project.items[ResourceID['周刊MAD排行榜']]);
render.outputModules[1].applyTemplate('Voukoder Classic MP4');
render.outputModules[1].file = new File('./周刊MAD排行榜No.' + WEEK_NUM + '.mp4');

app.project.save(File('./MAD_' + WEEK_NUM + '.aep'));