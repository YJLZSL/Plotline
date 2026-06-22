"""生成 Plotline 应用图标多尺寸。
设计：暖色琥珀渐变圆角方块背景 + 白色故事曲线 + 节点 + 引申出的分叉。
"""
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import math

OUT_DIR = Path(r"D:\AIKFCC\Plotline\src-tauri\icons")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def lerp_color(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def make_icon(size: int) -> Image.Image:
    # 高分辨率抗锯齿：4 倍超采样
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 背景圆角方块 + 暖色渐变
    radius = int(s * 0.22)
    # 渐变（从左上到右下，琥珀 → 陶土）
    c_top = (198, 138, 62)    # #C68A3E
    c_bot = (168, 106, 44)    # #A86A2C
    for y in range(s):
        t = y / s
        c = lerp_color(c_top, c_bot, t)
        draw.line([(0, y), (s, y)], fill=c)
    # 圆角 mask
    mask = Image.new("L", (s, s), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([0, 0, s - 1, s - 1], radius=radius, fill=255)
    img.putalpha(mask)

    # 柔光高光（左上）
    highlight = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    hdraw = ImageDraw.Draw(highlight)
    hdraw.ellipse([int(s * 0.05), int(s * 0.05), int(s * 0.55), int(s * 0.5)], fill=(255, 255, 255, 70))
    highlight = highlight.filter(ImageFilter.GaussianBlur(s * 0.08))
    img = Image.alpha_composite(img, highlight)

    draw = ImageDraw.Draw(img)

    # 故事曲线：从左下到右上的优雅 S 形
    # 使用多段直线近似贝塞尔
    def bezier(p0, p1, p2, p3, n=80):
        pts = []
        for i in range(n + 1):
            t = i / n
            x = (1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * p1[0] + 3 * (1 - t) * t ** 2 * p2[0] + t ** 3 * p3[0]
            y = (1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * p1[1] + 3 * (1 - t) * t ** 2 * p2[1] + t ** 3 * p3[1]
            pts.append((x, y))
        return pts

    # 主线
    p0 = (s * 0.18, s * 0.78)
    p1 = (s * 0.38, s * 0.20)
    p2 = (s * 0.62, s * 0.82)
    p3 = (s * 0.85, s * 0.30)
    pts = bezier(p0, p1, p2, p3)
    # 描绘粗白线（带柔光）
    line_w = max(s // 16, 3)
    glow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    for i in range(len(pts) - 1):
        gdraw.line([pts[i], pts[i + 1]], fill=(255, 255, 255, 90), width=line_w + s // 32)
    glow = glow.filter(ImageFilter.GaussianBlur(s // 64))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)
    for i in range(len(pts) - 1):
        draw.line([pts[i], pts[i + 1]], fill=(255, 255, 255, 255), width=line_w, joint="curve")

    # 节点圆点
    nodes = [p0, (s * 0.50, s * 0.50), p3]
    for p in nodes:
        r = max(s // 22, 4)
        # 外圈柔光
        halo = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        hdraw = ImageDraw.Draw(halo)
        hdraw.ellipse([p[0] - r * 2.5, p[1] - r * 2.5, p[0] + r * 2.5, p[1] + r * 2.5], fill=(255, 255, 255, 80))
        halo = halo.filter(ImageFilter.GaussianBlur(r))
        img = Image.alpha_composite(img, halo)
        draw = ImageDraw.Draw(img)
        draw.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=(255, 255, 255, 255))
        # 内点（强调）
        ir = max(r // 3, 2)
        draw.ellipse([p[0] - ir, p[1] - ir, p[0] + ir, p[1] + ir], fill=(198, 138, 62, 255))

    # 缩回目标尺寸
    return img.resize((size, size), Image.LANCZOS)


# 生成 PNG 多尺寸
sizes_png = [32, 128, 256, 512, 1024]
for sz in sizes_png:
    icon = make_icon(sz)
    icon.save(OUT_DIR / f"{sz}x{sz}.png", "PNG")
    print(f"saved {sz}x{sz}.png")

# 128x128@2x
icon_256 = make_icon(256)
icon_256.save(OUT_DIR / "128x128@2x.png", "PNG")
print("saved 128x128@2x.png")

# icon.png (512)
icon_512 = make_icon(512)
icon_512.save(OUT_DIR / "icon.png", "PNG")
print("saved icon.png")

# Windows SquareLogo 系列
square_sizes = {
    "Square30x30Logo": 30,
    "Square44x44": 44,
    "Square71x71": 71,
    "Square89x89": 89,
    "Square107x107": 107,
    "Square142x142": 142,
    "Square150x150": 150,
    "Square284x284": 284,
    "Square310x310": 310,
    "StoreLogo": 50,
}
for name, sz in square_sizes.items():
    icon = make_icon(sz)
    icon.save(OUT_DIR / f"{name}.png", "PNG")
    print(f"saved {name}.png")

# 生成 .ico（Windows 多尺寸）
ico_sizes = [16, 24, 32, 48, 64, 128, 256]
ico_images = [make_icon(sz) for sz in ico_sizes]
ico_images[0].save(OUT_DIR / "icon.ico", format="ICO", sizes=[(sz, sz) for sz in ico_sizes], append_images=ico_images[1:])
print("saved icon.ico")

print("ALL DONE")
