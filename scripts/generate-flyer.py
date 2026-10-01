"""Create a one-page French Stockkonect product flyer."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader, simpleSplit
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "flyer-stockkonect.pdf"
LOGO_WHITE = ROOT / "public" / "stockkonect-logo-white.png"
LOGO_MARK = ROOT / "public" / "stockkonect-mark.png"
W, H = A4
NAVY = colors.HexColor("#111A32")
NAVY_LIGHT = colors.HexColor("#1C2948")
INDIGO = colors.HexColor("#5B4CE2")
INDIGO_LIGHT = colors.HexColor("#EEEFFF")
INK = colors.HexColor("#172033")
MUTED = colors.HexColor("#667085")
PALE = colors.HexColor("#F5F6FA")
LINE = colors.HexColor("#E4E7EF")
GREEN = colors.HexColor("#119B70")
WHITE = colors.white
SITE_URL = "https://stockkonnect.vercel.app"


def rounded(c, x, y, w, h, fill, radius=10, stroke=None):
    c.setFillColor(fill)
    c.setStrokeColor(stroke or fill)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=bool(stroke))


def wrapped(c, value, x, y, width, *, font="Helvetica", size=9, leading=13, color=INK):
    c.setFillColor(color)
    c.setFont(font, size)
    for line in simpleSplit(value, font, size, width):
        c.drawString(x, y, line)
        y -= leading
    return y


def pill(c, label, x, y, *, fill=INDIGO_LIGHT, color=INDIGO, size=7.2, px=9, py=5):
    width = stringWidth(label, "Helvetica-Bold", size) + px * 2
    rounded(c, x, y, width, size + py * 2, fill, (size + py * 2) / 2)
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", size)
    c.drawString(x + px, y + py, label)
    return width


def draw_qr_code(c, x, y, size):
    qr = QrCodeWidget(
        SITE_URL,
        barLevel="H",
        barBorder=4,
        barFillColor=colors.black,
        barWidth=size,
        barHeight=size,
    )
    drawing = Drawing(size, size)
    drawing.add(qr)
    c.saveState()
    c.setFillColor(WHITE)
    c.roundRect(x - 2, y - 2, size + 4, size + 4, 4, stroke=0, fill=1)
    renderPDF.draw(drawing, c, x, y)
    c.restoreState()


def dashboard_mockup(c, x, y, w, h):
    # Floating browser window with an illustrative, fictional dashboard.
    c.saveState()
    c.setFillAlpha(0.18)
    rounded(c, x + 5, y - 5, w, h, colors.black, 13)
    c.restoreState()
    rounded(c, x, y, w, h, WHITE, 12)
    rounded(c, x, y + h - 31, w, 31, colors.HexColor("#F8F9FC"), 12)
    c.drawImage(ImageReader(str(LOGO_MARK)), x + 9, y + h - 23, width=14, height=14, mask="auto")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 7.2)
    c.drawString(x + 27, y + h - 18, "Stockkonect")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 5.5)
    c.drawRightString(x + w - 12, y + h - 18, "TABLEAU DE BORD")

    nav_w = 45
    c.setFillColor(NAVY)
    c.roundRect(x + 8, y + 9, nav_w, h - 48, 6, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#AAB4CC"))
    c.setFont("Helvetica", 5.1)
    for i, label in enumerate(["Vue d'ensemble", "Produits", "Mouvements", "Ventes", "Clients"]):
        yy = y + h - 56 - i * 20
        if i == 0:
            rounded(c, x + 12, yy - 4, nav_w - 8, 14, NAVY_LIGHT, 4)
            c.setFillColor(WHITE)
        c.drawString(x + 17, yy, label)
        c.setFillColor(colors.HexColor("#AAB4CC"))

    content_x = x + nav_w + 19
    content_w = w - nav_w - 31
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(content_x, y + h - 52, "Vue d'ensemble")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 5.6)
    c.drawString(content_x, y + h - 64, "Suivez l'activité de votre entreprise")

    card_gap = 5
    kpi_w = (content_w - card_gap * 2) / 3
    for i, (label, value) in enumerate([("STOCK", "3 103"), ("VENTES", "109"), ("ALERTES", "04")]):
        xx = content_x + i * (kpi_w + card_gap)
        rounded(c, xx, y + h - 109, kpi_w, 34, WHITE, 5, LINE)
        c.setFillColor(MUTED)
        c.setFont("Helvetica-Bold", 4.8)
        c.drawString(xx + 6, y + h - 88, label)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(xx + 6, y + h - 102, value)

    chart_x, chart_y = content_x, y + 20
    chart_w, chart_h = content_w * 0.63, 73
    rounded(c, chart_x, chart_y, chart_w, chart_h, WHITE, 6, LINE)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 5.7)
    c.drawString(chart_x + 7, chart_y + chart_h - 12, "Ventes des 7 derniers jours")
    c.setStrokeColor(colors.HexColor("#E9EAF2"))
    c.setLineWidth(0.5)
    for i in range(3):
        yy = chart_y + 17 + i * 14
        c.line(chart_x + 8, yy, chart_x + chart_w - 7, yy)
    points = [
        (chart_x + 10, chart_y + 21),
        (chart_x + 29, chart_y + 31),
        (chart_x + 48, chart_y + 27),
        (chart_x + 67, chart_y + 48),
        (chart_x + 87, chart_y + 41),
        (chart_x + 107, chart_y + 58),
        (chart_x + chart_w - 10, chart_y + 54),
    ]
    c.setStrokeColor(INDIGO)
    c.setLineWidth(1.8)
    path = c.beginPath()
    path.moveTo(*points[0])
    for point in points[1:]:
        path.lineTo(*point)
    c.drawPath(path, stroke=1, fill=0)

    stock_x = chart_x + chart_w + 6
    stock_w = content_w - chart_w - 6
    rounded(c, stock_x, chart_y, stock_w, chart_h, WHITE, 6, LINE)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 5.7)
    c.drawString(stock_x + 6, chart_y + chart_h - 12, "Stock par produit")
    c.setFillColor(INDIGO_LIGHT)
    c.circle(stock_x + stock_w / 2, chart_y + 34, 18, fill=1, stroke=0)
    c.setFillColor(INDIGO)
    c.wedge(stock_x + stock_w / 2 - 18, chart_y + 16, stock_x + stock_w / 2 + 18, chart_y + 52, 20, 255, fill=1, stroke=0)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 5)
    c.drawCentredString(stock_x + stock_w / 2, chart_y + 7, "50 produits")
def draw_flyer(c):
    c.setTitle("Stockkonect — Présentation")
    c.setAuthor("Stockkonect")
    c.setSubject("Flyer de présentation de Stockkonect et de ses offres")
    c.setFillColor(PALE)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # Hero area
    c.setFillColor(NAVY)
    c.rect(0, 405, W, H - 405, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#282364"))
    c.circle(W - 18, H - 8, 135, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#3F38A5"))
    c.circle(W - 7, H - 5, 91, fill=1, stroke=0)
    c.drawImage(ImageReader(str(LOGO_WHITE)), 43, H - 91, width=170, height=34, mask="auto")
    c.setFillColor(colors.HexColor("#C7D2FE"))
    c.setFont("Helvetica-Bold", 7.5)
    c.drawRightString(W - 43, H - 53, "GESTION DE STOCK SIMPLIFIÉE")

    pill(c, "POUR LES COMMERCES ET LES ENTREPRISES", 43, 704, fill=colors.HexColor("#2B3153"), color=colors.HexColor("#D6D9FF"), size=6.7)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 29)
    c.drawString(43, 662, "Votre stock,")
    c.drawString(43, 626, "sous contrôle.")
    c.setFillColor(colors.HexColor("#A5B4FC"))
    c.setFont("Helvetica-Bold", 22)
    c.drawString(43, 590, "Votre activité en avance.")
    wrapped(
        c,
        "Gérez vos produits, vos ventes et vos approvisionnements dans un seul outil simple à utiliser.",
        45,
        558,
        240,
        size=9.5,
        leading=14,
        color=colors.HexColor("#D7DCEC"),
    )
    rounded(c, 43, 493, 224, 34, GREEN, 17)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(58, 506, "Parlons de votre activité sur WhatsApp")
    c.linkURL(
        "https://wa.me/2250748323191?text=Bonjour%20Stockkonect%2C%20je%20souhaite%20d%C3%A9couvrir%20votre%20solution.",
        (43, 493, 267, 527), relative=0, thickness=0,
    )
    c.setFillColor(colors.HexColor("#CDD4E6"))
    c.setFont("Helvetica", 7)
    c.drawString(45, 476, "Essai gratuit disponible à la création d'un compte")

    dashboard_mockup(c, 316, 474, 237, 247)
    c.setFillColor(colors.HexColor("#AEB8D0"))
    c.setFont("Helvetica", 5.8)
    c.drawRightString(553, 463, "Aperçu illustratif · données fictives")

    # Feature strip
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(43, 375, "Tout votre stock, au même endroit")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7.5)
    c.drawRightString(W - 43, 376, "Simple à prendre en main · accessible en ligne")

    features = [
        ("01", "Produits & stocks", "Suivez les quantités, les seuils d'alerte, les catégories et les codes-barres."),
        ("02", "Ventes & achats", "Enregistrez les ventes et les réceptions, avec un historique des mouvements."),
        ("03", "Pilotage & exports", "Consultez vos indicateurs et exportez vos données en CSV."),
    ]
    card_y, card_h, gap = 271, 82, 10
    card_w = (W - 86 - gap * 2) / 3
    for index, (number, title, description) in enumerate(features):
        x = 43 + index * (card_w + gap)
        rounded(c, x, card_y, card_w, card_h, WHITE, 9, LINE)
        pill(c, number, x + 12, card_y + 53, size=6.3, px=7, py=4)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(x + 12, card_y + 39, title)
        wrapped(c, description, x + 12, card_y + 25, card_w - 24, size=6.7, leading=9, color=MUTED)

    # Pricing strip
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(43, 239, "Choisissez votre offre")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7)
    c.drawRightString(W - 43, 240, "Des formules adaptées à votre croissance")

    plans = [
        ("STARTER", "9 900", "50 produits · 2 utilisateurs", False),
        ("PRO", "14 900", "200 produits · 5 utilisateurs", True),
        ("BUSINESS", "24 900", "500 produits · 10 utilisateurs", False),
    ]
    price_y, price_h = 128, 94
    price_w = (W - 86 - gap * 2) / 3
    for index, (name, price, limits, highlighted) in enumerate(plans):
        x = 43 + index * (price_w + gap)
        fill = NAVY if highlighted else WHITE
        stroke = INDIGO if highlighted else LINE
        rounded(c, x, price_y, price_w, price_h, fill, 9, stroke)
        main = WHITE if highlighted else INK
        sub = colors.HexColor("#CFD4E4") if highlighted else MUTED
        c.setFillColor(main)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(x + 12, price_y + 72, name)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(x + 12, price_y + 49, price)
        c.setFont("Helvetica", 7)
        c.drawString(x + 12 + stringWidth(price, "Helvetica-Bold", 16) + 4, price_y + 50, "F CFA / mois")
        c.setFillColor(sub)
        c.setFont("Helvetica", 6.4)
        c.drawString(x + 12, price_y + 31, limits)
        if highlighted:
            c.setFillColor(colors.HexColor("#C7D2FE"))
            c.setFont("Helvetica-Bold", 5.6)
            c.drawRightString(x + price_w - 10, price_y + 72, "POPULAIRE")

    # Contact footer
    rounded(c, 43, 48, W - 86, 58, INDIGO, 10)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(58, 83, "Prêt à mieux gérer votre stock ?")
    c.setFont("Helvetica", 7.5)
    c.drawString(58, 65, "Contactez-nous sur WhatsApp : +225 07 48 32 31 91")
    qr_size, qr_x, qr_y = 35, W - 50 - 35, 57
    c.setFont("Helvetica-Bold", 6.4)
    c.drawRightString(qr_x - 9, 80, "Scannez pour visiter")
    c.setFont("Helvetica", 6)
    c.drawRightString(qr_x - 9, 65, "stockkonnect.vercel.app")
    draw_qr_code(c, qr_x, qr_y, qr_size)
    c.linkURL(SITE_URL, (qr_x - 125, 55, qr_x + qr_size + 3, 98), relative=0, thickness=0)
    c.showPage()
    c.save()


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    draw_flyer(pdf)
    print(f"Flyer généré : {OUTPUT}")


if __name__ == "__main__":
    main()
