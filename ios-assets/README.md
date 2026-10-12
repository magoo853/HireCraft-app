# ios-assets

App icon + splash for the HireCraft iOS shell.

- `icon.svg` — master artwork (deep navy `#0B3B2E` → `#065F46` gradient,
  white "H" pillars, emerald `#34D399` upward tick).
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
