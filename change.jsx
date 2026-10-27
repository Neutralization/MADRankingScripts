// @include 'json2/json2.js';
app.project.expressionEngine = 'extendscript';
app.project.workingSpace = 'Rec.709 Gamma 2.4';
app.project.bitsPerChannel = 8;

WEEK_NUM = Math.floor((Date.now() / 1000 - 1428681600) / 3600 / 24 / 7);

app.beginUndoGroup('Update Everything');
// Remove last/all ranking footage folder
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

// Import footage
for (i = 0; i < AllData.length; i++) {
    if (AllData[i] != undefined) {
        if (AllData[i].rank <= 20) {
            FileFullPath = './FOOTAGE/No.' + WEEK_NUM + '/VIDEO/av' + AllData[i].av + '.mp4';
            FileName = AllData[i].av;
            FileFolder = VideoFolder;
        } else {
            FileFullPath = './FOOTAGE/No.' + WEEK_NUM + '/COVER/' + AllData[i].rank + '_av' + AllData[i].av + '.jpg';
            FileName = AllData[i].rank + '_av' + AllData[i].av;
            FileFolder = CoverFolder;
        }
        FootageFile = new ImportOptions(File(FileFullPath));
        FootageFile.ImportAs = ImportAsType.FOOTAGE;
        FileItem = app.project.importFile(FootageFile);
        FileItem.pixelAspect = 1.0;
        FileItem.name = FileName;
        FileItem.parentFolder = FileFolder;
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

function AddAudioProperty(Target, Duration, Offset, Direction) {
    NewProperty = Target.property('Audio Levels');
    if (Direction == 1) {
        for (t = Offset; t <= Offset + Duration; t += Duration / CompFPS) {
            NewProperty.setValueAtTime(t, [
                (Math.sqrt(1 - Math.pow(1 - (t - Offset) / Duration, 2)) - 1) * 50,
                (Math.sqrt(1 - Math.pow(1 - (t - Offset) / Duration, 2)) - 1) * 50,
            ]);
        }
        NewProperty.setValueAtTime(Offset, [-Infinity, -Infinity]);
    }
    if (Direction == -1) {
        for (t = Offset; t <= Offset + Duration; t += Duration / CompFPS) {
            NewProperty.setValueAtTime(t, [
                (Math.sqrt(1 - Math.pow((t - Offset) / Duration, 2)) - 1) * 50,
                (Math.sqrt(1 - Math.pow((t - Offset) / Duration, 2)) - 1) * 50,
            ]);
        }
        NewProperty.setValueAtTime(Offset + Duration, [-Infinity, -Infinity]);
    }
    return NewProperty;
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// JSON.stringify keeps quotes, backslashes and newlines valid in the generated expression.
function setSourceText(comp, layerName, value) {
    comp.layer(layerName).property('Source Text').expression = 'text.sourceText=' + JSON.stringify(String(value)) + ';';
}

// Normal: wide uses width, narrow uses height;
// Reverse: wide uses height, narrow uses width.
function SetUniformScale(Target, SourceSize, TargetSize, Reverse) {
    var Wide = SourceSize.width / SourceSize.height >= TargetSize[0] / TargetSize[1];
    var Axis = (Wide ? 0 : 1) ^ (Reverse ? 1 : 0);
    var Scale = (TargetSize[Axis] / (Axis == 0 ? SourceSize.width : SourceSize.height)) * 100;
    Target.property('Scale').setValue([Scale, Scale]);
}

// last is a number or the literal string 'null' only.
function setRankState(comp, suffix, last, rank, showNewAsUp) {
    var isNew = last === 'null';
    var isEqual = !isNew && last == rank;
    var isDown = !isNew && last < rank;
    var isUp = !isNew && last > rank;
    comp.layer('NEW!' + suffix).enabled = isNew;
    comp.layer('equal' + suffix).enabled = isEqual;
    comp.layer('down' + suffix).enabled = isDown;
    comp.layer('up' + suffix).enabled = isUp || (isNew && showNewAsUp);
    comp.layer('本周排名' + suffix).effect(1).enabled = isUp || isNew;
    comp.layer('本周排名' + suffix).effect(2).enabled = isDown;
    comp.layer('本周排名' + suffix).effect(3).enabled = isEqual;
}

CoverComp43 = app.project.items[ResourceID['封面-4/3']];
setSourceText(CoverComp43, 1, WEEK_NUM);
CoverComp169 = app.project.items[ResourceID['封面-16/9']];
setSourceText(CoverComp169, 1, WEEK_NUM);

OPComp = app.project.items[ResourceID.OP];
setSourceText(OPComp, 8, 'No.' + WEEK_NUM);

DateComp = app.project.items[ResourceID['TEXT-03']];
today = (WEEK_NUM * 7 * 24 * 3600 + 1428681600) * 1000;
sdate = new Date(today - 7 * 24 * 3600 * 1000);
start = sdate.getFullYear() + '年' + (sdate.getMonth() + 1) + '月' + sdate.getDate() + '日凌晨';
edate = new Date(today - 0 * 24 * 3600 * 1000);
end = edate.getFullYear() + '年' + (edate.getMonth() + 1) + '月' + edate.getDate() + '日凌晨';
setSourceText(DateComp, 4, '\n\t\t' + start + '——' + end);

FinalComp = app.project.items[ResourceID['周刊MAD排行榜']];

for (RankNum = 20; RankNum >= 1; RankNum--) {
    DataRecord = DataByRank[RankNum];
    if (DataRecord == undefined) {
        continue;
    }
    TEXTCompName = 'TEXT-UI ' + RankNum;
    TEXTComp = app.project.items[ResourceID[TEXTCompName]];
    setSourceText(TEXTComp, '总分', numberWithCommas(DataRecord['分']));
    setSourceText(TEXTComp, '收藏', numberWithCommas(DataRecord['藏']));
    setSourceText(TEXTComp, '弹幕', numberWithCommas(DataRecord['弹']));
    setSourceText(TEXTComp, '评论', numberWithCommas(DataRecord['评']));
    setSourceText(TEXTComp, '播放', numberWithCommas(DataRecord['点']));
    setSourceText(TEXTComp, '本周排名', DataRecord.rank);
    setSourceText(TEXTComp, '日期', DataRecord.pubdate);
    setSourceText(TEXTComp, '作品名', DataRecord.title);
    TEXTComp.layer('作品名').property('Source Text').expression.enabled = false;
    TEXTComp.layer('作品名').enabled = false;
    setSourceText(TEXTComp, '上传者ID', DataRecord.up);
    setSourceText(TEXTComp, 'AV号', DataRecord.av);
    setSourceText(TEXTComp, '上周排名', DataRecord.last);
    if (DataRecord.av >= 10000000000) {
        TEXTComp.layer('Shape Layer 1').property('Position').setValue([767.5, 361.5]);
        TEXTComp.layer('上传者ID').property('Position').setValue([589, 656.4]);
    }
    setRankState(TEXTComp, '', DataRecord.last, DataRecord.rank, true);

    TitleImgLayer = TEXTComp.layers.add(app.project.items[ResourceID[DataRecord.rank + '_TEXT']], 40);
    OrigSize = TitleImgLayer.sourceRectAtTime(TitleImgLayer.inPoint, false);
    TitleImgLayer.property('Position').setValue([235 + OrigSize.width / 2, 636 + OrigSize.height / 2]);

    if (RankNum < 4) {
        UICompName = 'UI-TOP' + RankNum;
    } else {
        UICompName = 'UI ' + RankNum;
    }
    UIComp = app.project.items[ResourceID[UICompName]];
    if (UIComp.layer(1).name == 'WaterMark.png') {
        UIComp.layer(1).remove();
    }
    VideoLayer = UIComp.layers.add(app.project.items[ResourceID[DataRecord.av]], 30);
    delay = 0.5;
    if (RankNum < 4) {
        delay = 1 + 7 / CompFPS;
        FullVideoLayer = UIComp.layers.add(app.project.items[ResourceID[DataRecord.av]], 80);
        FullVideoLayer.startTime = 0 + delay;
        FullVideoLayer.inPoint = 0 + delay;
        FullVideoLayer.outPoint = 72 + delay;
        OrigSize = FullVideoLayer.sourceRectAtTime(FullVideoLayer.inPoint, false);
        SetUniformScale(FullVideoLayer, OrigSize, CompSize, false);
        FullVideoLayer.property('Position').setValue([CompSize[0] / 2, CompSize[1] / 2]);
        TrueDuration = app.project.items[ResourceID[DataRecord.av]].duration;
        if (UIComp.duration < TrueDuration) {
            TrueDuration = UIComp.duration;
        }
        FullVideoLayer.property('Opacity').setValueAtTime(FullVideoLayer.inPoint + 20 - 1 / CompFPS, 0);
        FullVideoLayer.property('Opacity').setValueAtTime(FullVideoLayer.inPoint + 20, 100);
        FullVideoLayer.property('Opacity').setValueAtTime(TrueDuration - 3, 100);
        FullVideoLayer.property('Opacity').setValueAtTime(TrueDuration, 0);
        AddAudioProperty(FullVideoLayer, 1, FullVideoLayer.inPoint, 1);
        AddAudioProperty(FullVideoLayer, 3, TrueDuration - 3, -1);
        MarkLayer = UIComp.layers.add(app.project.items[ResourceID['WaterMark.png']], 80);
        MarkLayer.property('Opacity').setValueAtTime(FullVideoLayer.inPoint + 20 - 1 / CompFPS, 0);
        MarkLayer.property('Opacity').setValueAtTime(FullVideoLayer.inPoint + 20, 100);
        MarkLayer.property('Opacity').setValueAtTime(TrueDuration - 3, 100);
        MarkLayer.property('Opacity').setValueAtTime(TrueDuration, 0);
    }
    VideoLayer.startTime = 0 + delay;
    VideoLayer.inPoint = 0 + delay;
    VideoLayer.outPoint = 21 + delay;
    VideoLayer.moveAfter(UIComp.layer('Screen-Matte 2'));
    VideoLayer.trackMatteType = TrackMatteType.ALPHA;
    OrigSize = VideoLayer.sourceRectAtTime(VideoLayer.inPoint, false);
    SetUniformScale(VideoLayer, OrigSize, PartSize, false);
    VideoLayer.property('Position').setValue([738, 327]);
    if (RankNum < 4) {
        VideoLayer.audioEnabled = false;
    } else {
        AddAudioProperty(VideoLayer, 1, VideoLayer.inPoint, 1);
        AddAudioProperty(VideoLayer, 1.5, VideoLayer.outPoint - 1.5, -1);
    }
}

for (PickNum = 1; PickNum <= 6; PickNum++) {
    DataRecord = DataByRank[-PickNum];
    if (DataRecord == undefined) {
        continue;
    }
    if (DataRecord.rank + 3 >= 0) {
        TEXTCompName = 'old' + DataRecord.rank;
    } else {
        TEXTCompName = 'new' + DataRecord.rank;
    }
    UIComp = 'UI-PICK UP ' + TEXTCompName;
    TEXTComp = app.project.items[ResourceID[TEXTCompName]];
    PICKUIComp = app.project.items[ResourceID[UIComp]];
    setSourceText(TEXTComp, 'AV号', DataRecord.av);
    setSourceText(TEXTComp, '上传者ID', DataRecord.up);
    setSourceText(TEXTComp, '日期', DataRecord.pubdate);
    setSourceText(TEXTComp, TEXTComp.layer('Shape Layer 1').index - 1, DataRecord.type.replace(/\\n/g, '\n'));
    setSourceText(TEXTComp, 2, '　　' + DataRecord.comment.substring(1));
    setSourceText(TEXTComp, 1, DataRecord.comment.substring(0, 1));
    if (DataRecord.av >= 10000000000) {
        TEXTComp.layer('Shape Layer 1').property('Position').setValue([767.5, 361.5]);
        TEXTComp.layer('上传者ID').property('Position').setValue([589, 656.4]);
    } else {
        TEXTComp.layer('Shape Layer 1').property('Position').setValue([667.5, 361.5]);
        TEXTComp.layer('上传者ID').property('Position').setValue([489, 656.4]);
    }
    // 标题
    TitleImgLayer = TEXTComp.layers.add(app.project.items[ResourceID[DataRecord.rank + '_TEXT']], 40);
    OrigSize = TitleImgLayer.sourceRectAtTime(TitleImgLayer.inPoint, false);
    TitleImgLayer.property('Position').setValue([235 + OrigSize.width / 2, 636 + OrigSize.height / 2]);
    VideoLayer = PICKUIComp.layers.add(app.project.items[ResourceID[DataRecord.av]], 30);
    VideoLayer.startTime = 0.5;
    VideoLayer.inPoint = 0;
    VideoLayer.outPoint = 40;
    VideoLayer.moveAfter(PICKUIComp.layer('Screen-Matte 2'));
    VideoLayer.trackMatteType = TrackMatteType.ALPHA;
    OrigSize = VideoLayer.sourceRectAtTime(VideoLayer.inPoint, false);
    SetUniformScale(VideoLayer, OrigSize, PartSize, false);
    VideoLayer.property('Position').setValue([738, 327]);
    AddAudioProperty(VideoLayer, 1, VideoLayer.inPoint, 1);
    AddAudioProperty(VideoLayer, 1.5, VideoLayer.outPoint - 1.5, -1);
}

for (TopNum = 1; TopNum < 4; TopNum++) {
    TopCompName = 'TOP' + TopNum + '-3';
    TopComp = app.project.items[ResourceID[TopCompName]];
    TopRecord = DataByRank[TopNum];
    NextTopRecord = DataByRank[TopNum + 1];
    if (TopRecord == undefined || NextTopRecord == undefined) {
        continue;
    }
    setSourceText(TopComp, 3, TopNum);
    setSourceText(TopComp, 2, numberWithCommas(TopRecord['分'] - NextTopRecord['分']));
}

for (SubNum = 1; SubNum <= 16; SubNum++) {
    SUBCompName = 'SUBRANK ' + SubNum;
    SUBComp = app.project.items[ResourceID[SUBCompName]];
    for (LineNum = 1; LineNum <= 5; LineNum++) {
        Rank = 20 + (SubNum - 1) * 5 + LineNum;
        DataRecord = DataByRank[Rank];
        if (DataRecord == undefined) {
            continue;
        }
        setSourceText(SUBComp, 'AV号 ' + LineNum, DataRecord.av);
        setSourceText(SUBComp, '日期 ' + LineNum, DataRecord.pubdate);
        setSourceText(SUBComp, '本周排名 ' + LineNum, DataRecord.rank);
        setSourceText(SUBComp, '上传者ID ' + LineNum, DataRecord.up);
        setSourceText(SUBComp, '总分 ' + LineNum, numberWithCommas(DataRecord['分']));
        setSourceText(SUBComp, '上周排名 ' + LineNum, DataRecord.last);
        setRankState(SUBComp, ' ' + LineNum, DataRecord.last, DataRecord.rank, false);
        // 标题
        STitleImgLayer = SUBComp.layers.add(app.project.items[ResourceID[DataRecord.rank + '_TEXT']], 6);
        OrigSize = STitleImgLayer.sourceRectAtTime(STitleImgLayer.inPoint, false);
        STitleImgLayer.property('Position').setValue([157 + OrigSize.width / 2, 29 + OrigSize.height / 2 + (LineNum - 1) * 142]);
        STitleImgLayer.outPoint = SUBComp.layer(2).outPoint;
        STitleImgLayer.mask.addProperty('Mask');
        STitleImgLayer.mask(1).maskMode = MaskMode.ADD;
        STitleImgLayer.mask(1).inverted = false;
        STitleImgLayer.mask(1).property(1).expression =
            'x=thisLayer.width>865?865:thisLayer.width;mask(1).maskPath=createPath(points=[[0,0],[x,0],[x,thisLayer.height],[0,thisLayer.height]],inTangents=[],outTangents=[],is_closed=true);';
        CoverName = DataRecord.rank + '_av' + DataRecord.av;
        CoverLayer = SUBComp.layers.add(app.project.items[ResourceID[CoverName]], 6);
        CoverLayer.property('Position').setValue([1175, 95 + (LineNum - 1) * 142]);
        CoverLayer.outPoint = SUBComp.layer(2).outPoint;
        OrigSize = CoverLayer.sourceRectAtTime(CoverLayer.inPoint, false);
        SetUniformScale(CoverLayer, OrigSize, CoverSize, true);
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
render = renderQueue.items.add(FinalComp);
render.outputModules[1].applyTemplate('Voukoder Classic MP4');
render.outputModules[1].file = new File('./周刊MAD排行榜No.' + WEEK_NUM + '.mp4');

app.project.save(File('./MAD_' + WEEK_NUM + '.aep'));
