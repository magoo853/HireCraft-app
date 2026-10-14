#!/bin/bash
# Installs the app icon + splash images into the Xcode asset catalog.
# The PNGs travel through git as base64 text (the push API is text-only);
# this decodes them into place. No installs needed — base64 ships with macOS.
set -e
cd "$(dirname "$0")/.."
A="ios/App/App/Assets.xcassets"
base64 -d ios-assets/icon-1024.base64.txt > "$A/AppIcon.appiconset/AppIcon-512@2x.png"
# Splash payload is the FULL 2732x2732 raster of ios-assets/splash.svg
# (splash-2732.base64.txt). The old splash-1024.base64.txt payload was a
# 1024x1024 image that this script used to install under the 2732 names —
# a quarter-resolution overwrite; do not reintroduce it.
base64 -d ios-assets/splash-2732.base64.txt > /tmp/hc-splash.png
cp /tmp/hc-splash.png "$A/Splash.imageset/splash-2732x2732.png"
cp /tmp/hc-splash.png "$A/Splash.imageset/splash-2732x2732-1.png"
cp /tmp/hc-splash.png "$A/Splash.imageset/splash-2732x2732-2.png"
echo "✓ App icon + splash installed into $A"
