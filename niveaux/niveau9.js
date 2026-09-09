/* =============================================================================
   NIVEAU 9 — La lune du monde parallele

   Trois zones :
     1. le site d'alunissage — la fusee du BRADDY3000 est restee la
     2. la mer des Crises    — crateres, poussiere, la Terre au loin
     3. le champ d'asteroides — l'arene du Serra-Balistique

   C'est ici que tombe la TROISIEME piece de l'appareil a raclette. Elle est
   inscrite au niveau 9 depuis le prototype 09 (sauvegarde.js, vitrine de la
   base, replique « il faudra une fusee ») : ce fichier tient la promesse.

   ---------------------------------------------------------------------------
   CE QUE CE NIVEAU APPORTE : LA GRAVITE

   `gravite: 0.55` est un MULTIPLICATEUR du reglage global (voir monde.js).
   Tout ce qui tombe le subit — Brad, les Serra, les boules, les pieces — parce
   qu'une lune ou seul le heros flotte se lit comme un bug, pas comme une lune.

   Ce que ça change, chiffres a l'appui (calcules par tools/verifier_niveaux.js
   a partir des vrais reglages, jamais recopies a la main) :

       saut          74 px sur Terre  ->  134 px ici   (5,5 tuiles)
       portee au pas 94 px            ->  171 px       (7,1 tuiles)
       portee en course 157 px        ->  285 px       (11,9 tuiles)

   LE TRACE EN DECOULE. Les huit niveaux precedents utilisent des trous de
   quatre tuiles et des plateformes a trois tuiles du sol. Recopier ces valeurs
   ici donnerait une lune ou tout se franchit sans y penser : la gravite serait
   une decoration. Le niveau est donc redimensionne dans les memes proportions
   que le saut — trous de six a sept tuiles, plateformes a quatre puis huit
   rangees du sol. On saute exactement autant qu'avant ; c'est le decor qui a
   grandi autour du saut.

   POURQUOI PAS DE MECANIQUE DE PLUS. La gravite est deja une regle qui touche
   chaque seconde de jeu, et l'arene en ajoute une seconde (la pluie
   d'asteroides). Une troisieme rendrait le niveau bavard.

   REGLE DE TRACE : celle des niveaux 2 a 8, transposee. Chemin de sol garanti,
   rien au-dessus d'un elan, obstacles de deux tuiles au plus. Le vide le plus
   large fait sept tuiles (168 px) — moins que la portee AU PAS : aucune course
   n'est jamais obligatoire.

   Reperes : une tuile = 24 px, la rangee de sol de reference est la 15.
   ========================================================================== */
'use strict';

NIVEAUX['niveau9'] = {
  nom: 'La lune',
  musique: 'niveau9',
  largeur: 276,
  hauteur: 18,
  apparition: { x: 3, y: 12 },

  /* La lune du monde parallele. 55 % de la pesanteur : assez pour que le saut
     change de nature, pas assez pour que Brad devienne ingouvernable. */
  gravite: 0.55,

  zones: [
    {
      x1: 92,
      nom: 'Le site d\'alunissage',
      // Pas de ciel : le vide. Le degrade va du noir a un gris-bleu tres sombre,
      // pour que les silhouettes du sol se detachent quand meme.
      cielHaut: '#04060f', cielBas: '#161d2e',
      loin: '#2b3244', pres: '#3a4157',
      solFace: '#2c3040', solHaut: '#5c6478', solLigne: '#8d97ad',
      silhouettes: 'lune',
    },
    {
      x1: 196,
      nom: 'La mer des Crises',
      cielHaut: '#050813', cielBas: '#1c2438',
      loin: '#333a4e', pres: '#434a61',
      solFace: '#31364a', solHaut: '#666e84', solLigne: '#99a4bb',
      silhouettes: 'lune',
    },
    {
      x1: 999,
      nom: 'Le champ d\'astéroïdes',
      // La salle est plus claire que le reste : on doit voir arriver ce qui
      // tombe, et les marquages au sol doivent se lire sans effort.
      cielHaut: '#070c1c', cielBas: '#2a3450',
      loin: '#3d465e', pres: '#4d5670',
      solFace: '#383e54', solHaut: '#727b93', solLigne: '#a9b4cb',
      silhouettes: 'lune',
    },
  ],

  sas: { x: 90.5, y: 9, w: 3, h: 6, style: 'grille', titre: 'LA MER DES CRISES' },
  sas2: { x: 194.5, y: 9, w: 3, h: 6, style: 'grille', titre: 'LE CHAMP D\'ASTÉROÏDES' },

  /* La porte est DANS l'arene, comme aux niveaux 3 et 6 : elle reste
     verrouillee tant que le Balistique tient debout. */
  porte: { x: 264, y: 12, w: 2, h: 3 },

  /* -------------------------------------------------------------------------
     L'ARENE DU SERRA-BALISTIQUE

     `genre: 'asteroides'` choisit le TROISIEME scenario de combat (js/boss.js).
     Les deux autres — le blindage du Colosse, la duplication du Seraphin —
     restent intacts.

     Le principe, en une phrase : les poings ne suffisent pas, c'est le ciel qui
     frappe. Chaque impact est annonce au sol une seconde et demie a l'avance,
     a l'endroit ou se trouve Brad ; il s'agit de rester la, de laisser le
     Balistique s'approcher, et de s'ecarter au dernier moment.

     La salle est NUE. Pas une plateforme, pas un lustre : tout ce qui pend au
     plafond arreterait un asteroide ou masquerait un marquage, et le combat
     tient entierement a ce qu'on voit tomber.

     Les renforts sont des Serra-Volants ordinaires, appeles quand le boss se
     ressaisit — jamais pendant qu'il est sonne, sinon la fenetre de degats ne
     servirait a rien.
  ------------------------------------------------------------------------- */
  arene: {
    x1: 202, x2: 270, sol: 15,
    genre: 'asteroides',
    nom: 'LE SERRA-BALISTIQUE',
    musique: 'boss9',
    boss: 'Serra-Balistique',
    objet: 'appareil',
    depart: { x: 240, y: 11 },
    trampolines: [],
    renforts: [
      [ { type: 'Serra-Volant', x: 208, y: 10 },
        { type: 'Serra-Volant', x: 264, y: 10 } ],
      [ { type: 'Serra-Volant', x: 207, y: 11 },
        { type: 'Serra-Volant', x: 236, y: 9 },
        { type: 'Serra-Volant', x: 265, y: 11 } ],
      [ { type: 'Serra-Volant', x: 207, y: 10 },
        { type: 'Serra-Volant', x: 222, y: 9 },
        { type: 'Serra-Volant', x: 250, y: 9 },
        { type: 'Serra-Volant', x: 265, y: 10 } ],
    ],
  },

  solides: [
    // ---- ZONE 1 : le site d'alunissage -------------------------------------
    // Trous de six tuiles (144 px), a comparer aux 171 px de portee AU PAS.
    [0, 15, 22, 3],
    [4, 11, 5, 1], [6, 7, 4, 1],
    [28, 15, 18, 3],
    [31, 11, 5, 1], [33, 7, 4, 1],
    [52, 15, 20, 3],
    [56, 11, 5, 1], [58, 7, 4, 1],
    // Le seul vide de sept tuiles du niveau (168 px). Toujours sous la portee
    // au pas : il impressionne, il ne bloque pas.
    [79, 15, 13, 3],
    [82, 11, 5, 1],

    // ---- ZONE 2 : la mer des Crises ----------------------------------------
    [92, 15, 20, 3],
    [95, 11, 5, 1], [97, 7, 4, 1],
    [118, 15, 18, 3],
    [121, 11, 5, 1], [123, 7, 4, 1],
    [143, 15, 17, 3],
    [146, 11, 5, 1], [148, 7, 4, 1],
    [166, 15, 30, 3],
    [169, 11, 5, 1], [171, 7, 4, 1],
    [186, 11, 5, 1],

    // ---- ZONE 3 : le champ d'asteroides ------------------------------------
    // Sol d'un seul tenant et ciel vide. Voir le commentaire de l'arene.
    [196, 15, 76, 3],
    [-2, 0, 2, 18], [272, 0, 2, 18],
  ],

  /* Des passerelles de tole posees en travers des crevasses. Traversantes : on
     y monte par en dessous, elles ne peuvent donc pas faire plafond. Elles
     offrent une route haute a qui prefere sauter court plusieurs fois plutot
     que franchir un vide d'un coup. */
  traversantes: [
    [22, 11, 6],
    [46, 11, 6],
    [112, 11, 6],
    [136, 11, 7],
    [160, 11, 6],
  ],

  panneaux: [
    { x: 4, y: 13, texte: 'La lune. Du monde parallèle. Personne n\'a rien demandé.' },
    { x: 33, y: 9, texte: 'Tu sautes deux fois plus haut. Ne t\'y habitue pas.' },
    { x: 60, y: 13, texte: 'Sept tuiles de vide. Ici, ça se marche.' },
    { x: 88, y: 13, texte: 'La mer des Crises →' },
    { x: 124, y: 9, texte: 'La Terre est là-haut. Elle a l\'air de bien s\'en sortir sans toi.' },
    { x: 172, y: 9, texte: 'Une odeur de fromage. Sous vide, c\'est un exploit.' },
    { x: 190, y: 13, texte: 'Le champ d\'astéroïdes →' },
    { x: 206, y: 13, texte: 'Ça tombe du ciel. Tout le temps. Sers-t\'en.' },
    { x: 258, y: 13, texte: 'Sortie' },
  ],

  ennemis: [
    // --- zone 1 : peu d'ennemis. La gravite est deja un adversaire, et un
    //     joueur qui reapprend a sauter n'a pas besoin d'une garde serree.
    { type: 'Serra', x: 12, y: 15, rayon: 3 },
    { type: 'Serra', x: 6, y: 11, rayon: 2 },
    { type: 'Serra', x: 8, y: 7, rayon: 2 },
    { type: 'Serra-Volant', x: 16, y: 9, rayon: 4 },
    { type: 'Serra-Boost', x: 35, y: 15, rayon: 4 },
    { type: 'Serra-Lanceur', x: 33, y: 11 },
    { type: 'Serra-Volant', x: 42, y: 8, rayon: 5 },
    { type: 'Serra-Lourd', x: 60, y: 15, rayon: 3 },
    { type: 'Serra', x: 58, y: 11, rayon: 2 },
    { type: 'Serra-Volant', x: 66, y: 9, rayon: 5 },
    { type: 'Serra-Boost', x: 84, y: 15, rayon: 4 },
    { type: 'Serra', x: 84, y: 11, rayon: 2 },

    // --- zone 2 : la garde se resserre. Les Lanceurs sont poses en hauteur :
    //     leur boule decrit ici une cloche beaucoup plus longue, il faut la
    //     voir venir de loin.
    { type: 'Serra', x: 98, y: 15, rayon: 3 },
    { type: 'Serra-Lanceur', x: 97, y: 11 },
    { type: 'Serra-Volant', x: 106, y: 8, rayon: 5 },
    { type: 'Serra-Boost', x: 124, y: 15, rayon: 4 },
    { type: 'Serra-Lourd', x: 130, y: 15, rayon: 3 },
    { type: 'Serra', x: 123, y: 11, rayon: 2 },
    { type: 'Serra', x: 124, y: 7, rayon: 2 },
    { type: 'Serra-Volant', x: 132, y: 9, rayon: 5 },
    { type: 'Serra-Lanceur', x: 148, y: 11 },
    { type: 'Serra', x: 152, y: 15, rayon: 3 },
    { type: 'Serra-Volant', x: 156, y: 8, rayon: 6 },
    { type: 'Serra-Boost', x: 170, y: 15, rayon: 4 },
    { type: 'Serra', x: 171, y: 11, rayon: 2 },
    { type: 'Serra-Lourd', x: 180, y: 15, rayon: 3 },
    { type: 'Serra-Volant', x: 184, y: 9, rayon: 5 },
    { type: 'Serra', x: 188, y: 11, rayon: 2 },
    { type: 'Serra-Lanceur', x: 192, y: 15 },

    // --- zone 3 : la salle est vide. Le Balistique arrive quand Brad franchit
    //     la ligne, et lui seul.
  ],
};
