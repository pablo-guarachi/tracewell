"""Draw the neutral sample images in examples/ (Pillow). Usage: python scripts/make-samples.py examples"""
from PIL import Image, ImageDraw
import math, sys
out = sys.argv[1]
S = 4  # supersample

def save(img, name, size):
    img.resize(size, Image.LANCZOS).save(f"{out}/{name}")

# 1. Badge: mountains + sun, flat colors, transparent bg
W = 512*S
im = Image.new("RGBA", (W, W), (0,0,0,0)); d = ImageDraw.Draw(im)
d.ellipse([16*S,16*S,496*S,496*S], fill=(20,48,74,255))
d.ellipse([300*S,110*S,400*S,210*S], fill=(246,178,60,255))
d.polygon([(70*S,380*S),(200*S,180*S),(330*S,380*S)], fill=(56,163,140,255))
d.polygon([(200*S,380*S),(310*S,230*S),(442*S,380*S)], fill=(38,120,104,255))
d.polygon([(200*S,180*S),(232*S,229*S),(168*S,229*S)], fill=(240,244,240,255))
d.rectangle([70*S,380*S,442*S,392*S], fill=(240,244,240,255))
save(im, "sample-badge.png", (512,512))

# 2. Icon: speech bubble with heart, 2 colors on transparent
im = Image.new("RGBA", (W, W), (0,0,0,0)); d = ImageDraw.Draw(im)
d.rounded_rectangle([40*S,60*S,472*S,380*S], radius=70*S, fill=(232,86,74,255))
d.polygon([(120*S,370*S),(110*S,470*S),(220*S,375*S)], fill=(232,86,74,255))
# heart
cx, cy, r = 256*S, 210*S, 62*S
d.ellipse([cx-2*r+10*S, cy-r, cx+10*S, cy+r], fill=(255,248,240,255))
d.ellipse([cx-10*S, cy-r, cx+2*r-10*S, cy+r], fill=(255,248,240,255))
d.polygon([(cx-2*r+10*S, cy),(cx+2*r-10*S, cy),(cx, cy+2*r+14*S)], fill=(255,248,240,255))
save(im, "sample-icon.png", (512,512))

# 3. Wave mark on solid white background
im = Image.new("RGBA", (W, W), (255,255,255,255)); d = ImageDraw.Draw(im)
d.rounded_rectangle([64*S,64*S,448*S,448*S], radius=96*S, fill=(36,52,120,255))
for i,(col) in enumerate([(255,196,0,255),(120,200,255,255),(255,255,255,255)]):
    y = (190 + i*72)*S
    d.arc([110*S, y-60*S, 260*S, y+60*S], 200, 340, fill=col, width=26*S)
    d.arc([254*S, y-100*S, 404*S, y+20*S], 20, 160, fill=col, width=26*S)
save(im, "sample-mark.png", (512,512))
print("ok")
