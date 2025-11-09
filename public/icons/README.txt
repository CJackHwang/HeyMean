Place raster PNG icons here for the PWA manifest.

Required files referenced by manifest.webmanifest:
- icon-192.png (192x192, purpose: any)
- icon-512.png (512x512, purpose: any)
- icon-192-maskable.png (192x192, purpose: maskable)
- icon-512-maskable.png (512x512, purpose: maskable)
- icon-180.png (180x180, Apple touch icon)

Maskable safe zone: keep critical graphics within the inner 40% circle/rounded square.
The outer 10–20% may be clipped by device masks (circles, squircles).

How to export from SVG:
- Any vector tool (Figma/Sketch/Illustrator): export at the exact pixel sizes above.
- CLI examples (if you have tools installed):
  - Inkscape: inkscape -o icon-512.png -w 512 -h 512 ../heymeanlogo.svg
  - rsvg-convert: rsvg-convert -w 512 -h 512 ../heymeanlogo.svg > icon-512.png

Tip: Create a maskable version with extra padding around the logo to avoid clipping.
