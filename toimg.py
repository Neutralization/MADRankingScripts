# -*- coding: utf-8 -*-

import json
import sys
from os import makedirs, remove
from os.path import abspath

import requests
from PIL import Image
from selenium.webdriver import Chrome
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager

from tojson import WEEKS

browser_options = Options()
browser_options.add_argument("--headless")
browser_options.add_argument("--disable-infobars")
browser_options.add_argument("--window-size=1100,200")
browser_options.add_argument("--window-position=-2400,-2400")
browser = Chrome(
    service=ChromeService(ChromeDriverManager().install()), options=browser_options
)
browser.execute_cdp_cmd(
    "Emulation.setDefaultBackgroundColorOverride",
    {"color": {"r": 0, "g": 0, "b": 0, "a": 0}},
)
text_font = abspath("./FOOTAGE/FONT/Hiragino Sans GB W3_[HiraginoSansGB-W3].otf")
emoji_font = abspath("./FOOTAGE/FONT/Noto Emoji_[NotoEmoji-Regular].ttf")


def folder():
    return "pickup" if len(sys.argv) > 1 and sys.argv[1] == "pickup" else WEEKS


def downcover(data):
    rank, aid, link = data
    try:
        response = requests.get(f"{link}@640w_400h.jpg")
    except requests.exceptions.MissingSchema:
        print(f"requests.exceptions.MissingSchema: av{aid}\n")
        return None
    print(f"./FOOTAGE/No.{WEEKS}/COVER/{rank}_av{aid}.jpg")
    with open(f"./FOOTAGE/No.{WEEKS}/COVER/{rank}_av{aid}.jpg", "wb") as f:
        f.write(response.content)


def text2img(name, text, font, emoji, size):
    html_content = f"""<html>
        <head>
            <style type="text/css">
                @font-face {{
                    font-family: "MAD";
                    src: url("{font}");
                }}
                @font-face {{
                    font-family: "Emoji";
                    src: url("{emoji}");
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

    with open("TEXT.html", "w", encoding="utf-8-sig") as f:
        f.write(html_content)

    browser.get(f"file://{abspath('TEXT.html')}")
    print(f"./FOOTAGE/No.{folder()}/TEXT/{name}.png")
    browser.save_screenshot(f"./FOOTAGE/No.{folder()}/TEXT/{name}.png")


def crop(name):
    img = Image.open(f"./FOOTAGE/No.{folder()}/TEXT/{name}.png")
    x, y = img.size
    i = 0
    while i <= x:
        if sum([img.getpixel((i, z))[-1] for z in range(y)]) != 0:
            break
        i += 1
    j = x - 1
    while j >= 0:
        if sum([img.getpixel((j, z))[-1] for z in range(y)]) != 0:
            break
        j -= 1
    k = y - 1
    while k >= 0:
        if sum([img.getpixel((z, k))[-1] for z in range(x)]) != 0:
            break
        k -= 1
    img = img.crop((i, 0) + (j, k))
    img.save(f"./FOOTAGE/No.{folder()}/TEXT/{name}.png")


def main():
    this = json.load(open(f"./DATA/{WEEKS:03d}期数据.json", "r", encoding="utf-8"))
    list(
        map(
            downcover,
            [
                (x["rank"], x["av"], x["cover"])
                for x in this
                if (x["rank"] > 20 and x["rank"] <= 100)
            ],
        )
    )
    for x in this:
        if x["rank"] >= 21:
            text2img(f"{x['rank']}_av{x['av']}", x["title"], text_font, emoji_font, 25)
        else:
            text2img(f"{x['rank']}_av{x['av']}", x["title"], text_font, emoji_font, 35)
        crop(f"{x['rank']}_av{x['av']}")

    remove("./TEXT.html")
    browser.quit()


def pickup():
    this = json.load(open("./DATA/pickup.json", "r", encoding="utf-8"))
    for x in this:
        text2img(f"{x['rank']}_av{x['av']}", x["title"], text_font, emoji_font, 35)
        crop(f"{x['rank']}_av{x['av']}")

    remove("./TEXT.html")
    browser.quit()


if __name__ == "__main__":
    makedirs(f"./FOOTAGE/No.{WEEKS}/COVER", exist_ok=True)
    makedirs(f"./FOOTAGE/No.{WEEKS}/TEXT", exist_ok=True)
    if len(sys.argv) > 1 and sys.argv[1] == "pickup":
        makedirs("./FOOTAGE/No.pickup/TEXT", exist_ok=True)
        pickup()
    else:
        main()
