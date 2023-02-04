// @include 'json2/json2.js';

WEEK_NUM = Math.floor((Date.now() / 1000 - 1428681600) / 3600 / 24 / 7);

app.beginUndoGroup('pickup');
for (n = 1; n <= app.project.items.length; n++) {
    if (app.project.items[n] instanceof FolderItem && app.project.items[n].name.match(/^No./g)) {
        app.project.items[n].remove();
    }
}

file = new File('pickup.json');
file.open('r');
content = file.read();
file.close();
AllData = JSON.parse(content);

PartSize = [1030, 570];
CompSize = [1280, 720];
CompFPS = 30;

OldPickupComp = app.project.items.addComp('周刊MAD排行榜推荐合集22.12—旧作', CompSize[0], CompSize[1], 1, 6 + 1 / 3, CompFPS);
NewPickupComp = app.project.items.addComp('周刊MAD排行榜推荐合集22.12—新作', CompSize[0], CompSize[1], 1, 6 + 1 / 3, CompFPS);

WeeklyFolder = app.project.items.addFolder('No.' + WEEK_NUM);

for (i = 0; i < AllData.length; i++) {
    if (AllData[i] != undefined) {
        FileFullPath = './TEXT/' + AllData[i].rank + '_av' + AllData[i].av + '.png';
        FootageFile = new ImportOptions(File(FileFullPath));
        FootageFile.ImportAs = ImportAsType.FOOTAGE;
        FileItem = app.project.importFile(FootageFile);
        FileItem.name = AllData[i].rank + '_TEXT';
        FileItem.parentFolder = WeeklyFolder;
    }
}

for (i = 0; i < AllData.length; i++) {
    if (AllData[i] != undefined) {
        FileFullPath = './VIDEO/av' + AllData[i].av + '.mp4';
        FootageFile = new ImportOptions(File(FileFullPath));
        FootageFile.ImportAs = ImportAsType.FOOTAGE;
        FileItem = app.project.importFile(FootageFile);
        FileItem.name = AllData[i].av;
        FileItem.parentFolder = WeeklyFolder;
    }
}

ResourceID = {};

function ReCountResource() {
    for (n = 1; n <= app.project.items.length; n++) {
        ResourceID[app.project.items[n].name] = n;
    }
}

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

ReCountResource();

OldPickupComp.layers.add(app.project.items[ResourceID['Transfer-Main Rank 4']], 6 + 1 / 3);
OldPickupComp.openInViewer();
NewPickupComp.layers.add(app.project.items[ResourceID['Transfer-Main Rank 5']], 6 + 1 / 3);
NewPickupComp.openInViewer();

for (i = 0; i < AllData.length; i++) {
    if (AllData[i].rank % 10 < 4) {
        TextComp = app.project.items[ResourceID['old-1']].duplicate();
        ReCountResource();
        PICKUIComp = app.project.items[ResourceID['UI-PICK UP old-1']].duplicate();
        ReCountResource();
        PickupComp = OldPickupComp;
    } else if (AllData[i].rank % 10 > 3) {
        TextComp = app.project.items[ResourceID['new-1']].duplicate();
        ReCountResource();
        PICKUIComp = app.project.items[ResourceID['UI-PICK UP new-1']].duplicate();
        ReCountResource();
        PickupComp = NewPickupComp;
    } else {
        continue;
    }
    NTextLayer = PICKUIComp.layers.add(TextComp);
    NTextLayer.moveAfter(PICKUIComp.layer(7));
    NTextLayer.trackMatteType = TrackMatteType.ALPHA;
    PICKUIComp.layer(8).remove();
    TextComp.layer(20).property('Source Text').expression = 'text.sourceText="' + AllData[i].av + '";';
    TextComp.layer(18).property('Source Text').expression = 'text.sourceText="' + AllData[i].up + '";';
    TextComp.layer(17).property('Source Text').expression = 'text.sourceText="' + AllData[i].pubdate + '";';
    TextComp.layer(3).property('Source Text').expression = 'text.sourceText="' + AllData[i].type + '";';
    TextComp.layer(2).property('Source Text').expression = 'text.sourceText="　　' + AllData[i].comment.substring(1) + '";';
    TextComp.layer(1).property('Source Text').expression = 'text.sourceText="' + AllData[i].comment.substring(0, 1) + '";';
    TitleImgLayer = TextComp.layers.add(app.project.items[ResourceID[AllData[i].rank + '_TEXT']], 40);
    OrigSize = TitleImgLayer.sourceRectAtTime(TitleImgLayer.inPoint, false);
    TitleImgLayer.property('Position').setValue([235 + OrigSize.width / 2, 736]);
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
    NewLayer = PickupComp.layers.add(PICKUIComp);
    NewLayer.startTime = PickupComp.duration;
    TopLayer = PickupComp.layers.add(app.project.items[ResourceID.TOP]);
    TopLayer.startTime = PickupComp.duration + NewLayer.outPoint - NewLayer.startTime;
    PickupComp.duration += (NewLayer.outPoint - NewLayer.startTime + TopLayer.outPoint - TopLayer.startTime);
}
