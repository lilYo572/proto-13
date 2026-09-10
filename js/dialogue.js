/* =============================================================================
   BRAD BITT, MAIS LE JEU — dialogues

   Une boite de texte en bas d'ecran, un nom d'interlocuteur, un effet machine
   a ecrire, et un clic pour avancer. Le premier clic termine la ligne en
   cours plutot que de la sauter : c'est la convention que tout le monde
   connait, et elle evite de rater une replique en cliquant trop vite.

   Un dialogue est un simple tableau :
     [{ qui: 'brad', texte: '…', fond: 'ciel' }, …]
   `fond` est optionnel et change l'illustration derriere la boite.
   ========================================================================== */
'use strict';

const VITESSE_TEXTE = 42;        // caracteres par seconde

const PARLEURS = {
  brad:      { nom: 'BRAD BITT',   couleur: '#e8b62c' },
  braddy:    { nom: 'BRADDY3000',  couleur: '#6fd0e8' },
  narrateur: { nom: '',            couleur: '#9aa0bb' },
  kirby:     { nom: 'KIRBY 67',    couleur: '#e2553b' },
};

const dialogue = {
  lignes: [],
  index: 0,
  reveles: 0,        // caracteres affiches
  fini: false,
  suite: null,       // fonction appelee a la fin
  fond: 'ciel',
  surHub: false,     // joue par-dessus la base, avec Brad et le BRADDY3000 visibles
};

function lancerDialogue(lignes, suite) {
  dialogue.lignes = lignes;
  dialogue.index = 0;
  dialogue.reveles = 0;
  dialogue.fini = false;
  dialogue.suite = suite || null;
  dialogue.fond = lignes[0] && lignes[0].fond ? lignes[0].fond : 'ciel';
  // Un dialogue « sur le hub » se joue dans le decor de la base : on voit Brad,
  // on voit le BRADDY3000, et la camera se tourne vers ce dont il parle.
  dialogue.surHub = !!(lignes[0] && lignes[0].surHub);
  // Une bulle du BRADDY3000 encore ouverte se superposerait a la boite de
  // texte : deux repliques a la fois, illisible.
  hub.reponse = '';
  hub.reponseT = 0;
  hub.reponseAge = 0;
  scene = 'dialogue';
}

/* De combien la base est remontee pendant un dialogue joue devant elle. Sans
   ce decalage, le sol du hub tombe derriere la boite de texte et on ne voit
   plus ni Brad ni le robot — or c'est justement ce qu'on veut montrer. */
const REMONTEE_HUB = 62;

function ligneCourante() { return dialogue.lignes[dialogue.index] || null; }

function majDialogue(dt) {
  const l = ligneCourante();
  if (!l) return;
  if (dialogue.reveles < l.texte.length) {
    dialogue.reveles = Math.min(l.texte.length, dialogue.reveles + VITESSE_TEXTE * dt);
  }

  if (!dialogue.surHub) return;
  // La base continue de vivre pendant qu'on parle.
  hub.t += dt;
  hub.braddy.phase += dt;
  if (hub.brad) { hub.brad.phaseRepos += dt; hub.brad.inactif += dt; }

  // La camera se tourne vers le poste dont il est question. Montrer la chose
  // en meme temps qu'on en parle vaut mieux que de la decrire.
  const poste = l.regarde ? POSTES.find(p => p.cle === l.regarde) : null;
  const cible = poste ? poste.x - LARGEUR / 2
                      : (hub.brad ? hub.brad.x + hub.brad.w / 2 - LARGEUR / 2 : camHub.x);
  camHub.x += (cible - camHub.x) * Math.min(1, 2.2 * dt);
  camHub.x = Math.max(0, Math.min(HUB_L - LARGEUR, camHub.x));

  /* Les deux interlocuteurs suivent la visite. Le robot flotte a gauche de ce
     qu'il montre, Brad marche derriere lui : la camera peut ainsi se tourner
     vers n'importe quel poste sans jamais laisser la scene vide. */
  if (hub.brad) {
    const ancre = camHub.x + LARGEUR * 0.42;
    const suivi = Math.min(1, 1.8 * dt);
    hub.braddy.x += (ancre - hub.braddy.x) * suivi;
    const versBrad = ancre - 78 - hub.brad.w / 2;
    const avant = hub.brad.x;
    hub.brad.x += (versBrad - hub.brad.x) * suivi;
    hub.brad.x = Math.max(40, Math.min(HUB_L - 62, hub.brad.x));
    // Brad marche vraiment : le cycle de pas s'indexe sur la distance, jamais
    // sur le temps, sinon il pedale sur place.
    const pas = hub.brad.x - avant;
    if (Math.abs(pas) > 0.05) {
      hub.brad.sens = pas > 0 ? 1 : -1;
      hub.brad.phaseMarche += Math.abs(pas) / LONGUEUR_PAS;
      hub.brad.inactif = 0;
    }
  }
}

/* Avance : d'abord completer la ligne, puis passer a la suivante. */
function avancerDialogue() {
  const l = ligneCourante();
  if (!l) return;
  if (dialogue.reveles < l.texte.length) {
    dialogue.reveles = l.texte.length;
    return;
  }
  dialogue.index++;
  dialogue.reveles = 0;
  const suivante = ligneCourante();
  if (!suivante) {
    dialogue.fini = true;
    const f = dialogue.suite;
    dialogue.suite = null;
    if (f) f();
    return;
  }
  if (suivante.fond) dialogue.fond = suivante.fond;
  if (suivante.surHub !== undefined) dialogue.surHub = !!suivante.surHub;
  audio.bruit('menu');
}

function passerDialogue() {
  dialogue.index = dialogue.lignes.length;
  dialogue.reveles = 0;
  dialogue.fini = true;
  const f = dialogue.suite;
  dialogue.suite = null;
  audio.bruit('menu');
  if (f) f();
}

/* -----------------------------------------------------------------------------
   RENDU
-------------------------------------------------------------------------- */

/* Illustrations de fond. Dessinees en primitives : produire des vraies images
   pour une intro qui sera reecrite serait du travail jete. */
function fondDialogue(nom) {
  const t = performance.now() / 1000;

  if (nom === 'ciel') {
    const g = ctx.createLinearGradient(0, 0, 0, HAUTEUR);
    g.addColorStop(0, '#28406e'); g.addColorStop(1, '#8ea7c4');
    ctx.fillStyle = g; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
    // toits d'une ville tranquille, en contre-jour
    ctx.fillStyle = '#2a3350';
    for (let i = 0; i < 9; i++) {
      const h = 34 + ((i * 37) % 46);
      ctx.fillRect(i * 76 - 20, 232 - h, 62, h + 40);
      ctx.fillStyle = 'rgba(232,182,44,.18)';
      for (let f = 0; f < 3; f++) ctx.fillRect(i * 76 - 8 + f * 18, 240 - h + 8, 8, 9);
      ctx.fillStyle = '#2a3350';
    }
    ctx.fillStyle = '#1b2136'; ctx.fillRect(0, 272, LARGEUR, HAUTEUR - 272);
    ctx.fillStyle = '#232a44'; ctx.fillRect(0, 272, LARGEUR, 4);
    return;
  }

  if (nom === 'telephone') {
    ctx.fillStyle = '#12161f'; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
    // un ecran de telephone, en gros, au centre
    const w = 150, h = 210, x = (LARGEUR - w) / 2, y = 24;
    ctx.fillStyle = '#0a0d14'; ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
    ctx.fillStyle = '#1d2740'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(111,208,232,' + (0.5 + 0.5 * Math.sin(t * 3)).toFixed(2) + ')';
    ctx.fillRect(x + 12, y + 26, w - 24, 34);
    ctx.font = '9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0a0d14';
    ctx.fillText('1 NOUVEAU MESSAGE', x + w / 2, y + 47);
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.fillRect(x + 12, y + 76, w - 24, 6);
    ctx.fillRect(x + 12, y + 92, w - 60, 6);
    ctx.textAlign = 'left';
    return;
  }

  if (nom === 'portail') {
    ctx.fillStyle = '#0a0714'; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
    // spirale de teleportation
    ctx.save();
    ctx.translate(LARGEUR / 2, 150);
    for (let i = 8; i > 0; i--) {
      const r = i * 17 + Math.sin(t * 2 + i) * 4;
      ctx.strokeStyle = 'rgba(' + (140 - i * 8) + ',' + (60 + i * 14) + ',220,' + (0.15 + i * 0.05).toFixed(2) + ')';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, r, t * (i % 2 ? 1 : -1) + i, t * (i % 2 ? 1 : -1) + i + 4.4);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (nom === 'complexe') {
    const g = ctx.createLinearGradient(0, 0, 0, HAUTEUR);
    g.addColorStop(0, '#0f1520'); g.addColorStop(1, '#1d2a2c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    for (let i = 0; i < 10; i++) ctx.fillRect(i * 68 + 10, 0, 14, HAUTEUR);
    // debris de telecommande au sol
    ctx.fillStyle = '#2a3140'; ctx.fillRect(LARGEUR / 2 - 26, 236, 52, 12);
    ctx.fillStyle = '#e2553b'; ctx.fillRect(LARGEUR / 2 - 18, 240, 6, 4);
    ctx.fillStyle = '#1a1f28';
    ctx.fillRect(LARGEUR / 2 + 12, 244, 18, 5);
    ctx.fillRect(LARGEUR / 2 - 42, 246, 12, 4);
    return;
  }

  /* LA FUSEE, sur son pas de tir improvise derriere la base. Dessinee en
     primitives comme les autres fonds : une illustration de plus pour une
     cinematique de sept repliques ne se justifie pas, et une fusee est
     exactement le genre de forme que trois rectangles suffisent a raconter. */
  if (nom === 'fusee') {
    const g = ctx.createLinearGradient(0, 0, 0, HAUTEUR);
    g.addColorStop(0, '#101a2e'); g.addColorStop(1, '#3a3448');
    ctx.fillStyle = g; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

    // Quelques etoiles : on est dehors, et il fait nuit.
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 97) % LARGEUR, sy = (i * 53) % 150;
      ctx.fillRect(sx, sy, 1, 1);
    }

    const cx = LARGEUR / 2 + 40, base = 270;
    // Portique
    ctx.fillStyle = '#2a2f3e';
    ctx.fillRect(cx - 62, base - 150, 8, 150);
    for (let k = 0; k < 5; k++) ctx.fillRect(cx - 62, base - 140 + k * 28, 30, 4);
    // Corps
    ctx.fillStyle = '#c9cede';
    ctx.fillRect(cx - 17, base - 132, 34, 132);
    ctx.fillStyle = '#8f96a8';
    ctx.fillRect(cx + 6, base - 132, 11, 132);
    // Coiffe
    ctx.fillStyle = '#d8483c';
    ctx.beginPath();
    ctx.moveTo(cx - 17, base - 132); ctx.lineTo(cx, base - 176);
    ctx.lineTo(cx + 17, base - 132); ctx.closePath(); ctx.fill();
    // Ailerons
    ctx.fillStyle = '#d8483c';
    ctx.beginPath();
    ctx.moveTo(cx - 17, base - 34); ctx.lineTo(cx - 34, base); ctx.lineTo(cx - 17, base);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 17, base - 34); ctx.lineTo(cx + 34, base); ctx.lineTo(cx + 17, base);
    ctx.closePath(); ctx.fill();
    // Hublot, et une bande de peinture faite a la main
    ctx.fillStyle = '#6fd0e8';
    ctx.beginPath(); ctx.arc(cx - 3, base - 104, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8b62c';
    ctx.fillRect(cx - 17, base - 66, 34, 5);
    // Vapeur au pied
    ctx.fillStyle = 'rgba(220,230,255,.16)';
    for (let k = 0; k < 6; k++) {
      const r = 12 + ((k * 17) % 22) + Math.sin(t * 2 + k) * 3;
      ctx.beginPath(); ctx.arc(cx - 46 + k * 22, base + 6, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#20242f';
    ctx.fillRect(0, base, LARGEUR, HAUTEUR - base);
    return;
  }

  /* LA LUNE, vue depuis le hublot. Le meme gris que le decor du niveau 9 :
     l'annonce et l'arrivee doivent montrer le meme endroit. */
  if (nom === 'lune') {
    ctx.fillStyle = '#03050d'; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    for (let i = 0; i < 70; i++) {
      const sx = (i * 131) % LARGEUR, sy = (i * 79) % HAUTEUR;
      ctx.fillRect(sx, sy, 1, 1);
    }
    // Le disque, en bas a droite, plus gros que l'ecran ne le laisse voir.
    const lx = LARGEUR * 0.62, ly = 300, lr = 150;
    ctx.fillStyle = '#7a8296';
    ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#646c80';
    for (let k = 0; k < 12; k++) {
      const a = k * 1.9, d = (k % 4) * 32 + 22;
      const px = lx + Math.cos(a) * d, py = ly + Math.sin(a) * d * 0.8;
      if (py > ly - lr + 10) {
        ctx.beginPath(); ctx.arc(px, py, 8 + (k % 3) * 6, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.fillStyle = 'rgba(4,6,14,.35)';
    ctx.beginPath(); ctx.arc(lx + 46, ly - 16, lr, 0, Math.PI * 2); ctx.fill();
    // La fusee, minuscule, qui traverse.
    const fx = 90 + ((t * 26) % (LARGEUR + 120)) - 60;
    ctx.fillStyle = '#e6e8f0';
    ctx.fillRect(Math.round(fx), 116, 12, 4);
    ctx.fillStyle = '#d8483c';
    ctx.fillRect(Math.round(fx) + 12, 116, 4, 4);
    ctx.fillStyle = 'rgba(255,180,90,.6)';
    ctx.fillRect(Math.round(fx) - 9, 117, 9, 2);
    return;
  }

  /* -----------------------------------------------------------------------
     LES FONDS DE L'ACTE FINAL

     Cinq images, toutes en primitives comme les precedentes. Elles racontent
     une suite : la grille du manoir, le trone brise, le manoir qui saute, la
     faille ouverte sur le monde reel, et Lille sous la pluie. Chacune reprend
     une couleur de la precedente pour que l'enchainement se lise comme un
     mouvement et non comme cinq ecrans.
  -------------------------------------------------------------------------- */

  if (nom === 'grille-manoir') {
    const g = ctx.createLinearGradient(0, 0, 0, HAUTEUR);
    g.addColorStop(0, '#131a34'); g.addColorStop(1, '#4a4058');
    ctx.fillStyle = g; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
    // La facade au fond, toutes fenetres allumees
    ctx.fillStyle = '#241f36';
    ctx.fillRect(96, 74, 448, 200);
    ctx.beginPath();
    ctx.moveTo(84, 74); ctx.lineTo(160, 34); ctx.lineTo(480, 34); ctx.lineTo(556, 74);
    ctx.closePath(); ctx.fill();
    for (let r = 0; r < 3; r++) {
      for (let k = 0; k < 9; k++) {
        ctx.fillStyle = 'rgba(255,214,140,' + (0.3 + 0.14 * Math.sin(t * 0.6 + k + r)).toFixed(2) + ')';
        ctx.fillRect(118 + k * 48, 92 + r * 58, 22, 40);
      }
    }
    // La grille en fer forge, au premier plan
    ctx.fillStyle = '#0d1020';
    ctx.fillRect(0, 250, LARGEUR, HAUTEUR - 250);
    ctx.strokeStyle = 'rgba(226,180,90,.7)';
    ctx.lineWidth = 3;
    for (let k = 0; k < 22; k++) {
      const x = 8 + k * 30;
      ctx.beginPath(); ctx.moveTo(x, 300); ctx.lineTo(x, 150); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, 146, 4, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 196); ctx.lineTo(LARGEUR, 196); ctx.stroke();
    return;
  }

  if (nom === 'trone-brise') {
    const g = ctx.createLinearGradient(0, 0, 0, HAUTEUR);
    g.addColorStop(0, '#2c2030'); g.addColorStop(1, '#5a4144');
    ctx.fillStyle = g; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
    // Les colonnes, penchees
    for (let k = 0; k < 5; k++) {
      const x = 40 + k * 140;
      ctx.save();
      ctx.translate(x, 300);
      ctx.rotate((k % 2 ? 1 : -1) * 0.05);
      ctx.fillStyle = 'rgba(246,238,220,.14)';
      ctx.fillRect(-16, -250, 32, 250);
      ctx.restore();
    }
    // Le trone renverse, au centre
    ctx.save();
    ctx.translate(LARGEUR / 2, 268);
    ctx.rotate(0.3);
    ctx.fillStyle = 'rgba(122,26,38,.75)';
    ctx.fillRect(-40, -76, 80, 76);
    ctx.fillStyle = 'rgba(226,180,90,.65)';
    ctx.fillRect(-44, -82, 88, 8);
    ctx.restore();
    // Poussiere en suspension
    ctx.fillStyle = 'rgba(255,236,190,.20)';
    for (let k = 0; k < 40; k++) {
      const px = (k * 137) % LARGEUR;
      const py = 120 + ((k * 61 + t * 22) % 180);
      ctx.fillRect(px, py, 2, 2);
    }
    ctx.fillStyle = '#241c22'; ctx.fillRect(0, 296, LARGEUR, HAUTEUR - 296);
    return;
  }

  if (nom === 'manoir-explose') {
    ctx.fillStyle = '#160d10'; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
    // Le champignon de feu
    const cx = LARGEUR / 2, cy = 210;
    for (const [r, c] of [[190, 'rgba(120,40,20,.5)'], [140, 'rgba(206,86,32,.6)'],
                          [96, 'rgba(240,150,50,.75)'], [54, 'rgba(255,226,150,.9)']]) {
      const rr = r * (0.9 + 0.1 * Math.sin(t * 3 + r));
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.fill();
    }
    // Les debris qui montent
    ctx.fillStyle = 'rgba(30,22,20,.9)';
    for (let k = 0; k < 26; k++) {
      const a = k * 0.72;
      const d = 120 + ((k * 43 + t * 90) % 210);
      ctx.save();
      ctx.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7 - 30);
      ctx.rotate(a + t * 2);
      ctx.fillRect(-5, -3, 10, 6);
      ctx.restore();
    }
    // La silhouette du portail au loin, deja ouverte
    ctx.strokeStyle = 'rgba(180,120,255,.65)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(548, 150, 26, 52, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#100a0c'; ctx.fillRect(0, 300, LARGEUR, HAUTEUR - 300);
    return;
  }

  if (nom === 'faille-lille') {
    ctx.fillStyle = '#0a0714'; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
    // La faille : une fente verticale qui s'ouvre sur un ciel gris
    const l = 96 + 22 * Math.sin(t * 1.6);
    const g = ctx.createLinearGradient(LARGEUR / 2 - l, 0, LARGEUR / 2 + l, 0);
    g.addColorStop(0, 'rgba(150,80,240,0)');
    g.addColorStop(0.35, 'rgba(150,80,240,.55)');
    g.addColorStop(0.5, 'rgba(210,220,235,.95)');
    g.addColorStop(0.65, 'rgba(150,80,240,.55)');
    g.addColorStop(1, 'rgba(150,80,240,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(LARGEUR / 2, 10);
    ctx.lineTo(LARGEUR / 2 + l, 180);
    ctx.lineTo(LARGEUR / 2, 350);
    ctx.lineTo(LARGEUR / 2 - l, 180);
    ctx.closePath();
    ctx.fill();
    // Ce qu'on apercoit dedans : un beffroi et des toits de brique
    ctx.fillStyle = 'rgba(88,54,48,.75)';
    ctx.fillRect(LARGEUR / 2 - 14, 130, 28, 120);
    ctx.beginPath();
    ctx.moveTo(LARGEUR / 2 - 18, 130); ctx.lineTo(LARGEUR / 2, 96);
    ctx.lineTo(LARGEUR / 2 + 18, 130); ctx.closePath(); ctx.fill();
    // Des eclats violets qui tournent autour
    ctx.fillStyle = 'rgba(190,140,255,.6)';
    for (let k = 0; k < 14; k++) {
      const a = k * 0.9 + t * 1.1;
      const d = 130 + (k % 4) * 26;
      ctx.fillRect(Math.round(LARGEUR / 2 + Math.cos(a) * d),
                   Math.round(180 + Math.sin(a) * d * 0.55), 3, 3);
    }
    return;
  }

  if (nom === 'lille') {
    const g = ctx.createLinearGradient(0, 0, 0, HAUTEUR);
    g.addColorStop(0, '#3d4356'); g.addColorStop(1, '#8d8478');
    ctx.fillStyle = g; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
    // La Grand-Place : facades a pignons, brique et pierre
    for (let k = 0; k < 9; k++) {
      const x = k * 74 - 20;
      const h = 120 + ((k * 37) % 4) * 22;
      ctx.fillStyle = k % 2 ? '#6d4a3e' : '#7d6350';
      ctx.fillRect(x, 280 - h, 66, h + 40);
      // Le pignon a redents, la signature du coin
      ctx.beginPath();
      for (let m = 0; m < 4; m++) {
        ctx.rect(x + 8 + m * 6, 280 - h - 8 - m * 7, 50 - m * 12, 8 + m * 7);
      }
      ctx.fill();
      ctx.fillStyle = 'rgba(255,226,170,.35)';
      for (let r = 0; r < 3; r++) {
        for (let c2 = 0; c2 < 3; c2++) {
          ctx.fillRect(x + 10 + c2 * 18, 280 - h + 18 + r * 34, 11, 20);
        }
      }
    }
    // Le beffroi, plus haut que tout
    ctx.fillStyle = '#5d4a44';
    ctx.fillRect(430, 40, 46, 250);
    ctx.beginPath();
    ctx.moveTo(424, 40); ctx.lineTo(453, -8); ctx.lineTo(482, 40);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,226,170,.5)';
    ctx.fillRect(444, 70, 18, 24);
    // Le pave mouille, et la pluie
    ctx.fillStyle = '#4a4740'; ctx.fillRect(0, 296, LARGEUR, HAUTEUR - 296);
    ctx.fillStyle = 'rgba(255,255,255,.10)';
    ctx.fillRect(0, 296, LARGEUR, 3);
    ctx.strokeStyle = 'rgba(200,214,235,.35)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 70; k++) {
      const px = (k * 173 + t * 190) % (LARGEUR + 60) - 30;
      const py = (k * 97 + t * 460) % HAUTEUR;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 3, py + 11); ctx.stroke();
    }
    return;
  }

  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
}

function dessinerDialogue() {
  if (dialogue.surHub) {
    // Le bas de l'ecran appartient a la boite de texte : on remonte toute la
    // base pour que le sol, Brad et le robot restent au-dessus d'elle.
    ctx.fillStyle = '#232839';
    ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
    ctx.save();
    ctx.translate(0, -REMONTEE_HUB);
    dessinerHub();
    ctx.restore();
    // Un voile leger : le decor reste lisible mais passe derriere le texte.
    ctx.fillStyle = 'rgba(9,11,20,.42)';
    ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  } else {
    fondDialogue(dialogue.fond);
  }

  const l = ligneCourante();
  if (!l) return;
  const p = PARLEURS[l.qui] || PARLEURS.narrateur;

  // Boite de texte
  const bx = 34, bh = 92, by = HAUTEUR - bh - 20, bw = LARGEUR - bx * 2;
  ctx.fillStyle = 'rgba(9,11,20,.9)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = 'rgba(232,182,44,.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);

  // Etiquette du parleur
  if (p.nom) {
    ctx.font = 'bold 11px system-ui, sans-serif';
    const l2 = ctx.measureText(p.nom).width + 16;
    ctx.fillStyle = 'rgba(9,11,20,.95)';
    ctx.fillRect(bx + 12, by - 10, l2, 19);
    ctx.strokeStyle = 'rgba(232,182,44,.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 12.5, by - 9.5, l2 - 1, 18);
    ctx.fillStyle = p.couleur;
    ctx.fillText(p.nom, bx + 20, by + 3);
  }

  // Texte, coupe en lignes et revele progressivement
  const visible = l.texte.slice(0, Math.floor(dialogue.reveles));
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#e6e8f0';
  const largeurMax = bw - 36;
  let ligne = '';
  let y = by + 30;
  for (const mot of visible.split(' ')) {
    const essai = ligne ? ligne + ' ' + mot : mot;
    if (ctx.measureText(essai).width > largeurMax && ligne) {
      ctx.fillText(ligne, bx + 18, y);
      y += 17;
      ligne = mot;
    } else {
      ligne = essai;
    }
  }
  if (ligne) ctx.fillText(ligne, bx + 18, y);

  // Curseur « continuer », une fois la ligne finie
  if (dialogue.reveles >= l.texte.length) {
    const c = Math.sin(performance.now() / 260) > 0 ? 1 : 0.35;
    ctx.globalAlpha = c;
    ctx.fillStyle = '#e8b62c';
    const fx = bx + bw - 22, fy = by + bh - 18;
    ctx.beginPath();
    ctx.moveTo(fx, fy); ctx.lineTo(fx + 9, fy); ctx.lineTo(fx + 4.5, fy + 6);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ATTENTION A L'ORDRE. zoneSousSouris() parcourt la pile a l'envers, donc la
  // DERNIERE zone enregistree gagne. Le rectangle plein ecran doit donc etre
  // pose EN PREMIER, sinon il recouvre le bouton « Passer » et l'avale.
  zone(0, 0, LARGEUR, HAUTEUR, 'avancer-dialogue');

  /* « Passer » se pose JUSTE AU-DESSUS de la boite de texte, pas dans le coin
     haut-droit. Le bouton HTML « ⚙ Réglages » est en position fixe dans ce
     coin, par-dessus le canvas : un clic y atterrissait sur lui et jamais sur
     « Passer ». C'est la vraie cause du bouton qui ne repondait pas. */
  const px = bx + bw - 80, py = by - 32, pw = 78, ph = 22;
  const survol = souris.survol && souris.survol.action === 'passer-dialogue';
  ctx.fillStyle = survol ? 'rgba(255,255,255,.2)' : 'rgba(9,11,20,.7)';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = survol ? 'rgba(232,182,44,.7)' : 'rgba(255,255,255,.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + .5, py + .5, pw - 1, ph - 1);
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = survol ? '#ffe9a8' : 'rgba(255,255,255,.7)';
  ctx.fillText('Passer  ▸▸', px + pw / 2, py + 15);

  // Le compteur se pose a GAUCHE du bouton, sur la meme ligne : pose au-dessus
  // de la boite comme avant, il finissait sous « Passer ».
  ctx.font = '9px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,.32)';
  ctx.fillText((dialogue.index + 1) + ' / ' + dialogue.lignes.length, px - 10, py + 15);
  ctx.textAlign = 'left';

  zone(px, py, pw, ph, 'passer-dialogue');
}

/* -----------------------------------------------------------------------------
   SCRIPTS
-------------------------------------------------------------------------- */

/* Ouverture du jeu. La version retenue dans les notes : Brad reçoit une
   notification, s'y rend, et casse la telecommande a l'atterrissage. */
const DIALOGUE_INTRO = [
  { qui: 'narrateur', fond: 'ciel',
    texte: 'Un mardi. Brad Bitt sort les poubelles, comme tous les mardis. Le quartier est calme. Trop calme, diront certains. Personne, en fait.' },
  { qui: 'brad', fond: 'ciel',
    texte: 'Voilà. Poubelles sorties. Journée productive.' },
  { qui: 'narrateur', fond: 'telephone',
    texte: 'Son téléphone vibre.' },
  { qui: 'braddy', fond: 'telephone',
    texte: 'BONJOUR BRAD. C\'EST MOI. LE BRADDY3000. J\'AI RETROUVÉ KIRBY 67. Il est dans le monde parallèle et il a commencé quelque chose de très moche.' },
  { qui: 'brad', fond: 'telephone',
    texte: 'Le monde parallèle ? Celui où je l\'avais justement envoyé pour qu\'il arrête d\'être un problème ?' },
  { qui: 'braddy', fond: 'telephone',
    texte: 'CELUI-LÀ MÊME. Il l\'a pris. Entièrement. Il appelle ça « un monde au Serrano ». Tout le monde y est heureux. C\'est le problème.' },
  { qui: 'brad', fond: 'telephone',
    texte: 'J\'arrive. Envoie les coordonnées.' },
  { qui: 'braddy', fond: 'portail',
    texte: 'ENVOYÉES. J\'AI PRÉPARÉ UNE TÉLÉCOMMANDE DE RETOUR. Ne la casse pas. Je le précise parce que statistiquement, tu vas la casser.' },
  { qui: 'brad', fond: 'portail',
    texte: 'Je ne casse jamais rien.' },
  { qui: 'narrateur', fond: 'complexe',
    texte: 'Brad Bitt atterrit dans le monde parallèle. La télécommande de retour atterrit trois mètres plus loin, en quatre morceaux.' },
  { qui: 'brad', fond: 'complexe',
    texte: '…' },
  { qui: 'braddy', fond: 'complexe',
    texte: 'JE NE DIRAI RIEN.' },
  { qui: 'brad', fond: 'complexe',
    texte: 'Bon. On fait comme d\'habitude, alors. Je traverse, je tape ce qui bouge, et je rentre à pied.' },
  { qui: 'braddy', fond: 'complexe',
    texte: 'C\'EST EXACTEMENT COMME ÇA QUE ÇA S\'EST PASSÉ LES TROIS FOIS PRÉCÉDENTES. Bonne chance, Brad.' },
];

/* Arrivee au hub, apres le niveau d'introduction.

   Ce dialogue-la se joue DANS la base : on voit Brad, on voit le BRADDY3000
   flotter, et la camera se tourne vers chaque poste au moment ou il en parle.
   Decrire un comptoir pendant qu'on le regarde vaut mieux que de le decrire
   sur fond noir. */
const DIALOGUE_HUB = [
  { qui: 'braddy', surHub: true,
    texte: 'BRAD. J\'AI TROUVÉ UN ABRI. Une vieille station du complexe, oubliée par tout le monde, Kirby 67 compris. J\'y ai monté une base.' },
  { qui: 'brad', surHub: true,
    texte: 'Tu as monté une base. En quarante minutes.' },
  { qui: 'braddy', surHub: true,
    texte: 'J\'AI EU LE TEMPS.' },

  { qui: 'braddy', surHub: true, regarde: 'boutique',
    texte: 'Là, c\'est la boutique. C\'est moi. Tes Brad Coins s\'y échangent contre de la vie, des dégâts, de la résistance. Ça monte à chaque palier, alors garde-en.' },
  { qui: 'braddy', surHub: true, regarde: 'vestiaire',
    texte: 'Là, le vestiaire. C\'est aussi moi. Les uniformes sont GRATUITS — ils se débloquent quand tu accomplis des choses.' },
  { qui: 'brad', surHub: true, regarde: 'vestiaire',
    texte: 'Donc je ne choisis jamais entre être fort et être beau.' },
  { qui: 'braddy', surHub: true, regarde: 'vestiaire',
    texte: 'EXACT. J\'AI RÉFLÉCHI À LA QUESTION PENDANT QUARANTE MINUTES.' },

  { qui: 'braddy', surHub: true, regarde: 'entrainement',
    texte: 'Le camp d\'entraînement. Les Serra y reviennent en boucle et rien n\'y rapporte quoi que ce soit. C\'est volontaire : on s\'y exerce, on n\'y travaille pas.' },
  { qui: 'braddy', surHub: true, regarde: 'arcade',
    texte: 'La borne, je l\'ai réparée parce que je m\'ennuyais. Trois parties par jour. Ne discute pas, c\'est moi qui compte.' },

  { qui: 'braddy', surHub: true, regarde: 'carte',
    texte: 'Et au fond, la carte. Dix niveaux avant de retrouver Kirby 67. Enfin, dix en théorie. Je n\'ai pas vérifié.' },
  { qui: 'brad', surHub: true, regarde: 'carte',
    texte: 'Tu n\'as jamais rien vérifié.' },
  { qui: 'braddy', surHub: true,
    texte: 'ET POURTANT NOUS VOILÀ. Vas-y quand tu veux, Brad. Je reste ici. Je n\'ai pas de jambes.' },
];

/* -----------------------------------------------------------------------------
   LA CINEMATIQUE DE LA FUSEE

   Elle se joue UNE FOIS, juste avant le premier depart pour le niveau 9, et
   nulle part ailleurs — ni au retour, ni en rejouant le niveau, ni depuis le
   panneau de teleportation. Le drapeau `partie.fusee` s'en charge.

   Pourquoi elle existe. La derniere piece de l'appareil est annoncee depuis le
   niveau 3 comme etant « loin, tres loin — il faudra une fusee ». Passer de la
   carte de la base a un sol lunaire sans un mot ferait de ce voyage un simple
   changement de decor. Sept repliques suffisent a en faire un depart.

   Elle est courte, et l'on peut la passer : une cinematique qu'on subit une
   seconde fois est une cinematique de trop.
-------------------------------------------------------------------------- */

const DIALOGUE_FUSEE = [
  { qui: 'braddy', fond: 'fusee',
    texte: 'BRAD. VIENS DERRIÈRE LA BASE. J\'AI CONSTRUIT QUELQUE CHOSE.' },
  { qui: 'brad', fond: 'fusee',
    texte: 'C\'est une fusée.' },
  { qui: 'braddy', fond: 'fusee',
    texte: 'C\'EST UNE FUSÉE. La dernière pièce de l\'appareil n\'est pas sur cette planète. Elle est sur la lune. La lune de ce monde-ci, pas la nôtre — je précise, parce que la différence va compter.' },
  { qui: 'brad', fond: 'fusee',
    texte: 'Et elle compte comment, exactement ?' },
  { qui: 'braddy', fond: 'lune',
    texte: 'ELLE PÈSE MOINS. Tu sauteras deux fois plus haut et tu retomberas deux fois plus lentement. Ce n\'est pas un cadeau : tout le reste tombe aussi lentement que toi.' },
  { qui: 'brad', fond: 'lune',
    texte: 'Tout le reste, c\'est-à-dire.' },
  { qui: 'braddy', fond: 'lune',
    texte: 'DES CAILLOUX. Beaucoup. Le champ d\'astéroïdes bombarde la face nord en permanence. Reste loin de ce qui est marqué au sol — ou fais-y venir quelqu\'un d\'autre. Je te laisse choisir, tu es adulte.' },
  { qui: 'brad', fond: 'lune',
    texte: 'Tu m\'envoies sur une lune bombardée pour aller chercher un appareil à raclette.' },
  { qui: 'braddy', fond: 'lune',
    texte: 'JE T\'ENVOIE SUR UNE LUNE BOMBARDÉE POUR ALLER CHERCHER LA DERNIÈRE PIÈCE. L\'appareil à raclette n\'est qu\'un moyen. Bon vol, Brad. Ne casse pas la fusée. Je le précise parce que statistiquement…' },
  { qui: 'brad', fond: 'lune',
    texte: 'Oui. J\'ai compris. J\'y vais.' },
];

/* =============================================================================
   L'ACTE FINAL — QUATRE CINEMATIQUES

   Elles se suivent dans cet ordre, et chacune a un declencheur precis :

     1. DIALOGUE_MANOIR    au lancement du niveau 10, une seule fois
     2. DIALOGUE_EXPLOSION quand Kirby 67 tombe au manoir (js/boss.js)
     3. DIALOGUE_PORTAIL   quand Brad accepte de franchir le portail de la base
     4. DIALOGUE_FINAL     a l'ouverture du combat final (js/final.js)

   Toutes sont courtes et passables. Une cinematique qu'on subit une seconde
   fois est une cinematique de trop — c'est deja la regle de celle de la fusee.
-------------------------------------------------------------------------- */

const DIALOGUE_MANOIR = [
  { qui: 'narrateur', fond: 'grille-manoir',
    texte: 'Les trois pièces réunies, le BRADDY3000 a calculé une position. Elle tombait sur un manoir. Un vrai, avec une grille en fer forgé et un parc.' },
  { qui: 'brad', fond: 'grille-manoir',
    texte: 'Il vit ici ? Depuis le début ?' },
  { qui: 'braddy', fond: 'grille-manoir',
    texte: 'DEPUIS LE DÉBUT. Pendant que tu traversais une discothèque, une lune et un complexe nucléaire, il faisait tailler ses ifs.' },
  { qui: 'brad', fond: 'grille-manoir',
    texte: 'Toutes les fenêtres sont allumées.' },
  { qui: 'braddy', fond: 'grille-manoir',
    texte: 'IL T\'ATTEND. Sa garde aussi — ce sont des Serra, mais en livrée : plus de vie, plus de dégâts, et beaucoup moins d\'humour. Ne les prends pas de haut.' },
  { qui: 'brad', fond: 'grille-manoir',
    texte: 'Je ne prends jamais personne de haut. Je saute dessus, c\'est différent.' },
];

const DIALOGUE_EXPLOSION = [
  { qui: 'narrateur', fond: 'trone-brise',
    texte: 'Kirby 67 tombe à genoux au milieu de sa salle du trône. Le silence dure une seconde et demie.' },
  { qui: 'kirby', fond: 'trone-brise',
    texte: 'Bien. Vraiment. Tu es meilleur que la dernière fois.' },
  { qui: 'brad', fond: 'trone-brise',
    texte: 'Reste au sol.' },
  { qui: 'kirby', fond: 'trone-brise',
    texte: 'Non. Vois-tu, ce monde-ci, je l\'ai déjà fini. Il est au serrano d\'un bout à l\'autre. Ce qui m\'intéresse maintenant, c\'est le tien.' },
  { qui: 'narrateur', fond: 'manoir-explose',
    texte: 'Il claque des doigts. Le manoir saute. Quarante et une vitrines, deux cents mètres de tapis rouge et un jardin à la française partent en même temps.' },
  { qui: 'braddy', fond: 'manoir-explose',
    texte: 'BRAD. IL A OUVERT UNE FAILLE. Il ne fuit pas — il PASSE. De l\'autre côté, c\'est chez nous.' },
  { qui: 'kirby', fond: 'faille-lille',
    texte: 'Lille. Grand-Place. J\'y serai dans quatre minutes. Prends ton temps, surtout.' },
  { qui: 'brad', fond: 'faille-lille',
    texte: '…Pourquoi Lille ?' },
  { qui: 'braddy', fond: 'faille-lille',
    texte: 'PARCE QUE C\'EST LÀ QUE TU AS GRANDI, BRAD. Il ne choisit jamais une ville au hasard. Rentre à la base. Prends tout ce que tu peux prendre. Cette fois, il n\'y aura pas de suivante.' },
];

const DIALOGUE_PORTAIL = [
  { qui: 'braddy', fond: 'faille-lille',
    texte: 'PORTAIL STABLE. Je le tiens ouvert quatre-vingt-dix secondes, et je n\'aurai pas de deuxième essai.' },
  { qui: 'brad', fond: 'faille-lille',
    texte: 'Tu restes ici ?' },
  { qui: 'braddy', fond: 'faille-lille',
    texte: 'JE N\'AI PAS DE JAMBES, BRAD. Mais je te parle dans l\'oreille, et je compte. C\'est ce que je fais de mieux.' },
  { qui: 'braddy', fond: 'lille',
    texte: 'Une dernière chose. Là-bas, tes poings ne lui feront rien. RIEN. La seule chose qui l\'atteindra, c\'est ton Brad-Shy — concentré, chargé à bloc, tiré à bout portant.' },
  { qui: 'brad', fond: 'lille',
    texte: 'Et je le charge comment ?' },
  { qui: 'braddy', fond: 'lille',
    texte: 'COMME TOUJOURS : en tapant sur ce qui bouge. Il t\'enverra des Serra. Ce sont tes munitions. Trois décharges au but, et c\'est fini.' },
  { qui: 'kirby', fond: 'lille',
    texte: 'Tu as mis onze minutes. J\'ai eu le temps de visiter. C\'est charmant, chez toi.' },
];

const DIALOGUE_VICTOIRE = [
  { qui: 'narrateur', fond: 'lille',
    texte: 'La troisième décharge le prend de plein fouet. Kirby 67 recule de trois pas, regarde ses mains, et s\'assoit sur le pavé mouillé.' },
  { qui: 'kirby', fond: 'lille',
    texte: 'Bon. D\'accord. Celui-là, je te le laisse.' },
  { qui: 'brad', fond: 'lille',
    texte: 'Tu disais ça la dernière fois.' },
  { qui: 'kirby', fond: 'lille',
    texte: 'Oui. Mais cette fois je suis fatigué. Ce n\'est pas pareil.' },
  { qui: 'braddy', fond: 'lille',
    texte: 'LA FAILLE SE REFERME. Brad — nous avons un appareil à raclette, un poêlon, de la garniture, et plus personne à combattre.' },
  { qui: 'brad', fond: 'lille',
    texte: '…' },
  { qui: 'brad', fond: 'lille',
    texte: 'Alors on fait une raclette.' },
  { qui: 'braddy', fond: 'lille',
    texte: 'JE N\'AI PAS DE BOUCHE. Mais je tiendrai le tableau des parts. Personne ne me l\'a demandé.' },
  { qui: 'narrateur', fond: 'lille',
    texte: 'FIN. Enfin — fin de ce jeu-là. Il paraît qu\'il y en a un autre, avec des karts.' },
];

/* -----------------------------------------------------------------------------
   REPLIQUES DU BRADDY3000

   Deux usages : quand on lui parle dans la base (touche E ou clic), et quand
   on rentre d'un niveau. Elles changent selon l'avancement — un compagnon qui
   dit la meme chose au bout de dix niveaux cesse d'etre un compagnon.
-------------------------------------------------------------------------- */

function auHasard(liste) { return liste[Math.floor(Math.random() * liste.length)]; }

/* Une remarque propre au niveau qu'on vient de quitter. Elle passe avant les
   repliques generiques une fois sur deux : entendre « encore un niveau
   derriere nous » en sortant d'une boite de nuit bresilienne serait un
   gaspillage. La cle est l'identifiant du niveau, pas son rang, pour que
   l'ordre puisse changer sans casser le texte. */
const REPLIQUES_PAR_NIVEAU = {
  'niveau4': [
    'Une discothèque. Au Brésil. Je note « piste sérieuse » dans le tableau, sans y croire.',
    'Ces dalles étaient une infraction à peu près à tout. Tu as bien fait de ne pas t\'arrêter.',
    'J\'ai analysé la musique là-bas. Quatre accords. Répétés neuf cents fois. C\'était très efficace.',
  ],
  'niveau5': [
    'Moins vingt et du verglas. Ta cravate en laine était le bon choix. Pour une fois.',
    'Le froid ralentit le Serrano. Il ralentit aussi Brad Bitt, mais ne retenons que la première moitié.',
    'Tu as glissé sept fois. Je n\'ai pas compté, mais j\'aime la précision, alors : sept.',
  ],
  'niveau6': [
    'Un manoir hanté avec du fromage au grenier. Je ne discute plus la logique de cette aventure.',
    'Le grand volant s\'est divisé trois fois et tu l\'as retrouvé trois fois. Je suis presque ému.',
    'J\'ai compté les portraits. Quarante et un. Aucun ne représente quelqu\'un de sympathique.',
  ],
  /* Attention a la NUMEROTATION. Ces trois repliques parlaient du complexe et
     etaient rangees sous 'niveau7' : depuis que le complexe est le huitieme
     niveau et que Paris occupe le septieme, les laisser la ferait commenter
     des lasers au retour d'une promenade sur les toits. */
  'niveau7': [
    'Paris. Les vrais toits, la vraie tour, et des Serra dessus. Je ne commente pas.',
    'Tu as marché sur du zinc pendant vingt minutes. C\'est plus parisien que tout le reste.',
    'J\'ai compté onze cheminées identiques. Kirby 67 a copié-collé un quartier entier.',
  ],
  'niveau8': [
    'Un complexe scientifique. Personne dedans. Les lasers, eux, travaillaient encore.',
    'J\'ai lu les écrans en passant. C\'était des tableurs. Des tableurs partout.',
    'Le tokamak pulse toutes les sept secondes. Je le sais parce que je n\'ai pas pu m\'en empêcher.',
    'Une chambre de confinement magnétique, dans un monde au Serrano. Quelqu\'un, là-bas, a de l\'ambition.',
  ],
  'niveau10': [
    'Un manoir. Un vrai. Avec un parc. Pendant que tu traversais une lune.',
    'Quarante et une vitrines de serrano. J\'ai compté pendant que ça explosait.',
    'Il s\'est relevé. Ils se relèvent toujours. C\'est très agaçant.',
  ],
  'niveau9': [
    'Tu es allé sur la lune. Je tiens à le noter, parce que personne d\'autre ne le fera.',
    'La gravité y était à 55 %. Tes sauts étaient magnifiques. Tes atterrissages, moins.',
    'Le champ d\'astéroïdes n\'a pas cessé une seconde. Il ne cessera pas. C\'est son travail.',
    'Tu as fait tomber un caillou de trois tonnes sur quelqu\'un. Je note « résolution créative ».',
  ],
};

/* Ce qu'il dit quand on rentre de mission. */
function repliqueRetourNiveau() {
  const propres = REPLIQUES_PAR_NIVEAU[niveauCourant];
  if (propres && Math.random() < 0.5) return auHasard(propres);

  const n = partie.termines.length;
  const communes = [
    'Bien. Nous nous rapprochons de Kirby 67. Du moins en théorie.',
    'Encore un niveau derrière nous. Je tiens un tableau. Personne ne me l\'a demandé.',
    'Tu es rentré entier. Statistiquement, c\'était l\'issue la moins probable.',
    'J\'ai calculé ton itinéraire optimal pendant que tu jouais. Tu n\'as suivi aucune de mes recommandations.',
    'Le Serrano recule. Lentement. Comme une marée, mais en plus gras.',
  ];
  if (n <= 1) {
    return auHasard(communes.concat([
      'Premier niveau bouclé. Il en reste neuf. Ou dix. J\'ai perdu le compte.',
      'Passe à la boutique. Tu vas en avoir besoin, et moi j\'ai besoin de compagnie.',
    ]));
  }
  if (n < 5) {
    return auHasard(communes.concat([
      'Kirby 67 a forcément remarqué. Il n\'est pas malin, mais il est observateur.',
      'À ce rythme, on y sera pour février. Février de quelle année, je ne me prononce pas.',
    ]));
  }
  return auHasard(communes.concat([
    'La moitié du chemin. C\'est le moment où, dans les films, quelque chose tourne mal.',
    'J\'ai un mauvais pressentiment. Ou une surchauffe. Les deux se ressemblent beaucoup.',
  ]));
}

/* Ce qu'il dit quand on sort du camp d'entrainement. */
function repliqueSortieEntrainement() {
  return auHasard([
    'Bel entraînement. Aucune récompense, comme prévu. C\'est ce qui en fait un entraînement.',
    'Tu as tapé sur des Serra qui reviennent toujours. C\'est très sain. Ne le fais pas trop longtemps.',
    'J\'ai compté tes coups. Je ne te dirai pas combien tu en as raté.',
    'Les Serra du camp ne t\'en veulent pas. Ils n\'ont pas d\'opinion, en fait.',
  ]);
}

/* Ce qu'il dit quand Brad lui parle dans la base. */
function repliqueBraddy() {
  const n = partie.termines.length;
  const paliers = typeof paliersAchetes === 'function' ? paliersAchetes() : 0;

  const conseils = [];
  if (partie.pieces >= 30) {
    conseils.push('Tu as de quoi acheter quelque chose. Ça me ferait plaisir. Enfin, ça ferait quelque chose.');
  }
  if (paliers === 0) {
    conseils.push('Un conseil : la barre de vie en premier. Mourir coûte plus cher que tout le reste.');
  }
  if (partie.ameliorations.degats === 0 && paliers > 0) {
    conseils.push('Les dégâts, c\'est ce qui raccourcit les combats. Et les combats courts, c\'est moins de coups reçus.');
  }
  if (partie.entrainements === 0) {
    conseils.push('Le camp d\'entraînement ne rapporte rien. C\'est exactement pour ça qu\'il est utile.');
  }
  if (partie.meilleurArcade === 0) {
    conseils.push('Essaie la borne. Cent points valent un Brad Coin. Ce n\'est pas beaucoup, mais c\'est honnête.');
  }
  conseils.push('N\'oublie pas : tu peux marcher sur la tête du Serra-Lourd. Il déteste ça. Enfin je suppose.');
  conseils.push('Le Lanceur est blindé. Renvoie-lui sa boule. C\'est de la poésie, techniquement.');

  /* Conseils sur les mecaniques recentes, donnes seulement une fois le niveau
     qui les introduit devenu accessible : les servir plus tot serait du
     bavardage sur quelque chose que le joueur n'a pas encore vu. */
  if (typeof niveauDebloque === 'function' && niveauDebloque('niveau4')) {
    conseils.push('Les dalles de la piste lâchent une demi-seconde après que tu poses le pied dessus. Elles reviennent. Toi aussi, j\'espère.');
    conseils.push('Le Serra-Samba s\'arrête une demi-seconde sur deux. Compte le temps, puis passe. C\'est de la musique, au fond.');
  }
  if (typeof niveauDebloque === 'function' && niveauDebloque('niveau5')) {
    conseils.push('Sur la glace, freine deux tuiles avant le bord. J\'ai mis ces deux tuiles là exprès. De rien.');
    conseils.push('Le Serra-Glaçon patine autant que toi. Laisse-le te dépasser : il mettra un moment à revenir.');
  }
  if (typeof niveauDebloque === 'function' && niveauDebloque('niveau6')) {
    conseils.push('Le Séraphin encaisse presque tout. Attends qu\'il se divise : c\'est là qu\'il devient frappable.');
    conseils.push('Quand il se divise, le vrai est montré une seconde et demie. Ne cligne pas des yeux.');
    conseils.push('Frappe-le et il te fond dessus. C\'est agaçant, mais c\'est prévisible — donc esquivable.');
    conseils.push('Les Spectres sont verts. Les copies sont violettes. Si tu retiens ça, tu as gagné la moitié du combat.');
  }
  if (typeof niveauDebloque === 'function' && niveauDebloque('niveau8')) {
    conseils.push('Les barrières hautes s\'attendent, les basses se sautent. Regarde où elles s\'arrêtent.');
    conseils.push('Le voyant est vert avant que la barrière ne s\'éteigne. C\'est ton feu de circulation.');
  }
  if (typeof niveauDebloque === 'function' && niveauDebloque('niveau9')) {
    conseils.push('Sur la lune, freine plus tôt. Tu tombes lentement, mais tu tombes quand même.');
    conseils.push('Le Balistique encaisse tout ce que tu lui donnes. Ce n\'est pas toi qui dois le frapper.');
    conseils.push('Le cercle au sol se pose là où TU es. Reste dedans, laisse-le venir, écarte-toi.');
    conseils.push('Un astéroïde ne touche que ce qui est près du sol. Sauter est une esquive — et il reste dessous.');
    conseils.push('Quand il est assommé, sa coque ne compte plus. Tu as trois secondes, pas quatre.');
  }
  if (typeof niveauDebloque === 'function' && niveauDebloque('niveau10')) {
    conseils.push('Sa garde est en livrée : trois fois la vie d\'un Serra ordinaire. Un saut sur la tête reste un saut sur la tête.');
    conseils.push('Le Garde-Lourd ne s\'écrase pas. Contourne-le, ne le pousse pas.');
    conseils.push('Kirby 67 garde ses distances et roule des meules. Une meule se brise d\'un coup de poing.');
    conseils.push('Quand il claque des doigts, ne frappe pas : attends la fin du geste.');
  }
  if (partie.manoirFait && !partie.finalGagne) {
    conseils.push('Le portail est au fond de la base. Il n\'y a pas de boutique de l\'autre côté — je le répète parce que c\'est important.');
    conseils.push('Là-bas, tes poings ne lui feront rien. Seule l\'onde chargée à bloc compte, et de près.');
    conseils.push('Ses Serra sont tes munitions. Ce n\'est pas une image : c\'est en les abattant que la jauge monte.');
  }

  const absurdes = [
    'J\'ai rêvé cette nuit. Je ne dors pas, donc c\'est inquiétant.',
    'Est-ce que le Serrano est un fromage ? J\'ai passé trois heures dessus. Toujours pas de réponse.',
    'Si tu m\'écoutes assez longtemps, je finirai par dire quelque chose d\'utile. Statistiquement.',
    'J\'ai renommé mes fichiers internes en « truc_1 » à « truc_9000 ». Je le regrette déjà.',
    'Tu savais que j\'ai un mode furtif ? Il ne marche pas. Mais il existe.',
    'Ta cravate est réglementaire. J\'ai vérifié le règlement. Je l\'ai aussi écrit.',
    'Kirby 67 a un plan. J\'ai un tableur. Nous ne jouons pas dans la même catégorie.',
    'Parfois je me demande ce qu\'il y a derrière le mur du fond. Puis je me souviens que je l\'ai peint.',
    'On m\'a construit pour trier du courrier. Regarde où j\'en suis.',
  ];

  if (n >= 2) {
    absurdes.push('Deux niveaux. Je commence à croire que tu vas y arriver. Ne me déçois pas, j\'ai peu de sentiments et je les investis mal.');
  }
  if (n >= 5) {
    absurdes.push('À mi-parcours, les héros doutent. Toi tu manges. C\'est une approche.');
  }
  if (partie.uniforme === 'dore') {
    absurdes.push('Ce costume doré te va bien. Il te rend légèrement insupportable, mais il te va bien.');
  }

  /* Le fil rouge : l'appareil a raclette. Il en parle differemment selon ce
     qu'on a deja rapporte, et il en parle SOUVENT quand une piece vient
     d'arriver — c'est la seule chose qui fasse avancer l'histoire, il serait
     absurde qu'il l'evoque aussi rarement qu'une blague sur sa cravate. */
  conseils.push(...repliquesObjets());

  // Deux fois sur trois un conseil, une fois sur trois n'importe quoi.
  return Math.random() < 0.66 ? auHasard(conseils) : auHasard(absurdes);
}

/* -----------------------------------------------------------------------------
   L'APPAREIL A RACLETTE

   Trois pieces, trois boss, tous les trois niveaux. Le BRADDY3000 est le seul
   personnage a savoir pourquoi on les cherche : c'est donc lui qui porte
   l'histoire, replique par replique.
-------------------------------------------------------------------------- */

function repliquesObjets() {
  const n = objetsTrouves();

  if (n === 0) {
    return [
      'J\'ai une piste pour Kirby 67. Elle est ridicule. Elle implique une raclette.',
      'Kirby 67 ne répond à aucun appel. Mais il n\'a jamais résisté à une odeur de fromage fondu. C\'est documenté.',
      'Trois pièces : un poêlon, de quoi le remplir, et la machine. Réunies, elles le feront sortir de son trou.',
      'Chaque pièce est gardée. Évidemment qu\'elles sont gardées. Rien n\'est jamais posé sur une table.',
    ];
  }

  if (n === 1) {
    return [
      'Un poêlon. Un seul. Je ne vais pas te mentir, il en faudrait huit, mais on fera avec.',
      'La première pièce est là. Il en manque deux : la garniture et la machine. Dans cet ordre, si le monde est bien fait.',
      'Regarde la vitrine si tu doutes de nos progrès. Elle est aux deux tiers vide, mais elle existe.',
      'Le gardien du poêlon se blindait quand il avait peur. Nous avons tous nos méthodes.',
    ];
  }

  if (n === 2) {
    return [
      'Le poêlon et la garniture. Il ne manque que l\'appareil. C\'est-à-dire l\'essentiel.',
      'Deux pièces sur trois. À ce stade, ce n\'est plus un plan, c\'est presque un repas.',
      'La dernière pièce est loin. Très loin. Il faudra une fusée, et je préfère t\'en parler plus tard.',
    ];
  }

  return [
    'Les trois pièces sont là. Je peux calculer la position de Kirby 67. Enfin — je peux essayer, et cette fois j\'ai des données.',
    'Poêlon, garniture, appareil. Il va sentir le fromage à des kilomètres. Il viendra. Il vient toujours.',
    'L\'appareil est complet. Le manoir nous attend. Prends une cravate propre.',
  ];
}

/* =============================================================================
   L'ENCHAINEMENT DE L'ACTE FINAL

   Quatre fonctions, une par charniere. Elles sont rassemblees ici plutot que
   dispersees dans boss.js, hub.js et final.js parce que c'est un SCENARIO :
   quand on veut savoir dans quel ordre les choses arrivent, on doit pouvoir le
   lire d'un seul tenant.
-------------------------------------------------------------------------- */

/* 1. On part pour le manoir. Appele depuis la carte, une seule fois. */
function lancerDepartManoir() {
  partie.manoirVu = true;
  enregistrerPartie();
  audio.arreterMusique(0.6);
  lancerDialogue(DIALOGUE_MANOIR, () => preparerNiveau('niveau10'));
}

/* 2. Kirby 67 tombe au manoir. Appele par js/boss.js quand sa vie descend sous
      le seuil d'arret. Le niveau est valide ICI et pas a la porte : il n'y a
      pas de porte a franchir, la cinematique la remplace. */
function lancerFinDuManoir() {
  if (partie.termines.indexOf('niveau10') < 0) partie.termines.push('niveau10');
  partie.manoirFait = true;
  enregistrerPartie();
  lancerDialogue(DIALOGUE_EXPLOSION, () => {
    entrerHub(false);
    braddyDit('Le portail est monté, tout au fond de la base. Il tiendra le temps '
            + 'qu\'il faudra — mais de l\'autre côté, il n\'y a ni boutique ni retour. '
            + 'Dépense tout avant de passer.');
  });
}

/* 3. Brad se presente devant le portail. La question du BRADDY3000 est le
      dernier avertissement du jeu, et elle a un but precis : rappeler qu'il
      reste peut-etre des Brad Coins a depenser. */
function ouvrirPortailFinal() {
  /* Une revanche ne se demande pas deux fois. La grande question — celle qui
     rappelle qu'il reste des Brad Coins a depenser — n'a de sens que la
     premiere fois ; la reposer a chaque rematch la userait. */
  if (partie.finalGagne) {
    demanderConfirmation(
      'Retourner à Lille pour un dernier tour ? Kirby 67 t\'y attend, avec ses '
      + 'trois points de vie et sa mauvaise humeur.',
      () => { audio.arreterMusique(0.6); demarrerCombatFinal(true); });
    return;
  }

  const reste = partie.pieces;
  const rappel = reste >= 30
    ? ' Il te reste ' + reste + ' Brad Coins. De l\'autre côté, ils ne valent plus rien.'
    : '';
  demanderConfirmation(
    'ES-TU SÛR ? Le combat final commence maintenant. Pas de retour à la base, '
    + 'pas de boutique là-bas.' + rappel,
    () => {
      audio.arreterMusique(0.6);
      lancerDialogue(DIALOGUE_PORTAIL, () => demarrerCombatFinal(true));
    });
}

/* 4. Kirby 67 est a terre pour de bon. */
function terminerLeJeu() {
  partie.finalGagne = true;
  /* Le combat final n'est pas un niveau : il ne passe donc jamais par le bilan
     qui ajoute le chrono au temps de jeu. Sans cette ligne, le generique
     raconterait une partie ou le dernier combat n'aurait pas eu lieu. */
  if (typeof finale === 'object' && finale.t > 0) partie.tempsJoue += finale.t;
  enregistrerPartie();
  /* La derniere cinematique, puis le GENERIQUE. On ne repasse pas par la base :
     le joueur y retournera s'il le veut, depuis le generique. Le renvoyer
     d'office a un comptoir de boutique juste apres la fin du jeu serait la
     pire chute possible. */
  lancerDialogue(DIALOGUE_VICTOIRE, lancerGenerique);
}

/* Ce qu'il dit au retour d'un niveau ou une piece vient d'etre ramassee : ça
   prime sur le commentaire de mission habituel, l'evenement est trop gros. */
function repliqueObjetRapporte(cle) {
  const o = OBJETS_MAJEURS.find(x => x.cle === cle);
  if (!o) return null;
  const reste = OBJETS_MAJEURS.length - objetsTrouves();

  if (reste === 0) {
    return 'TU L\'AS. Les trois pièces. Je lance le calcul. Brad — je crois que je sais où il est.';
  }
  return o.prise + ' Encore ' + reste + ' pièce' + (reste > 1 ? 's' : '') + '.';
}
