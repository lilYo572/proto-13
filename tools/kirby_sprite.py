#!/usr/bin/env python3
"""
Brad Bitt, mais le jeu — generation de la planche de KIRBY 67.

POURQUOI ELLE DERIVE DE CELLE DE BRAD

Kirby 67 est le dernier personnage du jeu, et il partage l'ecran avec Brad
pendant deux combats et cinq cinematiques. Le dessiner a part, meme
soigneusement, aurait donne deux styles cote a cote : deux epaisseurs de
contour, deux facons d'ombrer, deux cadences d'animation. On repart donc de la
planche de Brad — memes proportions, memes douze images, meme trait — et on n'en
change QUE l'habillement et la couleur des cheveux.

C'est aussi ce qui garantit que ses animations existent : marche, course et
repos sont deja calees sur les memes durees, et le moteur les lit avec le meme
code (BRAD_PLANCHE).

CE QUI EST RECOLORE, ET SELON QUELLE REGLE

Les couleurs de la planche ne forment pas une palette indexee — c'est un dessin
avec des degrades. On ne peut donc pas remplacer « la couleur X par la couleur
Y ». On classe les pixels par ROLE (comme le fait deja recolor_brad.py pour les
uniformes) et on borne chaque role a une BANDE DE LIGNES, parce que deux roles
peuvent partager une teinte : les cheveux blonds et la peau eclairee des mains
tombent tous les deux dans « clair et chaud ». Sans la bande, les mains de
Kirby 67 devenaient brunes.

    lignes  0-11  : les cheveux        blond    -> chatain fonce
    lignes 12-21  : le visage          + barbe de trois jours sur la machoire
    lignes 22-35  : le torse           costume, chemise et cravate -> t-shirt cyan
                                        avec les avant-bras nus (manches courtes)
    lignes 36-43  : les jambes         costume -> jean bleu fonce
    lignes 44-47  : les pieds          -> baskets claires

Usage : python3 tools/kirby_sprite.py assets/brad/brad.png assets/kirby/kirby.png
"""
import sys
import os

import numpy as np
from PIL import Image

CW, CH = 36, 48          # une cellule de la planche
COLONNES, LIGNES = 4, 3

# --- Bandes de lignes, relevees sur la planche de Brad --------------------
Y_CHEVEUX = (0, 10)
Y_VISAGE = (12, 22)
Y_TORSE = (22, 36)
Y_JAMBES = (36, 44)
Y_PIEDS = (44, 48)

# La manche s'arrete ici : au-dessous, ce qui appartenait au bras est de la
# peau. C'est la seule difference de SILHOUETTE entre les deux personnages, et
# elle tient en trois lignes de pixels.
Y_MANCHE = 29
LARGEUR_BRAS = 6         # colonnes comptees depuis chaque bord visible

CYAN = (38, 196, 210)          # le t-shirt
CYAN_COL = (24, 152, 166)      # l'encolure, un cran plus sombre
JEAN = (44, 62, 104)
CHATAIN = (74, 52, 38)
CHATAIN_SOMBRE = (34, 24, 18)
BASKET = (222, 226, 234)
SEMELLE = (58, 62, 74)
BARBE = (0.80, 0.72, 0.68)     # facteur applique a la peau de la machoire


def masques(cell):
    r = cell[..., 0].astype(int)
    g = cell[..., 1].astype(int)
    b = cell[..., 2].astype(int)
    a = cell[..., 3]
    vis = a > 0
    lum = (r + g + b) / 3.0

    # Meme regle que recolor_brad.py : la cravate est un rouge SATURE, ce qui
    # la distingue des ombres de peau, qui sont du rouge dominant mais clair.
    cravate = vis & (r > 120) & (g < 95) & (b < 95) & (r > g * 1.8) & (r > b * 1.8)
    # Le costume : sombre, mais pas le contour ni les chaussures, plus sombres
    # encore.
    costume = vis & (lum >= 16) & (lum <= 62) & ~cravate
    chemise = vis & (r > 200) & (g > 200) & (b > 200)
    # Blond : clair, chaud, et surtout PEU DE BLEU — c'est ce qui le separe de
    # la peau, qui ne descend pas sous 125.
    # Blond : clair, chaud, et surtout PEU DE BLEU — c'est ce qui le separe de
    # la peau, qui ne descend pas sous 125.
    #
    # Ces seuils sont volontairement STRICTS. Une version elargie, essayee pour
    # attraper les meches sombres des tempes, attrapait aussi les ombres du nez
    # et des orbites : le visage se retrouvait strie de brun. La peau et les
    # cheveux ombres se recouvrent trop pour etre separes par la seule couleur ;
    # c'est la fonction `tempes()` qui traite le reste, par la position.
    blond = vis & (r > 185) & (g > 145) & (b < 128)
    peau = vis & (r > 150) & (g > 95) & (b >= 60) & ~blond & ~chemise & ~cravate
    return dict(vis=vis, lum=lum, cravate=cravate, costume=costume,
                chemise=chemise, blond=blond, peau=peau)


def teindre(out, masque, couleur, lum, plancher=0.45, plafond=62.0):
    """Applique `couleur` en conservant le modele : un pixel sombre le reste."""
    if not masque.any():
        return
    v = np.clip(lum[masque] / plafond, plancher, 1.0)
    for c in range(3):
        out[..., c][masque] = np.clip(couleur[c] * v, 0, 255).astype(np.uint8)


def bordure(vis):
    """Les pixels du CONTOUR EXTERIEUR : visibles, mais touchant le vide.

    Ils portent tout le style du dessin et ne doivent jamais etre repeints.
    Les autres pixels sombres, eux, sont du TRAIT INTERIEUR — les revers de la
    veste de Brad, l'ouverture du costume, la separation des jambes. Sur le
    torse ils n'ont plus rien a decrire une fois la veste devenue un t-shirt,
    et les laisser donnait des coutures noires en plein milieu du maillot.
    """
    h, w = vis.shape
    pad = np.pad(vis, 1, constant_values=False)
    touche = np.zeros_like(vis)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy == 0 and dx == 0:
                continue
            touche |= ~pad[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
    return vis & touche


def bande(masque, y0, y1):
    """Restreint un masque a une bande de lignes."""
    m = np.zeros_like(masque)
    m[y0:y1] = masque[y0:y1]
    return m


def bras(vis):
    """Les colonnes de bras, ligne par ligne, sous la manche.

    Un bras est ce qui depasse de part et d'autre du torse. Plutot que de
    chercher des composantes connexes — fragile des que le poing touche la
    hanche — on prend les six colonnes les plus externes de la silhouette :
    a cette hauteur, le torse ne fait jamais plus de la moitie de la largeur
    totale, et ces six colonnes sont donc toujours du bras.
    """
    m = np.zeros_like(vis)
    for y in range(Y_MANCHE, Y_TORSE[1]):
        xs = np.flatnonzero(vis[y])
        if xs.size < 14:            # bras colles au corps : rien a decouper
            continue
        xmin, xmax = xs[0], xs[-1]
        m[y, xmin:xmin + LARGEUR_BRAS] = True
        m[y, max(0, xmax - LARGEUR_BRAS + 1):xmax + 1] = True
    return m & vis


LARGEUR_TEMPE = 4
Y_TEMPES = (14, 18)


def tempes(vis, lum, bleu):
    """Les colonnes exterieures de la tete, entre la calotte et les pommettes.

    On exclut ce qui est franchement de la PEAU, et on le fait par le canal
    BLEU plutot que par le masque `peau` : ce masque-la attrapait aussi les
    pattes (170,129,68), qui sont exactement ce qu'on veut foncer, et les
    epargnait. La peau eclairee du bord du visage ne descend pas sous 120 de
    bleu ; les meches y sont a 60-80. Le seuil se lit donc tout seul.
    """
    m = np.zeros_like(vis)
    for y in range(*Y_TEMPES):
        xs = np.flatnonzero(vis[y])
        if xs.size == 0:
            continue
        xmin, xmax = xs[0], xs[-1]
        m[y, xmin:xmin + LARGEUR_TEMPE] = True
        m[y, max(0, xmax - LARGEUR_TEMPE + 1):xmax + 1] = True
    # Le contour du dessin reste noir, comme partout ailleurs.
    return m & vis & (lum >= 16) & (bleu < 120)


def transformer(cell):
    """
    LA REGLE : ON REPEINT PAR BANDE, PAS PAR ROLE.

    Premiere version : on classait les pixels du torse en « costume »,
    « chemise » et « cravate », et on teignait chacun. Resultat, le modele du
    costume survivait a la recoloration — revers, ouverture de veste, plastron
    plus clair — et Kirby 67 portait un BLAZER cyan sur une chemise cyan clair,
    pas un t-shirt. On ne peut pas repeindre une veste en t-shirt : il faut
    supprimer la veste.

    Donc, dans chaque bande, TOUT ce qui n'est pas un trait de contour prend la
    couleur de la bande, en gardant seulement le degrade d'origine pour le
    volume. Le contour et les yeux — les pixels quasi noirs — ne bougent
    jamais : c'est eux qui portent le style, et c'est pour eux qu'on est parti
    de la planche de Brad.
    """
    out = cell.copy()
    m = masques(cell)
    lum = m['lum']
    vis = m['vis']
    # Le trait. En dessous de 16 de luminance on est sur un contour ou sur un
    # oeil ; au-dessus, sur une surface a peindre.
    trait = vis & (lum < 16)
    contour = trait & bordure(vis)
    # Deux definitions de « ce qu'on peut peindre », et le choix depend de la
    # bande. Sur le torse et les chaussures, le trait interieur decrit un
    # vetement qui n'existe plus : on le recouvre. Sur les jambes il separe
    # les deux cuisses, et l'effacer collerait le pantalon en un seul bloc.
    peignable = vis & ~contour          # le trait interieur est recouvert
    peignableAvecTrait = vis & ~trait   # tout trait conserve

    # --- 1. Les cheveux ---------------------------------------------------
    # Toute la calotte, contour du dessin excepte. Le masque « blond » ne
    # suffisait pas : ses seuils laissaient passer le liseré clair du bord de
    # la coiffure, et Kirby 67 gardait un halo dore autour de cheveux chatains.
    teindre(out, bande(peignable, *Y_CHEVEUX), CHATAIN, lum,
            plancher=0.55, plafond=200.0)
    # Les meches des TEMPES descendent plus bas que la calotte, jusqu'au
    # niveau des yeux. Le masque « blond » seul ne les attrapait pas toutes —
    # ses seuils sont volontairement stricts pour epargner la peau — et il
    # restait deux touffes dorees de chaque cote du visage.
    #
    # On les designe donc par leur PLACE plutot que par leur teinte : a cette
    # hauteur, tout ce qui se trouve dans les cinq colonnes exterieures de la
    # tete est du cheveu, jamais du visage. Le peu de peau qui s'y trouve est
    # l'ombre du bord du visage, qui gagne a foncer avec les meches.
    # Les meches qui retombent sur le front. Elles sont CENTRALES, donc la
    # regle de position ne les voit pas, et trop sombres pour le masque blond
    # strict. Mais entre le front (bleu 130-140) et une meche (bleu 44-90),
    # l'ecart est net : un seuil sur le seul canal bleu les separe sans risque
    # sur ces quatre lignes-la.
    bleu = cell[..., 2].astype(int)
    meches = vis & (lum >= 16) & (bleu < 112) & (cell[..., 0].astype(int) > bleu + 55)
    teindre(out, bande(meches, Y_CHEVEUX[1], 14), CHATAIN, lum,
            plancher=0.5, plafond=200.0)
    # Plus bas, les pattes. La le seuil sur le bleu ne suffit plus — l'ombre de
    # la bouche y descend au meme niveau — et c'est la POSITION qui tranche.
    teindre(out, tempes(vis, lum, bleu), CHATAIN, lum, plancher=0.5, plafond=200.0)

    # --- 2. La barbe de trois jours ---------------------------------------
    # On assombrit la peau de la machoire au lieu d'y poser une couleur : une
    # barbe peinte a plat, sur un visage de dix pixels de haut, se lit comme
    # une tache.
    machoire = bande(m['peau'], 17, Y_VISAGE[1])
    if machoire.any():
        for c in range(3):
            canal = out[..., c].astype(float)
            canal[machoire] *= BARBE[c]
            out[..., c] = np.clip(canal, 0, 255).astype(np.uint8)

    # --- 3. Le t-shirt ----------------------------------------------------
    torse = bande(peignable, *Y_TORSE)
    avantBras = bras(vis) & torse
    teindre(out, torse & ~avantBras, CYAN, lum)
    # L'encolure : deux lignes plus sombres en haut du torse font le col rond.
    teindre(out, bande(peignable, Y_TORSE[0], Y_TORSE[0] + 2), CYAN_COL, lum)
    # Et la couture de manche courte, une ligne, juste au-dessus des bras nus.
    teindre(out, bande(peignable, Y_MANCHE - 1, Y_MANCHE) & bras(vis), CYAN_COL, lum)
    # Les avant-bras, en peau. On reprend le ton moyen de la peau de la cellule
    # pour ne pas inventer une couleur qui ne serait nulle part ailleurs.
    if avantBras.any() and m['peau'].any():
        ton = cell[..., :3][m['peau']].mean(axis=0)
        v = np.clip(lum[avantBras] / 62.0, 0.62, 1.0)
        for c in range(3):
            out[..., c][avantBras] = np.clip(ton[c] * v, 0, 255).astype(np.uint8)

    # --- 4. Le jean -------------------------------------------------------
    teindre(out, bande(peignableAvecTrait, *Y_JAMBES), JEAN, lum)

    # --- 5. Les baskets ---------------------------------------------------
    # Les chaussures de Brad sont noires de bout en bout, trait compris. On
    # repeint donc leur interieur en clair, mais on garde leur contour : sans
    # lui, les baskets se detachaient du bas du jean et flottaient sous lui.
    pieds = bande(peignable, *Y_PIEDS)
    teindre(out, pieds, BASKET, lum, plancher=0.75, plafond=30.0)
    semelle = bande(peignable, Y_PIEDS[1] - 2, Y_PIEDS[1])
    teindre(out, semelle, SEMELLE, lum, plancher=0.85, plafond=30.0)
    return out


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    base, sortie = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.dirname(sortie) or '.', exist_ok=True)
    arr = np.array(Image.open(base).convert('RGBA'))
    out = arr.copy()
    for ligne in range(LIGNES):
        for col in range(COLONNES):
            y, x = ligne * CH, col * CW
            out[y:y + CH, x:x + CW] = transformer(arr[y:y + CH, x:x + CW])
    Image.fromarray(out, 'RGBA').save(sortie)
    print(sortie)
    return 0


if __name__ == '__main__':
    sys.exit(main())
