/* =============================================================================
   NIVEAU 6 — La maison hantee, et le gardien de la garniture

   Trois zones :
     1. le parc du manoir  — grille, arbres morts, la facade au fond
     2. les couloirs       — lambris, portraits de travers, chandeliers
     3. la salle de bal    — l'arene du Serra-Seraphin

   C'est ici que tombe la deuxieme piece de l'appareil a raclette : le fromage
   et la charcuterie. Elle est inscrite au niveau 6 depuis le prototype 09,
   dans sauvegarde.js et dans la vitrine de la base — ce fichier ne fait que
   tenir la promesse.

   POURQUOI DES SPECTRES DANS LES COULOIRS. Le mini-boss appelle des
   Serra-Spectres verts entre ses phases. Les rencontrer AVANT le combat, seuls,
   dans un couloir, apprend leur couleur et leur trajectoire. Le joueur arrive
   donc dans la salle de bal en sachant deja qu'un Spectre vert n'est pas une
   copie violette — ce qui est exactement l'information qu'il doit avoir, et la
   seule.

   REGLE DE TRACE : celle des niveaux 2 a 5. Chemin de sol garanti, trous de 4
   tuiles au plus, rien au-dessus d'un elan, obstacles de 2 tuiles maximum.
   L'arene, elle, est d'un seul tenant.

   Reperes : une tuile = 24 px, la rangee de sol de reference est la 15.
   ========================================================================== */
'use strict';

NIVEAUX['niveau6'] = {
  nom: 'La maison hantée',
  musique: 'niveau6',
  largeur: 264,
  hauteur: 18,
  apparition: { x: 3, y: 12 },

  zones: [
    {
      x1: 88,
      nom: 'Le parc du manoir',
      cielHaut: '#161326', cielBas: '#3b2b42',
      loin: '#241d34', pres: '#2e2440',
      solFace: '#2a2430', solHaut: '#463c4e', solLigne: '#6b5c78',
      silhouettes: 'parc-manoir',
    },
    {
      x1: 190,
      nom: 'Les couloirs',
      cielHaut: '#1a1220', cielBas: '#33222e',
      loin: '#2a1e2a', pres: '#33262f',
      solFace: '#33261f', solHaut: '#5a4433', solLigne: '#7d6046',
      silhouettes: 'manoir',
    },
    {
      x1: 999,
      nom: 'La salle de bal',
      cielHaut: '#140f22', cielBas: '#2c2140',
      loin: '#241a34', pres: '#2c2140',
      solFace: '#2e2436', solHaut: '#4e4059', solLigne: '#7a6690',
      silhouettes: 'salle-bal',
    },
  ],

  sas: { x: 86.5, y: 9, w: 3, h: 6, style: 'grille', titre: 'LE MANOIR' },
  sas2: { x: 188.5, y: 9, w: 3, h: 6, style: 'grille', titre: 'LA SALLE DE BAL' },

  /* La porte est DANS l'arene, comme au niveau 3 : elle reste verrouillee tant
     que le Seraphin vole. Elle doit rester en deca du mur de droite (260). */
  porte: { x: 254, y: 12, w: 2, h: 3 },

  /* L'ARENE DU SERAPHIN.

     `genre: 'duplication'` choisit le second scenario de combat (voir
     js/boss.js). Le premier — le blindage du Colosse — reste intact.

     Pas de trampolines ici, et c'est deliberé : ils existaient au niveau 3
     parce que le Colosse, large et terrestre, plaquait Brad contre un mur sans
     lui laisser de sortie. Le Seraphin vole : il ne bloque personne, il fond.
     Les lustres jouent le role inverse — ils servent a MONTER le chercher.

     Les renforts sont des Spectres, appeles seulement entre deux phases de
     duplication (voir lancerVagueSpectres). */
  arene: {
    x1: 194, x2: 258, sol: 15,
    genre: 'duplication',
    nom: 'LE SÉRAPHIN DU MANOIR',
    musique: 'boss6',
    boss: 'Serra-Seraphin',
    objet: 'garniture',
    depart: { x: 226, y: 11 },
    trampolines: [],
    renforts: [
      [ { type: 'Serra-Spectre', x: 200, y: 10 },
        { type: 'Serra-Spectre', x: 252, y: 10 } ],
      [ { type: 'Serra-Spectre', x: 199, y: 11 },
        { type: 'Serra-Spectre', x: 226, y: 9 },
        { type: 'Serra-Spectre', x: 253, y: 11 } ],
      [ { type: 'Serra-Spectre', x: 199, y: 10 },
        { type: 'Serra-Spectre', x: 214, y: 9 },
        { type: 'Serra-Spectre', x: 238, y: 9 },
        { type: 'Serra-Spectre', x: 253, y: 10 } ],
    ],
  },

  solides: [
    // ---- ZONE 1 : le parc --------------------------------------------------
    [0, 15, 20, 3],
    [8, 12, 5, 1],                        // auvent du portail
    [24, 15, 16, 3],
    [26, 12, 5, 1], [30, 10, 4, 1],       // muret puis branche basse
    [44, 15, 14, 3],
    [46, 12, 5, 1],
    [62, 15, 26, 3],
    [64, 12, 5, 1], [68, 10, 4, 1],
    [78, 12, 5, 1],

    // ---- ZONE 2 : les couloirs --------------------------------------------
    [88, 15, 16, 3],
    [90, 12, 5, 1],
    [108, 15, 14, 3],
    [110, 12, 5, 1], [114, 10, 4, 1],
    [126, 15, 16, 3],
    [128, 12, 5, 1],
    [146, 15, 14, 3],
    [148, 12, 5, 1], [152, 10, 4, 1],
    [164, 15, 26, 3],
    [166, 12, 5, 1], [170, 10, 5, 1],
    [180, 12, 5, 1],

    // ---- ZONE 3 : la salle de bal -----------------------------------------
    // Sol nu d'un seul tenant, comme l'arene du niveau 3 : le combat a besoin
    // de place au sol. Ce qui monte, ici, ce sont les lustres — et ils sont
    // traversants, donc ils n'arretent ni Brad ni le regard.
    [190, 15, 70, 3],
    [-2, 0, 2, 18], [260, 0, 2, 18],
  ],

  traversantes: [
    [20, 12, 4],
    [40, 12, 4],
    [58, 12, 4],
    [104, 12, 4],
    [122, 12, 4],
    [142, 12, 4],
    [160, 12, 4],

    // --- LES LUSTRES DE LA SALLE DE BAL
    // Rangee 12 : trois tuiles au-dessus du sol, donc atteignables d'un saut
    // depuis n'importe ou dans l'arene. Traversants par le bas, ils ne peuvent
    // pas servir de plafond ni pieger un saut.
    [204, 12, 5],
    [222, 12, 6],
    [240, 12, 5],
  ],

  panneaux: [
    { x: 4, y: 13, texte: 'La grille était ouverte. Ça commence toujours comme ça.' },
    { x: 28, y: 10, texte: 'Les arbres sont morts. Le BRADDY3000 dit « c\'est l\'automne ».' },
    { x: 66, y: 10, texte: 'Une odeur de fromage. Enfin une bonne nouvelle.' },
    { x: 84, y: 13, texte: 'Le manoir →' },
    { x: 112, y: 11, texte: 'Les portraits te suivent des yeux. C\'est peint, calme-toi.' },
    { x: 150, y: 11, texte: 'Les verts, là. Retiens leur couleur.' },
    { x: 186, y: 13, texte: 'La salle de bal →' },
    { x: 196, y: 13, texte: 'Quelque chose de très grand vole ici.' },
    { x: 250, y: 13, texte: 'Sortie' },
  ],

  ennemis: [
    // --- zone 1 : le parc, classique, pour installer le decor
    { type: 'Serra', x: 13, y: 15, rayon: 3 },
    { type: 'Serra-Volant', x: 22, y: 9, rayon: 4 },
    { type: 'Serra', x: 28, y: 15, rayon: 3 },
    { type: 'Serra-Boost', x: 34, y: 15, rayon: 4 },
    { type: 'Serra-Volant', x: 46, y: 8, rayon: 5 },
    { type: 'Serra-Lourd', x: 50, y: 15, rayon: 3 },
    { type: 'Serra', x: 65, y: 15, rayon: 3 },
    { type: 'Serra-Lanceur', x: 66, y: 12 },
    { type: 'Serra-Boost', x: 80, y: 15, rayon: 4 },

    // --- zone 2 : les couloirs. C'est ici qu'on rencontre les Spectres pour
    //     la premiere fois, isoles, sur un sol plein : leur couleur et leur
    //     vol se retiennent avant qu'ils ne comptent vraiment.
    { type: 'Serra-Spectre', x: 94, y: 10, rayon: 5 },
    { type: 'Serra', x: 98, y: 15, rayon: 3 },
    { type: 'Serra-Lanceur', x: 92, y: 12 },
    { type: 'Serra-Spectre', x: 112, y: 9, rayon: 5 },
    { type: 'Serra-Boost', x: 116, y: 15, rayon: 4 },
    { type: 'Serra-Volant', x: 124, y: 8, rayon: 5 },
    { type: 'Serra', x: 130, y: 15, rayon: 3 },
    { type: 'Serra-Lourd', x: 136, y: 15, rayon: 3 },
    { type: 'Serra-Spectre', x: 150, y: 10, rayon: 6 },
    { type: 'Serra-Spectre', x: 154, y: 8, rayon: 5 },
    { type: 'Serra', x: 149, y: 12, rayon: 2 },
    { type: 'Serra-Boost', x: 168, y: 15, rayon: 4 },
    { type: 'Serra-Lanceur', x: 167, y: 12 },
    { type: 'Serra-Lourd', x: 178, y: 15, rayon: 4 },
    { type: 'Serra-Volant', x: 182, y: 8, rayon: 5 },

    // --- zone 3 : la salle est vide. Le Seraphin arrive quand Brad franchit
    //     la ligne, et lui seul.
  ],
};
