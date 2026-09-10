/* =============================================================================
   BRAD BITT, MAIS LE JEU — LE GENERIQUE

   Il se joue une fois Kirby 67 a terre et la derniere cinematique passee. Deux
   partis pris, tous deux demandes :

   1. PAS DE DEFILEMENT. Le generique ne monte pas, il se succede : une
      categorie occupe l'ecran, s'efface, la suivante arrive. On lit une chose a
      la fois, et chaque nom a l'ecran pour lui.

   2. IL EST CALE SUR LA MUSIQUE. Deux moments sont fixes par la piste elle-meme
      — la voix de Brad Bitt a 1 min 09, et la reprise a 2 min 02, ou il ne
      reste plus qu'un remerciement. Le reste se repartit entre les deux.

   ---------------------------------------------------------------------------
   COMMENT LE RETOUCHER

   Tout est dans la table `CARTES` ci-dessous : un objet par ecran, avec sa
   seconde de debut. Changer l'ordre, la duree ou le texte d'une categorie se
   fait la, sans toucher au rendu. Les deux reperes musicaux sont dans
   `GENERIQUE`.

   ---------------------------------------------------------------------------
   LA DUREE

   La piste `generique` n'a pas encore ete fournie. Tant qu'elle manque, le
   generique dure `dureeParDefaut`. Des qu'elle est deposee dans assets/audio,
   c'est SA duree reelle qui est lue et qui commande la fin — il n'y a donc rien
   a recalculer quand elle arrivera, et le retour au menu tombera exactement a
   la derniere note.
   ========================================================================== */
'use strict';

const GENERIQUE = {
  dureeParDefaut: 168,     // 2 min 48, le temps que la vraie piste arrive
  voix: 69,                // 1 min 09 — la voix de Brad Bitt
  reprise: 122,            // 2 min 02 — la musique repart, il ne reste qu'un merci
  fondu: 0.7,              // duree d'apparition et de disparition d'une carte
};

/* Les categories, dans l'ordre, avec leur seconde de debut. La derniere carte
   n'a pas de fin : elle tient jusqu'au bout de la musique. */
const CARTES = [
  { t: 1.5,  titre: 'Idée originale de',            noms: ['IMAGINe Studio'] },
  { t: 9.5,  titre: 'Développement',                noms: ['HwR Engine'] },
  { t: 17.5, titre: 'Échantillons de musiques par', noms: ['Mixvibes'] },
  { t: 25.5, titre: 'Musique',                      noms: ['lılyº'] },

  /* « Propulsé par » garde son titre pendant que les trois noms arrivent UN A
     UN, comme demande. `intervalle` est le temps entre deux arrivees ; le titre,
     lui, ne bouge pas tant que la carte dure. */
  { t: 33.5, titre: 'Propulsé par', intervalle: 3.6,
    noms: ['GitHub', 'Opus 5', 'Netlify'] },

  { t: 47,   titre: 'L\'univers Brad Bitt créé par', noms: ['H.D.N'] },
  { t: 55,   titre: 'Merci', noms: ['à mes amis', 'pour leurs idées des plus farfelues'],
    intervalle: 2.2 },

  // Une respiration avant le repere de la voix : la carte de titre.
  { t: 62,   genre: 'titre' },

  // 1 min 09 — la voix.
  { t: GENERIQUE.voix, titre: 'Voix de Brad Bitt', genre: 'voix',
    noms: ['Brad Bitt (lui-même)'] },

  // De 1 min 20 a 2 min 02, ce que le jeu a fabrique en chemin.
  { t: 80,   titre: 'Le bestiaire', genre: 'bestiaire' },
  { t: 94,   titre: 'Cette partie', genre: 'statistiques' },
  { t: 106,  titre: 'Une précision', genre: 'mention' },

  // 2 min 02 — la reprise. Il ne reste plus que le remerciement.
  { t: GENERIQUE.reprise, genre: 'merci' },
];

const MENTION_IA =
  'Plusieurs agents conversationnels ont été utilisés pendant la fabrication '
  + 'de ce jeu. Le game design, les idées et l\'ensemble de l\'univers restent '
  + 'l\'œuvre d\'un humain.';

const generique = {
  actif: false,
  t: 0,
  duree: GENERIQUE.dureeParDefaut,
  choix: 0,                 // 0 = menu principal, 1 = retour a la base
  termine: false,
};

/* -----------------------------------------------------------------------------
   LES CONFETTIS

   Ils servent a deux endroits : a la toute fin du generique, et au menu a
   chaque lancement une fois le jeu termine. Un seul systeme, donc, pose ici
   plutot que dans le menu — c'est le generique qui les invente.
-------------------------------------------------------------------------- */

const confettis = [];
const COULEURS_CONFETTI = ['#e8b62c', '#d8483c', '#3ac0dc', '#7ee08a',
                           '#c8a0ff', '#f2f3f8'];

function lancerConfettis(nombre, depuisLeHaut) {
  for (let i = 0; i < nombre; i++) {
    confettis.push({
      x: Math.random() * LARGEUR,
      y: depuisLeHaut ? -Math.random() * HAUTEUR : HAUTEUR * 0.55 + Math.random() * 30,
      vx: (Math.random() - 0.5) * 120,
      vy: depuisLeHaut ? 40 + Math.random() * 80 : -220 - Math.random() * 180,
      w: 3 + Math.random() * 3,
      h: 5 + Math.random() * 4,
      rot: Math.random() * 6.28,
      vrot: (Math.random() - 0.5) * 9,
      couleur: COULEURS_CONFETTI[Math.floor(Math.random() * COULEURS_CONFETTI.length)],
      vie: 6 + Math.random() * 3,
    });
  }
}

function majConfettis(dt) {
  for (let i = confettis.length - 1; i >= 0; i--) {
    const c = confettis[i];
    c.vie -= dt;
    c.vy += 260 * dt;
    // Un peu de portance : un confetti ne tombe pas comme une pierre.
    c.vx += Math.sin(c.rot) * 26 * dt;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.rot += c.vrot * dt;
    if (c.vie <= 0 || c.y > HAUTEUR + 30) confettis.splice(i, 1);
  }
}

function dessinerConfettis() {
  for (const c of confettis) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.globalAlpha = Math.min(1, c.vie);
    ctx.fillStyle = c.couleur;
    // L'echelle horizontale suit la rotation : le confetti se met de profil,
    // ce qui suffit a le faire tourner sur lui-meme sans dessin de plus.
    ctx.scale(Math.max(0.15, Math.abs(Math.cos(c.rot * 1.7))), 1);
    ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/* Les confettis du menu. Une fois par session, pas une fois par image : sans ce
   drapeau, revenir au menu depuis les options en relancerait une bordee. */
let confettisMenuVus = false;

function confettisDuMenu() {
  if (confettisMenuVus || !partie.finalGagne) return;
  confettisMenuVus = true;
  lancerConfettis(70, true);
}

/* -----------------------------------------------------------------------------
   DEROULEMENT
-------------------------------------------------------------------------- */

function lancerGenerique() {
  generique.actif = true;
  generique.t = 0;
  generique.choix = 0;
  generique.termine = false;
  confettis.length = 0;
  scene = 'generique';

  const src = sourceMusique('generique');
  audio.jouerMusiqueDifferee(src, 1.2);

  /* La duree vient de la piste des qu'elle existe. `duration` n'est lisible
     qu'une fois les metadonnees chargees ; tant qu'elle ne l'est pas, on garde
     le repli, et majGenerique la relira. */
  generique.duree = GENERIQUE.dureeParDefaut;
  generique.source = src;
}

function dureeGenerique() {
  const el = audio.pistes.get(generique.source);
  const d = el ? el.duration : NaN;
  // On se mefie d'une duree absurde : un fichier tronque ou un flux mal lu
  // renverrait quelques secondes, et le generique se refermerait aussitot.
  if (isFinite(d) && d > 60) return d;
  return GENERIQUE.dureeParDefaut;
}

function carteCourante() {
  let courante = null;
  for (const c of CARTES) {
    if (generique.t >= c.t) courante = c;
    else break;
  }
  return courante;
}

function finDeCarte(carte) {
  const i = CARTES.indexOf(carte);
  return i >= 0 && i < CARTES.length - 1 ? CARTES[i + 1].t : Infinity;
}

function majGenerique(dt) {
  generique.t += dt;
  generique.duree = dureeGenerique();
  majConfettis(dt);

  // La derniere carte fait tomber les confettis, une seule fois.
  if (!generique.termine && generique.t >= GENERIQUE.reprise + 1.2) {
    generique.termine = true;
    lancerConfettis(90, true);
  }

  /* Fin de la musique : on renvoie au menu, meme si le joueur n'a rien touche.
     C'est la demande explicite — le generique ne doit jamais rester ouvert
     indefiniment sur un ecran muet. */
  if (generique.t >= generique.duree) quitterGenerique('menu');
}

function quitterGenerique(ou) {
  generique.actif = false;
  confettis.length = 0;
  audio.arreterMusique(ou === 'menu' ? 1.2 : 0.6);
  if (ou === 'base') { entrerHub(false); return; }
  retourAuMenu();
  /* Les confettis du menu suivent le generique sans coupure : on ne remet pas
     le drapeau a faux, ils viennent d'etre vus. */
  confettisMenuVus = true;
  lancerConfettis(70, true);
}

function validerGenerique() {
  if (generique.t < GENERIQUE.reprise) {
    // Avant la reprise, il n'y a rien a valider : on passe au remerciement.
    generique.t = GENERIQUE.reprise;
    audio.bruit('menu');
    return;
  }
  audio.bruit('valider');
  quitterGenerique(generique.choix === 1 ? 'base' : 'menu');
}

function deplacerGenerique(pas) {
  if (generique.t < GENERIQUE.reprise) return;
  generique.choix = (generique.choix + pas + 2) % 2;
  audio.bruit('menu');
}

/* -----------------------------------------------------------------------------
   RENDU
-------------------------------------------------------------------------- */

function dessinerGenerique() {
  // Un fond sombre, avec une lueur qui respire : ni noir plat, ni decor.
  const g = ctx.createRadialGradient(LARGEUR / 2, HAUTEUR / 2, 30,
                                     LARGEUR / 2, HAUTEUR / 2, 360);
  g.addColorStop(0, '#141a2a');
  g.addColorStop(1, '#07090f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

  const c = carteCourante();
  if (c) {
    const debut = generique.t - c.t;
    const fin = finDeCarte(c) - generique.t;
    // Fondu d'entree et de sortie : deux categories ne se croisent jamais.
    const a = Math.min(1, debut / GENERIQUE.fondu, Math.max(0, fin) / GENERIQUE.fondu);
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    dessinerCarteGenerique(c, debut);
    ctx.restore();
  }

  dessinerConfettis();

  // Le rappel de sortie, discret, seulement avant la reprise.
  if (generique.t < GENERIQUE.reprise) {
    ctx.font = '9px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fillText('Espace pour aller à la fin', LARGEUR - 12, HAUTEUR - 12);
    ctx.textAlign = 'left';
  }
}

/* ATTENTION AU NOM. Cette fonction s'est d'abord appelee `dessinerCarte` — et
   il en existe deja une dans js/hub.js, celle de la carte des missions. Les
   fichiers sont des scripts classiques : la derniere definition chargee gagne,
   hub.js est charge apres celui-ci, et le generique dessinait donc la CARTE DES
   MISSIONS a la place de chacune de ses categories. Aucune erreur, aucune
   trace : juste le mauvais ecran, huit fois de suite.

   D'ou le suffixe. Il n'est pas decoratif : dans un projet sans modules, deux
   fonctions de meme nom sont une seule fonction. */
function dessinerCarteGenerique(c, age) {
  switch (c.genre) {
    case 'titre':         return carteTitre();
    case 'voix':          return carteVoix(c, age);
    case 'bestiaire':     return carteBestiaire(c);
    case 'statistiques':  return carteStatistiques(c);
    case 'mention':       return carteMention(c);
    case 'merci':         return carteMerci(age);
    default:              return carteSimple(c, age);
  }
}

/* La mise en page commune des cartes a texte. Trois nombres, et tout le
   generique s'aligne dessus. */
const Y_TITRE = 134;
const Y_NOMS = 200;
const PAS_NOM = 32;

/* La carte ordinaire : un titre en petit, les noms en grand dessous. Quand
   `intervalle` est pose, les noms arrivent un a un et le titre reste. */
function carteSimple(c, age) {
  const noms = c.noms || [];
  const visibles = c.intervalle
    ? Math.min(noms.length, Math.floor(age / c.intervalle) + 1)
    : noms.length;

  ctx.textAlign = 'center';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(232,182,44,.85)';
  ctx.fillText(c.titre, LARGEUR / 2, Y_TITRE);

  // Un filet sous le titre : il separe la categorie de ce qu'elle nomme.
  ctx.fillStyle = 'rgba(232,182,44,.28)';
  ctx.fillRect(LARGEUR / 2 - 46, Y_TITRE + 8, 92, 1);

  /* Le bloc de noms est CENTRE sous le titre, quel qu'en soit le nombre. Le
     calcul precedent partait d'une ligne fixe et remontait de treize pixels par
     nom : a trois noms — « Propulsé par » — le premier venait se coller au
     filet du titre. Ici le bloc s'ecarte de part et d'autre de Y_NOMS. */
  const depart = Y_NOMS - (visibles - 1) * (PAS_NOM / 2);
  for (let i = 0; i < visibles; i++) {
    /* Chaque nom monte de quelques pixels en apparaissant. C'est ce qui rend
       lisible le « un a la fois » de la carte « Propulsé par » : sans ce
       mouvement, on ne verrait pas lequel vient d'arriver. */
    const arrivee = c.intervalle ? age - i * c.intervalle : age;
    const p = Math.min(1, Math.max(0, arrivee / 0.5));
    ctx.save();
    ctx.globalAlpha *= p;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = '#f2f3f8';
    ctx.fillText(noms[i], LARGEUR / 2, depart + i * PAS_NOM + (1 - p) * 8);
    ctx.restore();
  }
  ctx.textAlign = 'left';
}

function carteTitre() {
  ctx.textAlign = 'center';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillStyle = '#f2f3f8';
  ctx.fillText('BRAD BITT', LARGEUR / 2, 152);
  ctx.font = 'italic 17px system-ui, sans-serif';
  ctx.fillStyle = '#e8b62c';
  ctx.fillText('mais le jeu', LARGEUR / 2, 180);

  /* LES DEUX STUDIOS EN TOUTES LETTRES, PAS EN LOGOS.

     Les logos ont ete essayes ici. Ils ne tiennent pas : celui d'IMAGINe fait
     802 x 323, il est fait pour occuper trois cents pixels de large — c'est
     ainsi que l'ecran de demarrage l'affiche — et reduit a la moitie pour tenir
     a cote de l'autre, son texte se reduit a un code-barre illisible. Celui de
     HwR est carre : a largeur egale il ecrase le premier, a hauteur egale il
     disparait.

     Ils ont deja leur ecran, en grand, au lancement du jeu, et les deux studios
     ont chacun leur categorie dans ce generique. Ici, deux mots suffisent. */
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.fillText('IMAGINe Studio', LARGEUR / 2 - 74, 226);
  ctx.fillText('HwR Engine', LARGEUR / 2 + 74, 226);
  ctx.fillStyle = 'rgba(232,182,44,.6)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('×', LARGEUR / 2, 226);

  ctx.font = '10px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.fillText('février 2027', LARGEUR / 2, 250);
  ctx.textAlign = 'left';
}

/* Le repere de 1 min 09. Brad est a l'ecran, en grand, et il dit quelque
   chose : c'est le seul moment du generique ou l'on revoit un personnage. */
function carteVoix(c, age) {
  ctx.textAlign = 'center';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(232,182,44,.85)';
  ctx.fillText(c.titre, LARGEUR / 2, 96);
  ctx.fillStyle = 'rgba(232,182,44,.28)';
  ctx.fillRect(LARGEUR / 2 - 46, 104, 92, 1);

  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = '#f2f3f8';
  ctx.fillText((c.noms || [''])[0], LARGEUR / 2, 136);
  ctx.textAlign = 'left';

  // Brad, en grand, au centre.
  const bas = 268;
  const flotte = Math.sin(age * 2) * 2;
  ctx.save();
  ctx.translate(LARGEUR / 2, bas + flotte);
  ctx.scale(2.2, 2.2);
  dessinerPlancheBrad(0, 0, 1, 1,
    { ligne: BRAD_PLANCHE.repos, colonne: Math.floor(age / 0.28) % 4 });
  ctx.restore();

  // Sa replique, apres une seconde : le temps qu'on le voie arriver.
  if (age < 1.2) return;
  const texte = 'Bon. On rentre.';
  ctx.font = '13px system-ui, sans-serif';
  const w = ctx.measureText(texte).width + 26;
  const bx = LARGEUR / 2 + 40, by = 176;
  ctx.fillStyle = 'rgba(9,11,20,.9)';
  ctx.fillRect(bx, by, w, 26);
  ctx.strokeStyle = 'rgba(232,182,44,.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + .5, by + .5, w - 1, 25);
  ctx.beginPath();
  ctx.moveTo(bx, by + 20); ctx.lineTo(bx - 9, by + 30); ctx.lineTo(bx + 12, by + 26);
  ctx.closePath();
  ctx.fillStyle = 'rgba(9,11,20,.9)';
  ctx.fill();
  ctx.fillStyle = '#e6e8f0';
  ctx.fillText(texte, bx + 13, by + 17);
}

/* Le bestiaire : tout ce que Brad a croise, en une grille. Statique, comme le
   reste du generique — on regarde, on ne suit pas. */
const BESTIAIRE = [
  ['Serra', 'Serra'], ['Serra-Boost', 'Boost'], ['Serra-Lourd', 'Lourd'],
  ['Serra-Lanceur', 'Lanceur'], ['Serra-Volant', 'Volant'], ['Serra-Samba', 'Samba'],
  ['Serra-Glacon', 'Glaçon'], ['Serra-Spectre', 'Spectre'], ['Serra-Garde', 'Garde'],
  ['Serra-Colosse', 'Colosse'], ['Serra-Seraphin', 'Séraphin'],
  ['Serra-Balistique', 'Balistique'],
];

function carteBestiaire(c) {
  ctx.textAlign = 'center';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(232,182,44,.85)';
  ctx.fillText(c.titre, LARGEUR / 2, 76);
  ctx.fillStyle = 'rgba(232,182,44,.28)';
  ctx.fillRect(LARGEUR / 2 - 46, 84, 92, 1);

  const COLS = 6, PAS_X = 92, PAS_Y = 108;
  const x0 = LARGEUR / 2 - ((COLS - 1) * PAS_X) / 2;
  BESTIAIRE.forEach(([type, nom], i) => {
    const t = TYPES_ENNEMI[type];
    if (!t) return;
    const img = sprites[t.sprite || type];
    const cx = x0 + (i % COLS) * PAS_X;
    const cy = 158 + Math.floor(i / COLS) * PAS_Y;
    if (img) {
      const ech = Math.min(1, 44 / img.height) * (t.echelle && t.echelle < 1.6 ? 1 : 0.7);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(ech, ech);
      const source = t.teinte ? teinter(img, t.teinte) : img;
      ctx.drawImage(source, -img.width / 2, -img.height);
      ctx.restore();
    }
    ctx.font = '9px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.62)';
    ctx.fillText(nom, cx, cy + 14);
  });
  ctx.textAlign = 'left';
}

/* Les chiffres de CETTE partie. C'est la seule carte du generique qui ne soit
   pas la meme pour tout le monde, et c'est pour ça qu'elle vaut la peine. */
function carteStatistiques(c) {
  ctx.textAlign = 'center';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(232,182,44,.85)';
  ctx.fillText(c.titre, LARGEUR / 2, 92);
  ctx.fillStyle = 'rgba(232,182,44,.28)';
  ctx.fillRect(LARGEUR / 2 - 46, 100, 92, 1);
  ctx.textAlign = 'left';

  const d = DIFFICULTES.find(x => x.cle === partie.difficulte);
  const uniformes = UNIFORMES.filter(u => uniformeDebloque(u)).length;
  const lignes = [
    ['Temps de jeu', dureeLisible(partie.tempsJoue)],
    ['Serra éliminés', String(partie.ennemisTotal)],
    /* CUMULES, pas les porte-monnaie : une partie ou l'on a tout depense en
       boutique reste une partie ou l'on a beaucoup ramasse. */
    ['Brad Coins gagnés', String(partie.piecesGagnees || 0)],
    ['Brad Coins secrets trouvés', String(partie.secretsTrouves || 0)],
    ['Uniformes débloqués', uniformes + ' / ' + UNIFORMES.length],
    ['Meilleur score à l\'arcade', String(partie.meilleurArcade)],
    ['Difficulté', d ? d.nom : partie.difficulte],
  ];

  const x = LARGEUR / 2 - 130;
  let y = 132;
  for (const [gauche, droite] of lignes) {
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillText(gauche, x, y);
    ctx.textAlign = 'right';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = '#f2f3f8';
    ctx.fillText(droite, x + 260, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fillRect(x, y + 5, 260, 1);
    y += 24;
  }
}

function carteMention(c) {
  ctx.textAlign = 'center';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(232,182,44,.85)';
  ctx.fillText(c.titre, LARGEUR / 2, 128);
  ctx.fillStyle = 'rgba(232,182,44,.28)';
  ctx.fillRect(LARGEUR / 2 - 46, 136, 92, 1);

  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.82)';
  let ligne = '';
  let y = 172;
  const large = 420;
  for (const mot of MENTION_IA.split(' ')) {
    const essai = ligne ? ligne + ' ' + mot : mot;
    if (ctx.measureText(essai).width > large && ligne) {
      ctx.fillText(ligne, LARGEUR / 2, y);
      y += 20;
      ligne = mot;
    } else ligne = essai;
  }
  if (ligne) ctx.fillText(ligne, LARGEUR / 2, y);
  ctx.textAlign = 'left';
}

/* La derniere carte. Elle ne s'efface pas : elle tient jusqu'au bout de la
   musique, avec les deux sorties et le temps qui reste. */
function carteMerci(age) {
  ctx.textAlign = 'center';
  const battement = 1 + Math.sin(age * 1.6) * 0.012;
  ctx.save();
  ctx.translate(LARGEUR / 2, 122);
  ctx.scale(battement, battement);
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillStyle = '#e8b62c';
  ctx.fillText('MERCI D\'AVOIR JOUÉ', 0, 0);
  ctx.restore();

  ctx.font = 'italic 12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.fillText('Brad Bitt reviendra. En kart, paraît-il.', LARGEUR / 2, 152);
  ctx.textAlign = 'left';

  const choix = [
    { nom: 'Menu principal', ou: 'menu' },
    { nom: 'Retour à la base', ou: 'base' },
  ];
  const l = 168, h = 36;
  const x0 = LARGEUR / 2 - l - 8;
  choix.forEach((e, i) => {
    const x = x0 + i * (l + 16), y = 206;
    const survol = souris.survol && souris.survol.action === 'generique' &&
                   souris.survol.valeur === i;
    if (survol && souris.bouge && generique.choix !== i) generique.choix = i;
    const actif = generique.choix === i;
    ctx.fillStyle = actif ? 'rgba(232,182,44,.18)' : 'rgba(255,255,255,.05)';
    ctx.fillRect(x, y, l, h);
    if (actif) { ctx.fillStyle = '#e8b62c'; ctx.fillRect(x, y, 3, h); }
    ctx.font = (actif ? 'bold ' : '') + '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = actif ? '#ffe9a8' : 'rgba(255,255,255,.75)';
    ctx.fillText(e.nom, x + l / 2, y + 23);
    ctx.textAlign = 'left';
    zone(x, y, l, h, 'generique', i);
  });

  /* Le decompte. Il n'est pas la pour presser le joueur mais pour lui dire que
     l'ecran ne restera pas ouvert indefiniment — sans quoi un jeu qui bascule
     tout seul au menu passerait pour un plantage. */
  const reste = Math.max(0, generique.duree - generique.t);
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,.32)';
  ctx.fillText('Retour au menu dans ' + Math.ceil(reste) + ' s',
               LARGEUR / 2, 266);
  ctx.textAlign = 'left';
}
