"""Prepare real OùVa screenshots for public videos: hide locations, third-party art, call pill."""
from PIL import Image, ImageDraw, ImageFilter
S = 1206 / 920  # coords below are in the 920x2000 preview frame

def R(box):
    x0, y0, x1, y1 = box
    return tuple(int(round(v * S)) for v in (x0, y0, x1, y1))

def blur(im, box, r=18):
    b = R(box)
    im.paste(im.crop(b).filter(ImageFilter.GaussianBlur(r * S)), b[:2])

def keep(src, dst, box, shape='rect', radius=0):
    b = R(box)
    if shape == 'rect' and not radius:
        dst.paste(src.crop(b), b[:2]); return
    w, h = b[2] - b[0], b[3] - b[1]
    m = Image.new('L', (w, h), 0); d = ImageDraw.Draw(m)
    if shape == 'circle': d.ellipse([0, 0, w - 1, h - 1], fill=255)
    else: d.rounded_rectangle([0, 0, w - 1, h - 1], radius=int((radius or h / 2) * S) if radius else h // 2, fill=255)
    dst.paste(src.crop(b), b[:2], m)

def fill(im, box, color, radius=0):
    d = ImageDraw.Draw(im)
    d.rounded_rectangle(R(box), radius=int(radius * S), fill=color)

def avatar(im, cx, cy, r):
    d = ImageDraw.Draw(im)
    s = S
    d.ellipse([(cx - r) * s, (cy - r) * s, (cx + r) * s, (cy + r) * s], fill=(58, 64, 62))
    d.ellipse([(cx - r * 0.34) * s, (cy - r * 0.55) * s, (cx + r * 0.34) * s, (cy + r * 0.13) * s], fill=(150, 158, 155))
    d.pieslice([(cx - r * 0.62) * s, (cy + r * 0.2) * s, (cx + r * 0.62) * s, (cy + r * 1.3) * s], 180, 360, fill=(150, 158, 155))

out = 'public/screens/'
src = 'assets/'

# 1 add place (name & category) — nothing sensitive
Image.open(src + 'f11638b2-image.png').convert('RGB').save(out + 'add_place.png')

# 2 gym stats — blur the map & the town name
im = Image.open(src + '86115f87-image.png').convert('RGB'); o = im.copy()
blur(im, (0, 0, 920, 560), 16)
keep(o, im, (37, 160, 142, 262), 'circle')
keep(o, im, (283, 186, 638, 281), 'pill')
for y in (155, 288, 420):
    keep(o, im, (778, y, 884, y + 106), 'circle')
blur(im, (240, 680, 400, 722), 12)
im.save(out + 'place_stats.png')

# 3 my day on the map — blur the real map, keep UI chips & markers
im = Image.open(src + '400fde2d-image.png').convert('RGB'); o = im.copy()
blur(im, (37, 518, 883, 1137), 20)
keep(o, im, (60, 543, 352, 624), 'round', 18)
keep(o, im, (686, 1036, 860, 1112), 'round', 18)
keep(o, im, (402, 778, 506, 882), 'circle')
keep(o, im, (436, 832, 526, 922), 'circle')
im.save(out + 'day_map.png')

# 4 home (features) — blur the map peeking at the bottom, keep the tab bar
im = Image.open(src + '2e275048-image.png').convert('RGB'); o = im.copy()
blur(im, (0, 1772, 920, 2000), 14)
keep(o, im, (35, 1805, 885, 1948))
im.save(out + 'home_features.png')

# 5 my places heat map — blur streets/labels, keep heat colours readable as a blob + UI
im = Image.open(src + 'aa1e896d-image.png').convert('RGB'); o = im.copy()
blur(im, (0, 0, 920, 1458), 14)
for box in [(28, 170, 428, 318), (28, 340, 557, 538)]:
    keep(o, im, box, 'round', 26)
for cy in (243, 1003, 1121, 1241, 1360):
    keep(o, im, (843 - 49, cy - 49, 843 + 49, cy + 49), 'circle')
keep(o, im, (320, 740, 574, 798), 'pill')
keep(o, im, (403, 822, 489, 908), 'circle')
keep(o, im, (22, 1308, 220, 1348))
im.save(out + 'places_heatmap.png')

# 6 home (now) — remove call pill, third-party avatar art, home town
im = Image.open(src + '8de25aea-image.png').convert('RGB')
fill(im, (150, 22, 735, 122), (9, 11, 11))
fill(im, (30, 178, 130, 278), (9, 13, 12))
avatar(im, 80, 228, 43)
blur(im, (132, 822, 372, 862), 9)
im.save(out + 'home_now.png')
print('ok')
