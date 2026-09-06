/* =============================================================================
   NIVEAU 5 — La ville americaine, en hiver

   Deux zones :
     1. l'avenue gelee   — trottoirs verglaces, immeubles enneiges
     2. le parc          — sapins, congeres, et beaucoup plus de glace

   CE QUE CE NIVEAU APPORTE : la glace. Elle ne touche qu'une chose,
   l'adherence : Brad met du temps a se lancer, et bien plus a s'arreter. La
   vitesse maximale, la hauteur de saut et le controle en l'air sont
   exactement ceux des quatre niveaux precedents — donc aucun saut calibre
   ailleurs ne devient infaisable ici. Ce qui change, c'est qu'il faut le
   preparer.

   D'ou la regle qui gouverne tout le trace : DEUX TUILES SECHES AVANT CHAQUE
   TROU. Une bande de verglas qui irait jusqu'au bord serait une chute
   imposee, pas une epreuve — le joueur n'aurait aucun moyen de s'arreter. Ces
   deux tuiles sont sa marge de manoeuvre, et elles sont visibles : la glace
   est dessinee, franchement, avec ses reflets.

   Le Serra-Glacon subit la meme regle que Brad. C'est ce qui rend la surface
   lisible : on voit l'ennemi deraper, on comprend le sol.

   REGLE DE TRACE : celle des niveaux 2, 3 et 4.
     1. Chemin de sol garanti, trous de 4 tuiles au plus — sauf le trou du
        parc, enjambe par une barre mobile, ou chaque bond vaut une tuile.
     2. Rien au-dessus d'un elan.
     3. Obstacles au sol de 2 tuiles au plus.
     4. Deux tuiles seches avant chaque bord.

   Reperes : une tuile = 24 px, la rangee de sol de reference est la 15.
   ========================================================================== */
'use strict';

NIVEAUX['niveau5'] = {
  nom: 'Ville USA — hiver',
  musique: 'niveau5',
  largeur: 250,
  hauteur: 18,
  apparition: { x: 3, y: 12 },

  zones: [
    {
      x1: 104,
      nom: 'L\'avenue gelée',
      cielHaut: '#2e3f5c', cielBas: '#8ea2b8',   // ciel bas, lumiere plate
      loin: '#46566e', pres: '#33415a',
      // Trottoir volontairement sombre : c'est ce qui permet a la glace,
      // dessinee par-dessus, de se voir au premier coup d'oeil.
      solFace: '#333a46', solHaut: '#5b6773', solLigne: '#84919f',
      silhouettes: 'hiver',
    },
    {
      x1: 999,
      nom: 'Le parc enneigé',
      cielHaut: '#25324a', cielBas: '#6f8098',
      loin: '#33445a', pres: '#27384a',
      solFace: '#2c333e', solHaut: '#5f6d7b', solLigne: '#8b9aa8',
      silhouettes: 'parc-hiver',
    },
  ],

  sas: { x: 102.5, y: 9, w: 3, h: 6, style: 'grille', titre: 'LE PARC' },
  porte: { x: 240, y: 12, w: 2, h: 3 },

  solides: [
    // ---- ZONE 1 : l'avenue ------------------------------------------------
    [0, 15, 22, 3],
    [8, 12, 5, 1],                        // marquise
    [26, 15, 18, 3],
    [28, 12, 5, 1], [32, 10, 4, 1],       // escalier de secours (optionnel)
    [48, 15, 16, 3],
    [50, 12, 5, 1],
    [68, 15, 18, 3],
    [70, 12, 5, 1], [74, 10, 4, 1],
    [90, 15, 14, 3],
    [92, 12, 5, 1],

    // ---- ZONE 2 : le parc -------------------------------------------------
    [104, 15, 16, 3],
    [106, 12, 5, 1],
    [124, 15, 14, 3],
    [126, 12, 5, 1], [128, 10, 4, 1],
    [142, 15, 16, 3],
    [144, 12, 5, 1],
    [162, 15, 14, 3],
    [164, 12, 5, 1],
    [184, 15, 14, 3],
    [186, 12, 5, 1], [190, 10, 4, 1],
    [202, 15, 14, 3],
    // Corniche allongee expres : c'est la seule de tout le niveau qui soit
    // gelee, et une bande de glace a besoin de deux tuiles seches de chaque
    // cote pour rester une epreuve plutot qu'une sanction.
    [202, 12, 9, 1],
    [220, 15, 26, 3],
    [222, 12, 5, 1], [227, 10, 5, 1],
    [-2, 0, 2, 18], [246, 0, 2, 18],
  ],

  /* LA GLACE. `y` est la rangee de la SURFACE, pas du bloc : une bande posee
     sur le sol se declare en 15, une bande posee sur une corniche de la rangee
     12 se declare en 12.

     Chaque bande s'arrete DEUX TUILES avant le bord du sol qui la porte. Sans
     cette marge, arriver en courant sur une plaque signifiait tomber, quoi que
     fasse le joueur. */
  glace: [
    // --- avenue
    [4, 15, 14],                          // sol 0-22, sec a partir de 18
    [30, 15, 12],                         // sol 26-44, sec a partir de 42
    [52, 15, 10],                         // sol 48-64, sec a partir de 62
    [72, 15, 12],                         // sol 68-86, sec a partir de 84
    [94, 15, 8],                          // sol 90-104, transition de zone

    /* Les corniches courtes (5 tuiles) ne sont PAS gelees. Le verificateur l'a
       impose et il a raison : sur 5 tuiles, deux seches de chaque cote ne
       laissent qu'une tuile de glace — soit rien a jouer, soit, si l'on
       supprime la marge, une glissade dont le joueur n'est jamais responsable.
       La glace reste donc au sol, ou elle se lit et se prepare. */

    // --- le parc : plus froid, donc plus large
    [106, 15, 12],                        // sol 104-120, sec a partir de 118
    [126, 15, 10],                        // sol 124-138, sec a partir de 136
    [144, 15, 12],                        // sol 142-158, sec a partir de 156
    [164, 15, 10],                        // sol 162-176, sec a partir de 174
    [186, 15, 10],                        // sol 184-198, sec a partir de 196
    [204, 15, 10],                        // sol 202-216, sec a partir de 214
    [222, 15, 14],                        // sol 220-246, sec bien avant la porte
    [204, 12, 5],                         // la corniche allongee du parc
  ],

  /* Le seul trou large du niveau, dans le parc, enjambe par une barre. Sur la
     glace, un trou de 8 tuiles serait une sanction : on ne peut pas garantir
     l'elan. La barre en fait une attente, ce qui est le contraire d'une
     punition — et le sol qui la precede est sec sur deux tuiles. */
  mobiles: [
    { x1: 176, x2: 184, y: 13, w: 3, vitesse: 54, phase: 0.35 },
  ],

  traversantes: [
    [22, 12, 4],
    [64, 12, 4],
    [120, 12, 4],
    [158, 12, 4],
    [198, 12, 4],
  ],

  panneaux: [
    { x: 4, y: 13, texte: 'Moins vingt. Brad a mis une cravate en laine.' },
    { x: 30, y: 10, texte: 'Le trottoir est une patinoire.' },
    { x: 70, y: 10, texte: 'Freine avant le bord. Pas dessus.' },
    { x: 100, y: 13, texte: 'Le parc →' },
    { x: 128, y: 11, texte: 'Ils glissent aussi. C\'est déjà ça.' },
    { x: 186, y: 11, texte: 'La barre, ou rien.' },
    { x: 224, y: 13, texte: 'Sortie' },
  ],

  ennemis: [
    // --- zone 1 : le Glacon se decouvre sur une longue ligne droite, la ou
    //     le voir depasser sa cible ne coute rien au joueur.
    { type: 'Serra', x: 14, y: 15, rayon: 3 },
    { type: 'Serra-Glacon', x: 30, y: 15, rayon: 5 },
    { type: 'Serra-Volant', x: 36, y: 9, rayon: 4 },
    { type: 'Serra', x: 52, y: 15, rayon: 3 },
    { type: 'Serra-Glacon', x: 57, y: 15, rayon: 5 },
    { type: 'Serra-Boost', x: 70, y: 15, rayon: 4 },
    { type: 'Serra-Volant', x: 76, y: 8, rayon: 5 },
    { type: 'Serra-Glacon', x: 80, y: 15, rayon: 5 },
    { type: 'Serra-Lourd', x: 95, y: 15, rayon: 3 },

    // --- zone 2 : le parc. Glacons et Lanceurs : les uns forcent a bouger,
    //     les autres a s'arreter. Sur la glace, les deux coutent cher.
    { type: 'Serra-Glacon', x: 108, y: 15, rayon: 5 },
    { type: 'Serra', x: 114, y: 15, rayon: 3 },
    { type: 'Serra-Volant', x: 120, y: 9, rayon: 5 },
    { type: 'Serra-Glacon', x: 128, y: 15, rayon: 5 },
    { type: 'Serra-Lanceur', x: 130, y: 10 },
    { type: 'Serra-Boost', x: 146, y: 15, rayon: 4 },
    { type: 'Serra-Glacon', x: 152, y: 15, rayon: 5 },
    { type: 'Serra-Volant', x: 150, y: 8, rayon: 6 },
    { type: 'Serra', x: 166, y: 15, rayon: 3 },
    { type: 'Serra-Glacon', x: 170, y: 15, rayon: 4 },
    { type: 'Serra-Lourd', x: 188, y: 15, rayon: 3 },
    { type: 'Serra-Lanceur', x: 188, y: 12 },
    { type: 'Serra-Volant', x: 196, y: 9, rayon: 5 },
    { type: 'Serra-Glacon', x: 206, y: 15, rayon: 5 },
    { type: 'Serra-Boost', x: 212, y: 15, rayon: 3 },
    { type: 'Serra', x: 224, y: 15, rayon: 3 },
    { type: 'Serra-Glacon', x: 232, y: 15, rayon: 5 },
    { type: 'Serra', x: 229, y: 10, rayon: 2 },
  ],
};
