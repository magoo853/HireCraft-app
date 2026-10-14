# ios-assets

App icon + splash for the ResumeRoadmap iOS shell.

- `icon.svg` — master artwork (full-bleed pine `#0B3B2E`, white "RR" with
  tonal `#10503C` perspective road and light-green `#A7F3D0` "AI" tag).
- `splash.svg` — launch screen artwork (2732×2732).
- `generate-icons.py` — renders the full AppIcon PNG set from the SVG master.
  Binary PNGs are intentionally **not** committed (the GitHub file API used
  for pushes is text-only). Run the script locally or in CI:

```bash
pip install cairosvg
python3 ios-assets/generate-icons.py
# → ios-assets/icons/AppIcon-1024.png, AppIcon-180.png, …
```

Then copy the set into
`ios/App/App/Assets.xcassets/AppIcon.appiconset/` after `npx cap add ios`.
