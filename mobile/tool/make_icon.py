"""Generate MPOnline launcher + splash artwork.

Source glyph: Google Material Symbols (Apache 2.0, free, no attribution
required) - 'account_balance' landmark mark rendered from the official
MaterialIcons-Regular.ttf in white on the app ink-indigo gradient.
"""
from PIL import Image, ImageDraw, ImageFont

SIZE = 1024
TOP = (11, 16, 38)      # ink #0B1026
BOTTOM = (49, 46, 129)  # indigo #312E81
GLYPH = 0xE84F          # account_balance (filled)

font = ImageFont.truetype("assets/icon/MaterialIcons-Regular.ttf", 640)
bbox = font.getbbox(chr(GLYPH))
assert bbox[2] - bbox[0] > 10 and bbox[3] - bbox[1] > 10, "glyph missing!"

# Full-bleed gradient base
base = Image.new("RGB", (SIZE, SIZE))
px = base.load()
for y in range(SIZE):
    t = y / (SIZE - 1)
    # slight diagonal feel: blend factor varies with x too
    for x in range(0, SIZE, 4):
        tt = min(1.0, max(0.0, (t + x / SIZE * 0.25) / 1.25))
        px[x, y] = tuple(int(TOP[i] + (BOTTOM[i] - TOP[i]) * tt) for i in range(3))
        if x + 4 < SIZE:
            for xx in range(x + 1, min(x + 4, SIZE)):
                px[xx, y] = px[x, y]

# Saffron baseline accent bar
draw = ImageDraw.Draw(base)
draw.rectangle([0, SIZE - 64, SIZE, SIZE], fill=(245, 158, 11))

# White landmark glyph, optically centered (above the accent bar)
glyph_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
gd = ImageDraw.Draw(glyph_layer)
ch = chr(GLYPH)
bb = gd.textbbox((0, 0), ch, font=font)
w, h = bb[2] - bb[0], bb[3] - bb[1]
gd.text(((SIZE - w) / 2 - bb[0], (SIZE - 64 - h) / 2 - bb[1]), ch, font=font, fill=(255, 255, 255, 255))
base = Image.alpha_composite(base.convert("RGBA"), glyph_layer).convert("RGB")
base.save("assets/icon/app_icon.png")

# Adaptive foreground: transparent with white glyph only
fg = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
fd = ImageDraw.Draw(fg)
font_fg = ImageFont.truetype("assets/icon/MaterialIcons-Regular.ttf", 680)
bb = fd.textbbox((0, 0), ch, font=font_fg)
w, h = bb[2] - bb[0], bb[3] - bb[1]
fd.text(((SIZE - w) / 2 - bb[0], (SIZE - h) / 2 - bb[1]), ch, font=font_fg, fill=(255, 255, 255, 255))
fg.save("assets/icon/app_icon_fg.png")
print("wrote assets/icon/app_icon.png + app_icon_fg.png")
