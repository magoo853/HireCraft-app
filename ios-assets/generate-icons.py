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

# --- Splash screens + populate the Xcode asset catalog when it exists ---
import re
import shutil

_raw = open(SRC).read()
_inner = re.sub(r"^.*?<svg[^>]*>", "", _raw, flags=re.S)
_inner = re.sub(r"</svg>\s*$", "", _inner)
_splash_svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732">'
    '<rect width="2732" height="2732" fill="#0B3B2E"/>'
    f'<g transform="translate(854,854)">{_inner}</g></svg>'
)
_splash_src = os.path.join(HERE, "splash-composed.svg")
open(_splash_src, "w").write(_splash_svg)
SPLASH_NAMES = ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]
for _name in SPLASH_NAMES:
    cairosvg.svg2png(url=_splash_src, write_to=os.path.join(OUT, _name), output_width=2732, output_height=2732)
print("wrote splash PNGs")

_assets = os.path.join(os.path.dirname(HERE), "ios", "App", "App", "Assets.xcassets")
if os.path.isdir(_assets):
    shutil.copy(os.path.join(OUT, "AppIcon-1024.png"),
                os.path.join(_assets, "AppIcon.appiconset", "AppIcon-512@2x.png"))
    for _name in SPLASH_NAMES:
        shutil.copy(os.path.join(OUT, _name), os.path.join(_assets, "Splash.imageset", _name))
    print("asset catalog populated:", _assets)
else:
    print("ios/ project not found — icon + splash PNGs are in", OUT)
