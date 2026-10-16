"""
Builds the public app captures used in the videos from the original screenshots:
- the real map around the user's home is replaced by an Apple Maps capture of another town (Sceaux),
- the heat grid is redrawn cell by cell (same colours) on top of that map,
- "Yassine"/"y" -> "Lucas", third-party avatar -> generated face (no real person),
- the place typed "mais" -> "Maison", home town names -> "Sceaux",
- the call pill in the status bar is removed.
Originals stay out of git (assets/*.png is ignored).
"""
import json
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFilter, ImageFont

S = 1206 / 920  # boxes below are given in the 920x2000 preview frame
FONT = 'assets/Inter-Var.ttf'
SRC = 'assets/'
OUT = 'public/screens/'


def R(b):
    return tuple(int(round(v * S)) for v in b)


def font(size, weight=700):
    f = ImageFont.truetype(FONT, int(size * S))
    try:
        f.set_variation_by_axes([weight])
    except Exception:
        pass
    return f


def mask_shape(w, h, shape, radius=0):
    m = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(m)
    if shape == 'circle':
        d.ellipse([0, 0, w - 1, h - 1], fill=255)
    elif shape == 'round':
        d.rounded_rectangle([0, 0, w - 1, h - 1], radius=int(radius * S), fill=255)
    elif shape == 'pill':
        d.rounded_rectangle([0, 0, w - 1, h - 1], radius=h // 2, fill=255)
    else:
        d.rectangle([0, 0, w - 1, h - 1], fill=255)
    return m


def keep(src, dst, box, shape='rect', radius=0):
    b = R(box)
    w, h = b[2] - b[0], b[3] - b[1]
    dst.paste(src.crop(b), b[:2], mask_shape(w, h, shape, radius))


def keep_glyphs(src, dst, box, thr=170):
    """paste only bright pixels (white text / icons) of a region"""
    b = R(box)
    crop = src.crop(b)
    a = np.asarray(crop.convert('L')).astype(np.float32)
    m = np.clip((a - thr) * 4, 0, 255).astype(np.uint8)
    dst.paste(crop, b[:2], Image.fromarray(m).filter(ImageFilter.GaussianBlur(0.6)))


# ---------------------------------------------------------------- map source (Sceaux, Apple Maps dark)
MAP = Image.open(SRC + 'map_src.png').convert('RGB')
# remove the dropped pin (center ~ 430,448) by inpainting
mp = np.asarray(MAP).copy()
pm = np.zeros(mp.shape[:2], np.uint8)
cv2.circle(pm, (430, 445), 22, 255, -1)
mp = cv2.inpaint(mp, pm, 6, cv2.INPAINT_TELEA)
MAP = Image.fromarray(mp).crop((74, 0, 738, 858))  # drop sidebar, controls, legal links
MAP = MAP.filter(ImageFilter.UnsharpMask(1.2, 60, 2))


def map_fill(size, focus=(0.5, 0.5), zoom=1.0):
    """cover-crop the map to size (w,h), centred on focus (0..1)"""
    W, H = size
    mw, mh = MAP.size
    sc = max(W / mw, H / mh) * zoom
    big = MAP.resize((int(mw * sc) + 1, int(mh * sc) + 1), Image.LANCZOS)
    bw, bh = big.size
    x = int(min(max(0, focus[0] * bw - W / 2), bw - W))
    y = int(min(max(0, focus[1] * bh - H / 2), bh - H))
    return big.crop((x, y, x + W, y + H))


def put_map(img, box, shape='rect', radius=0, focus=(0.5, 0.5), zoom=1.0, only_if=None):
    b = R(box)
    w, h = b[2] - b[0], b[3] - b[1]
    tile = map_fill((w, h), focus, zoom)
    m = mask_shape(w, h, shape, radius)
    if only_if is not None:  # restrict to pixels that were map in the original
        m = Image.fromarray(np.minimum(np.asarray(m), only_if(img.crop(b))))
    img.paste(tile, b[:2], m)


def text(img, xy, s, size, weight=700, fill=(255, 255, 255)):
    d = ImageDraw.Draw(img)
    d.text((xy[0] * S, xy[1] * S), s, font=font(size, weight), fill=fill)


def inpaint(img, box, pad=3):
    b = R(box)
    a = np.asarray(img).copy()
    m = np.zeros(a.shape[:2], np.uint8)
    m[b[1] - pad:b[3] + pad, b[0] - pad:b[2] + pad] = 255
    return Image.fromarray(cv2.inpaint(a, m, 9, cv2.INPAINT_TELEA))


def avatar(img, cx, cy, r):
    face = Image.open(SRC + 'avatar_src.png').convert('RGB')
    d = int(2 * r * S)
    face = face.resize((d, d), Image.LANCZOS)
    img.paste(face, (int((cx - r) * S), int((cy - r) * S)), mask_shape(d, d, 'circle'))


def status_clean(img, box=(150, 22, 735, 122), color=(9, 11, 11)):
    ImageDraw.Draw(img).rectangle(R(box), fill=color)


# ---------------------------------------------------------------- 1. add place (unchanged)
Image.open(SRC + 'f11638b2-image.png').convert('RGB').save(OUT + 'add_place.png')

# ---------------------------------------------------------------- 2. place stats (gym)
o = Image.open(SRC + '86115f87-image.png').convert('RGB')
im = o.copy()
is_map = lambda c: np.where(np.asarray(c.convert('L')) > 30, 255, 0).astype(np.uint8)  # sheet is near-black
put_map(im, (0, 0, 920, 600), focus=(0.62, 0.42), zoom=1.15, only_if=is_map)
keep_glyphs(o, im, (60, 40, 880, 115))
keep(o, im, (37, 160, 142, 262), 'circle')
keep(o, im, (283, 186, 638, 281), 'pill')
for y in (155, 288, 420):
    keep(o, im, (778, y, 884, y + 106), 'circle')
keep(o, im, (428, 300, 492, 384), 'round', 30)  # gym pin on the map
ImageDraw.Draw(im).rectangle(R((246, 680, 420, 724)), fill=(12, 15, 14))
text(im, (252, 684), 'Sceaux', 27, 500, (215, 222, 218))
im.save(OUT + 'place_stats.png')

# ---------------------------------------------------------------- 3. my day on the map
o = Image.open(SRC + '400fde2d-image.png').convert('RGB')
im = o.copy()
put_map(im, (37, 518, 883, 1137), 'round', 32, focus=(0.45, 0.55), zoom=1.2)
keep(o, im, (60, 543, 352, 624), 'round', 18)
keep(o, im, (686, 1036, 860, 1112), 'round', 18)
keep(o, im, (402, 778, 506, 882), 'circle')
keep(o, im, (436, 832, 526, 922), 'circle')
keep_glyphs(o, im, (58, 1078, 270, 1122), 150)
im.save(OUT + 'day_map.png')

# ---------------------------------------------------------------- 4. home (features) – map strip + name + avatar
o = Image.open(SRC + '2e275048-image.png').convert('RGB')
im = o.copy()
put_map(im, (33, 1776, 887, 2000), 'round', 34, focus=(0.5, 0.6), zoom=1.0)
keep(o, im, (35, 1805, 885, 1948), 'round', 60)
ImageDraw.Draw(im).rectangle(R((148, 228, 260, 272)), fill=(9, 12, 11))
text(im, (152, 232), 'Lucas', 30, 700)
avatar(im, 80, 228, 43)
im.save(OUT + 'home_features.png')

# ---------------------------------------------------------------- 5. my places heat map
o = Image.open(SRC + 'aa1e896d-image.png').convert('RGB')
im = o.copy()
put_map(im, (0, 0, 920, 1462), focus=(0.5, 0.5), zoom=1.0)
# redraw the heat grid (same cells & colours, no trace of the original streets)
cells = json.load(open(SRC + 'heat_cells.json'))
rows = {0: (1, 8), 1: (1, 9), 2: (1, 9), 3: (0, 10), 4: (0, 10), 5: (0, 10), 6: (0, 10), 7: (0, 9), 8: (0, 9), 9: (1, 9), 10: (3, 8)}
ov = Image.new('RGBA', im.size, (0, 0, 0, 0))
d = ImageDraw.Draw(ov)
px, py, cw, ch = 279.2, 942.0, 55.4, 55.6
for c in cells:
    lo, hi = rows[c['j']]
    if not (lo <= c['i'] <= hi):
        continue
    x0, y0 = px + c['i'] * cw, py + c['j'] * ch
    col = tuple(int(min(255, v * 1.08)) for v in c['c'])
    d.rectangle([x0, y0, x0 + cw, y0 + ch], fill=col + (225,), outline=(20, 26, 24, 150), width=2)
im = Image.alpha_composite(im.convert('RGBA'), ov).convert('RGB')
keep_glyphs(o, im, (40, 40, 880, 115))
for box in [(28, 170, 428, 318), (28, 340, 557, 538)]:
    keep(o, im, box, 'round', 26)
for cy in (243, 1003, 1121, 1241, 1360):
    keep(o, im, (843 - 49, cy - 49, 843 + 49, cy + 49), 'circle')
keep(o, im, (320, 740, 574, 798), 'pill')
keep(o, im, (403, 822, 489, 908), 'circle')
keep_glyphs(o, im, (22, 1308, 220, 1348), 150)
im.save(OUT + 'places_heatmap.png')

# ---------------------------------------------------------------- 6. home (now) – name, avatar, place name, town, status bar
o = Image.open(SRC + '8de25aea-image.png').convert('RGB')
im = o.copy()
status_clean(im)
ImageDraw.Draw(im).rectangle(R((148, 228, 290, 272)), fill=(9, 12, 11))
text(im, (152, 232), 'Lucas', 30, 700)
ImageDraw.Draw(im).ellipse(R((30, 178, 130, 278)), fill=(9, 13, 12))
avatar(im, 80, 228, 43)
# "mais" (title on the illustration) -> "Maison"
im = inpaint(im, (62, 556, 196, 602))
text(im, (65, 548), 'Maison', 49, 760)
# small pill "Mais" -> "Maison" (redraw a wider pill)
pill = R((572, 497, 764, 571))
ImageDraw.Draw(im).rounded_rectangle(pill, radius=(pill[3] - pill[1]) // 2, fill=(24, 27, 25))
hp = Image.open(SRC + '8de25aea-image.png').convert('RGB').crop(R((634, 516, 670, 552)))
im.paste(hp, R((594, 516, 630, 552))[:2])
text(im, (640, 518), 'Maison', 26, 520)
# tile "mais" -> "Maison"
im = inpaint(im, (146, 1152, 218, 1182))
text(im, (148, 1149), 'Maison', 27, 700)
# home town -> Sceaux
im = inpaint(im, (134, 826, 364, 858))
text(im, (135, 825), 'Sceaux', 22, 600)
im.save(OUT + 'home_now.png')
print('ok')
