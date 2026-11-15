"""Build the 'Bảo Dương moto' logos from the existing scooter icon + a Montserrat wordmark.

Usage: python3 scripts/make-logo.py <Montserrat[wght].ttf> <dir with the original logo.png & sub-logo.png>
Writes assets/images/logo.png (white, 54px high) and assets/images/sub-logo.png (black text, 166px high).
"""
import sys, pathlib
from PIL import Image, ImageDraw, ImageFont

FONT, SRC = sys.argv[1], pathlib.Path(sys.argv[2])
OUT = pathlib.Path(__file__).resolve().parent.parent / 'assets' / 'images'
LINE1, LINE2 = 'BẢO DƯƠNG', 'MOTO'


def font(size, weight):
    f = ImageFont.truetype(FONT, size)
    f.set_variation_by_name(weight)
    return f


def tracked(draw, xy, text, f, fill, track):
    """Draw text with extra letter spacing; returns the drawn width."""
    x, y = xy
    for i, ch in enumerate(text):
        draw.text((x, y), ch, font=f, fill=fill, anchor='ls')
        x += draw.textlength(ch, font=f) + (track if i < len(text) - 1 else 0)
    return x - xy[0]


def width(draw, text, f, track):
    return sum(draw.textlength(c, font=f) for c in text) + track * (len(text) - 1)


def build(src_name, icon_w, h, gap, fill, scale_out):
    """Render at 4x then downsample for clean edges."""
    k = 4
    icon = Image.open(SRC / src_name).crop((0, 0, icon_w, h))
    H = h * k
    f1 = font(int(H * 0.40), 'ExtraBold')
    probe = ImageDraw.Draw(Image.new('RGBA', (10, 10)))
    w1 = width(probe, LINE1, f1, 0)
    # line 2 is spread to the same width as line 1
    f2 = font(int(H * 0.40), 'ExtraBold')
    w2 = width(probe, LINE2, f2, 0)
    track2 = (w1 - w2) / (len(LINE2) - 1)
    text_x = icon_w * k + gap * k
    W = int(text_x + w1 + k * 2)
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    im.paste(icon.resize((icon_w * k, H), Image.LANCZOS), (0, 0))
    d = ImageDraw.Draw(im)
    tracked(d, (text_x, H * 0.47), LINE1, f1, fill, 0)
    tracked(d, (text_x, H * 0.96), LINE2, f2, fill, track2)
    im = im.resize((round(W / k), h), Image.LANCZOS)
    im.save(OUT / src_name, optimize=True)
    return im.size


print('logo.png', build('logo.png', 54, 54, 10, (255, 255, 255, 255), 1))
print('sub-logo.png', build('sub-logo.png', 166, 166, 34, (0, 0, 0, 255), 1))
