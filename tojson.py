# -*- coding: utf-8 -*-

import json
from functools import reduce
from math import floor
from os.path import abspath
from os import listdir, remove

import arrow
import requests
from pandas import read_excel

WEEKS = floor((int(arrow.now().timestamp()) - 1428681600) / 3600 / 24 / 7)


def getcover(aid):
    headers = {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36",
    }
    params = {
        "aid": aid,
    }
    resp = requests.get(
        "https://api.bilibili.com/x/web-interface/view", params=params, headers=headers
    )
    result = json.loads(resp.content)
    if result.get("code") == 0:
        origin = result["data"].get("title")
        return {
            aid: {
                "pic": result["data"].get("pic"),
                "pubdate": arrow.get(result["data"].get("pubdate")).format(
                    "YYYY-MM-DD HH:mm"
                ),
                "title": origin,
                "owner": result["data"]["owner"].get("name"),
            }
        }
    else:
        print(f"av{aid} 封面获取失败: {result}")
        return {
            aid: {
                "pic": None,
                "pubdate": result.get("code"),
                "title": None,
                "owner": "",
            }
        }


def downcover(rank, aid, link):
    try:
        response = requests.get(f"{link}@640w_400h.jpg")
    except requests.exceptions.MissingSchema:
        print(f"requests.exceptions.MissingSchema: av{aid}\n")
        return None
    with open(f"./COVER/{rank}_av{aid}.jpg", "wb") as f:
        f.write(response.content)


def readExcel(filename):
    print(f"\n加载文件\n\t{abspath(filename)}")
    df = read_excel(filename)
    print(f"\n加载文件\n\t{abspath('周刊除外.csv')}")
    ex_aids = [int(line.strip("\n")) for line in open("周刊除外.csv", "r")]
    for aid in ex_aids:
        exclude = df.loc[df["av"] == aid].index
        df = df.drop(exclude)
        df = df.sort_index().reset_index(drop=True)
    columns = df.columns.to_list()
    df.insert(columns.index("av") + 1, "pubdate", [i + 1 for i in range(len(df.index))])
    df.insert(columns.index("av") + 1, "offset", [0] * len(df.index))
    for x in df.index:
        df.at[x, "rank"] = int(x + 1)

    print("\n获取视频封面...")
    covers = reduce(
        lambda x, y: {**x, **y},
        [
            getcover(int(df.at[x, "av"]))
            for x in df.index
            if df.at[x, "av"] != "av" and df.at[x, "rank"] <= 100
        ],
    )

    for x in df.index:
        if df.at[x, "rank"] <= 100:
            df.at[x, "pubdate"] = covers[int(df.at[x, "av"])]["pubdate"]
            df.at[x, "title"] = (
                covers[int(df.at[x, "av"])]["title"]
                if covers[int(df.at[x, "av"])]["title"] is not None
                else df.at[x, "title"]
            )

    for file in listdir("./COVER/"):
        remove(f"./COVER/{file}")
    list(
        map(
            downcover,
            [
                int(df.at[x, "rank"])
                for x in df.index
                if df.at[x, "rank"] != "rank"
                and df.at[x, "rank"] <= 100
                and df.at[x, "rank"] > 20
            ],
            [
                int(df.at[x, "av"])
                for x in df.index
                if df.at[x, "av"] != "av"
                and df.at[x, "rank"] <= 100
                and df.at[x, "rank"] > 20
            ],
            [
                covers[int(df.at[x, "av"])]["pic"]
                for x in df.index
                if df.at[x, "av"] != "av"
                and df.at[x, "rank"] <= 100
                and df.at[x, "rank"] > 20
            ],
        )
    )
    df[0:100].to_excel(f"{WEEKS:03d}期数据.xlsx", index=False)
    with open("./psdownload/download.txt", "w", encoding="utf-8") as f:
        f.writelines([f"av{x}\n" for x in df[0:20]["av"].tolist()])
    with open(f"{WEEKS:03d}期数据.json", "w", encoding="utf-8") as f:
        df[0:100].to_json(f, orient="records", force_ascii=False)


def pickup():
    table = "fZodR9XQDSUm21yCkr6zBqiveYah8bt4xsWpHnJE7jL5VG3guMTKNPAwcF"
    tr = {}
    for i in range(58):
        tr[table[i]] = i
    s = [11, 10, 3, 8, 4, 6]
    xor = 177451812
    add = 8728348608

    def dec(x):
        r = 0
        for i in range(6):
            r += tr[x[s[i]]] * 58**i
        return (r - add) ^ xor

    pickups = [
        line.strip("\n")
        for line in open("pickup.txt", "r", encoding="utf-8")
        if line.strip("\n") != ""
    ]

    infos = reduce(
        lambda x, y: {**x, **y},
        [getcover(dec(pickups[4 * x])) for x in range(len(pickups) // 4)],
    )
    with open("./psdownload/download.txt", "a", encoding="utf-8") as f:
        f.writelines([f"av{x}\n" for x in infos.keys()])
    jsondata = [
        {
            "rank": -(x + 4) if x < len(pickups) // 8 else -(x - 1),
            "av": dec(pickups[4 * x + 0]),
            "offset": 0,
            "title": infos[dec(pickups[4 * x + 0])]["title"],
            "up": infos[dec(pickups[4 * x + 0])]["owner"],
            "pubdate": infos[dec(pickups[4 * x + 0])]["pubdate"],
            "type": f"{pickups[4 * x + 1]}\\n\\n{pickups[4 * x + 2]}",
            "comment": pickups[4 * x + 3],
        }
        for x in range(len(pickups) // 4)
    ]
    return jsondata


def main():
    readExcel(f"{WEEKS}.xlsx")
    this = json.load(open(f"{WEEKS:03d}期数据.json", "r", encoding="utf-8"))
    last = json.load(open(f"{WEEKS-1:03d}期数据.json", "r", encoding="utf-8"))
    last_dict = {x["av"]: x["rank"] for x in last}
    for x in this:
        if last_dict.get(x["av"]):
            x["last"] = last_dict.get(x["av"])
        else:
            x["last"] = "null"
    this += pickup()
    json.dump(
        this, open(f"{WEEKS:03d}期数据.json", "w", encoding="utf-8"), ensure_ascii=False
    )


if __name__ == "__main__":
    main()
