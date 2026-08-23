# -*- coding: utf-8 -*-

import argparse
import json
import logging
import subprocess
from concurrent.futures import ThreadPoolExecutor
from math import floor
from os import cpu_count, makedirs
from os.path import abspath, join
from tempfile import TemporaryDirectory

import arrow
import requests
from PIL import Image
from selenium.webdriver import Edge
from selenium.webdriver.edge.options import Options
from selenium.webdriver.edge.service import Service

text_font = abspath("./FOOTAGE/FONT/Hiragino Sans GB W3_[HiraginoSansGB-W3].otf")
emoji_font = abspath("./FOOTAGE/FONT/Noto Emoji_[NotoEmoji-Regular].ttf")


def default_weeks():
    return floor(
        (int(arrow.now("Asia/Shanghai").timestamp()) - 1428681600) / 3600 / 24 / 7
    )


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--weeks", "-w", type=int, default=default_weeks(), help="指定期数")
    parser.add_argument("--pickup", action="store_true", help="生成 pickup 图片素材")
    args = parser.parse_args()
    return args.weeks, args.pickup


def folder(output_folder):
    return f"./FOOTAGE/No.{output_folder}"


def open_browser():
    logging.getLogger("selenium.webdriver.common.selenium_manager").setLevel(
        logging.ERROR
    )
    browser_options = Options()
    browser_options.add_argument("--headless")
    browser_options.add_argument("--disable-infobars")
    browser_options.add_argument("--log-level=3")
    browser_options.add_argument("--silent")
    browser_options.add_argument("--window-size=1100,200")
    browser_options.add_argument("--window-position=-2400,-2400")
    browser_options.add_experimental_option("excludeSwitches", ["enable-logging"])
    service = Service(log_output=subprocess.DEVNULL)
    browser = Edge(options=browser_options, service=service)
    browser.execute_cdp_cmd(
        "Emulation.setDefaultBackgroundColorOverride",
        {"color": {"r": 0, "g": 0, "b": 0, "a": 0}},
    )
    return browser


def cover_workers():
    return min(8, cpu_count() or 1)


def text_workers():
    return min(4, cpu_count() or 1)


def downcover(data):
    rank, aid, link, destination = data
    try:
        response = requests.get(f"{link}@640w_400h.jpg")
    except requests.exceptions.MissingSchema:
        print(f"requests.exceptions.MissingSchema: av{aid}\n")
        return
    print(destination)
    with open(destination, "wb") as f:
        f.write(response.content)


def text2img(data):
    name, text, size, output_folder = data
    destination = f"{folder(output_folder)}/TEXT/{name}.png"
    with TemporaryDirectory() as temp_dir:
        html_path = join(temp_dir, f"{name}.html")
        html_content = f"""<html>
            <head>
                <style type="text/css">
                    @font-face {{
                        font-family: "MAD";
                        src: url("{text_font}");
                    }}
                    @font-face {{
                        font-family: "Emoji";
                        src: url("{emoji_font}");
                    }}
                    body {{
                        font-family: MAD, Emoji, Segoe UI, Segoe UI Historic, Segoe UI Emoji, sans-serif;
                        font-size: {size}px;
                        overflow: hidden;
                        white-space: nowrap;
                        text-overflow: ellipsis;
                        text-align: left;
                        color: #FFFFFF;
                        padding: 20px 20px 20px 20px;
                    }}
                </style>
            </head>
            <body>
                <p>{text}</p>
            </body>
        </html>"""
        with open(html_path, "w", encoding="utf-8-sig") as f:
            f.write(html_content)

        browser = open_browser()
        try:
            browser.get(f"file://{abspath(html_path)}")
            print(destination)
            browser.save_screenshot(destination)
        finally:
            browser.quit()
    crop(destination)


def crop(destination):
    img = Image.open(destination).convert("RGBA")
    alpha = img.getchannel("A")
    x, y = img.size
    i = 0
    while i <= x:
        if any(alpha.getpixel((i, z)) != 0 for z in range(y)):
            break
        i += 1
    j = x - 1
    while j >= 0:
        if any(alpha.getpixel((j, z)) != 0 for z in range(y)):
            break
        j -= 1
    k = y - 1
    while k >= 0:
        if any(alpha.getpixel((z, k)) != 0 for z in range(x)):
            break
        k -= 1
    img = img.crop((i, 0) + (j, k))
    img.save(destination)


def main(weeks):
    output_folder = str(weeks)
    with open(f"./DATA/{weeks:03d}期数据.json", "r", encoding="utf-8") as f:
        this = json.load(f)
    with ThreadPoolExecutor(max_workers=cover_workers()) as executor:
        list(
            executor.map(
                downcover,
                [
                    (
                        x["rank"],
                        x["av"],
                        x["cover"],
                        f"{folder(output_folder)}/COVER/{x['rank']}_av{x['av']}.jpg",
                    )
                    for x in this
                    if (x["rank"] > 20 and x["rank"] <= 100)
                ],
            )
        )
    with ThreadPoolExecutor(max_workers=text_workers()) as executor:
        list(
            executor.map(
                text2img,
                [
                    (
                        f"{x['rank']}_av{x['av']}",
                        x["title"],
                        25 if x["rank"] >= 21 else 35,
                        output_folder,
                    )
                    for x in this
                ],
            )
        )


def pickup():
    with open("./DATA/pickup.json", "r", encoding="utf-8") as f:
        this = json.load(f)
    with ThreadPoolExecutor(max_workers=text_workers()) as executor:
        list(
            executor.map(
                text2img,
                [(f"{x['rank']}_av{x['av']}", x["title"], 35, "pickup") for x in this],
            )
        )


if __name__ == "__main__":
    weeks, is_pickup = parse_args()
    if is_pickup:
        makedirs("./FOOTAGE/No.pickup/TEXT", exist_ok=True)
        pickup()
    else:
        makedirs(f"./FOOTAGE/No.{weeks}/COVER", exist_ok=True)
        makedirs(f"./FOOTAGE/No.{weeks}/TEXT", exist_ok=True)
        main(weeks)
