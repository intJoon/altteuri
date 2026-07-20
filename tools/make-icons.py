import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

DST = Path(__file__).resolve().parents[1] / "extension"
FONT_PATH = Path(r"C:\Users\user\AppData\Local\Microsoft\Windows\Fonts\[KIM]WILDgag-Bold.ttf")

BLUE = (52, 106, 255, 255)
WHITE = (255, 255, 255, 255)

SS = 8


def render_glyph(ch: str, target_h: float) -> Image.Image:
    probe_size = 256
    font = ImageFont.truetype(str(FONT_PATH), probe_size)
    probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    bbox = probe.textbbox((0, 0), ch, font=font)
    ink_h = bbox[3] - bbox[1]
    font = ImageFont.truetype(str(FONT_PATH), round(probe_size * target_h / ink_h))
    bbox = probe.textbbox((0, 0), ch, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    m = math.ceil(max(w, h) * 0.05) + 2

    layer = Image.new("RGBA", (w + 2 * m, h + 2 * m), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.text((m - bbox[0], m - bbox[1]), ch, font=font, fill=WHITE)
    return layer


def paste_glyph(img: Image.Image, ch: str, cx: float, cy: float, target_h: float, mirror: bool = False):
    layer = render_glyph(ch, target_h)
    if mirror:
        layer = layer.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    img.alpha_composite(layer, (round(cx - layer.width / 2), round(cy - layer.height / 2)))


def make_icon(size: int) -> Image.Image:
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    pad = round(s * 0.02)
    radius = round(s * 0.24)
    d.rounded_rectangle((pad, pad, s - 1 - pad, s - 1 - pad), radius=radius, fill=BLUE)

    eye_h = s * 0.36
    eye_dx = s * 0.155
    eye_y = s * 0.34
    paste_glyph(img, "ㅇ", s / 2 - eye_dx, eye_y, eye_h)
    paste_glyph(img, "ㅇ", s / 2 + eye_dx, eye_y, eye_h, mirror=True)

    paste_glyph(img, "ㄸ", s / 2 + s * 0.09, s * 0.69, s * 0.28)

    return img.resize((size, size), Image.Resampling.LANCZOS)


def main():
    sizes = {
        "icon16.png": 16,
        "icon32.png": 32,
        "icon48.png": 48,
        "icon128.png": 128,
        "icon.png": 512,
    }
    for name, size in sizes.items():
        path = DST / name
        make_icon(size).save(path, optimize=True)
        print(f"wrote {name} {size}x{size} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
