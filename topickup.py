# -*- coding: utf-8 -*-

import json
import os
from functools import reduce
from math import floor

import arrow

BEFORE = floor(
    (int(arrow.now("Asia/Shanghai").timestamp()) - 1428681600) / 3600 / 24 / 7
)
AFTER = floor(
    (
        int(arrow.now("Asia/Shanghai").shift(months=-3).shift(weeks=1).timestamp())
        - 1428681600
    )
    / 3600
    / 24
    / 7
)


def readjson(week):
    if not os.path.exists(f"./DATA/{week:03d}期数据.json"):
        return []
    result = json.load(open(f"./DATA/{week:03d}期数据.json", "r", encoding="utf-8"))
    pickup = [x for x in result if x["rank"] < 0]
    for x in pickup:
        x["rank"] = week * 10 - x["rank"]
    return pickup


data = reduce(list.__add__, map(readjson, range(BEFORE, AFTER)))

with open("./psdownload/download.txt", "w", encoding="utf-8") as f:
    f.writelines([f"av{x['av']}\n" for x in data])

json.dump(
    sorted(data, key=lambda z: z["rank"]),
    open("pickup.json", "w", encoding="utf-8"),
    ensure_ascii=False,
    indent=4,
)
