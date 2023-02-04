import os

import easyocr

newlist = [
    file
    for file in os.listdir("./VIDEO/")
    if file.endswith(".jpg") and file.startswith("new_")
]
oldlist = [
    file
    for file in os.listdir("./VIDEO/")
    if file.endswith(".jpg") and file.startswith("old_")
]

reader = easyocr.Reader(["en"])
with open("ocresult.txt", "w", encoding="utf-8-sig") as f:
    for file in newlist:
        result = reader.readtext(f"./VIDEO/{file}", detail=0)
        f.write("".join(result) + "\n")
    for file in oldlist:
        result = reader.readtext(f"./VIDEO/{file}", detail=0)
        f.write("".join(result) + "\n")
