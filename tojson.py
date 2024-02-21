# -*- coding: utf-8 -*-

import json
from functools import reduce
from math import floor

import arrow
import requests
from pandas import read_excel

WEEKS = floor(
    (int(arrow.now("Asia/Shanghai").timestamp()) - 1428681600) / 3600 / 24 / 7
)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0"


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
            "title": None if code else result["data"].get("title"),
            "duration": None if code else result["data"].get("duration"),
            "owner": None if code else result["data"]["owner"].get("name"),
            "pic": None if code else result["data"].get("pic"),
            "pubdate": (
                None
                if code
                else arrow.get(
                    result["data"].get("pubdate"), tzinfo="Asia/Shanghai"
                ).format("YYYY-MM-DD HH:mm")
            ),
        }
    }


def readExcel(filename):
    print(f"\n加载文件\n\t{filename}")
    df = read_excel(filename)
    for extra_col in ("last", "cover", "duration", "pubdate", "offset"):
        if extra_col in df.columns:
            pass
        else:
            df.insert(0, extra_col, [0] * len(df.index))
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

    print("\n获取视频信息...")
    videoinfo = reduce(
        lambda x, y: {**x, **y},
        [
            getinfo(int(df.at[x, "av"]))
            for x in df.index
            if df.at[x, "av"] != "av" and df.at[x, "rank"] <= 150
        ],
    )

    for x in df.index:
        if df.at[x, "rank"] <= 150:
            df.at[x, "cover"] = videoinfo[int(df.at[x, "av"])]["pic"]
            df.at[x, "pubdate"] = videoinfo[int(df.at[x, "av"])]["pubdate"]
            df.at[x, "duration"] = videoinfo[int(df.at[x, "av"])]["duration"]
            df.at[x, "up"] = (
                videoinfo[int(df.at[x, "av"])]["owner"]
                if videoinfo[int(df.at[x, "av"])]["owner"] is not None
                else df.at[x, "up"]
            )
            df.at[x, "title"] = (
                videoinfo[int(df.at[x, "av"])]["title"]
                if videoinfo[int(df.at[x, "av"])]["title"] is not None
                else df.at[x, "title"]
            )
    df.to_excel(f"./DATA/{WEEKS:03d}期数据.xlsx", index=False)
    # with open(f"./DATA/{WEEKS:03d}期数据.json", "w", encoding="utf-8") as f:
    #     df[0:100].to_json(f, orient="records", force_ascii=False)
    reorder = "rank;last;av;offset;up;pubdate;title;分;点;评;弹;藏;币;duration;cover"
    return df[reorder.split(";")][:100].to_json(orient="records")


def pickup():
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

    def av2bv(avid: int):
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

    def bv2av(bvid: str):
        bv_list = list(bvid)
        bv_list[3], bv_list[9] = bv_list[9], bv_list[3]
        bv_list[4], bv_list[7] = bv_list[7], bv_list[4]
        tmp = 0
        for char in bv_list[3:]:
            idx = table[char]
            tmp = tmp * BASE + idx
        avid = (tmp & MASK_CODE) ^ XOR_CODE
        return avid

    pickups = [
        line.strip("\n")
        for line in open(f"./DATA/{WEEKS:03d}期pickup.txt", "r", encoding="utf-8")
        if line.strip("\n") != ""
    ]
    infos = reduce(
        lambda x, y: {**x, **y},
        [getinfo(bv2av(pickups[4 * x])) for x in range(len(pickups) // 4)],
    )
    jsondata = [
        {
            "rank": -(x + 4) if x < len(pickups) // 8 else -(x - 1),
            "av": bv2av(pickups[4 * x + 0]),
            "offset": 0,
            "title": infos[bv2av(pickups[4 * x + 0])]["title"],
            "up": infos[bv2av(pickups[4 * x + 0])]["owner"],
            "pubdate": infos[bv2av(pickups[4 * x + 0])]["pubdate"],
            "type": f"{pickups[4 * x + 1]}\\n\\n{pickups[4 * x + 2]}",
            "comment": pickups[4 * x + 3],
        }
        for x in range(len(pickups) // 4)
    ]
    return jsondata


def lastrank():
    rankdata = {
        x["av"]: x["rank"]
        for x in json.load(
            open(f"./DATA/{WEEKS-1:03d}期数据.json", "r", encoding="utf-8")
        )
        if (x["rank"] > 0 and x["rank"] <= 100)
    }
    database = reduce(
        list.__add__,
        [
            json.load(open(f"./DATA/{w:03d}期数据.json", "r", encoding="utf-8"))
            for w in range(376, WEEKS)
        ],
    )
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


def rankdoor(rank):
    result = [
        [
            x["rank"],
            f"av{x['av']}",
        ]
        for x in rank
        if x["rank"] <= 20
    ]
    result.sort(key=lambda z: z[0], reverse=True)
    with open(f"{WEEKS:03d}_rankdoor.csv", "w", encoding="utf-8-sig") as f:
        f.writelines(
            [
                f"{x[0] if x[0] > 0 else '旧作' if x[0] >= -3 else '新作'},{x[1]}\n"
                for x in result
            ]
        )


def main():
    this = json.loads(readExcel(f"./DATA/{WEEKS}期数据.xlsx"))
    last_rank, last_offset = lastrank()
    for x in this:
        x["last"] = last_rank.get(x["av"]) if last_rank.get(x["av"]) else "null"
        x["offset"] = last_offset.get(x["av"])[-1] if last_offset.get(x["av"]) else 0
    this += pickup()
    rankdoor(this)
    json.dump(
        this,
        open(f"./DATA/{WEEKS:03d}期数据.json", "w", encoding="utf-8"),
        ensure_ascii=False,
        indent=4,
    )


if __name__ == "__main__":
    main()
