/* =============================================================================
   NIVEAU 10 — Le manoir de Kirby 67

   Trois zones :
     1. le parc d'honneur    — jardin a la francaise, la facade eclairee au fond
     2. la galerie           — marbre, tapis rouge, les meules en vitrine
     3. la salle du trone    — l'arene du PREMIER combat contre Kirby 67

   ---------------------------------------------------------------------------
   POURQUOI IL NE RESSEMBLE PAS AU MANOIR DU NIVEAU 6

   C'etait la demande, et c'est aussi la seule maniere de justifier un
   deuxieme manoir dans le meme jeu. Le niveau 6 est une maison ABANDONNEE :
   palette violette et froide, bois, portraits de travers, et le noir comme
   mecanique de combat. Celui-ci est HABITE et il est riche :

     - il est ECLAIRE. Lustres, appliques, vitrines. Aucune obscurite nulle
       part, y compris pendant le combat ;
     - sa palette est CHAUDE : marbre creme, or, bordeaux ;
     - tout y est ALIGNE. Le manoir hante est de travers ; ici les ifs sont
       espaces a intervalle egal, les colonnes aussi, les vitrines aussi.
       La symetrie EST le decor chic.

   ---------------------------------------------------------------------------
   CE QUE CE NIVEAU APPORTE : LA GARDE

   Aucune regle nouvelle — c'est le dernier niveau, on n'y apprend plus, on y
   verifie. Ce qui change, ce sont les ennemis : les Serra en livree du manoir
   ont deux a six fois la vie des Serra ordinaires et frappent deux a trois
   fois plus fort. Les memes gestes, donc, mais plus aucune marge.

   Attention a une subtilite d'equilibrage : les points de vie ne protegent que
   des COUPS DE POING ; un saut sur la tete tue toujours en une fois. Le Garde
   ordinaire reste donc ecrasable, le Garde-Lourd et le Hallebardier non.

   REGLE DE TRACE : celle des niveaux 2 a 8, gravite terrestre. Chemin de sol
   garanti, trous de quatre tuiles, rien au-dessus d'un elan, obstacles de deux
   tuiles au plus.

   Reperes : une tuile = 24 px, la rangee de sol de reference est la 15.
   ========================================================================== */
'use strict';

NIVEAUX['niveau10'] = {
  nom: 'Le manoir de Kirby 67',
  musique: 'niveau10',
  largeur: 272,
  hauteur: 18,
  apparition: { x: 3, y: 12 },

  zones: [
    {
      x1: 88,
      nom: 'Le parc d\'honneur',
      // Nuit claire, pas nuit noire : on doit voir que le parc est entretenu.
      cielHaut: '#131a34', cielBas: '#3c3550',
      loin: '#26243c', pres: '#343049',
      solFace: '#3b3444', solHaut: '#6d6377', solLigne: '#a99a8c',
      silhouettes: 'parc-honneur',
    },
    {
      x1: 190,
      nom: 'La galerie des trophées',
      cielHaut: '#2a2130', cielBas: '#4a3a3c',
      loin: '#453a40', pres: '#54454a',
      solFace: '#4a3c3a', solHaut: '#8a7563', solLigne: '#d8c39a',
      silhouettes: 'galerie',
    },
    {
      x1: 999,
      nom: 'La salle du trône',
      cielHaut: '#2c2030', cielBas: '#573f42',
      loin: '#50414a', pres: '#5e4b50',
      // La face du sol etait presque aussi claire que sa surface : la salle
      // se lisait comme une seule bande beige, sans ligne de sol.
      solFace: '#382c26', solHaut: '#9a8368', solLigne: '#e8d2a4',
      silhouettes: 'trone',
    },
  ],

  sas: { x: 86.5, y: 9, w: 3, h: 6, style: 'grille', titre: 'LA GALERIE' },
  sas2: { x: 188.5, y: 9, w: 3, h: 6, style: 'grille', titre: 'LA SALLE DU TRÔNE' },

  /* La porte existe, mais on ne la franchit jamais : le combat contre Kirby 67
     se termine par une cinematique qui ramene Brad a la base. Elle est la pour
     que le niveau reste structurellement identique aux autres — et pour que le
     verificateur de geometrie ait quelque chose a controler. */
  porte: { x: 258, y: 12, w: 2, h: 3 },

  /* -------------------------------------------------------------------------
     L'ARENE DU TRONE — LE PREMIER COMBAT

     `genre: 'kirby'` : le quatrieme scenario de combat du jeu. Les trois autres
     — blindage, duplication, asteroides — ne sont pas touches.

     Ce combat-ci est le plus DIRECT des quatre, et c'est voulu. Kirby 67 n'a
     ni coque, ni copies, ni invulnerabilite : on le frappe, il perd de la vie.
     Ce qu'il a, c'est un rythme — il se teleporte, roule des meules, appelle sa
     garde — et le joueur doit lire ce rythme sans avoir de nouvelle regle a
     apprendre. Le vrai combat final, celui qui change tout, se joue ailleurs.

     Il ne meurt pas non plus : passe sous un certain seuil, la cinematique
     prend la main. Voir `terminerCombatManoir()` dans js/boss.js.
  ------------------------------------------------------------------------- */
  arene: {
    x1: 196, x2: 264, sol: 15,
    genre: 'kirby',
    nom: 'KIRBY 67',
    musique: 'mini-kirby',
    boss: 'Kirby67',
    // Aucun objet a lacher : les trois pieces de l'appareil sont deja reunies,
    // c'est meme ce qui a permis de le trouver.
    objet: null,
    depart: { x: 232, y: 11 },
    trampolines: [],
    renforts: [
      [ { type: 'Serra-Garde', x: 202, y: 15 },
        { type: 'Serra-Garde', x: 258, y: 15 } ],
      [ { type: 'Serra-Garde', x: 201, y: 15 },
        { type: 'Serra-Garde-Lourd', x: 246, y: 15 },
        { type: 'Serra-Garde', x: 259, y: 15 } ],
      [ { type: 'Serra-Garde', x: 201, y: 15 },
        { type: 'Serra-Garde', x: 214, y: 15 },
        { type: 'Serra-Garde-Lourd', x: 244, y: 15 },
        { type: 'Serra-Garde', x: 259, y: 15 } ],
    ],
  },

  solides: [
    // ---- ZONE 1 : le parc d'honneur ---------------------------------------
    [0, 15, 22, 3],
    [4, 12, 5, 1], [8, 9, 4, 1],
    [26, 15, 18, 3],
    [30, 12, 5, 1], [34, 9, 4, 1],
    [48, 15, 16, 3],
    [52, 12, 5, 1], [56, 9, 4, 1],
    [68, 15, 20, 3],
    [72, 12, 5, 1], [76, 9, 4, 1],

    // ---- ZONE 2 : la galerie ----------------------------------------------
    [88, 15, 20, 3],
    [92, 12, 5, 1], [96, 9, 4, 1],
    [112, 15, 18, 3],
    [116, 12, 5, 1], [120, 9, 4, 1],
    [134, 15, 20, 3],
    [138, 12, 5, 1], [142, 9, 4, 1],
    [158, 15, 32, 3],
    [162, 12, 5, 1], [166, 9, 4, 1],
    [178, 12, 5, 1],

    // ---- ZONE 3 : la salle du trone ---------------------------------------
    // Sol nu d'un seul tenant, comme toutes les arenes du jeu.
    [190, 15, 78, 3],
    [-2, 0, 2, 18], [268, 0, 2, 18],
  ],

  /* Les estrades laterales du trone. Traversantes, donc franchissables par le
     bas : elles offrent de la hauteur sans jamais pouvoir servir de plafond ni
     bloquer un saut. Ce sont les seules choses en relief de l'arene — le reste
     du sol doit rester nu pour que les meules roulent sans obstacle. */
  traversantes: [
    [22, 12, 4],
    [44, 12, 4],
    [64, 12, 4],
    [108, 12, 4],
    [130, 12, 4],
    [154, 12, 4],
    [200, 12, 5],
    [253, 12, 5],
  ],

  panneaux: [
    { x: 4, y: 13, texte: 'Grille en fer forgé. Dorée. Bien sûr qu\'elle est dorée.' },
    { x: 32, y: 10, texte: 'Les ifs sont taillés au millimètre. Quelqu\'un s\'ennuie ici.' },
    { x: 70, y: 10, texte: 'Trois étages allumés. Il sait qu\'on arrive.' },
    { x: 84, y: 13, texte: 'La galerie →' },
    { x: 96, y: 13, texte: 'Vitrine 1 : « Serrano, 2019. Excellent millésime. »' },
    { x: 140, y: 10, texte: 'Vitrine 14. Il y en a quarante et une. Le BRADDY3000 a compté.' },
    { x: 172, y: 13, texte: 'Tapis rouge. Pour nous ? C\'est trop.' },
    { x: 186, y: 13, texte: 'La salle du trône →' },
    { x: 194, y: 13, texte: 'Il est assis. Il n\'a même pas l\'air surpris.' },
  ],

  ennemis: [
    // --- zone 1 : la garde extérieure. Peu nombreuse, mais chacun coûte cher.
    { type: 'Serra-Garde', x: 13, y: 15, rayon: 3 },
    { type: 'Serra-Volant', x: 18, y: 9, rayon: 4 },
    { type: 'Serra-Garde', x: 6, y: 12, rayon: 2 },
    { type: 'Serra-Garde', x: 33, y: 15, rayon: 3 },
    { type: 'Serra-Garde-Lourd', x: 39, y: 15, rayon: 3 },
    { type: 'Serra-Hallebardier', x: 32, y: 12 },
    { type: 'Serra-Volant', x: 46, y: 8, rayon: 5 },
    { type: 'Serra-Garde', x: 54, y: 15, rayon: 3 },
    { type: 'Serra-Garde', x: 54, y: 12, rayon: 2 },
    { type: 'Serra-Garde-Lourd', x: 60, y: 15, rayon: 3 },
    { type: 'Serra-Volant', x: 66, y: 9, rayon: 5 },
    { type: 'Serra-Garde', x: 74, y: 15, rayon: 3 },
    { type: 'Serra-Hallebardier', x: 74, y: 12 },
    { type: 'Serra-Garde', x: 83, y: 15, rayon: 3 },

    // --- zone 2 : la galerie. Les Hallebardiers tiennent les vitrines, en
    //     hauteur : leur boule passe entre les colonnes, pas Brad.
    { type: 'Serra-Garde', x: 94, y: 15, rayon: 3 },
    { type: 'Serra-Hallebardier', x: 94, y: 12 },
    { type: 'Serra-Volant', x: 102, y: 9, rayon: 5 },
    { type: 'Serra-Garde', x: 104, y: 15, rayon: 3 },
    { type: 'Serra-Garde-Lourd', x: 118, y: 15, rayon: 3 },
    { type: 'Serra-Garde', x: 124, y: 15, rayon: 3 },
    { type: 'Serra-Garde', x: 118, y: 12, rayon: 2 },
    { type: 'Serra-Volant', x: 126, y: 8, rayon: 5 },
    { type: 'Serra-Garde', x: 140, y: 15, rayon: 3 },
    { type: 'Serra-Hallebardier', x: 140, y: 12 },
    { type: 'Serra-Garde-Lourd', x: 148, y: 15, rayon: 3 },
    { type: 'Serra-Volant', x: 150, y: 9, rayon: 5 },
    { type: 'Serra-Garde', x: 164, y: 15, rayon: 3 },
    { type: 'Serra-Garde', x: 164, y: 12, rayon: 2 },
    { type: 'Serra-Garde-Lourd', x: 172, y: 15, rayon: 4 },
    { type: 'Serra-Volant', x: 176, y: 8, rayon: 6 },
    { type: 'Serra-Garde', x: 180, y: 12, rayon: 2 },
    { type: 'Serra-Hallebardier', x: 184, y: 15 },

    // --- zone 3 : la salle est vide. Kirby 67 y est deja, assis. Il se leve
    //     quand Brad franchit la ligne.
  ],
};
