/* =============================================================================
   NIVEAU 7 — Le complexe scientifique

   Deux zones :
     1. le hall d'essais      — baies d'ordinateurs, premieres barrieres
     2. la salle du reacteur  — plus dense, cycles plus courts

   CE QUE CE NIVEAU APPORTE : les barrieres laser, citees dans la roadmap
   (« une vague d'ennemi sur le joueur ou des lasers a eviter »). Elles ne
   portent pas Brad et ne le poussent pas : elles decoupent le couloir dans le
   TEMPS. On avance quand la voie est libre.

   DEUX FORMES, et le melange des deux fait tout le niveau :

     - la barriere HAUTE (h: 4) descend jusqu'au sol et monte au-dessus de la
       tete de Brad : impossible a sauter, il faut attendre ;
     - la barriere BASSE (h: 2) s'arrete a mi-hauteur : un saut suffit, si on
       le prend au bon moment.

   REGLE DE POSE, en plus de la regle de trace habituelle : aucune barriere a
   moins de deux tuiles du bord d'un trou. Une barriere qui s'allume pendant
   l'elan obligerait a s'arreter au bord du vide, ou pire, a sauter dedans.
   Le verificateur refuse desormais toute barriere posee la.

   Reperes : une tuile = 24 px, la rangee de sol de reference est la 15.
   ========================================================================== */
'use strict';

NIVEAUX['niveau7'] = {
  nom: 'Complexe scientifique',
  musique: 'niveau7',
  largeur: 252,
  hauteur: 18,
  apparition: { x: 3, y: 12 },

  zones: [
    {
      x1: 96,
      nom: 'Le hall d\'essais',
      cielHaut: '#111c26', cielBas: '#223a44',
      loin: '#1a2c38', pres: '#213542',
      solFace: '#232d38', solHaut: '#3e5261', solLigne: '#5f7d90',
      silhouettes: 'labo',
    },
    {
      x1: 999,
      nom: 'La salle du réacteur',
      cielHaut: '#0d1622', cielBas: '#1b3040',
      // Le fond est eclairci d'un cran : le reacteur et ses conduites se
      // perdaient dans un bleu presque noir, et la zone n'avait plus d'identite.
      loin: '#243c50', pres: '#1b2c3c',
      solFace: '#1f2833', solHaut: '#374a59', solLigne: '#557186',
      silhouettes: 'reacteur',
    },
  ],

  sas: { x: 94.5, y: 9, w: 3, h: 6, style: 'grille', titre: 'LE RÉACTEUR' },
  porte: { x: 242, y: 12, w: 2, h: 3 },

  solides: [
    // ---- ZONE 1 : le hall d'essais ----------------------------------------
    [0, 15, 22, 3],
    [8, 12, 5, 1],
    [26, 15, 18, 3],
    [28, 12, 5, 1], [32, 10, 4, 1],
    [48, 15, 16, 3],
    [50, 12, 5, 1],
    [68, 15, 28, 3],
    [70, 12, 5, 1], [74, 10, 4, 1],
    [88, 12, 5, 1],

    // ---- ZONE 2 : la salle du reacteur ------------------------------------
    [96, 15, 18, 3],
    [98, 12, 5, 1],
    [118, 15, 16, 3],
    [120, 12, 5, 1], [124, 10, 4, 1],
    [138, 15, 18, 3],
    [140, 12, 5, 1],
    [160, 15, 16, 3],
    [162, 12, 5, 1], [166, 10, 4, 1],
    [180, 15, 18, 3],
    [182, 12, 5, 1],
    [202, 15, 46, 3],
    [204, 12, 5, 1], [208, 10, 5, 1],
    [222, 12, 5, 1],
    [-2, 0, 2, 18], [248, 0, 2, 18],
  ],

  /* LES BARRIERES. `cycle` est la duree totale, `actif` la part allumee,
     `phase` (0 a 1) le decalage au depart. Toutes laissent au moins une
     seconde et demie de voie libre : c'est le minimum pour traverser sans
     course parfaite, et le verificateur le controle. */
  lasers: [
    // --- zone 1 : on apprend. Cycles longs, une barriere a la fois.
    { x: 12, y: 11, h: 4, cycle: 3.4, actif: 1.4, phase: 0 },
    { x: 33, y: 13, h: 2, cycle: 3.0, actif: 1.2, phase: 0.4 },
    { x: 54, y: 11, h: 4, cycle: 3.2, actif: 1.3, phase: 0.2 },
    { x: 75, y: 13, h: 2, cycle: 2.8, actif: 1.1, phase: 0.6 },
    { x: 86, y: 11, h: 4, cycle: 3.0, actif: 1.3, phase: 0.1 },

    // --- zone 2 : plus serre, et surtout dephase — deux barrieres proches qui
    //     s'allument ensemble se franchissent d'une traite, ce qui n'a aucun
    //     interet. Decalees, elles demandent de s'arreter entre les deux.
    { x: 104, y: 11, h: 4, cycle: 2.8, actif: 1.2, phase: 0 },
    { x: 127, y: 13, h: 2, cycle: 2.4, actif: 1.0, phase: 0.35 },
    { x: 146, y: 11, h: 4, cycle: 2.8, actif: 1.2, phase: 0.55 },
    { x: 168, y: 11, h: 4, cycle: 2.6, actif: 1.1, phase: 0.2 },
    { x: 189, y: 13, h: 2, cycle: 2.2, actif: 0.9, phase: 0.7 },
    { x: 210, y: 11, h: 4, cycle: 3.0, actif: 1.4, phase: 0 },
    { x: 230, y: 11, h: 4, cycle: 2.6, actif: 1.1, phase: 0.5 },
  ],

  /* Une barre mobile au-dessus du plus large trou de la zone 2, pour rompre le
     rythme des barrieres : ici on attend une plateforme, pas une extinction. */
  mobiles: [
    { x1: 198, x2: 202, y: 13, w: 3, vitesse: 50, phase: 0.25 },
  ],

  traversantes: [
    [22, 12, 4],
    [44, 12, 4],
    [64, 12, 4],
    [114, 12, 4],
    [134, 12, 4],
    [156, 12, 4],
    [176, 12, 4],
  ],

  panneaux: [
    { x: 4, y: 13, texte: 'Complexe de recherche. On ne sait pas sur quoi.' },
    { x: 30, y: 10, texte: 'Les rouges brûlent. Les vertes non. C\'est déjà ça.' },
    { x: 72, y: 10, texte: 'Attendre, puis passer. Pas l\'inverse.' },
    { x: 92, y: 13, texte: 'Le réacteur →' },
    { x: 122, y: 11, texte: 'Le BRADDY3000 refuse de commenter le réacteur.' },
    { x: 184, y: 13, texte: 'Presque au bout.' },
    { x: 238, y: 13, texte: 'Sortie' },
  ],

  ennemis: [
    // --- zone 1 : peu d'ennemis. Les barrieres sont deja un adversaire, et en
    //     empiler un second des la premiere zone rendrait l'apprentissage
    //     illisible.
    { type: 'Serra', x: 17, y: 15, rayon: 3 },
    { type: 'Serra-Volant', x: 24, y: 9, rayon: 4 },
    { type: 'Serra-Boost', x: 38, y: 15, rayon: 4 },
    { type: 'Serra', x: 52, y: 15, rayon: 3 },
    { type: 'Serra-Volant', x: 60, y: 8, rayon: 5 },
    { type: 'Serra-Lourd', x: 72, y: 15, rayon: 3 },
    { type: 'Serra', x: 84, y: 15, rayon: 3 },
    { type: 'Serra-Lanceur', x: 90, y: 12 },

    // --- zone 2 : le complexe se defend. Les Lanceurs sont poses DERRIERE les
    //     barrieres : leur boule passe, pas Brad. C'est la seule maniere de
    //     rendre l'attente inconfortable sans la rendre injuste.
    { type: 'Serra', x: 100, y: 15, rayon: 3 },
    { type: 'Serra-Lanceur', x: 99, y: 12 },
    { type: 'Serra-Boost', x: 110, y: 15, rayon: 3 },
    { type: 'Serra-Volant', x: 122, y: 9, rayon: 5 },
    { type: 'Serra', x: 130, y: 15, rayon: 3 },
    { type: 'Serra-Lourd', x: 142, y: 15, rayon: 3 },
    { type: 'Serra-Lanceur', x: 141, y: 12 },
    { type: 'Serra-Volant', x: 152, y: 8, rayon: 6 },
    { type: 'Serra-Boost', x: 164, y: 15, rayon: 4 },
    { type: 'Serra', x: 172, y: 15, rayon: 3 },
    { type: 'Serra-Volant', x: 186, y: 9, rayon: 5 },
    { type: 'Serra-Lourd', x: 192, y: 15, rayon: 3 },
    { type: 'Serra', x: 206, y: 15, rayon: 3 },
    { type: 'Serra-Lanceur', x: 205, y: 12 },
    { type: 'Serra-Boost', x: 218, y: 15, rayon: 4 },
    { type: 'Serra-Volant', x: 226, y: 9, rayon: 5 },
    { type: 'Serra', x: 234, y: 15, rayon: 3 },
    { type: 'Serra', x: 223, y: 12, rayon: 2 },
  ],
};
