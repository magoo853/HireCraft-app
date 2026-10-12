#!/usr/bin/env python3
"""Generate the HireCraft iOS icon set from the SVG master.

Why a script? The GitHub file API used for pushes stores content as text,
so binary PNGs can't be pushed through it. The SVG master + this script live
in the repo; PNGs are generated locally (or in CI) and dropped into the
Xcode asset catalog.

Usage:  python3 ios-assets/generate-icons.py
Output: ios-assets/icons/AppIcon-<size>.png  (+ AppIcon-1024.png master)

Requires: cairosvg  (pip install cairosvg)
"""
import os
import sys

try:
    import cairosvg
except ImportError:
    sys.exit("cairosvg not installed: pip install cairosvg")

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "icons")
os.makedirs(OUT, exist_ok=True)

# iOS AppIcon sizes (points x scale). 1024 master has no rounded corners
# applied by us — Apple masks it.
SIZES = [1024, 180, 167, 152, 120, 87, 80, 60, 58, 40, 29, 20]

SRC = os.path.join(HERE, "icon.svg")
for s in SIZES:
    dest = os.path.join(OUT, f"AppIcon-{s}.png")
    cairosvg.svg2png(url=SRC, write_to=dest, output_width=s, output_height=s)
    print("wrote", dest)

print("done:", len(SIZES), "icons in", OUT)
print("Copy into: ios/App/App/Assets.xcassets/AppIcon.appiconset/")
