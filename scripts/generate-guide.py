"""Build the French Stockkonect user guide with vector UI captures."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "guide-stockkonect.pdf"
PAGE_W, PAGE_H = A4
NAVY = colors.HexColor("#10182D")
INK = colors.HexColor("#172033")
MUTED = colors.HexColor("#64748B")
INDIGO = colors.HexColor("#5546D7")
PALE = colors.HexColor("#F3F5FA")
LINE = colors.HexColor("#E2E8F0")
GREEN = colors.HexColor("#059669")
AMBER = colors.HexColor("#D97706")
WHITE = colors.white



CHAPTERS = [
    {
        "title": "Prendre ses repères",
        "intro": "Le tableau de bord rassemble les indicateurs utiles et les raccourcis vers les opérations courantes.",
        "mode": "dashboard",
        "active": "Tableau de bord",
        "caption": "Le tableau de bord en un coup d'oeil",
        "markers": [(0.31, 0.79), (0.66, 0.79), (0.30, 0.34)],
        "marker_labels": ["1. Indicateurs", "2. Activite", "3. Alertes"],
        "steps": [
            "Connectez-vous avec l'adresse e-mail et le mot de passe de votre entreprise.",
            "Lisez la valeur du stock, les ventes et les achats du mois dans les cartes en haut.",
            "Ouvrez une alerte de stock bas pour retrouver le produit à réapprovisionner.",
        ],
        "tip": "Le menu latéral donne accès aux produits, mouvements, ventes, approvisionnements et répertoires. Sur téléphone, ouvrez-le avec le bouton de menu.",
    },
    {
        "title": "Créer et organiser les produits",
        "intro": "Une fiche produit bien renseignée facilite les ventes, les recherches et le suivi des niveaux de stock.",
        "mode": "products",
        "active": "Produits",
        "caption": "La liste des produits et ses actions",
        "markers": [(0.89, 0.91), (0.66, 0.60), (0.63, 0.44)],
        "marker_labels": ["1. Nouveau produit", "2. SKU", "3. Niveau de stock"],
        "steps": [
            "Cliquez sur Nouveau produit, puis indiquez le nom et un SKU unique.",
            "Renseignez prix, coût, quantité initiale et seuil d'alerte. La photo et le code-barres sont facultatifs.",
            "Ajoutez une catégorie ou un fournisseur, puis enregistrez. Utilisez l'action Étiquette pour imprimer un code-barres.",
        ],
        "tip": "Le SKU identifie votre article dans vos exports. Choisissez une référence courte et stable, par exemple PAP-001.",
    },
    {
        "title": "Suivre les mouvements de stock",
        "intro": "Chaque entrée, sortie ou correction est enregistrée dans l'historique avec sa date et son auteur.",
        "mode": "movements",
        "active": "Mouvements",
        "caption": "Le formulaire de mouvement et l'historique",
        "markers": [(0.34, 0.77), (0.43, 0.57), (0.71, 0.28)],
        "marker_labels": ["1. Type", "2. Article et quantité", "3. Historique"],
        "steps": [
            "Choisissez le produit concerné et le type de mouvement : entrée, sortie ou ajustement.",
            "Saisissez la quantité et ajoutez une note pour garder le contexte de l'opération.",
            "Validez, puis consultez l'historique pour vérifier le changement de stock.",
        ],
        "tip": "Une sortie ne peut pas dépasser le stock disponible. Pour une correction d'inventaire, utilisez un ajustement et indiquez la raison.",
    },
    {
        "title": "Enregistrer ventes et approvisionnements",
        "intro": "Les ventes diminuent le stock et les réceptions l'augmentent. Les deux opérations gardent une trace detailee.",
        "mode": "sales",
        "active": "Ventes",
        "caption": "Une vente enregistrée met le stock à jour automatiquement",
        "markers": [(0.37, 0.78), (0.74, 0.56), (0.82, 0.21)],
        "marker_labels": ["1. Ajouter les articles", "2. Choisir le client", "3. Confirmer"],
        "steps": [
            "Dans Ventes, créez une vente, ajoutez les articles et leurs quantités, puis sélectionnez le client si besoin.",
            "Dans Approvisionnements, créez une réception et choisissez le fournisseur. Le coût d'achat peut être précisé par article.",
            "Pour annuler une opération, ouvrez-la dans son historique et choisissez Annuler. Le stock est corrigé dans la même opération.",
        ],
        "tip": "Une réception ne peut être annulée que si le stock disponible permet de retirer les quantités reçues. Vérifiez l'historique après chaque annulation.",
    },
    {
        "title": "Gérer clients, fournisseurs et catégories",
        "intro": "Les répertoires évitent de ressaisir les mêmes informations et relient les produits aux bons contacts.",
        "mode": "contacts",
        "active": "Clients",
        "caption": "Un repertoire simple, recherche et modifiable",
        "markers": [(0.89, 0.91), (0.35, 0.63), (0.78, 0.63)],
        "marker_labels": ["1. Ajouter un contact", "2. Rechercher", "3. Modifier"],
        "steps": [
            "Ajoutez les clients et fournisseurs depuis leur page respective. Le nom est obligatoire ; les coordonnées sont facultatives.",
            "Créez des catégories pour classer les produits par famille ou activité.",
            "Associez une catégorie ou un fournisseur a la fiche produit pour retrouver les informations plus vite.",
        ],
        "tip": "Les répertoires sont propres a votre entreprise. Utilisez la recherche de la page pour retrouver un contact dans une longue liste.",
    },
    {
        "title": "Exporter les données vers Excel",
        "intro": "Les exports CSV permettent d'archiver les données, de les partager ou de poursuivre l'analyse dans un tableur.",
        "mode": "exports",
        "active": "Tableau de bord",
        "caption": "Les exports rapides sont accèssibles depuis le tableau de bord",
        "markers": [(0.89, 0.90), (0.73, 0.90), (0.55, 0.90)],
        "marker_labels": ["1. Stock", "2. Mouvements", "3. Ventes"],
        "steps": [
            "Choisissez Exporter le stock, Exporter les mouvements, Exporter les ventes ou Exporter les approvisionnements.",
            "Vous pouvez aussi exporter une liste depuis les pages Produits, Ventes et Approvisionnements.",
            "Ouvrez le fichier CSV dans Excel ou un autre tableur. Pour les ventes, choisissez la période proposée.",
        ],
        "tip": "Un CSV contient des lignes et des colonnes. Si Excel affiche tout dans une colonne, choisissez le séparateur point-virgule a l'importation.",
    },
    {
        "title": "Gérer l'équipe et obtenir de l'aide",
        "intro": "Les administrateurs gèrent les accès et les paramêtres. Le menu donne aussi accès aux abonnements et au support.",
        "mode": "team",
        "active": "Utilisateurs",
        "caption": "Les roles et les liens d'assistance dans l'espace de gestion",
        "markers": [(0.49, 0.64), (0.17, 0.22), (0.17, 0.12)],
        "marker_labels": ["1. Rôles de l'équipe", "2. Abonnements", "3. Assistance"],
        "steps": [
            "Depuis Utilisateurs, un administrateur invite un membre, choisit son role et peut mettre à jour son accès.",
            "Les employés gèrent les opérations quotidiennes. Les paramêtres et la gestion des utilisateurs restent réservés aux administrateurs.",
            "Ouvrez Abonnements pour consulter les offres. Pour demander une offre payante, utilisez le bouton Choisir cette offre et poursuivez sur WhatsApp.",
        ],
        "tip": "Besoin d'aide ? Cliquez sur le lien WhatsApp dans la barre latérale. Pour une question utile au support, indiquez le nom de votre entreprise et la page concernee.",
    },
]


def style(name, **kwargs):
    base = {
        "fontName": "Helvetica",
        "fontSize": 9,
        "leading": 13,
        "textColor": INK,
        "alignment": TA_LEFT,
        "spaceAfter": 0,
        "allowWidows": 0,
        "allowOrphans": 0,
    }
    base.update(kwargs)
    return ParagraphStyle(name, **base)


BODY = style("body")
SMALL = style("small", fontSize=7.5, leading=10, textColor=MUTED)
CARD_TEXT = style("card", fontSize=8.2, leading=11, textColor=INK)
TIP_TEXT = style("tip", fontSize=8.2, leading=11, textColor=INK)


def paragraph(c, text, x, top, width, pstyle=BODY):
    p = Paragraph(text, pstyle)
    _, height = p.wrap(width, PAGE_H)
    p.drawOn(c, x, top - height)
    return top - height


def rounded_button(c, x, y, w, h, label, fill=INDIGO):
    c.setFillColor(fill)
    c.roundRect(x, y, w, h, 4, stroke=0, fill=1)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 6.3)
    c.drawCentredString(x + w / 2, y + (h - 6.3) / 2 + 1, label)


def draw_sidebar(c, x, y, w, h, active):
    c.setFillColor(NAVY)
    c.roundRect(x, y, w, h, 7, stroke=0, fill=1)
    c.rect(x + w - 7, y, 7, h, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#8B83FF"))
    c.circle(x + 12, y + h - 17, 5, stroke=0, fill=1)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 7.2)
    c.drawString(x + 21, y + h - 19, "Stockkonect")
    c.setStrokeColor(colors.HexColor("#29344C"))
    c.line(x + 7, y + h - 29, x + w - 7, y + h - 29)
    labels = ["Tableau de bord", "Produits", "Mouvements", "Ventes", "Approvisionnements", "Clients", "Categories", "Fournisseurs", "Utilisateurs", "Paramêtres"]
    yy = y + h - 43
    for label in labels:
        if yy < y + 38:
            break
        if label == active:
            c.setFillColor(colors.HexColor("#28334A"))
            c.roundRect(x + 5, yy - 4, w - 10, 15, 3, stroke=0, fill=1)
        c.setFillColor(WHITE if label == active else colors.HexColor("#C5CCDA"))
        c.setFont("Helvetica-Bold" if label == active else "Helvetica", 5.2)
        c.drawString(x + 10, yy, label)
        yy -= 17
    c.setStrokeColor(colors.HexColor("#29344C"))
    c.line(x + 7, y + 31, x + w - 7, y + 31)
    c.setFillColor(colors.HexColor("#A7F3D0"))
    c.setFont("Helvetica-Bold", 5.1)
    c.drawString(x + 10, y + 19, "Abonnements")
    c.setFillColor(colors.HexColor("#CBD5E1"))
    c.drawString(x + 10, y + 9, "Besoin d'aide ?")


def draw_table(c, x, y, w, h, headings, rows, widths=None):
    header_h = 20
    c.setFillColor(colors.HexColor("#F8FAFC"))
    c.roundRect(x, y + h - header_h, w, header_h, 3, stroke=0, fill=1)
    if widths is None:
        widths = [w / len(headings)] * len(headings)
    xx = x
    c.setFont("Helvetica-Bold", 5.5)
    c.setFillColor(MUTED)
    for label, colw in zip(headings, widths):
        c.drawString(xx + 5, y + h - 13, label.upper()[:18])
        xx += colw
    row_h = min(25, (h - header_h) / max(1, len(rows)))
    for i, row in enumerate(rows):
        ry = y + h - header_h - (i + 1) * row_h
        c.setStrokeColor(LINE)
        c.setLineWidth(0.5)
        c.line(x, ry, x + w, ry)
        xx = x
        for j, (value, colw) in enumerate(zip(row, widths)):
            c.setFillColor(INK if j == 0 else MUTED)
            c.setFont("Helvetica-Bold" if j == 0 else "Helvetica", 5.8)
            max_chars = max(7, int(colw / 3.3))
            c.drawString(xx + 5, ry + row_h / 2 - 2, str(value)[:max_chars])
            xx += colw


def draw_ui_capture(c, x, y, w, h, mode, active):
    """Draw a clean, fictitious-data capture that mirrors the real web app."""
    c.setFillColor(WHITE)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.8)
    c.roundRect(x, y, w, h, 9, stroke=1, fill=1)
    pad = 7
    ix, iy, iw, ih = x + pad, y + pad, w - 2 * pad, h - 2 * pad
    sidebar_w = min(104, iw * 0.215)
    draw_sidebar(c, ix, iy, sidebar_w, ih, active)
    mx = ix + sidebar_w + 13
    mw = iw - sidebar_w - 22
    top = iy + ih - 17
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 10)
    title = {
        "dashboard": "Tableau de bord",
        "products": "Produits",
        "movements": "Mouvements de stock",
        "sales": "Nouvelle vente",
        "contacts": "Clients",
        "exports": "Vue d'ensemble",
        "team": "Utilisateurs",
    }[mode]
    c.drawString(mx, top, title)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 5.7)
    c.drawString(mx, top - 10, "Demo SAS  /  Donnees d'exemple")
    content_top = top - 24
    content_bottom = iy + 9
    content_h = content_top - content_bottom

    if mode in ("dashboard", "exports"):
        gap = 6
        card_w = (mw - gap * 3) / 4
        export_labels = ["Stock", "Mouvements", "Ventes", "Achats"]
        values = ["3 103 F", "109 unites", "0 F", "0 F"]
        for i in range(4):
            cx = mx + i * (card_w + gap)
            cy = content_top - 52
            c.setFillColor(colors.HexColor("#FFFFFF"))
            c.setStrokeColor(LINE)
            c.roundRect(cx, cy, card_w, 43, 5, stroke=1, fill=1)
            c.setFillColor(MUTED)
            c.setFont("Helvetica", 5.2)
            c.drawString(cx + 6, cy + 29, export_labels[i] if mode == "dashboard" else "Exporter " + export_labels[i])
            if mode == "dashboard":
                c.setFillColor(INK)
                c.setFont("Helvetica-Bold", 8)
                c.drawString(cx + 6, cy + 13, values[i])
            else:
                rounded_button(c, cx + 4, cy + 8, card_w - 8, 15, "CSV", GREEN)
        panel_y = content_bottom + 9
        panel_h = max(58, content_h - 68)
        left_w = (mw - 7) * 0.57
        for px, pw in ((mx, left_w), (mx + left_w + 7, mw - left_w - 7)):
            c.setFillColor(WHITE)
            c.setStrokeColor(LINE)
            c.roundRect(px, panel_y, pw, panel_h, 5, stroke=1, fill=1)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 6)
        c.drawString(mx + 8, panel_y + panel_h - 13, "Ventes des 14 derniers jours")
        gx, gy = mx + 12, panel_y + 14
        c.setStrokeColor(colors.HexColor("#CBD5E1"))
        c.line(gx, gy, mx + left_w - 7, gy)
        points = [(gx + 12, gy + 10), (gx + 39, gy + 25), (gx + 70, gy + 18), (gx + 99, gy + 37), (gx + 133, gy + 30)]
        c.setStrokeColor(INDIGO)
        c.setLineWidth(1.6)
        for a, b in zip(points, points[1:]):
            c.line(a[0], a[1], b[0], b[1])
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 6)
        c.drawString(mx + left_w + 14, panel_y + panel_h - 13, "Stock par produit")
        c.setFillColor(colors.HexColor("#7C5CE7"))
        c.circle(mx + left_w + 40, panel_y + panel_h / 2 - 2, min(23, panel_h * 0.23), stroke=0, fill=1)
        c.setFillColor(WHITE)
        c.circle(mx + left_w + 40, panel_y + panel_h / 2 - 2, min(12, panel_h * 0.12), stroke=0, fill=1)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 5.2)
        c.drawString(mx + left_w + 72, panel_y + panel_h / 2, "5 produits")
        if mode == "dashboard":
            c.setFillColor(colors.HexColor("#FFFBEB"))
            c.roundRect(mx, panel_y - 1, left_w, 14, 3, stroke=0, fill=1)
            c.setFillColor(AMBER)
            c.setFont("Helvetica-Bold", 5.2)
            c.drawString(mx + 7, panel_y + 4, "2 produits sous le seuil")
    elif mode == "products":
        rounded_button(c, mx + mw - 77, content_top - 20, 77, 18, "Nouveau produit")
        draw_table(c, mx, content_bottom + 5, mw, content_h - 34,
                   ["Produit / SKU", "Categorie", "Prix", "Stock", "Actions"],
                   [["Cahier A4", "Bureautique", "1 300 F", "60", "Étiquette"],
                    ["Clavier mecanique", "Electronique", "9 000 F", "32", "Modifier"],
                    ["Souris sans fil", "Electronique", "3 000 F", "3 - bas", "Modifier"],
                    ["Stylo bille", "Bureautique", "100 F", "2 - bas", "Modifier"]],
                   [mw * .27, mw * .22, mw * .17, mw * .14, mw * .20])
    elif mode == "movements":
        form_w = mw * .45
        c.setFillColor(colors.HexColor("#F8FAFC"))
        c.setStrokeColor(LINE)
        c.roundRect(mx, content_bottom + 4, form_w, content_h - 8, 6, stroke=1, fill=1)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 6.8)
        c.drawString(mx + 9, content_top - 13, "Nouveau mouvement")
        for i, (label, value) in enumerate([("TYPE", "Entree  /  Sortie  /  Ajustement"), ("PRODUIT", "Cahier A4 (lot de 5)"), ("QUANTITE", "10"), ("NOTE", "Reception fournisseur")]):
            yy = content_top - 31 - i * 31
            c.setFillColor(MUTED)
            c.setFont("Helvetica-Bold", 4.9)
            c.drawString(mx + 9, yy, label)
            c.setFillColor(WHITE)
            c.setStrokeColor(LINE)
            c.roundRect(mx + 8, yy - 17, form_w - 16, 13, 3, stroke=1, fill=1)
            c.setFillColor(INK)
            c.setFont("Helvetica", 5.2)
            c.drawString(mx + 13, yy - 12, value)
        rounded_button(c, mx + form_w - 69, content_bottom + 9, 60, 15, "Enregistrer", GREEN)
        hx = mx + form_w + 9
        hw = mw - form_w - 9
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 6.8)
        c.drawString(hx, content_top - 13, "Historique recent")
        draw_table(c, hx, content_bottom + 5, hw, content_h - 25,
                   ["Date", "Produit", "Type", "Qte"],
                   [["Aujourd'hui", "Cahier A4", "Entree", "+10"], ["Hier", "Stylo bille", "Sortie", "-2"], ["29/09", "Clavier", "Ajustement", "+1"]],
                   [hw * .26, hw * .32, hw * .25, hw * .17])
    elif mode == "sales":
        rounded_button(c, mx + mw - 69, content_top - 20, 69, 17, "Ajouter article")
        draw_table(c, mx, content_bottom + 46, mw * .68, content_h - 39,
                   ["Article", "Qte", "Prix", "Total"],
                   [["Cahier A4", "2", "1 300 F", "2 600 F"], ["Stylo bille", "1", "100 F", "100 F"], ["Souris sans fil", "1", "3 000 F", "3 000 F"]],
                   [mw * .30, mw * .12, mw * .27, mw * .31])
        box_x = mx + mw * .70
        box_w = mw * .30
        box_y = content_bottom + 4
        c.setFillColor(colors.HexColor("#F8FAFC"))
        c.setStrokeColor(LINE)
        c.roundRect(box_x, box_y, box_w, content_h - 8, 5, stroke=1, fill=1)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 5.3)
        c.drawString(box_x + 7, content_top - 18, "CLIENT")
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 6.2)
        c.drawString(box_x + 7, content_top - 31, "Client exemple")
        c.setStrokeColor(LINE)
        c.line(box_x + 7, content_top - 42, box_x + box_w - 7, content_top - 42)
        c.setFillColor(MUTED)
        c.drawString(box_x + 7, content_top - 56, "TOTAL")
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(box_x + 7, content_top - 72, "5 700 F")
        rounded_button(c, box_x + 6, box_y + 8, box_w - 12, 17, "Confirmer la vente", GREEN)
    elif mode == "contacts":
        rounded_button(c, mx + mw - 76, content_top - 20, 76, 18, "Nouveau client")
        c.setFillColor(colors.HexColor("#F8FAFC"))
        c.setStrokeColor(LINE)
        c.roundRect(mx, content_top - 21, mw * .56, 14, 3, stroke=1, fill=1)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 5.4)
        c.drawString(mx + 7, content_top - 16, "Rechercher un client...")
        draw_table(c, mx, content_bottom + 5, mw, content_h - 40,
                   ["Nom", "Telephone", "E-mail", "Actions"],
                   [["Librairie des Palmiers", "+225 07 00 00 01", "contact@exemple.ci", "Modifier"], ["Boutique Centrale", "+225 07 00 00 02", "boutique@exemple.ci", "Modifier"], ["Client exemple", "+225 07 00 00 03", "client@exemple.ci", "Modifier"]],
                   [mw * .32, mw * .22, mw * .30, mw * .16])
        c.setFillColor(colors.HexColor("#EEF2FF"))
        c.roundRect(mx, content_bottom - 1, mw, 18, 4, stroke=0, fill=1)
        c.setFillColor(INDIGO)
        c.setFont("Helvetica-Bold", 5.6)
        c.drawString(mx + 7, content_bottom + 5, "MEME PRINCIPE : FOURNISSEURS ET CATEGORIES")
    elif mode == "team":
        rounded_button(c, mx + mw - 75, content_top - 20, 75, 18, "Inviter un membre")
        draw_table(c, mx, content_bottom + 57, mw, content_h - 51,
                   ["Membre", "E-mail", "Role", "Actions"],
                   [["Awa Kouame", "awa@exemple.ci", "Administrateur", "Modifier"], ["Koffi Yao", "koffi@exemple.ci", "Employe", "Modifier"], ["Nadia Diallo", "nadia@exemple.ci", "Employe", "Modifier"]],
                   [mw * .22, mw * .35, mw * .22, mw * .21])
        c.setFillColor(colors.HexColor("#EEF2FF"))
        c.roundRect(mx, content_bottom + 5, mw, 39, 5, stroke=0, fill=1)
        c.setFillColor(INDIGO)
        c.setFont("Helvetica-Bold", 6)
        c.drawString(mx + 8, content_bottom + 29, "PARAMETRES DE L'ENTREPRISE")
        c.setFillColor(INK)
        c.setFont("Helvetica", 5.7)
        c.drawString(mx + 8, content_bottom + 16, "Offre actuelle : Pro     |     Abonnements     |     WhatsApp : +225 07 48 32 31 91")


def marker(c, x, y, number):
    c.setFillColor(colors.HexColor("#FBBF24"))
    c.setStrokeColor(WHITE)
    c.setLineWidth(1.2)
    c.circle(x, y, 8, stroke=1, fill=1)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 7)
    c.drawCentredString(x, y - 2.5, str(number))


def page_header(c, page_label):
    c.setFillColor(NAVY)
    c.roundRect(40, PAGE_H - 41, 18, 18, 5, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#A5B4FC"))
    c.circle(49, PAGE_H - 32, 4, stroke=0, fill=1)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(65, PAGE_H - 35, "STOCKKONECT")
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 7)
    c.drawRightString(PAGE_W - 40, PAGE_H - 34, page_label.upper())
    c.setStrokeColor(LINE)
    c.line(40, PAGE_H - 49, PAGE_W - 40, PAGE_H - 49)


def footer(c, page_no, total):
    c.setStrokeColor(LINE)
    c.line(40, 38, PAGE_W - 40, 38)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7)
    c.drawString(40, 24, "Guide pratique  |  stockkonnect.vercel.app")
    c.drawRightString(PAGE_W - 40, 24, f"{page_no:02d} / {total:02d}")


def draw_cover(c, total):
    c.setFillColor(PALE)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(NAVY)
    c.rect(0, PAGE_H * 0.42, PAGE_W, PAGE_H * 0.58, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#3B328D"))
    c.circle(PAGE_W - 15, PAGE_H - 40, 165, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#5D54C8"))
    c.circle(PAGE_W - 21, PAGE_H - 43, 115, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#A5B4FC"))
    c.circle(61, PAGE_H - 67, 13, stroke=0, fill=1)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(84, PAGE_H - 72, "Stockkonect")
    c.setFillColor(colors.HexColor("#C7D2FE"))
    c.setFont("Helvetica-Bold", 8)
    c.drawString(43, PAGE_H - 146, "GUIDE PRATIQUE")
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 31)
    c.drawString(42, PAGE_H - 190, "Gérer votre stock")
    c.drawString(42, PAGE_H - 229, "en toute simplicite")
    paragraph(c, "Le guide visuel pour prendre en main les produits, les mouvements, les ventes et votre équipe.", 43, PAGE_H - 250, PAGE_W - 100, style("coverintro", fontSize=12, leading=18, textColor=colors.HexColor("#E2E8F0")))
    c.setFillColor(colors.HexColor("#312E81"))
    c.roundRect(43, PAGE_H - 325, 157, 26, 13, stroke=0, fill=1)
    c.setFillColor(colors.HexColor("#E0E7FF"))
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(121.5, PAGE_H - 315, "7 CHAPITRES ILLUSTRES")
    draw_ui_capture(c, 42, 197, PAGE_W - 84, 303, "dashboard", "Tableau de bord")
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(43, 181, "APERÇU DE L'APPLICATION")
    paragraph(c, "Les ecrans de ce guide utilisent des données fictives pour vous montrer ou trouver les principales actions.", 43, 150, PAGE_W - 86, SMALL)
    c.setFillColor(INDIGO)
    c.roundRect(42, 80, PAGE_W - 84, 44, 8, stroke=0, fill=1)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(57, 106, "Pret a demarrer ?")
    c.setFont("Helvetica", 8)
    c.drawString(57, 91, "Connectez-vous, puis suivez les repères numerotes dans chaque chapitre.")
    footer(c, 1, total)
    c.showPage()


def draw_chapter(c, chapter, index, total):
    page_header(c, f"Chapitre {index:02d} / 07")
    c.setFillColor(INDIGO)
    c.roundRect(42, PAGE_H - 93, 58, 20, 10, stroke=0, fill=1)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 7)
    c.drawCentredString(71, PAGE_H - 86, f"{index:02d}  /  07")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 23)
    c.drawString(42, PAGE_H - 127, chapter["title"])
    paragraph(c, chapter["intro"], 43, PAGE_H - 144, PAGE_W - 88, style("intro", fontSize=9.5, leading=14, textColor=MUTED))

    capture_x, capture_y = 42, 394
    capture_w, capture_h = PAGE_W - 84, 271
    draw_ui_capture(c, capture_x, capture_y, capture_w, capture_h, chapter["mode"], chapter["active"])
    for n, (px, py) in enumerate(chapter["markers"], start=1):
        marker(c, capture_x + px * capture_w, capture_y + py * capture_h, n)
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(43, 382, chapter["caption"])
    c.setFont("Helvetica", 6.5)
    c.drawRightString(PAGE_W - 42, 382, "Ecran illustre - données fictives")
    label_x = 43
    for label in chapter["marker_labels"]:
        c.setFillColor(colors.HexColor("#EEF2FF"))
        label_w = stringWidth(label, "Helvetica-Bold", 6.5) + 15
        c.roundRect(label_x, 357, label_w, 16, 8, stroke=0, fill=1)
        c.setFillColor(INDIGO)
        c.setFont("Helvetica-Bold", 6.5)
        c.drawString(label_x + 7, 362.5, label)
        label_x += label_w + 7

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(43, 332, "Comment faire")
    col_gap = 10
    col_w = (PAGE_W - 84 - col_gap * 2) / 3
    box_y, box_h = 225, 91
    for i, (step, x) in enumerate(zip(chapter["steps"], [42 + j * (col_w + col_gap) for j in range(3)]), start=1):
        c.setFillColor(WHITE)
        c.setStrokeColor(LINE)
        c.roundRect(x, box_y, col_w, box_h, 7, stroke=1, fill=1)
        marker(c, x + 17, box_y + box_h - 18, i)
        paragraph(c, step, x + 12, box_y + box_h - 34, col_w - 24, CARD_TEXT)

    c.setFillColor(colors.HexColor("#EEF2FF"))
    c.roundRect(42, 92, PAGE_W - 84, 112, 8, stroke=0, fill=1)
    c.setFillColor(INDIGO)
    c.roundRect(42, 92, 5, 112, 2, stroke=0, fill=1)
    c.setFillColor(INDIGO)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(58, 184, "A RETENIR")
    paragraph(c, chapter["tip"], 58, 171, PAGE_W - 120, TIP_TEXT)
    if index == 7:
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(58, 119, "SUPPORT WHATSAPP")
        c.setFillColor(GREEN)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(170, 119, "+225 07 48 32 31 91")
        c.linkURL("https://wa.me/2250748323191?text=Bonjour%20Stockkonect", (167, 113, 310, 127), relative=0, thickness=0)
    footer(c, index + 1, total)
    c.showPage()


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    pdf.setTitle("Guide pratique Stockkonect")
    pdf.setAuthor("Stockkonect")
    pdf.setSubject("Guide illustre de prise en main de Stockkonect")
    total = len(CHAPTERS) + 1
    draw_cover(pdf, total)
    for index, chapter in enumerate(CHAPTERS, start=1):
        draw_chapter(pdf, chapter, index, total)
    pdf.save()
    print(f"PDF genere : {OUTPUT}")


if __name__ == "__main__":
    main()
