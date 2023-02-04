# -*- coding: utf-8 -*-

from functools import reduce
import json
import os


def readjson(week):
    if not os.path.exists(f"./DATA/{week:03d}期数据.json"):
        return []
    result = json.load(open(f"./DATA/{week:03d}期数据.json", "r", encoding="utf-8"))
    pickup = [x for x in result if x["rank"] < 0]
    for x in pickup:
        x["rank"] = week * 10 - x["rank"]
    return pickup


data = reduce(list.__add__, map(readjson, range(346, 401)))

with open("./psdownload/download.txt", "w", encoding="utf-8") as f:
    f.writelines([f"av{x['av']}\n" for x in data])

json.dump(
    sorted(data, key=lambda z: z["rank"]),
    open("pickup.json", "w", encoding="utf-8"),
    ensure_ascii=False,
    indent=4,
)
