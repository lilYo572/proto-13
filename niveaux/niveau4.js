/* =============================================================================
   NIVEAU 4 — La discotheque, quelque part au Bresil

   Trois zones :
     1. la file d'attente  — la rue, de nuit, enseignes au neon
     2. la piste           — les dalles qui se derobent, le coeur du niveau
     3. les loges          — couloirs, materiel, et un dernier passage de dalles

   CE QUE CE NIVEAU APPORTE : les dalles. Jusqu'ici, franchir un vide etait une
   question de saut (niveaux 1 a 3) ou de patience devant une barre mobile
   (niveau 2). Ici le sol existe, mais ne dure pas : il faut avancer. C'est la
   premiere fois que le jeu demande de NE PAS s'arreter.

   Et le Serra-Samba, qui demande exactement l'inverse : lui, on l'attend.
   Les deux idees se repondent, et c'est ce contraste qui fait le niveau.

   REGLE DE TRACE — celle des niveaux 2 et 3, avec deux ajouts :
     1. Le chemin du sol est garanti. Ses trous ne depassent pas 4 tuiles, SAUF
        au-dessus d'un passage de dalles : la, chaque bond d'une dalle a la
        suivante vaut une tuile. Le verificateur mesure ce plus grand bond, pas
        la largeur totale du vide.
     2. Rien au-dessus d'un elan.
     3. Les obstacles poses au sol font 2 tuiles au plus.
     4. AUCUN ennemi sur une dalle. Ils ne les connaissent pas — leur code de
        collision ne regarde que les solides et les traversantes — et le
        premier passage les ferait tomber dans le vide.

   Reperes : une tuile = 24 px, la rangee de sol de reference est la 15.
   ========================================================================== */
'use strict';

NIVEAUX['niveau4'] = {
  nom: 'Discothèque — Brésil',
  musique: 'niveau4',
  largeur: 256,
  hauteur: 18,
  apparition: { x: 3, y: 12 },

  zones: [
    {
      x1: 92,
      nom: 'La file d\'attente',
      cielHaut: '#160e28', cielBas: '#3a1c46',   // nuit tiede, halo des neons
      loin: '#241436', pres: '#311b44',
      solFace: '#2c1c34', solHaut: '#4a2e58', solLigne: '#7c4a90',
      silhouettes: 'neons',
    },
    {
      x1: 188,
      nom: 'La piste',
      cielHaut: '#1c0c30', cielBas: '#4a1858',
      loin: '#2a1040', pres: '#38164e',
      solFace: '#33163c', solHaut: '#5c2670', solLigne: '#9a41b4',
      silhouettes: 'club',
    },
    {
      x1: 999,
      nom: 'Les loges',
      cielHaut: '#140f1e', cielBas: '#2a2034',
      loin: '#1e1728', pres: '#2a2036',
      solFace: '#2a2230', solHaut: '#453a52', solLigne: '#66576f',
      silhouettes: 'club',
    },
  ],

  sas: { x: 90.5, y: 9, w: 3, h: 6, style: 'grille', titre: 'LA PISTE' },
  sas2: { x: 186.5, y: 9, w: 3, h: 6, style: 'grille', titre: 'LES LOGES' },

  porte: { x: 246, y: 12, w: 2, h: 3 },

  solides: [
    // ---- ZONE 1 : la file d'attente ---------------------------------------
    [0, 15, 20, 3],
    [8, 12, 5, 1],                        // auvent du sas d'entree
    [23, 15, 14, 3],
    [25, 12, 5, 1], [29, 10, 4, 1],       // escalier de secours (optionnel)
    [40, 15, 16, 3],
    [43, 12, 5, 1], [44, 10, 5, 1],
    [62, 15, 12, 3],
    [62, 12, 5, 1], [64, 10, 4, 1],
    [77, 15, 15, 3],
    [79, 12, 5, 1],

    // ---- ZONE 2 : la piste ------------------------------------------------
    // Trois vides, deux franchis sur des dalles. Les ilots entre eux sont les
    // seuls endroits ou l'on peut s'arreter — et c'est la qu'on est attendu.
    [92, 15, 14, 3],
    [94, 12, 5, 1],
    [116, 15, 12, 3],
    [118, 12, 5, 1],
    [132, 15, 10, 3],
    [133, 12, 4, 1],
    [154, 15, 12, 3],
    [156, 12, 5, 1],
    [170, 15, 18, 3],
    [172, 12, 5, 1], [177, 10, 5, 1],

    // ---- ZONE 3 : les loges -----------------------------------------------
    [188, 15, 16, 3],
    [190, 12, 5, 1],
    [212, 15, 14, 3],
    [214, 12, 5, 1],
    [230, 15, 22, 3],
    [232, 12, 5, 1], [237, 10, 5, 1],
    [-2, 0, 2, 18], [252, 0, 2, 18],
  ],

  /* LES DALLES. Rangee 13, soit deux tuiles au-dessus du sol : atteignables
     d'un saut depuis n'importe quel bord, et assez basses pour qu'on voie le
     vide en dessous. Chaque groupe laisse une tuile d'ecart avec les bords —
     ce petit saut d'entree evite qu'on s'y engage par inadvertance, en
     marchant. */
  dalles: [
    [107, 13, 8],                         // premier passage : on decouvre
    [143, 13, 10],                        // le long : il faut vraiment avancer
    [205, 13, 6],                         // rappel, dans les loges
  ],

  /* Une barre mobile dans la file d'attente, AVANT la piste. Elle pose la
     question inverse — attendre — pour que la piste, ensuite, se lise comme
     une rupture. Le trou qu'elle enjambe fait 6 tuiles : Brad le franchit
     aussi en courant, la barre n'est jamais le seul passage. */
  mobiles: [
    { x1: 56, x2: 62, y: 13, w: 3, vitesse: 52, phase: 0 },
  ],

  traversantes: [
    [20, 12, 4],
    [37, 12, 4],
    [74, 12, 4],
    [128, 12, 5],
    [166, 12, 5],
    [226, 12, 4],
  ],

  panneaux: [
    { x: 4, y: 13, texte: 'La musique s\'entend depuis la rue. Mauvais signe.' },
    { x: 27, y: 10, texte: 'Le videur n\'est plus là. Encore pire.' },
    { x: 63, y: 10, texte: 'Ça sent la fumée et le sucre.' },
    { x: 88, y: 13, texte: 'La piste →' },
    { x: 96, y: 13, texte: 'Les dalles ne tiennent pas. N\'insiste pas dessus.' },
    { x: 134, y: 11, texte: 'Vraiment, n\'insiste pas.' },
    { x: 173, y: 13, texte: 'Voilà. C\'était ça, danser.' },
    { x: 184, y: 13, texte: 'Les loges →' },
    { x: 234, y: 13, texte: 'Sortie' },
  ],

  ennemis: [
    // --- zone 1 : on presente le Samba seul, sur un sol plein, ou le rater
    //     ne coute qu'un coup et jamais une chute.
    { type: 'Serra', x: 14, y: 15, rayon: 3 },
    { type: 'Serra-Samba', x: 27, y: 15, rayon: 4 },
    { type: 'Serra-Volant', x: 33, y: 9, rayon: 4 },
    { type: 'Serra', x: 45, y: 15, rayon: 3 },
    { type: 'Serra-Samba', x: 51, y: 15, rayon: 5 },
    { type: 'Serra-Boost', x: 64, y: 15, rayon: 4 },
    { type: 'Serra-Volant', x: 66, y: 8, rayon: 5 },
    { type: 'Serra-Samba', x: 80, y: 15, rayon: 5 },
    { type: 'Serra-Lourd', x: 86, y: 15, rayon: 3 },

    // --- zone 2 : la piste. Les ennemis tiennent les ILOTS, jamais les
    //     dalles : ce sont des comites d'accueil en fin de passage, ce qui
    //     oblige a arriver en pensant deja au suivant.
    { type: 'Serra-Samba', x: 97, y: 15, rayon: 4 },
    { type: 'Serra-Volant', x: 111, y: 9, rayon: 5 },
    { type: 'Serra-Samba', x: 119, y: 15, rayon: 4 },
    { type: 'Serra', x: 124, y: 15, rayon: 3 },
    { type: 'Serra-Volant', x: 134, y: 8, rayon: 5 },
    { type: 'Serra-Boost', x: 136, y: 15, rayon: 3 },
    { type: 'Serra-Volant', x: 148, y: 9, rayon: 6 },
    { type: 'Serra-Samba', x: 157, y: 15, rayon: 4 },
    { type: 'Serra-Lanceur', x: 158, y: 12 },
    { type: 'Serra-Lourd', x: 174, y: 15, rayon: 4 },
    { type: 'Serra-Samba', x: 180, y: 15, rayon: 4 },
    { type: 'Serra', x: 178, y: 10, rayon: 2 },

    // --- zone 3 : les loges, plus etroites, plus habitees
    { type: 'Serra', x: 192, y: 15, rayon: 3 },
    { type: 'Serra-Lanceur', x: 192, y: 12 },
    { type: 'Serra-Samba', x: 198, y: 15, rayon: 4 },
    { type: 'Serra-Boost', x: 216, y: 15, rayon: 4 },
    { type: 'Serra-Volant', x: 218, y: 9, rayon: 5 },
    { type: 'Serra-Lourd', x: 234, y: 15, rayon: 4 },
    { type: 'Serra-Samba', x: 240, y: 15, rayon: 4 },
    { type: 'Serra', x: 238, y: 10, rayon: 2 },
  ],
};
