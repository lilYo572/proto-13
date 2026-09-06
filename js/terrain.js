/* =============================================================================
   BRAD BITT, MAIS LE JEU — terrain particulier

   Deux surfaces qui ne se comportent pas comme du sol ordinaire, et qui sont
   la matiere des niveaux 4 et 5.

   1. LES DALLES QUI SE DEROBENT (`dalles` dans le fichier du niveau)

      Une dalle de piste de danse. Brad s'y pose, elle s'allume, elle craque,
      elle tombe. Elle revient quelques secondes plus tard. On ne traverse donc
      pas un passage de dalles en s'arretant : c'est une epreuve de rythme, pas
      d'adresse.

      Trois precautions, apprises des mecaniques precedentes :

      - Elles sont TRAVERSANTES par le bas, comme les plateformes du meme nom.
        Une dalle qui ferait plafond transformerait un saut mesure en mur
        invisible, et le verificateur de geometrie les compte deja comme non
        bloquantes.
      - Elles REVIENNENT toujours. Aucun enchainement de dalles ne peut donc
        enfermer le joueur : au pire il attend deux secondes et demie.
      - Une dalle qui revient ne pousse jamais Brad. Comme elle n'arrete que
        les chutes, se tenir a l'endroit ou elle reapparait ne fait rien du
        tout — pas d'ecrasement, pas d'ejection dans le decor.

   2. LA GLACE (`glace` dans le fichier du niveau)

      Une bande de surface glissante posee sur un sol existant. Elle ne change
      pas la geometrie — le verificateur n'a rien a en dire — seulement
      l'adherence : Brad met du temps a lancer sa course et bien plus a
      s'arreter. Les sauts se preparent a l'avance.

      La glace est DESSINEE, franchement, avec des reflets : une surface qui
      change la physique sans se voir serait une trahison.

   Declaration, en tuiles :

     dalles: [ [x, y, w], ... ]     w tuiles de large, une dalle par tuile
     glace:  [ [x, y, w], ... ]     y = la rangee de la SURFACE du sol
   ========================================================================== */
'use strict';

let DALLES = [];        // { x, y, w, h, etat, t, chute, lueur }
let GLACE = [];         // { x, y, w }
let LASERS = [];        // { x, y, h, cycle, actif, phase, intensite }

/* -----------------------------------------------------------------------------
   3. LES BARRIERES LASER (niveau 7)

   Un rideau vertical qui s'allume et s'eteint sur un cycle fixe. On passe
   quand il est eteint. C'est une epreuve de patience et de lecture du rythme,
   comme la barre mobile du niveau 2, mais qui ne porte pas : ici il faut
   traverser soi-meme.

   TROIS REGLES, et la premiere n'est pas negociable :

   1. RIEN NE CLIGNOTE. L'intensite monte et descend par une rampe continue de
      trois dixiemes de seconde. Une barriere qui apparaitrait d'un coup serait
      a la fois injuste et dangereuse pour une personne photosensible — c'est
      le meme principe que les fenetres du niveau 2 et le manoir du niveau 6.
   2. Elle est VISIBLE eteinte. Les emetteurs restent dessines, relies par un
      pointille : on sait qu'une barriere dort la avant qu'elle ne s'allume.
   3. Elle BLESSE, elle ne tue pas. Deux points de degats et le recul
      habituel ; jamais une mort instantanee. Un obstacle qui tue au contact
      dans un jeu ou l'on court n'apprend rien, il punit.

   Declaration, en tuiles :

     lasers: [ { x, y, h, cycle, actif, phase } ]

   `cycle` est la duree totale en secondes, `actif` la part allumee, `phase`
   (0 a 1) le decalage au depart.
-------------------------------------------------------------------------- */

const MONTEE_LASER = 0.3;          // duree de la rampe, a l'allumage comme a l'extinction
const SEUIL_DEGATS_LASER = 0.6;    // en dessous, la barriere ne fait rien

function chargerLasers(d) {
  LASERS = (d.lasers || []).map(l => ({
    x: l.x * TUILE, y: l.y * TUILE, h: (l.h || 4) * TUILE,
    cycle: l.cycle || 2.8,
    actif: l.actif || 1.2,
    t: ((l.phase || 0) % 1) * (l.cycle || 2.8),
    intensite: 0,
  }));
}

function majLasers(dt) {
  for (const l of LASERS) {
    l.t = (l.t + dt) % l.cycle;
    // Rampe montante, plateau, rampe descendante — jamais de marche.
    let i;
    if (l.t >= l.actif) i = 0;
    else if (l.t < MONTEE_LASER) i = l.t / MONTEE_LASER;
    else if (l.t > l.actif - MONTEE_LASER) i = Math.max(0, (l.actif - l.t) / MONTEE_LASER);
    else i = 1;
    l.intensite = i;

    if (i < SEUIL_DEGATS_LASER) continue;
    if (brad.invincible > 0 || brad.scenarise > 0) continue;
    if (brad.x + brad.w > l.x - 3 && brad.x < l.x + 6 &&
        brad.y + brad.h > l.y && brad.y < l.y + l.h) {
      blesserBrad(2, l.x + 1, 'une barrière laser');
    }
  }
}

function dessinerLasers() {
  for (const l of LASERS) {
    const x = Math.round(l.x - cam.x);
    const y = Math.round(l.y - cam.y);
    if (x > LARGEUR + 30 || x < -30) continue;

    // Emetteurs : ils restent la, allumee ou non. C'est ce qui rend la
    // barriere previsible.
    ctx.fillStyle = '#5a6376';
    ctx.fillRect(x - 5, y - 8, 12, 9);
    ctx.fillRect(x - 5, y + l.h - 1, 12, 9);
    ctx.fillStyle = '#8d97ad';
    ctx.fillRect(x - 5, y - 8, 12, 2);
    ctx.fillRect(x - 5, y + l.h + 6, 12, 2);

    const i = l.intensite;
    // Voyant : rouge quand ça chauffe, vert quand la voie est libre.
    ctx.fillStyle = i > 0.15 ? 'rgba(240,90,70,' + (0.4 + 0.6 * i).toFixed(2) + ')'
                             : 'rgba(126,224,138,.8)';
    ctx.fillRect(x - 2, y - 6, 6, 5);

    if (i <= 0.02) {
      // Eteinte : un pointille discret, pour ne pas oublier qu'elle existe.
      ctx.fillStyle = 'rgba(240,120,100,.18)';
      for (let k = 4; k < l.h; k += 10) ctx.fillRect(x, y + k, 2, 5);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = i;
    // Halo, puis coeur : un rayon plat serait illisible sur un fond clair.
    const g = ctx.createLinearGradient(x - 7, 0, x + 9, 0);
    g.addColorStop(0, 'rgba(240,80,60,0)');
    g.addColorStop(0.5, 'rgba(255,140,110,.5)');
    g.addColorStop(1, 'rgba(240,80,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 7, y, 16, l.h);
    ctx.fillStyle = 'rgba(255,90,70,.9)';
    ctx.fillRect(x - 1, y, 4, l.h);
    ctx.fillStyle = 'rgba(255,225,215,.95)';
    ctx.fillRect(x, y, 2, l.h);
    ctx.restore();
  }
}

/* Duree pendant laquelle la dalle clignote avant de lacher. Assez courte pour
   qu'on ne s'y installe pas, assez longue pour qu'on ait le temps de repartir
   sans reflexe surhumain : a la vitesse de marche, Brad parcourt 82 px. */
const DELAI_CRAQUE = 0.55;

/* Duree d'absence. Le joueur qui rate son enchainement doit pouvoir
   recommencer sans attendre une eternite, mais assez longtemps pour qu'il ne
   soit pas tentant de rester sur place. */
const DELAI_RETOUR = 2.4;

function chargerTerrain(d) {
  DALLES = [];
  for (const [x, y, w] of (d.dalles || [])) {
    // Une dalle par tuile : c'est ce decoupage qui donne le grain de la
    // mecanique. Declarer « 6 tuiles » et n'en faire qu'un seul bloc rendrait
    // le passage tout ou rien.
    for (let i = 0; i < w; i++) {
      DALLES.push({
        x: (x + i) * TUILE, y: y * TUILE, w: TUILE, h: 8,
        etat: 'intacte', t: 0, chute: 0, lueur: (x + i) * 0.6,
      });
    }
  }
  GLACE = (d.glace || []).map(([x, y, w]) =>
    ({ x: x * TUILE, y: y * TUILE, w: w * TUILE }));
  chargerLasers(d);
}

function majTerrain(dt) {
  majLasers(dt);
  for (const d of DALLES) {
    d.lueur += dt;
    if (d.etat === 'craque') {
      d.t -= dt;
      if (d.t <= 0) {
        d.etat = 'tombee';
        d.t = DELAI_RETOUR;
        d.chute = 0;
        audio.bruit('craque');
      }
    } else if (d.etat === 'tombee') {
      d.chute += dt;
      d.t -= dt;
      if (d.t <= 0) { d.etat = 'intacte'; d.chute = 0; }
    }
  }
}

/* Pose Brad sur une dalle intacte et declenche son compte a rebours. Meme
   regle que les traversantes : uniquement en descente, et seulement s'il
   etait entierement au-dessus a l'image precedente. */
function poserSurDalles(basAvant) {
  if (brad.vy < 0) return false;
  let pose = false;
  for (const d of DALLES) {
    if (d.etat === 'tombee') continue;
    if (!chevauche(brad, d)) continue;
    if (basAvant > d.y + 1) continue;
    brad.y = d.y - brad.h;
    brad.vy = 0;
    pose = true;
    if (d.etat === 'intacte') { d.etat = 'craque'; d.t = DELAI_CRAQUE; }
  }
  return pose;
}

/* Brad est-il sur une bande de glace ? On teste le centre de ses pieds : se
   tenir a moitie sur la glace ne doit pas donner l'adherence du bitume. */
function surGlace() {
  if (!brad.auSol || GLACE.length === 0) return false;
  const ligne = brad.y + brad.h;
  const cx = brad.x + brad.w / 2;
  for (const g of GLACE) {
    if (cx >= g.x && cx <= g.x + g.w && Math.abs(g.y - ligne) < 8) return true;
  }
  return false;
}

/* Meme question pour un ennemi : un Serra sur la glace patine comme Brad. */
function ennemiSurGlace(e) {
  if (!e.auSol || GLACE.length === 0) return false;
  const ligne = e.y + e.h;
  const cx = e.x + e.w / 2;
  for (const g of GLACE) {
    if (cx >= g.x && cx <= g.x + g.w && Math.abs(g.y - ligne) < 8) return true;
  }
  return false;
}

/* -----------------------------------------------------------------------------
   RENDU
-------------------------------------------------------------------------- */

function dessinerGlace() {
  for (const g of GLACE) {
    const x = Math.round(g.x - cam.x);
    const y = Math.round(g.y - cam.y);
    if (x > LARGEUR + 40 || x + g.w < -40) continue;

    /* La glace doit se DISTINGUER du trottoir enneige qui la porte, sinon la
       physique change sans prevenir. On la peint donc franchement : une plaque
       claire, une arete blanche, et une ombre juste en dessous qui la decolle
       du sol. */
    const grad = ctx.createLinearGradient(0, y, 0, y + 11);
    grad.addColorStop(0, 'rgba(214,244,255,.95)');
    grad.addColorStop(0.55, 'rgba(150,206,244,.75)');
    grad.addColorStop(1, 'rgba(96,152,200,.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, g.w, 11);

    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.fillRect(x, y, g.w, 2);
    ctx.fillStyle = 'rgba(40,70,100,.28)';
    ctx.fillRect(x, y + 11, g.w, 2);

    // Bords francs : on voit ou la plaque commence et ou elle s'arrete, ce qui
    // est exactement l'information dont le joueur a besoin pour freiner.
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillRect(x, y, 2, 11);
    ctx.fillRect(x + g.w - 2, y, 2, 11);

    // Reflets obliques, espaces irregulierement pour ne pas faire motif.
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    for (let k = 6; k < g.w - 10; k += 31) {
      const dx = x + k + ((k * 7) % 9);
      ctx.beginPath();
      ctx.moveTo(dx, y + 3);
      ctx.lineTo(dx + 8, y + 3);
      ctx.lineTo(dx + 3, y + 9);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function dessinerDalles() {
  for (const d of DALLES) {
    const x = Math.round(d.x - cam.x);
    if (x > LARGEUR + 40 || x + d.w < -40) continue;

    if (d.etat === 'tombee') {
      // Elle tombe puis disparait. On la garde visible un instant : voir la
      // dalle partir explique la chute bien mieux qu'un trou apparu d'un coup.
      if (d.chute > 0.9) {
        // Fantome de l'emplacement : le joueur sait qu'elle va revenir.
        ctx.strokeStyle = 'rgba(255,255,255,.14)';
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.strokeRect(x + .5, Math.round(d.y - cam.y) + .5, d.w - 1, d.h - 1);
        ctx.setLineDash([]);
        continue;
      }
      const y = Math.round(d.y - cam.y + 620 * d.chute * d.chute);
      ctx.globalAlpha = Math.max(0, 1 - d.chute / 0.9);
      ctx.fillStyle = '#7a3f92';
      ctx.fillRect(x, y, d.w, d.h);
      ctx.globalAlpha = 1;
      continue;
    }

    const y = Math.round(d.y - cam.y);
    const craque = d.etat === 'craque';
    // Clignotement franc pendant le sursis : c'est le seul avertissement.
    const bat = craque ? (Math.sin(d.t * 40) > 0 ? 1 : 0.45) : 1;

    ctx.globalAlpha = bat;
    /* Chaque dalle est dessinee AVEC SON JOINT : deux pixels de vide a droite.
       Sans ce joint, une rangee de dalles adjacentes se lisait comme une seule
       longue barre — et le joueur ne pouvait pas voir qu'elles tombent une par
       une, ce qui est pourtant toute la mecanique. */
    const l = d.w - 2;
    ctx.fillStyle = craque ? '#e8574f' : '#b04fd8';
    ctx.fillRect(x, y, l, d.h);
    ctx.fillStyle = craque ? '#ffb0a0' : '#f0a8ff';
    ctx.fillRect(x, y, l, 2);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(x, y + d.h - 2, l, 2);

    // Neon qui court le long de la dalle quand elle est intacte : la piste de
    // danse doit avoir l'air vivante, pas d'un piege pose la.
    if (!craque) {
      const p = (Math.sin(d.lueur * 2.2) + 1) / 2;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + p * 0.3).toFixed(2) + ')';
      ctx.fillRect(x + 3, y + 3, l - 6, 1);
    }
    ctx.globalAlpha = 1;
  }
}
