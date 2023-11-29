# -*- coding: utf-8 -*-

import json
import os
from functools import reduce
from math import floor

import arrow

Season = (int(arrow.now("Asia/Shanghai").format("M")) - 1) // 3 * 3 + 1  # 1 4 7 10
EDay = arrow.get(
    f'{arrow.now("Asia/Shanghai").format("YYYY")}-{Season}-1 00:00:00 +0800',
    "YYYY-M-D HH:mm:ss Z",
)
SDay = EDay.shift(months=-3)
isMon = int(EDay.format("d"))
if isMon == 1:
    ENum = floor((int(EDay.shift(days=-7).timestamp()) - 1428681600) / 3600 / 24 / 7)
else:
    ENum = floor(
        (int(EDay.shift(days=1 - isMon).timestamp()) - 1428681600) / 3600 / 24 / 7
    )
wasMon = int(SDay.format("d"))
if wasMon == 1:
    SNum = floor((int(SDay.timestamp()) - 1428681600) / 3600 / 24 / 7)
else:
    SNum = floor(
        (int(SDay.shift(days=8 - wasMon).timestamp()) - 1428681600) / 3600 / 24 / 7
    )


def readjson(week):
    if not os.path.exists(f"./DATA/{week:03d}期数据.json"):
        return []
    result = json.load(open(f"./DATA/{week:03d}期数据.json", "r", encoding="utf-8"))
    pickup = [x for x in result if x["rank"] < 0]
    for x in pickup:
        x["rank"] = week * 10 - x["rank"]
    return pickup


def main():
    print(SNum, ENum)
    data = reduce(list.__add__, map(readjson, range(SNum, ENum + 1)))

    with open("./psdownload/download.txt", "w", encoding="utf-8") as f:
        f.writelines([f"av{x['av']}\n" for x in data])

    json.dump(
        sorted(data, key=lambda z: z["rank"]),
        open("pickup.json", "w", encoding="utf-8"),
        ensure_ascii=False,
        indent=4,
    )


if __name__ == "__main__":
    main()
