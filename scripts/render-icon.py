#!/usr/bin/env python3
"""
Plotline 图标渲染脚本
基于 SVG 矢量源文件，使用 Skia 渲染为所有 Tauri 需要的 PNG 与 ICO 尺寸。

依赖安装:
    python -m pip install skia-python

使用:
    python scripts/render-icon.py
"""

import os
import struct
import sys
from pathlib import Path

SVG_PATH = Path(__file__).parent.parent / "src-tauri" / "icons" / "icon.svg"
OUT_DIR = Path(__file__).parent.parent / "src-tauri" / "icons"

SIZES = [16, 24, 32, 128, 256, 512, 1024]
SQUARE_SIZES = [
    (30, 'Square30x30Logo'),
    (44, 'Square44x44Logo'),
    (71, 'Square71x71Logo'),
    (89, 'Square89x89Logo'),
    (107, 'Square107x107Logo'),
    (142, 'Square142x142Logo'),
    (150, 'Square150x150Logo'),
    (284, 'Square284x284Logo'),
    (310, 'Square310x310Logo'),
]


def ico_encode(images):
    """组装 Windows ICO 文件。images: [(width, height, png_bytes), ...]"""
    count = len(images)
    header = struct.pack('<HHH', 0, 1, count)
    dir_entries = []
    data_entries = []
    offset = 6 + 16 * count
    for w, h, png in images:
        bw = w if w < 256 else 0
        bh = h if h < 256 else 0
        dir_entry = struct.pack('<BBBBHHII', bw, bh, 0, 0, 1, 32, len(png), offset)
        dir_entries.append(dir_entry)
        data_entries.append(png)
        offset += len(png)
    return b''.join([header] + dir_entries + data_entries)


def render_icons():
    import skia

    with open(SVG_PATH, 'r', encoding='utf-8') as f:
        svg_data = f.read().encode('utf-8')

    stream = skia.MemoryStream(svg_data)
    svg = skia.SVGDOM.MakeFromStream(stream)

    if svg is None:
        print("Error: Failed to parse SVG.", file=sys.stderr)
        sys.exit(1)

    svg_width, svg_height = svg.containerSize()
    print(f"SVG source size: {svg_width:.0f}x{svg_height:.0f}")

    def render_size(size):
        surface = skia.Surface(size, size)
        canvas = surface.getCanvas()
        canvas.scale(size / svg_width, size / svg_height)
        svg.render(canvas)
        image = surface.makeImageSnapshot()
        return bytes(image.encodeToData(skia.EncodedImageFormat.kPNG, 100))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    png_buffers = {}

    for size in SIZES:
        png = render_size(size)
        name = f"{size}x{size}.png" if size != 1024 else "1024x1024.png"
        (OUT_DIR / name).write_bytes(png)
        png_buffers[size] = png
        print(f"  generated {name}")

    (OUT_DIR / "icon.png").write_bytes(png_buffers[512])
    print("  generated icon.png")

    (OUT_DIR / "128x128@2x.png").write_bytes(png_buffers[256])
    print("  generated 128x128@2x.png")

    for size, sq_name in SQUARE_SIZES:
        png = render_size(size)
        (OUT_DIR / f"{sq_name}.png").write_bytes(png)
        print(f"  generated {sq_name}.png")

    # ICO 需要额外的 48x48 和 64x64
    for extra in [48, 64]:
        png_buffers[extra] = render_size(extra)

    ico_images = [
        (16, 16, png_buffers[16]),
        (24, 24, png_buffers[24]),
        (32, 32, png_buffers[32]),
        (48, 48, png_buffers[48]),
        (64, 64, png_buffers[64]),
        (128, 128, png_buffers[128]),
        (256, 256, png_buffers[256]),
    ]
    (OUT_DIR / "icon.ico").write_bytes(ico_encode(ico_images))
    print("  generated icon.ico")
    print("Done.")


if __name__ == '__main__':
    render_icons()
