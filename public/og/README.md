# OG Image Setup

The OG image placeholder is provided as `og-image.svg`. To use it for social sharing, convert it to PNG format at 1200x630 pixels.

## Quick Conversion Options

1. **Online Tools:**
   - https://cloudconvert.com/svg-to-png
   - https://convertio.co/svg-png/
   - Upload `og-image.svg`, set dimensions to 1200x630, download as PNG

2. **Design Tools:**
   - Open `og-image.svg` in Figma, Adobe Illustrator, or similar
   - Export as PNG at 1200x630px
   - Save as `og-image.png` in `public/og/`

3. **Command Line (if tools installed):**
   ```bash
   # Using ImageMagick
   convert -background none -resize 1200x630 og-image.svg og-image.png
   
   # Using Inkscape
   inkscape og-image.svg --export-filename=og-image.png --export-width=1200 --export-height=630
   ```

## Current Status

- ✅ SVG placeholder created at `public/og/og-image.svg`
- ⚠️ PNG conversion needed: `public/og/og-image.png` (1200x630)

Once converted, the metadata will automatically use the PNG file for Open Graph and Twitter Cards.
