/* =============================================================================
   NIVEAU 7 — Les toits de Paris

   Deux zones :
     1. les toits de zinc   — petit matin, cheminees, lucarnes
     2. au-dessus des toits — plein jour, et la Tour Eiffel au fond

   POURQUOI CE NIVEAU N'APPORTE PAS DE MECANIQUE NEUVE. Les quatre precedents
   en ont chacun introduit une — dalles, glace, lustres, et le complexe
   apportera ses barrieres. Empiler une cinquieme regle ici ferait un jeu qui
   n'apprend plus rien au joueur, il l'assomme. Paris recombine donc ce qui
   existe : les echafaudages sont des barres mobiles, les balcons des
   plateformes traversantes, et le trace est le plus VERTICAL du jeu — on monte
   autant qu'on avance, ce qui est deja un depaysement suffisant.

   La Tour Eiffel est posee a un endroit fixe du monde (tuile 132, zone 2), pas
   repetee comme le reste du decor. Un Paris avec une tour tous les quatre
   immeubles ne serait pas Paris, ce serait un motif.

   REGLE DE TRACE : celle des niveaux 2 a 6. Chemin de sol garanti, trous de
   4 tuiles — 6 quand une barre mobile les enjambe —, rien au-dessus d'un elan,
   obstacles de 2 tuiles au plus.

   Reperes : une tuile = 24 px, la rangee de sol de reference est la 15.
   ========================================================================== */
'use strict';

NIVEAUX['niveau7'] = {
  nom: 'Les toits de Paris',
  musique: 'niveau7',
  largeur: 250,
  hauteur: 18,
  apparition: { x: 3, y: 12 },

  zones: [
    {
      x1: 96,
      nom: 'Les toits de zinc',
      cielHaut: '#3a3f66', cielBas: '#c98f7a',   // aube, encore bleue en haut
      /* Les deux plans etaient trop proches en valeur (#4a4a68 et #5b5f72) :
         la ville du fond et les toits du premier plan se confondaient en une
         seule masse grise. On les ecarte franchement — le lointain s'assombrit,
         le proche s'eclaircit — pour que la profondeur se voie. */
      loin: '#383a58', pres: '#6b7089',
      solFace: '#4a4e5c', solHaut: '#7e8698', solLigne: '#a8b2c4',
      silhouettes: 'toits',
    },
    {
      x1: 999,
      nom: 'Au-dessus des cheminées',
      cielHaut: '#5f86bc', cielBas: '#e8c9a2',   // le jour s'est leve
      loin: '#4a4c6b', pres: '#7d8299',
      solFace: '#565a68', solHaut: '#8d95a6', solLigne: '#b9c2d2',
      silhouettes: 'toits',
    },
  ],

  sas: { x: 94.5, y: 9, w: 3, h: 6, style: 'grille', titre: 'LES TOITS' },
  porte: { x: 240, y: 12, w: 2, h: 3 },

  solides: [
    // ---- ZONE 1 : les toits de zinc ---------------------------------------
    [0, 15, 20, 3],
    [6, 12, 5, 1], [11, 9, 5, 1],         // premiere montee, optionnelle
    [24, 15, 16, 3],
    [26, 12, 5, 1], [30, 9, 4, 1],
    [46, 15, 14, 3],
    [48, 12, 5, 1], [51, 9, 5, 1],
    [64, 15, 16, 3],
    [66, 12, 5, 1], [70, 9, 4, 1],
    [84, 15, 12, 3],
    [86, 12, 5, 1],

    // ---- ZONE 2 : au-dessus des cheminees ---------------------------------
    [96, 15, 18, 3],
    [98, 12, 5, 1], [102, 9, 4, 1],
    [118, 15, 16, 3],
    [120, 12, 5, 1], [124, 9, 5, 1],
    [140, 15, 14, 3],
    [142, 12, 5, 1], [146, 9, 4, 1],
    [158, 15, 18, 3],
    [160, 12, 5, 1], [164, 9, 5, 1],
    [180, 15, 16, 3],
    [182, 12, 5, 1], [186, 9, 4, 1],
    [202, 15, 44, 3],
    [204, 12, 5, 1], [208, 9, 5, 1],
    [214, 12, 5, 1],
    [-2, 0, 2, 18], [246, 0, 2, 18],
  ],

  /* Les echafaudages. Trois barres, chacune au-dessus d'un trou de six tuiles
     — franchissable en courant (157 px de portee pour 144 px de vide), donc
     jamais le seul passage. C'est la regle depuis le niveau 2 : un niveau qui
     depend d'une plateforme mobile devient injouable si elle se bloque. */
  mobiles: [
    { x1: 40, x2: 46, y: 13, w: 3, vitesse: 54, phase: 0 },
    { x1: 134, x2: 140, y: 13, w: 3, vitesse: 58, phase: 0.4 },
    { x1: 196, x2: 202, y: 13, w: 3, vitesse: 50, phase: 0.7 },
  ],

  // Les balcons.
  traversantes: [
    [20, 12, 4],
    [60, 12, 4],
    [80, 12, 4],
    [114, 12, 4],
    [154, 12, 4],
    [176, 12, 4],
  ],

  panneaux: [
    { x: 4, y: 13, texte: 'Paris. Brad n\'a rien demandé.' },
    { x: 28, y: 10, texte: 'Le zinc glisse un peu. Non, ça c\'était le niveau 5.' },
    { x: 68, y: 10, texte: 'Vue imprenable. Personne ne la prend.' },
    { x: 92, y: 13, texte: 'Encore des toits →' },
    { x: 122, y: 10, texte: 'La tour est là-bas. Le BRADDY3000 refuse de la nommer.' },
    { x: 166, y: 10, texte: 'Des Serra sur les toits de Paris. On s\'y fait.' },
    { x: 210, y: 10, texte: 'Presque au bout de l\'arrondissement.' },
    { x: 236, y: 13, texte: 'Sortie' },
  ],

  ennemis: [
    // --- zone 1 : on installe la verticalite, sans surcharger
    { type: 'Serra', x: 14, y: 15, rayon: 3 },
    { type: 'Serra-Volant', x: 21, y: 9, rayon: 4 },
    { type: 'Serra', x: 28, y: 15, rayon: 3 },
    { type: 'Serra', x: 27, y: 12, rayon: 2 },
    { type: 'Serra-Boost', x: 36, y: 15, rayon: 3 },
    { type: 'Serra-Volant', x: 44, y: 8, rayon: 5 },
    { type: 'Serra-Lourd', x: 52, y: 15, rayon: 3 },
    { type: 'Serra', x: 52, y: 9, rayon: 2 },
    { type: 'Serra-Boost', x: 68, y: 15, rayon: 4 },
    { type: 'Serra-Volant', x: 74, y: 8, rayon: 5 },
    { type: 'Serra', x: 88, y: 15, rayon: 3 },

    // --- zone 2 : les Lanceurs prennent les balcons, ce qui oblige a monter
    { type: 'Serra', x: 100, y: 15, rayon: 3 },
    { type: 'Serra-Lanceur', x: 99, y: 12 },
    { type: 'Serra-Volant', x: 110, y: 9, rayon: 5 },
    { type: 'Serra-Boost', x: 122, y: 15, rayon: 4 },
    { type: 'Serra', x: 125, y: 9, rayon: 2 },
    { type: 'Serra-Lourd', x: 130, y: 15, rayon: 3 },
    { type: 'Serra-Volant', x: 138, y: 8, rayon: 6 },
    { type: 'Serra', x: 144, y: 15, rayon: 3 },
    { type: 'Serra-Lanceur', x: 143, y: 12 },
    { type: 'Serra-Boost', x: 162, y: 15, rayon: 4 },
    { type: 'Serra-Volant', x: 168, y: 8, rayon: 5 },
    { type: 'Serra', x: 165, y: 9, rayon: 2 },
    { type: 'Serra-Lourd', x: 184, y: 15, rayon: 3 },
    { type: 'Serra-Lanceur', x: 183, y: 12 },
    { type: 'Serra-Volant', x: 192, y: 9, rayon: 5 },
    { type: 'Serra', x: 206, y: 15, rayon: 3 },
    { type: 'Serra-Boost', x: 212, y: 15, rayon: 4 },
    { type: 'Serra', x: 209, y: 9, rayon: 2 },
    { type: 'Serra-Volant', x: 222, y: 9, rayon: 5 },
    { type: 'Serra', x: 230, y: 15, rayon: 3 },
  ],
};
