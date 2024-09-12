# -*- coding: utf-8 -*-

import json
from os import remove, makedirs
from os.path import abspath
import sys
import requests
from PIL import Image
from selenium.webdriver import Chrome
from selenium.webdriver.chrome.options import Options

from tojson import WEEKS

browser_options = Options()
browser_options.add_argument("headless")
browser_options.add_argument("disable-infobars")
browser = Chrome(options=browser_options)
browser.set_window_size(1100, 200)
command = f"/session/{browser.session_id}/chromium/send_command_and_get_result"
url = browser.command_executor._url + command
data = json.dumps(
    {
        "cmd": "Emulation.setDefaultBackgroundColorOverride",
        "params": {"color": {"r": 0, "g": 0, "b": 0, "a": 0}},
    }
)
browser.command_executor._request("POST", url, data)
text_font = abspath("./FOOTAGE/FONT/Hiragino Sans GB W3.otf").replace("\\", "/")
emoji_font = abspath("./FOOTAGE/FONT/Noto Emoji.ttf").replace("\\", "/")


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

    browser.get(f'file://{abspath("TEXT.html")}')
    print(f"./FOOTAGE/No.{WEEKS}/TEXT/{name}.png")
    browser.save_screenshot(f"./FOOTAGE/No.{WEEKS}/TEXT/{name}.png")


def crop(name):
    img = Image.open(f"./FOOTAGE/No.{WEEKS}/TEXT/{name}.png")
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
    img.save(f"./FOOTAGE/No.{WEEKS}/TEXT/{name}.png")


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
    this = json.load(open("./pickup.json", "r", encoding="utf-8"))
    for x in this:
        text2img(f"{x['rank']}_av{x['av']}", x["title"], text_font, emoji_font, 35)
        crop(f"{x['rank']}_av{x['av']}")

    remove("./TEXT.html")
    browser.quit()


if __name__ == "__main__":
    makedirs(f"./FOOTAGE/No.{WEEKS}/COVER", exist_ok=True)
    makedirs(f"./FOOTAGE/No.{WEEKS}/TEXT", exist_ok=True)
    if len(sys.argv) > 1 and sys.argv[1] == "pickup":
        pickup()
    else:
        main()
