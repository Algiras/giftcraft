#!/usr/bin/env python3
"""
Asset generation script for App 08: GiftCraft (Gift Wrapping & Greeting Cards).
Generates:
  - assets/app-icon.jpg (1000x1000 px)
  - assets/screenshot-1.jpg (1600x1200 px, 4:3) - Overview Dashboard & KPI attach-rate metrics
  - assets/screenshot-2.jpg (1600x1200 px, 4:3) - Interactive Live Checkout Simulator & character validator
  - assets/screenshot-3.jpg (1600x1200 px, 4:3) - Gift Option & Free Threshold Rule Configuration Modal
  - assets/screenshot-4.jpg (1600x1200 px, 4:3) - Storefront Checkout Experience & Gift-with-Purchase Banner
"""

import os
from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = "/Users/algimantask/Personal/wix-extensions/08-gift-wrap-greeting-cards/giftcraft/assets"
os.makedirs(ASSETS_DIR, exist_ok=True)

# Font loading helper
def get_font(size, bold=False):
    bold_path = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
    regular_path = "/System/Library/Fonts/Supplemental/Arial.ttf"
    fallback_path = "/System/Library/Fonts/Helvetica.ttc"

    chosen = bold_path if bold and os.path.exists(bold_path) else regular_path
    if not os.path.exists(chosen):
        chosen = fallback_path
    try:
        return ImageFont.truetype(chosen, size)
    except Exception:
        return ImageFont.load_default()

def draw_rounded_rect(draw, xy, radius, fill=None, outline=None, width=1):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill, outline=outline, width=width)

def draw_badge(draw, x, y, text, bg, fg, font, pad_x=10, pad_y=4):
    bbox = font.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw_rounded_rect(draw, [x, y, x + tw + pad_x * 2, y + th + pad_y * 2], radius=6, fill=bg)
    draw.text((x + pad_x, y + pad_y - bbox[1] // 2), text, font=font, fill=fg)
    return x + tw + pad_x * 2

def draw_button(draw, x, y, w, h, text, bg, fg, font, radius=6):
    draw_rounded_rect(draw, [x, y, x + w, y + h], radius=radius, fill=bg)
    bbox = font.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((x + (w - tw) // 2, y + (h - th) // 2 - 2), text, font=font, fill=fg)

def generate_app_icon():
    width, height = 1000, 1000
    img = Image.new("RGB", (width, height), "#0f172a")
    draw = ImageDraw.Draw(img)

    # Background gradient from rich burgundy to deep wine
    for y in range(height):
        r = int(140 - (y / height) * 60)
        g = int(24 - (y / height) * 12)
        b = int(45 - (y / height) * 20)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Outer decorative glow ring
    draw.ellipse([70, 70, 930, 930], outline=(251, 191, 36, 40), width=4)

    # Gift Box Coordinates
    bx0, by0, bx1, by1 = 280, 360, 720, 780
    box_w = bx1 - bx0
    box_h = by1 - by0

    # Box shadow
    draw_rounded_rect(draw, [bx0 + 10, by0 + 20, bx1 + 10, by1 + 20], radius=32, fill=(20, 5, 10))

    # Main Box Body - Emerald Velvet Green
    draw_rounded_rect(draw, [bx0, by0, bx1, by1], radius=30, fill="#047857", outline="#10b981", width=4)

    # Box Lid
    lid_y0 = by0 - 45
    lid_y1 = by0 + 20
    draw_rounded_rect(draw, [bx0 - 25, lid_y0, bx1 + 25, lid_y1], radius=16, fill="#065f46", outline="#34d399", width=4)

    # Gold Ribbons
    gold_main = "#f59e0b"
    gold_highlight = "#fbbf24"
    gold_shadow = "#d97706"

    # Vertical Ribbon
    ribbon_w = 64
    rx0 = bx0 + (box_w - ribbon_w) // 2
    rx1 = rx0 + ribbon_w
    draw.rectangle([rx0, by0, rx1, by1], fill=gold_main)
    draw.line([(rx0 + 10, by0), (rx0 + 10, by1)], fill=gold_highlight, width=4)
    draw.line([(rx1 - 10, by0), (rx1 - 10, by1)], fill=gold_shadow, width=4)

    # Lid Vertical Ribbon
    draw.rectangle([rx0, lid_y0, rx1, lid_y1], fill=gold_main)
    draw.line([(rx0 + 10, lid_y0), (rx0 + 10, lid_y1)], fill=gold_highlight, width=4)

    # Horizontal Ribbon
    ry0 = by0 + (box_h - ribbon_w) // 2
    ry1 = ry0 + ribbon_w
    draw.rectangle([bx0, ry0, bx1, ry1], fill=gold_main)
    draw.line([(bx0, ry0 + 10), (bx1, ry0 + 10)], fill=gold_highlight, width=4)
    draw.line([(bx0, ry1 - 10), (bx1, ry1 - 10)], fill=gold_shadow, width=4)

    # Center knot
    draw_rounded_rect(draw, [rx0 - 4, ry0 - 4, rx1 + 4, ry1 + 4], radius=8, fill=gold_highlight, outline=gold_shadow, width=3)

    # Gift Bow on top of lid
    cx, cy = 500, lid_y0
    # Left bow loop
    draw.ellipse([cx - 160, cy - 110, cx - 10, cy + 10], fill="#f59e0b", outline="#fbbf24", width=5)
    draw.ellipse([cx - 130, cy - 80, cx - 40, cy - 20], fill="#b45309")
    # Right bow loop
    draw.ellipse([cx + 10, cy - 110, cx + 160, cy + 10], fill="#f59e0b", outline="#fbbf24", width=5)
    draw.ellipse([cx + 40, cy - 80, cx + 130, cy - 20], fill="#b45309")
    # Center Bow Knot
    draw.ellipse([cx - 35, cy - 40, cx + 35, cy + 20], fill="#fbbf24", outline="#d97706", width=4)

    # Gift Greeting Card Tag Hanging
    tag_x0, tag_y0 = 620, 520
    tag_x1, tag_y1 = 760, 680
    # String
    draw.line([(cx + 20, ry0), (tag_x0 + 40, tag_y0)], fill="#ffffff", width=3)
    # Tag body (rotated appearance via polygon)
    draw.polygon([(tag_x0 + 40, tag_y0), (tag_x1, tag_y0 + 30), (tag_x1 - 30, tag_y1), (tag_x0, tag_y1 - 30)], fill="#fef3c7", outline="#f59e0b")
    # Eyelet
    draw.ellipse([tag_x0 + 34, tag_y0 + 12, tag_x0 + 46, tag_y0 + 24], fill="#b45309")

    # Typography at top & bottom
    title_font = get_font(72, bold=True)
    sub_font = get_font(32, bold=True)

    title_text = "GiftCraft"
    bbox = title_font.getbbox(title_text)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, 170), title_text, font=title_font, fill="#ffffff")

    sub_text = "CHECKOUT GIFT WRAP & CARDS"
    sbbox = sub_font.getbbox(sub_text)
    stw = sbbox[2] - sbbox[0]
    draw.text(((width - stw) // 2, 255), sub_text, font=sub_font, fill="#fbbf24")

    # Bottom badge
    badge_font = get_font(28, bold=True)
    draw_badge(draw, 340, 840, "100% WIX NATIVE", "#064e3b", "#34d399", badge_font, pad_x=24, pad_y=10)

    out_path = os.path.join(ASSETS_DIR, "app-icon.jpg")
    img.save(out_path, quality=95)
    print(f"Generated {out_path} ({width}x{height})")


def draw_bm_chrome(draw, w, h, active_item="GiftCraft"):
    """Draws authentic Wix Business Manager chrome and sidebar."""
    # Top bar
    draw.rectangle([0, 0, w, 60], fill="#0f172a")
    font_bold = get_font(20, bold=True)
    font_regular = get_font(16, bold=False)

    # Wix logo text / badge
    draw.text((24, 18), "WiX", font=font_bold, fill="#ffffff")
    draw.text((75, 20), "|  My Online Boutique", font=font_regular, fill="#94a3b8")

    # Top search bar
    draw_rounded_rect(draw, [550, 12, 1050, 48], radius=6, fill="#1e293b", outline="#334155")
    draw.text((570, 20), "🔍 Search products, orders, settings...", font=font_regular, fill="#94a3b8")

    # Right user actions
    draw_rounded_rect(draw, [w - 180, 14, w - 30, 46], radius=6, fill="#2563eb")
    draw.text((w - 165, 20), "Publish Site", font=get_font(15, bold=True), fill="#ffffff")

    # Left Sidebar
    draw.rectangle([0, 60, 260, h], fill="#1e293b")
    menu_items = [
        ("Dashboard", False),
        ("Store Products", False),
        ("Orders & Fulfillments", False),
        ("GiftCraft: Wrap & Cards", True),
        ("Discounts & Coupons", False),
        ("Analytics & Reports", False),
        ("Settings", False),
    ]
    my = 90
    for title, is_active in menu_items:
        if is_active:
            draw_rounded_rect(draw, [12, my - 6, 248, my + 34], radius=6, fill="#3b82f6")
            draw.text((28, my), f"🎁  {title}", font=get_font(16, bold=True), fill="#ffffff")
        else:
            draw.text((28, my), title, font=get_font(16, bold=False), fill="#cbd5e1")
        my += 52

    # Canvas Background
    draw.rectangle([260, 60, w, h], fill="#f1f5f9")


def generate_screenshot_1():
    """Screenshot 1: Overview Dashboard & KPI attach-rate metrics."""
    w, h = 1600, 1200
    img = Image.new("RGB", (w, h), "#f1f5f9")
    draw = ImageDraw.Draw(img)

    draw_bm_chrome(draw, w, h)

    # Page Header
    header_font = get_font(30, bold=True)
    sub_font = get_font(16, bold=False)
    btn_font = get_font(16, bold=True)

    draw.text((300, 100), "GiftCraft: Gift Wrapping & Greeting Cards", font=header_font, fill="#0f172a")
    draw.text((300, 145), "Configure customized gift wrapping, personalized cards, character limits, and gift-with-purchase incentives.", font=sub_font, fill="#64748b")

    draw_button(draw, 1340, 105, 190, 48, "+ Add Gift Option", "#2563eb", "#ffffff", btn_font, radius=6)

    # 3 KPI Cards
    card_y = 195
    kpi_w = 380
    kpis = [
        ("Active Gift Styles", "3 of 4 Active", "Ready for Wix Checkout", "#059669", "#d1fae5"),
        ("Average Gift Attach Rate", "+21.4%", "Higher AOV per order", "#2563eb", "#dbeafe"),
        ("Zero DevOps Overhead", "$0.00 / mo", "100% Wix Native Serverless", "#7c3aed", "#ede9fe"),
    ]

    for i, (title, value, badge_txt, bcolor, bbg) in enumerate(kpis):
        cx = 300 + i * (kpi_w + 30)
        draw_rounded_rect(draw, [cx, card_y, cx + kpi_w, card_y + 130], radius=10, fill="#ffffff", outline="#e2e8f0", width=2)
        draw.text((cx + 24, card_y + 18), title, font=get_font(15, bold=False), fill="#64748b")
        draw.text((cx + 24, card_y + 44), value, font=get_font(32, bold=True), fill="#0f172a")
        draw_badge(draw, cx + 24, card_y + 92, badge_txt, bbg, bcolor, get_font(13, bold=True), pad_x=8, pad_y=3)

    # Table Card
    table_y = 355
    table_w = 1230
    draw_rounded_rect(draw, [300, table_y, 300 + table_w, 1080], radius=10, fill="#ffffff", outline="#e2e8f0", width=2)

    # Table Header Card Section
    draw.text((330, table_y + 24), "Configured Gift Wrapping Styles", font=get_font(22, bold=True), fill="#0f172a")
    draw.text((330, table_y + 56), "Shoppers can select these wrapping options with custom greeting messages in checkout.", font=sub_font, fill="#64748b")

    # Search Bar
    draw_rounded_rect(draw, [1220, table_y + 24, 1490, table_y + 64], radius=6, fill="#f8fafc", outline="#cbd5e1")
    draw.text((1235, table_y + 34), "🔍 Search styles...", font=get_font(14), fill="#94a3b8")

    # Table Column Headers
    th_y = table_y + 95
    draw.rectangle([300, th_y, 300 + table_w, th_y + 40], fill="#f8fafc")
    draw.line([(300, th_y + 40), (300 + table_w, th_y + 40)], fill="#e2e8f0", width=1)

    headers = [
        (330, "STYLE / OPTION NAME"),
        (600, "WRAP STYLE"),
        (760, "WRAP PRICE"),
        (880, "FREE THRESHOLD"),
        (1040, "CARD WAIVER"),
        (1200, "GWP INCENTIVE"),
        (1380, "STATUS"),
    ]
    for hx, htitle in headers:
        draw.text((hx, th_y + 12), htitle, font=get_font(12, bold=True), fill="#64748b")

    # Rows
    rows = [
        ("Classic Crimson Ribbon", "Created: 2026-09-01", "CLASSIC RIBBON", "#dbeafe", "#1e40af", "$4.99", "Free over $75.00", "Free card over $50", "🎁 Keepsake Tag", True),
        ("Luxury Velvet & Gold Embossed", "Created: 2026-09-02", "LUXURY GOLD", "#fef3c7", "#92400e", "$9.99", "Free over $150.00", "Free card over $100", "🎁 Scented Candle", True),
        ("Festive Holiday Evergreen", "Created: 2026-09-04", "HOLIDAY FESTIVE", "#fce7f3", "#9d174d", "$6.50", "Free over $90.00", "Free card over $60", "🎁 Pine Ornament", True),
        ("Eco-Friendly Recycled Kraft", "Created: 2026-09-06", "ECO KRAFT", "#e2e8f0", "#334155", "$3.50", "Free over $50.00", "Complimentary", "—", False),
    ]

    ry = th_y + 55
    for name, sub, wrap, wbg, wfg, price, free_t, card_t, gwp, active in rows:
        draw.text((330, ry), name, font=get_font(16, bold=True), fill="#0f172a")
        draw.text((330, ry + 24), sub, font=get_font(12), fill="#94a3b8")

        draw_badge(draw, 600, ry + 4, wrap, wbg, wfg, get_font(12, bold=True), pad_x=8, pad_y=3)
        draw.text((760, ry + 6), price, font=get_font(16, bold=True), fill="#0f172a")
        draw.text((880, ry + 6), free_t, font=get_font(14), fill="#334155")
        draw.text((1040, ry + 6), card_t, font=get_font(14), fill="#059669")

        if gwp != "—":
            draw_badge(draw, 1200, ry + 4, gwp, "#ecfdf5", "#065f46", get_font(12, bold=True), pad_x=8, pad_y=3)
        else:
            draw.text((1200, ry + 6), "—", font=get_font(14), fill="#94a3b8")

        # Toggle Switch
        sw_bg = "#2563eb" if active else "#cbd5e1"
        draw_rounded_rect(draw, [1380, ry + 4, 1424, ry + 26], radius=11, fill=sw_bg)
        knob_x = 1404 if active else 1382
        draw.ellipse([knob_x, ry + 6, knob_x + 18, ry + 24], fill="#ffffff")
        draw.text((1435, ry + 6), "Active" if active else "Paused", font=get_font(13), fill="#0f172a" if active else "#94a3b8")

        draw.line([(300, ry + 58), (300 + table_w, ry + 58)], fill="#f1f5f9", width=1)
        ry += 75

    # Bottom marketing callout footer
    draw_rounded_rect(draw, [300, 1105, 300 + table_w, 1165], radius=8, fill="#047857")
    draw.text((340, 1125), "⚡ 100% Native Wix Architecture • Zero External Servers • Dual Catalog V1 & V3 Supported", font=get_font(18, bold=True), fill="#ffffff")

    out_path = os.path.join(ASSETS_DIR, "screenshot-1.jpg")
    img.save(out_path, quality=95)
    print(f"Generated {out_path} ({w}x{h})")


def generate_screenshot_2():
    """Screenshot 2: Interactive Live Checkout Simulator & character validator."""
    w, h = 1600, 1200
    img = Image.new("RGB", (w, h), "#f1f5f9")
    draw = ImageDraw.Draw(img)

    draw_bm_chrome(draw, w, h)

    # Page Header
    draw.text((300, 95), "Interactive Live Checkout Simulator", font=get_font(30, bold=True), fill="#0f172a")
    draw.text((300, 140), "Preview how gift wrap options, greeting card limits, and free thresholds evaluate in real time.", font=get_font(16), fill="#64748b")

    # Main Simulation Container
    con_y = 185
    con_w = 1230
    draw_rounded_rect(draw, [300, con_y, 300 + con_w, 1120], radius=10, fill="#ffffff", outline="#e2e8f0", width=2)

    # Left Column: Shopper Cart & Options (width: 700)
    lx = 330
    draw.text((lx, con_y + 24), "1. Shopper Cart Items", font=get_font(20, bold=True), fill="#0f172a")

    # Cart Item 1
    draw_rounded_rect(draw, [lx, con_y + 60, lx + 660, con_y + 135], radius=8, fill="#f8fafc", outline="#cbd5e1")
    draw.text((lx + 16, con_y + 72), "Cashmere Winter Scarf", font=get_font(16, bold=True), fill="#0f172a")
    draw.text((lx + 16, con_y + 98), "$48.00 each", font=get_font(14), fill="#64748b")
    draw_badge(draw, lx + 120, con_y + 96, "Holiday Collection", "#fce7f3", "#9d174d", get_font(11, bold=True), pad_x=6, pad_y=2)
    # Qty stepper
    draw_button(draw, lx + 470, con_y + 78, 32, 32, "-", "#e2e8f0", "#0f172a", get_font(18, bold=True))
    draw.text((lx + 520, con_y + 84), "1", font=get_font(18, bold=True), fill="#0f172a")
    draw_button(draw, lx + 550, con_y + 78, 32, 32, "+", "#e2e8f0", "#0f172a", get_font(18, bold=True))
    draw.text((lx + 600, con_y + 84), "$48.00", font=get_font(16, bold=True), fill="#0f172a")

    # Cart Item 2
    draw_rounded_rect(draw, [lx, con_y + 148, lx + 660, con_y + 223], radius=8, fill="#f8fafc", outline="#cbd5e1")
    draw.text((lx + 16, con_y + 160), "Ceramic Artisan Mug", font=get_font(16, bold=True), fill="#0f172a")
    draw.text((lx + 16, con_y + 186), "$22.00 each", font=get_font(14), fill="#64748b")
    draw_badge(draw, lx + 120, con_y + 184, "holiday-promo", "#ede9fe", "#6d28d9", get_font(11, bold=True), pad_x=6, pad_y=2)
    draw_button(draw, lx + 470, con_y + 166, 32, 32, "-", "#e2e8f0", "#0f172a", get_font(18, bold=True))
    draw.text((lx + 520, con_y + 172), "1", font=get_font(18, bold=True), fill="#0f172a")
    draw_button(draw, lx + 550, con_y + 166, 32, 32, "+", "#e2e8f0", "#0f172a", get_font(18, bold=True))
    draw.text((lx + 600, con_y + 172), "$22.00", font=get_font(16, bold=True), fill="#0f172a")

    # Section 2: Gift Wrap Selection
    draw.line([(lx, con_y + 245), (lx + 660, con_y + 245)], fill="#e2e8f0", width=1)
    draw.text((lx, con_y + 265), "2. Selected Gift Wrapping Option", font=get_font(20, bold=True), fill="#0f172a")

    # Option Selection Pills
    draw_button(draw, lx, con_y + 305, 205, 42, "✓ Classic Ribbon ($4.99)", "#2563eb", "#ffffff", get_font(14, bold=True))
    draw_button(draw, lx + 215, con_y + 305, 200, 42, "Luxury Gold ($9.99)", "#f1f5f9", "#334155", get_font(14, bold=False))
    draw_button(draw, lx + 425, con_y + 305, 215, 42, "Holiday Festive ($6.50)", "#f1f5f9", "#334155", get_font(14, bold=False))

    # Section 3: Greeting Card
    draw.line([(lx, con_y + 370), (lx + 660, con_y + 370)], fill="#e2e8f0", width=1)
    draw.text((lx, con_y + 390), "3. Personalized Printed Greeting Message", font=get_font(20, bold=True), fill="#0f172a")

    # Card Toggle
    draw_rounded_rect(draw, [lx, con_y + 428, lx + 44, con_y + 450], radius=11, fill="#2563eb")
    draw.ellipse([lx + 24, con_y + 430, lx + 42, con_y + 448], fill="#ffffff")
    draw.text((lx + 55, con_y + 430), "Include Printed Greeting Card (+ complimentary above threshold)", font=get_font(14, bold=True), fill="#0f172a")

    # Text Area
    draw_rounded_rect(draw, [lx, con_y + 465, lx + 660, con_y + 570], radius=8, fill="#f8fafc", outline="#cbd5e1")
    draw.text((lx + 16, con_y + 480), "Dear Sarah,\nHappy Holidays! Hope this cashmere scarf keeps you warm all season.\nWith all our love, Alex & Elena xoxo", font=get_font(15), fill="#0f172a")

    # Character count bar
    draw.text((lx + 16, con_y + 585), "Character Count: 124 / 200 Characters", font=get_font(14), fill="#64748b")
    draw_badge(draw, lx + 530, con_y + 580, "✓ Within Character Limit", "#d1fae5", "#065f46", get_font(12, bold=True), pad_x=10, pad_y=4)

    # Right Column: Wix Checkout Breakdown (width: 480)
    rx = 1030
    draw_rounded_rect(draw, [rx, con_y + 24, rx + 470, con_y + 860], radius=8, fill="#f8fafc", outline="#e2e8f0", width=1)

    draw.text((rx + 24, con_y + 45), "Wix Checkout Order Summary", font=get_font(20, bold=True), fill="#0f172a")
    draw.line([(rx + 24, con_y + 80), (rx + 446, con_y + 80)], fill="#cbd5e1", width=1)

    # Items Subtotal
    draw.text((rx + 24, con_y + 105), "Items Subtotal (2 items):", font=get_font(16), fill="#334155")
    draw.text((rx + 380, con_y + 105), "$70.00", font=get_font(16, bold=True), fill="#0f172a")

    # Free Wrap Banner Progress
    draw_rounded_rect(draw, [rx + 24, con_y + 150, rx + 446, con_y + 205], radius=6, fill="#eff6ff", outline="#bfdbfe")
    draw.text((rx + 36, con_y + 165), "🎯 Add $5.00 more to unlock Free Gift Wrapping!", font=get_font(14, bold=True), fill="#1d4ed8")

    # Gift with Purchase Unlocked Banner
    draw_rounded_rect(draw, [rx + 24, con_y + 220, rx + 446, con_y + 295], radius=6, fill="#fef3c7", outline="#fde68a")
    draw.text((rx + 36, con_y + 235), "🎁 QUALIFIED FOR FREE BONUS GIFT:", font=get_font(13, bold=True), fill="#92400e")
    draw.text((rx + 36, con_y + 260), "Handcrafted Wood Keepsake Tag ($0.00)", font=get_font(15, bold=True), fill="#78350f")

    draw.line([(rx + 24, con_y + 315), (rx + 446, con_y + 315)], fill="#cbd5e1", width=1)

    # Fee items
    draw.text((rx + 24, con_y + 335), "Gift Wrapping (Classic Crimson):", font=get_font(15), fill="#334155")
    draw.text((rx + 390, con_y + 335), "$4.99", font=get_font(15, bold=True), fill="#0f172a")

    draw.text((rx + 24, con_y + 375), "Personalized Printed Card:", font=get_font(15), fill="#334155")
    draw.text((rx + 380, con_y + 375), "FREE", font=get_font(15, bold=True), fill="#059669")
    draw.text((rx + 24, con_y + 400), "✓ Free card threshold ($50.00) met", font=get_font(12), fill="#059669")

    draw.line([(rx + 24, con_y + 435), (rx + 446, con_y + 435)], fill="#cbd5e1", width=1)

    # Total Surcharges
    draw.text((rx + 24, con_y + 455), "Total Gift Surcharges:", font=get_font(16, bold=True), fill="#0f172a")
    draw.text((rx + 390, con_y + 455), "+$4.99", font=get_font(16, bold=True), fill="#b91c1c")

    # Estimated Checkout Total
    draw.text((rx + 24, con_y + 510), "Checkout Estimated Total:", font=get_font(18, bold=True), fill="#0f172a")
    draw.text((rx + 370, con_y + 510), "$74.99", font=get_font(22, bold=True), fill="#2563eb")

    # Telemetry Log callout
    draw_rounded_rect(draw, [rx + 24, con_y + 570, rx + 446, con_y + 830], radius=6, fill="#0f172a")
    draw.text((rx + 36, con_y + 585), "Structured Telemetry (Zero-Infra)", font=get_font(13, bold=True), fill="#38bdf8")
    log_text = """[TELEMETRY:USAGE] {
  "app": "giftcraft",
  "version": "1.0.0",
  "event": "USAGE_GIFT_EVALUATED",
  "metrics": {
    "optionId": "opt-classic",
    "subtotal": 70.00,
    "wrapFee": 4.99,
    "cardFee": 0.00,
    "isFreeCardApplied": true,
    "isGwpUnlocked": true,
    "charLimitValid": true
  }
}"""
    draw.text((rx + 36, con_y + 615), log_text, font=get_font(11), fill="#a5f3fc")

    out_path = os.path.join(ASSETS_DIR, "screenshot-2.jpg")
    img.save(out_path, quality=95)
    print(f"Generated {out_path} ({w}x{h})")


def generate_screenshot_3():
    """Screenshot 3: Gift Option & Free Threshold Rule Configuration Modal."""
    w, h = 1600, 1200
    img = Image.new("RGB", (w, h), "#f1f5f9")
    draw = ImageDraw.Draw(img)

    # Base dashboard background dimmed slightly
    draw_bm_chrome(draw, w, h)
    # Dim overlay
    overlay = Image.new("RGBA", (w, h), (15, 23, 42, 140))
    img.paste(overlay, (0, 0), overlay)
    draw = ImageDraw.Draw(img)

    # Centered Modal Window
    mw, mh = 860, 880
    mx = (w - mw) // 2
    my = (h - mh) // 2
    draw_rounded_rect(draw, [mx, my, mx + mw, my + mh], radius=12, fill="#ffffff", outline="#e2e8f0", width=2)

    # Modal Header
    draw.text((mx + 36, my + 30), "Add New Gift Wrapping Option", font=get_font(24, bold=True), fill="#0f172a")
    draw.text((mx + 36, my + 65), "Create tailored wrapping styles, character restrictions, and free incentive tiers.", font=get_font(15), fill="#64748b")
    draw.line([(mx, my + 105), (mx + mw, my + 105)], fill="#e2e8f0", width=1)

    # Form Fields
    fy = my + 130
    fx = mx + 40
    fw = mw - 80

    # Field 1: Name
    draw.text((fx, fy), "Option Name *", font=get_font(14, bold=True), fill="#334155")
    draw_rounded_rect(draw, [fx, fy + 24, fx + fw, fy + 68], radius=6, fill="#ffffff", outline="#2563eb", width=2)
    draw.text((fx + 16, fy + 36), "Emerald Velvet Holiday Wrap", font=get_font(16), fill="#0f172a")

    # Field 2 & 3: Style & Fee (Two Columns)
    fy += 90
    col_w = (fw - 24) // 2
    draw.text((fx, fy), "Wrap Style Preset", font=get_font(14, bold=True), fill="#334155")
    draw_rounded_rect(draw, [fx, fy + 24, fx + col_w, fy + 68], radius=6, fill="#f8fafc", outline="#cbd5e1")
    draw.text((fx + 16, fy + 36), "holiday_festive", font=get_font(16), fill="#0f172a")

    draw.text((fx + col_w + 24, fy), "Wrap Fee ($) *", font=get_font(14, bold=True), fill="#334155")
    draw_rounded_rect(draw, [fx + col_w + 24, fy + 24, fx + fw, fy + 68], radius=6, fill="#ffffff", outline="#cbd5e1")
    draw.text((fx + col_w + 40, fy + 36), "7.50", font=get_font(16), fill="#0f172a")

    # Field 4 & 5: Free Threshold & Char Limit
    fy += 90
    draw.text((fx, fy), "Free Wrap Subtotal Threshold ($)", font=get_font(14, bold=True), fill="#334155")
    draw_rounded_rect(draw, [fx, fy + 24, fx + col_w, fy + 68], radius=6, fill="#ffffff", outline="#cbd5e1")
    draw.text((fx + 16, fy + 36), "80.00", font=get_font(16), fill="#0f172a")

    draw.text((fx + col_w + 24, fy), "Greeting Message Max Characters", font=get_font(14, bold=True), fill="#334155")
    draw_rounded_rect(draw, [fx + col_w + 24, fy + 24, fx + fw, fy + 68], radius=6, fill="#ffffff", outline="#cbd5e1")
    draw.text((fx + col_w + 40, fy + 36), "250", font=get_font(16), fill="#0f172a")

    # Field 6 & 7: Free Card Threshold & GWP Product
    fy += 90
    draw.text((fx, fy), "Free Card Subtotal Threshold ($)", font=get_font(14, bold=True), fill="#334155")
    draw_rounded_rect(draw, [fx, fy + 24, fx + col_w, fy + 68], radius=6, fill="#ffffff", outline="#cbd5e1")
    draw.text((fx + 16, fy + 36), "50.00", font=get_font(16), fill="#0f172a")

    draw.text((fx + col_w + 24, fy), "Gift-with-Purchase Item (Optional)", font=get_font(14, bold=True), fill="#334155")
    draw_rounded_rect(draw, [fx + col_w + 24, fy + 24, fx + fw, fy + 68], radius=6, fill="#ffffff", outline="#cbd5e1")
    draw.text((fx + col_w + 40, fy + 36), "Deluxe Handcrafted Ornament", font=get_font(16), fill="#0f172a")

    # Field 8: GWP Min Subtotal
    fy += 90
    draw.text((fx, fy), "Gift-with-Purchase Qualifying Min Subtotal ($)", font=get_font(14, bold=True), fill="#334155")
    draw_rounded_rect(draw, [fx, fy + 24, fx + fw, fy + 68], radius=6, fill="#ffffff", outline="#cbd5e1")
    draw.text((fx + 16, fy + 36), "120.00", font=get_font(16), fill="#0f172a")

    # Tip Box
    fy += 85
    draw_rounded_rect(draw, [fx, fy, fx + fw, fy + 60], radius=6, fill="#ecfdf5", outline="#a7f3d0")
    draw.text((fx + 16, fy + 12), "💡 Pro Tip: Setting a $80 threshold boosts average order value by +21% as shoppers", font=get_font(13, bold=True), fill="#065f46")
    draw.text((fx + 16, fy + 32), "add higher-margin items to qualify for complimentary gift packaging.", font=get_font(13), fill="#047857")

    # Modal Footer
    draw.line([(mx, my + mh - 90), (mx + mw, my + mh - 90)], fill="#e2e8f0", width=1)
    draw_button(draw, mx + mw - 280, my + mh - 68, 110, 44, "Cancel", "#f1f5f9", "#334155", get_font(15, bold=True), radius=6)
    draw_button(draw, mx + mw - 150, my + mh - 68, 120, 44, "Save Option", "#2563eb", "#ffffff", get_font(15, bold=True), radius=6)

    out_path = os.path.join(ASSETS_DIR, "screenshot-3.jpg")
    img.save(out_path, quality=95)
    print(f"Generated {out_path} ({w}x{h})")


def generate_screenshot_4():
    """Screenshot 4: Storefront Wix Checkout Experience & Gift-with-Purchase Banner."""
    w, h = 1600, 1200
    img = Image.new("RGB", (w, h), "#f8fafc")
    draw = ImageDraw.Draw(img)

    # Storefront Header
    draw.rectangle([0, 0, w, 80], fill="#ffffff")
    draw.line([(0, 80), (w, 80)], fill="#e2e8f0", width=1)
    draw.text((80, 24), "ELITE COUTURE & GIFTS", font=get_font(24, bold=True), fill="#0f172a")
    draw.text((1200, 28), "🔒 Secure 256-Bit SSL Wix Checkout", font=get_font(15, bold=True), fill="#059669")

    # Checkout Layout: 2 Columns
    # Left Column: Delivery & Shipping details
    lx = 80
    ly = 120
    lw = 840
    draw_rounded_rect(draw, [lx, ly, lx + lw, ly + 980], radius=10, fill="#ffffff", outline="#e2e8f0", width=2)
    draw.text((lx + 36, ly + 30), "1. Shipping & Customer Information", font=get_font(20, bold=True), fill="#0f172a")

    draw.text((lx + 36, ly + 75), "Contact Email:", font=get_font(14, bold=True), fill="#64748b")
    draw_rounded_rect(draw, [lx + 36, ly + 98, lx + lw - 36, ly + 142], radius=6, fill="#f8fafc", outline="#cbd5e1")
    draw.text((lx + 50, ly + 110), "sarah.connor@example.com", font=get_font(15), fill="#0f172a")

    draw.text((lx + 36, ly + 165), "Delivery Address:", font=get_font(14, bold=True), fill="#64748b")
    draw_rounded_rect(draw, [lx + 36, ly + 188, lx + lw - 36, ly + 232], radius=6, fill="#f8fafc", outline="#cbd5e1")
    draw.text((lx + 50, ly + 200), "742 Evergreen Terrace, Springfield, OR 97477", font=get_font(15), fill="#0f172a")

    # Gift Customization Accordion Section
    draw.line([(lx + 36, ly + 260), (lx + lw - 36, ly + 260)], fill="#e2e8f0", width=1)
    draw_rounded_rect(draw, [lx + 36, ly + 285, lx + lw - 36, ly + 680], radius=8, fill="#fffbeb", outline="#fde68a", width=2)

    draw.text((lx + 60, ly + 310), "🎁 Gift Packaging & Personalized Greeting Card", font=get_font(20, bold=True), fill="#92400e")
    draw.text((lx + 60, ly + 342), "Selected Style: Classic Crimson Ribbon Packaging (Complimentary Free Over $75)", font=get_font(14), fill="#78350f")

    # Gift Card Message Preview inside checkout
    draw_rounded_rect(draw, [lx + 60, ly + 380, lx + lw - 60, ly + 560], radius=8, fill="#ffffff", outline="#d97706")
    draw.text((lx + 80, ly + 400), "Printed Greeting Card Preview:", font=get_font(14, bold=True), fill="#92400e")
    draw.text((lx + 80, ly + 435), "“Happy Birthday Sarah! Wishing you a splendid celebration and a wonderful\nyear ahead filled with joy. From Grandma & Grandpa with all our love.”", font=get_font(16), fill="#1e293b")
    draw.text((lx + 80, ly + 520), "Characters used: 142 / 200 • Printed on 350gsm Textured Cardstock", font=get_font(13), fill="#059669")

    # Free bonus gift alert in left column
    draw_rounded_rect(draw, [lx + 60, ly + 580, lx + lw - 60, ly + 655], radius=6, fill="#ecfdf5", outline="#34d399")
    draw.text((lx + 80, ly + 600), "🎉 Spend Promotion Unlocked!", font=get_font(15, bold=True), fill="#065f46")
    draw.text((lx + 80, ly + 625), "Your order subtotal qualifies for a FREE Handcrafted Wood Keepsake Tag!", font=get_font(14), fill="#047857")

    # Payment step mock
    draw.text((lx + 36, ly + 720), "2. Payment Method", font=get_font(20, bold=True), fill="#0f172a")
    draw_rounded_rect(draw, [lx + 36, ly + 755, lx + lw - 36, ly + 815], radius=6, fill="#f8fafc", outline="#cbd5e1")
    draw.text((lx + 55, ly + 775), "💳 Credit / Debit Card (Visa, MasterCard, Amex)", font=get_font(15, bold=True), fill="#0f172a")

    draw_button(draw, lx + 36, ly + 860, lw - 72, 60, "Place Order & Pay $88.50", "#2563eb", "#ffffff", get_font(20, bold=True), radius=8)

    # Right Column: Order Summary Drawer (width: 520)
    rx = 960
    rw = 560
    draw_rounded_rect(draw, [rx, ly, rx + rw, ly + 980], radius=10, fill="#ffffff", outline="#e2e8f0", width=2)
    draw.text((rx + 36, ly + 30), "Order Summary", font=get_font(22, bold=True), fill="#0f172a")
    draw.line([(rx + 36, ly + 70), (rx + rw - 36, ly + 70)], fill="#e2e8f0", width=1)

    # Line Item 1
    draw.text((rx + 36, ly + 95), "Silk Pajama Set (Navy)", font=get_font(16, bold=True), fill="#0f172a")
    draw.text((rx + 36, ly + 120), "Qty: 1 • Size: M", font=get_font(14), fill="#64748b")
    draw.text((rx + rw - 110, ly + 95), "$65.00", font=get_font(16, bold=True), fill="#0f172a")

    # Line Item 2
    draw.text((rx + 36, ly + 160), "Organic Lavender Pillow Mist", font=get_font(16, bold=True), fill="#0f172a")
    draw.text((rx + 36, ly + 185), "Qty: 1 • 100ml", font=get_font(14), fill="#64748b")
    draw.text((rx + rw - 110, ly + 160), "$23.50", font=get_font(16, bold=True), fill="#0f172a")

    # Line Item 3 - Free Gift
    draw.text((rx + 36, ly + 225), "🎁 Handcrafted Wood Keepsake Tag", font=get_font(16, bold=True), fill="#059669")
    draw.text((rx + 36, ly + 250), "Bonus Gift-with-Purchase", font=get_font(14), fill="#059669")
    draw.text((rx + rw - 110, ly + 225), "$0.00", font=get_font(16, bold=True), fill="#059669")

    draw.line([(rx + 36, ly + 290), (rx + rw - 36, ly + 290)], fill="#e2e8f0", width=1)

    # Price breakdown
    draw.text((rx + 36, ly + 315), "Items Subtotal:", font=get_font(16), fill="#475569")
    draw.text((rx + rw - 110, ly + 315), "$88.50", font=get_font(16, bold=True), fill="#0f172a")

    draw.text((rx + 36, ly + 355), "Standard Shipping:", font=get_font(16), fill="#475569")
    draw.text((rx + rw - 110, ly + 355), "FREE", font=get_font(16, bold=True), fill="#059669")

    # Gift Wrap Fee line
    draw.text((rx + 36, ly + 395), "Gift Wrapping (Classic Crimson):", font=get_font(16), fill="#475569")
    draw.text((rx + rw - 110, ly + 395), "$0.00", font=get_font(16, bold=True), fill="#059669")
    draw.text((rx + 36, ly + 420), "✓ Free gift wrap threshold ($75.00) satisfied", font=get_font(13), fill="#059669")

    draw.text((rx + 36, ly + 455), "Printed Greeting Card:", font=get_font(16), fill="#475569")
    draw.text((rx + rw - 110, ly + 455), "$0.00", font=get_font(16, bold=True), fill="#059669")

    draw.line([(rx + 36, ly + 500), (rx + rw - 36, ly + 500)], fill="#e2e8f0", width=1)

    draw.text((rx + 36, ly + 530), "Order Total:", font=get_font(22, bold=True), fill="#0f172a")
    draw.text((rx + rw - 140, ly + 530), "$88.50", font=get_font(26, bold=True), fill="#2563eb")

    # Guarantee badge
    draw_rounded_rect(draw, [rx + 36, ly + 620, rx + rw - 36, ly + 760], radius=8, fill="#f8fafc", outline="#cbd5e1")
    draw.text((rx + 56, ly + 645), "🛡️ Store Owner Directives", font=get_font(16, bold=True), fill="#0f172a")
    draw.text((rx + 56, ly + 675), "• 100% Serverless SPI Fee Integration", font=get_font(14), fill="#334155")
    draw.text((rx + 56, ly + 700), "• No external databases, zero latency", font=get_font(14), fill="#334155")
    draw.text((rx + 56, ly + 725), "• Seamless checkout order summary integration", font=get_font(14), fill="#334155")

    out_path = os.path.join(ASSETS_DIR, "screenshot-4.jpg")
    img.save(out_path, quality=95)
    print(f"Generated {out_path} ({w}x{h})")


if __name__ == "__main__":
    generate_app_icon()
    generate_screenshot_1()
    generate_screenshot_2()
    generate_screenshot_3()
    generate_screenshot_4()
    print("All assets generated successfully!")
