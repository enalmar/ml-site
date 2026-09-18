# Generates the specimen cross-section SVG for the #research themes.
# Deterministic: control points are jittered with a fixed seed, so the edges are
# irregular (a real bondline is not a sine wave) but reproducible.
import random
R = random.Random(11)

X0, X1 = 20.0, 240.0          # specimen body
TI, ADH, CFRP, LAT, BOT = 30.0, 84.0, 116.0, 244.0, 368.0
NPLY = 6

def pts(y, amp, n=9):
    """Jittered control points across the specimen width at height y."""
    out = []
    for i in range(n):
        x = X0 + (X1 - X0) * i / (n - 1)
        out.append((x, y + R.uniform(-amp, amp)))
    return out

def cr(points, close=False):
    """Catmull-Rom through points -> cubic bezier path body (no leading M)."""
    p = points[:]
    if close:
        p = [points[-1]] + points + [points[0], points[1]]
    else:
        p = [points[0]] + points + [points[-1]]
    d = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i-1], p[i], p[i+1], p[i+2]
        c1 = (p1[0] + (p2[0]-p0[0])/6.0, p1[1] + (p2[1]-p0[1])/6.0)
        c2 = (p2[0] - (p3[0]-p1[0])/6.0, p2[1] - (p3[1]-p1[1])/6.0)
        d.append("C%.1f,%.1f %.1f,%.1f %.1f,%.1f" % (c1[0],c1[1],c2[0],c2[1],p2[0],p2[1]))
    return "".join(d)

def band(top, bottom):
    """Closed path between two edges (lists of points), left to right then back."""
    d = "M%.1f,%.1f" % top[0]
    d += cr(top)
    d += "L%.1f,%.1f" % bottom[-1]
    d += cr(list(reversed(bottom)))
    return d + "Z"

def edge_path(e):
    return "M%.1f,%.1f%s" % (e[0][0], e[0][1], cr(e))

def blob(cx, cy, rx, ry, n=8, rough=0.28):
    """Irregular closed blob - a void, not a tidy ellipse."""
    import math
    ps = []
    for i in range(n):
        a = 2*math.pi*i/n
        f = 1 + R.uniform(-rough, rough)
        ps.append((cx + rx*f*math.cos(a), cy + ry*f*math.sin(a)))
    return "M%.1f,%.1f%sZ" % (ps[0][0], ps[0][1], cr(ps, close=True))

# ---- boundaries (shared, so adjacent bands nest exactly) -------------------
b_top  = pts(TI, 1.0)
b_tiad = pts(ADH, 3.0)           # abraded, bonded face
b_adcf = pts(CFRP, 2.6)
b_ply  = [b_adcf] + [pts(CFRP + (LAT-CFRP)*k/NPLY, 2.2) for k in range(1, NPLY)] + [pts(LAT, 2.6)]
b_cfla = b_ply[-1]
b_bot  = pts(BOT, 1.6)

out = []
A = out.append

# ---- titanium adherend ----------------------------------------------------
A('<g class="sxb sxb--ti">')
A('<path class="sx-ti" d="%s"/>' % band(b_top, b_tiad))
for i in range(5):                                  # machining marks
    y = 40 + i*8 + R.uniform(-1.5, 1.5)
    x = X0 + R.uniform(8, 40)
    A('<path class="sx-mark" d="M%.1f,%.1f h%.1f"/>' % (x, y, R.uniform(50, 150)))
A('</g>')

# ---- adhesive bondline ----------------------------------------------------
A('<g class="sxb sxb--adh">')
A('<path class="sx-adh" d="%s"/>' % band(b_tiad, b_adcf))
for cx, cy, rx, ry in [(46,99,5.2,3.0),(78,103,3.4,2.2),(104,97,4.6,2.6),
                       (139,102,3.0,2.0),(166,98,5.6,3.2),(196,103,3.8,2.4),(222,98,3.2,2.1)]:
    A('<path class="sx-void" d="%s"/>' % blob(cx, cy, rx, ry))
A('</g>')

# ---- CFRP laminate --------------------------------------------------------
A('<g class="sxb sxb--cfrp">')
for k in range(NPLY):
    A('<path class="sx-ply sx-ply--%s" d="%s"/>' % ('a' if k % 2 == 0 else 'b', band(b_ply[k], b_ply[k+1])))
for k in range(1, NPLY):
    A('<path class="sx-plyline" d="%s"/>' % edge_path(b_ply[k]))
# ply cracks: short, jagged, crossing a ply at an angle
for x, k in [(88, 1), (171, 3)]:
    y0 = CFRP + (LAT-CFRP)*k/NPLY
    y1 = CFRP + (LAT-CFRP)*(k+1)/NPLY
    seg = [(x + R.uniform(-2.5, 2.5), y0 + (y1-y0)*t/4.0) for t in range(5)]
    A('<path class="sx-crack" d="%s"/>' % edge_path(seg))
# delamination sliver along one ply interface
k = 4
yd = CFRP + (LAT-CFRP)*k/NPLY
A('<path class="sx-delam" d="%s"/>' % blob(126, yd, 26, 1.9, n=10, rough=0.16))
A('</g>')

# ---- printed lattice ------------------------------------------------------
A('<g class="sxb sxb--lat">')
A('<clipPath id="sxLat"><path d="%s"/></clipPath>' % band(b_cfla, b_bot))
A('<path class="sx-lat" d="%s"/>' % band(b_cfla, b_bot))
A('<g clip-path="url(#sxLat)" class="sx-cells">')
cols, rows, cw, ch = 9, 4, (X1-X0)/8.0, (BOT-LAT)/4.0
grid = [[(X0 + c*cw + R.uniform(-3.5,3.5), LAT + r*ch + R.uniform(-3.5,3.5))
         for c in range(cols+1)] for r in range(rows+1)]
for r in range(rows+1):
    for c in range(cols+1):
        if c < cols:
            A('<path class="sx-strut" d="M%.1f,%.1f L%.1f,%.1f"/>' % (grid[r][c]+grid[r][c+1]))
        if r < rows:
            A('<path class="sx-strut" d="M%.1f,%.1f L%.1f,%.1f"/>' % (grid[r][c]+grid[r+1][c]))
        if c < cols and r < rows and (r+c) % 2 == 0:     # diagonal bracing
            A('<path class="sx-strut" d="M%.1f,%.1f L%.1f,%.1f"/>' % (grid[r][c]+grid[r+1][c+1]))
A('</g>')
for cx, cy, rx, ry in [(70,282,4.4,3.4),(152,314,5.2,3.8),(206,344,3.8,3.0)]:
    A('<path class="sx-void" d="%s"/>' % blob(cx, cy, rx, ry))
A('</g>')

# ---- the interfaces themselves -------------------------------------------
A('<g class="sx-ifaces">')
A('<path class="sx-iface sx-iface--a" d="%s"/>' % edge_path(b_tiad))
A('<path class="sx-iface sx-iface--b" d="%s"/>' % edge_path(b_adcf))
A('<path class="sx-iface sx-iface--c" d="%s"/>' % edge_path(b_cfla))
A('</g>')

open('/private/tmp/claude-501/-Users-eam-Dev-ml-website/cf5defeb-d710-4e3c-9581-e82b6e130142/scratchpad/stack.svg.frag','w').write("\n".join(out))
print("\n".join(out)[:400])
print("...")
print("fragment bytes:", len("\n".join(out)))
