# -*- coding: utf-8 -*-

import os
import sys

import cv2
import numpy as np


def search(orig, target):
    orig_img = cv2.imread(f"./VIDEO/{orig}.jpg")
    orig_gray = cv2.cvtColor(orig_img, cv2.COLOR_BGR2GRAY)
    template = cv2.imread(f"./{target}.jpg", 0)
    result = cv2.matchTemplate(orig_gray, template, cv2.TM_CCOEFF_NORMED)
    loc = np.where(result >= 0.9)
    x, y = loc[0], loc[1]
    if len(x) and len(y):
        cropped_image = orig_img[625:664, 210:437]
        cv2.imwrite(f"./VIDEO/{target}_{orig}.jpg", cropped_image)


def duplicate(orig, target):
    orig_img = cv2.imread(f"./VIDEO/{orig}")
    orig_gray = cv2.cvtColor(orig_img, cv2.COLOR_BGR2GRAY)
    template = cv2.imread(f"./VIDEO/{target}", 0)
    result = cv2.matchTemplate(orig_gray, template, cv2.TM_CCOEFF_NORMED)
    loc = np.where(result >= 0.9)
    x, y = loc[0], loc[1]
    if len(x) and len(y):
        return True
    else:
        return False


if __name__ == "__main__":
    old = False
    new = False
    for file in range(42):
        if not old:
            old = search(f"{sys.argv[1]}_{file + 1:0>3}", "old")
        if not new:
            new = search(f"{sys.argv[1]}_{file + 1:0>3}", "new")
    checklist = [
        file
        for file in os.listdir("./VIDEO/")
        if file.endswith(".jpg")
        and (
            file.startswith(f"old_{sys.argv[1]}")
            or file.startswith(f"new_{sys.argv[1]}")
        )
    ]
    start = 0
    while True:
        end = len(checklist)
        if start + 1 == end:
            print(checklist)
            break
        if duplicate(checklist[start], checklist[start + 1]):
            os.remove(f"./VIDEO/{checklist[start + 1]}")
            checklist.pop(start + 1)
        else:
            start += 1
    for file in range(42):
        os.remove(f"./VIDEO/{sys.argv[1]}_{file + 1:0>3}.jpg")
