# -*- coding: utf-8 -*-

import json
from os import listdir, remove
from os.path import abspath

from selenium.webdriver import Chrome
from selenium.webdriver.chrome.options import Options

from tojson import WEEKS

browser_options = Options()
browser_options.add_argument("--headless")
browser = Chrome(options=browser_options)
browser.set_window_size(1280, 200)
command = f"/session/{browser.session_id}/chromium/send_command_and_get_result"
url = browser.command_executor._url + command
data = json.dumps(
    {
        "cmd": "Emulation.setDefaultBackgroundColorOverride",
        "params": {"color": {"r": 0, "g": 0, "b": 0, "a": 0}},
    }
)
browser.command_executor._request("POST", url, data)
for file in listdir("./TEXT/"):
    remove(f"./TEXT/{file}")


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
                    word-break: keep-all;
                    word-wrap: break-word;
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
    print(f"./TEXT/{name}.png")
    browser.save_screenshot(f"./TEXT/{name}.png")


def main():
    text_font = abspath("./FONT/Hiragino Sans GB W3.otf").replace("\\", "/")
    emoji_font = abspath("./FONT/Noto Emoji.ttf").replace("\\", "/")

    this = json.load(open(f"{WEEKS:03d}期数据.json", "r", encoding="utf-8"))
    for x in this:
        if x["rank"] >= 21:
            text2img(f"{x['rank']}_av{x['av']}", x["title"], text_font, emoji_font, 25)
        else:
            text2img(f"{x['rank']}_av{x['av']}", x["title"], text_font, emoji_font, 35)

    remove("./TEXT.html")
    browser.quit()


if __name__ == "__main__":
    main()
