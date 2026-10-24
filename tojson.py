# -*- coding: utf-8 -*-

import argparse
import json
import os
import re
from functools import reduce
from math import floor

import arrow
import requests
from pandas import read_excel

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0"
EPOCH = 1428681600


def default_weeks():
    return floor((int(arrow.now("Asia/Shanghai").timestamp()) - EPOCH) / 3600 / 24 / 7)


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--weeks", "-w", type=int, help="指定期数")
    parser.add_argument("--pickup", action="store_true", help="生成 pickup 聚合数据")
    args = parser.parse_args()
    return args.weeks, args.pickup


def week_number(day):
    return floor((int(day.timestamp()) - EPOCH) / 3600 / 24 / 7)


def quarter_start(day):
    season = (int(day.format("M")) - 1) // 3 * 3 + 1
    return arrow.get(
        f"{day.format('YYYY')}-{season}-1 00:00:00 +0800", "YYYY-M-D HH:mm:ss Z"
    )


def pickup_week_range(anchor_weeks):
    if anchor_weeks is None:
        end_day = quarter_start(arrow.now("Asia/Shanghai"))
        start_day = end_day.shift(months=-3)
    else:
        anchor_day = arrow.get(EPOCH).to("Asia/Shanghai").shift(
            days=2, weeks=anchor_weeks
        )
        start_day = quarter_start(anchor_day)
        end_day = start_day.shift(months=3)

    end_weekday = int(end_day.format("d"))
    if end_weekday == 1:
        end_week = week_number(end_day.shift(days=-7))
    else:
        end_week = week_number(end_day.shift(days=1 - end_weekday))

    start_weekday = int(start_day.format("d"))
    if start_weekday == 1:
        start_week = week_number(start_day)
    else:
        start_week = week_number(start_day.shift(days=8 - start_weekday))

    return start_week, end_week


def read_pickup_json(week):
    if not os.path.exists(f"./DATA/{week:03d}期数据.json"):
        return []
    with open(f"./DATA/{week:03d}期数据.json", "r", encoding="utf-8") as f:
        result = json.load(f)
    pickup_data = [x for x in result if x["rank"] < 0]
    for x in pickup_data:
        x["rank"] = week * 10 - x["rank"]
    return pickup_data


def pickup_aggregation(anchor_weeks):
    start_week, end_week = pickup_week_range(anchor_weeks)
    print(start_week, end_week)
    data = []
    for week in range(start_week, end_week + 1):
        data += read_pickup_json(week)
    with open("./DATA/pickup.json", "w", encoding="utf-8") as f:
        json.dump(sorted(data, key=lambda z: z["rank"]), f, ensure_ascii=False, indent=4)


def getinfo(aid):
    headers = {"User-Agent": UA}
    params = {"aid": aid}
    resp = requests.get(
        "https://api.bilibili.com/x/web-interface/view", params=params, headers=headers
    )
    result = json.loads(resp.content)
    code = result.get("code")
    if code != 0:
        print(f"av{aid} 封面获取失败：{result}")
    return {
        aid: {
            "title": "" if code else result["data"].get("title"),
            "duration": 0 if code else result["data"].get("duration"),
            "owner": "" if code else result["data"]["owner"].get("name"),
            "pic": "" if code else result["data"].get("pic"),
            "pubdate": (
                None
                if code
                else arrow.get(
                    result["data"].get("pubdate"), tzinfo="Asia/Shanghai"
                ).format("YYYY-MM-DD HH:mm")
            ),
        }
    }


def readExcel(filename, weeks):
    print(f"\n加载文件\n\t{filename}")
    df = read_excel(filename)
    for extra_col in ("offset", "last", "duration", "cover", "pubdate"):
        if extra_col not in df.columns:
            df.insert(0, extra_col, 0)
    df = df.astype(
        {
            "rank": "int32",
            "last": "int32",
            "av": "int64",
            "offset": "int32",
            "up": "string",
            "pubdate": "string",
            "title": "string",
            "分": "int32",
            "点": "int32",
            "评": "int32",
            "弹": "int32",
            "藏": "int32",
            "币": "int32",
            "duration": "int32",
            "cover": "string",
        }
    )

    def cell_int(row, column):
        return int(str(df.at[row, column]))

    print("\n获取视频信息...")
    videoinfo = reduce(
        lambda x, y: {**x, **y},
        [
            getinfo(cell_int(x, "av"))
            for x in df.index
            if df.at[x, "av"] != "av" and cell_int(x, "rank") <= 150
        ],
    )

    for x in df.index:
        if cell_int(x, "rank") <= 150:
            aid = cell_int(x, "av")
            df.at[x, "cover"] = videoinfo[aid]["pic"]
            df.at[x, "pubdate"] = videoinfo[aid]["pubdate"]
            df.at[x, "duration"] = videoinfo[aid]["duration"]
            df.at[x, "up"] = (
                videoinfo[aid]["owner"]
                if videoinfo[aid]["owner"] is not None
                else df.at[x, "up"]
            )
            df.at[x, "title"] = (
                videoinfo[aid]["title"]
                if videoinfo[aid]["title"] is not None
                else df.at[x, "title"]
            )
    df.to_excel(f"./DATA/{weeks:03d}期数据.xlsx", index=False)
    # with open(f"./DATA/{weeks:03d}期数据.json", "w", encoding="utf-8") as f:
    #     df[0:100].to_json(f, orient="records", force_ascii=False)
    reorder = "rank;last;av;offset;up;pubdate;title;分;点;评;弹;藏;币;duration;cover"
    return df[reorder.split(";")][:100].to_json(orient="records")


def pickup(weeks):
    # https://www.zhihu.com/question/381784377/answer/1099438784
    # https://github.com/Colerar/abv
    XOR_CODE = 23442827791579
    MASK_CODE = 2251799813685247
    MAX_AID = 1 << 51
    BASE = 58
    BV_LEN = 12
    ALPHABET = "FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf"

    table = {}
    for i in range(58):
        table[ALPHABET[i]] = i

    def av2bv(avid):
        bv_list = list("BV1000000000")
        bv_idx = BV_LEN - 1
        tmp = (MAX_AID | avid) ^ XOR_CODE
        while tmp != 0:
            bv_list[bv_idx] = ALPHABET[tmp % BASE]
            tmp //= BASE
            bv_idx -= 1
        bv_list[3], bv_list[9] = bv_list[9], bv_list[3]
        bv_list[4], bv_list[7] = bv_list[7], bv_list[4]
        return "".join(bv_list)

    def bv2av(bvid):
        bv_list = list(bvid)
        bv_list[3], bv_list[9] = bv_list[9], bv_list[3]
        bv_list[4], bv_list[7] = bv_list[7], bv_list[4]
        tmp = 0
        for char in bv_list[3:]:
            idx = table[char]
            tmp = tmp * BASE + idx
        avid = (tmp & MASK_CODE) ^ XOR_CODE
        return avid

    pickup_path = f"./DATA/{weeks:03d}期pickup.txt"
    if not os.path.exists(pickup_path):
        print(f"pickup 文件不存在，已创建空文件：{pickup_path}")
        with open(pickup_path, "w", encoding="utf-8"):
            pass
        raise FileNotFoundError(pickup_path)
    with open(pickup_path, "r", encoding="utf-8") as f:
        content = f.read()
    pickups = list(
        re.finditer(r"(?m)^(BV1[0-9A-Za-z]{9})\n([^\n]+)\n([^\n]+)\n([^\n]+)$", content)
    )
    if not pickups:
        print(f"pickup 未找到推荐：{weeks}")
        return []
    old_marker = re.search(r"(?m)^旧作 pick$", content)
    old_start = sum(match.start() < old_marker.start() for match in pickups) if old_marker else 0
    if not 0 < old_start < len(pickups):
        old_start = len(pickups) // 2
    infos = reduce(
        lambda x, y: {**x, **y},
        [getinfo(bv2av(match[1])) for match in pickups],
    )
    jsondata = [
        {
            "rank": -(x + 4) if x < old_start else -(x - old_start + 1),
            "av": bv2av(match[1]),
            "offset": 0,
            "title": infos[bv2av(match[1])]["title"],
            "up": infos[bv2av(match[1])]["owner"],
            "pubdate": infos[bv2av(match[1])]["pubdate"],
            "type": f"{match[2]}\\n\\n{match[3]}",
            "comment": match[4],
        }
        for x, match in enumerate(pickups)
    ]
    return jsondata


def lastrank(weeks):
    rankdata = {
        x["av"]: x["rank"]
        for x in json.load(
            open(f"./DATA/{weeks - 1:03d}期数据.json", "r", encoding="utf-8")
        )
        if (x["rank"] > 0 and x["rank"] <= 100)
    }
    database = []
    for w in range(376, weeks):
        database += json.load(open(f"./DATA/{w:03d}期数据.json", "r", encoding="utf-8"))
    offsetdata = {}
    for d in database:
        if d["offset"] > 0 and d["rank"] > 0 and d["rank"] <= 100:
            if offsetdata.get(d["av"]):
                offsetdata[d["av"]].append(d["offset"])
            else:
                offsetdata[d["av"]] = [d["offset"]]
    for k, v in offsetdata.items():
        offsetdata[k] = list(set(v))
    return rankdata, offsetdata


def rankdoor(rank, weeks):
    result = [[x["rank"], f"av{x['av']}"] for x in rank if x["rank"] <= 20]
    result.sort(key=lambda z: z[0], reverse=True)
    with open(f"{weeks:03d}_rankdoor.csv", "w", encoding="utf-8-sig") as f:
        f.writelines(
            [
                f"{x[0] if x[0] > 0 else '旧作' if x[0] >= -3 else '新作'},{x[1]}\n"
                for x in result
            ]
        )


def main(weeks):
    this = json.loads(readExcel(f"./DATA/{weeks:03d}期数据.xlsx", weeks))
    last_rank, last_offset = lastrank(weeks)
    for x in this:
        x["last"] = last_rank.get(x["av"]) if last_rank.get(x["av"]) else "null"
        offsets = last_offset.get(x["av"])
        x["offset"] = x["offset"] if x["offset"] else offsets[-1] if offsets else 0
    this += pickup(weeks)
    rankdoor(this, weeks)
    json.dump(
        this,
        open(f"./DATA/{weeks:03d}期数据.json", "w", encoding="utf-8"),
        ensure_ascii=False,
        indent=4,
    )


if __name__ == "__main__":
    weeks, is_pickup = parse_args()
    if is_pickup:
        pickup_aggregation(weeks)
    else:
        main(weeks if weeks is not None else default_weeks())
