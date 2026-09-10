/* =============================================================================
   BRAD BITT, MAIS LE JEU — LE COMBAT FINAL

   Lille, Grand-Place, sous la pluie. Ce fichier est un JEU DANS LE JEU : il ne
   partage avec le reste ni la physique, ni la camera, ni le rendu. C'est
   voulu, et voici pourquoi.

   ---------------------------------------------------------------------------
   1. POURQUOI UNE SCENE A PART, ET PAS UN ONZIEME NIVEAU

   Le moteur du jeu est un plateformer en coupe : on avance en x, on saute en
   y, et la profondeur n'existe pas. Le combat final se joue sur une PLACE — on
   tourne autour de l'adversaire, on s'ecarte d'une meule qui arrive de face,
   on recule. Cela demande une troisieme dimension.

   Plutot que d'ajouter un axe z a un moteur regle depuis quinze prototypes —
   ce qui aurait touche chaque collision, chaque ennemi et chaque niveau
   existant —, cette scene a sa propre simulation, courte et lisible, et son
   propre rendu. Rien de ce qui marche ailleurs ne peut casser ici, et
   reciproquement.

   ---------------------------------------------------------------------------
   2. LA PERSPECTIVE

   Une projection en trou d'epingle, six lignes. La camera est posee derriere
   et au-dessus de la place, elle regarde vers le fond :

       d  = z + DIST_CAM        distance du point a la camera
       k  = FOCALE / d          echelle a cette distance
       sx = LARGEUR/2 + (x - cam) * k
       sy = HORIZON + (HAUTEUR_CAM - y) * k

   Tout en decoule : le sol est un damier dont les lignes se resserrent vers
   l'horizon, les personnages sont des sprites multiplies par `k`, et l'ordre
   de dessin est simplement l'ordre des z decroissants. Aucune bibliotheque,
   aucun WebGL, et la page reste ouvrable par double-clic.

   ---------------------------------------------------------------------------
   3. LES REGLES DU COMBAT

   Kirby 67 a TROIS points de vie, et une seule chose au monde peut les lui
   retirer : une onde de Brad-Shy CHARGEE A BLOC, tiree assez pres. Les poings
   ne lui font rien — le BRADDY3000 le dit avant le combat, et le jeu le repete
   a chaque coup dans le vide.

   La jauge de Brad-Shy se remplit en frappant les Serra que Kirby 67 envoie.
   Ses vagues ne sont donc pas une nuisance ajoutee « pour l'intensite » :
   ce sont les MUNITIONS. Sans elles, on ne peut pas gagner ; avec elles, rester
   en vie devient le probleme. Les deux moities du combat se tiennent.

   A chaque point de vie perdu, il gagne une mecanique de plus, et il peut les
   enchainer :

       3 PV : l'aspiration
       2 PV : + la charge teleguidee
       1 PV : + la pluie de meules

   Les deux premieres ont deja ete vues au manoir, ou elles etaient seules et
   sans danger. C'est la raison d'etre du premier combat.

   ---------------------------------------------------------------------------
   4. LES COMMANDES

   Il n'y a pas de saut ici : on ne saute pas sur une place, on s'ecarte. La
   touche de saut devient donc une ESQUIVE — un bond court, invincible, dans la
   direction ou l'on va. C'est la seule commande qui change, et l'ecran de
   depart la rappelle.

       fleches / ZQSD   se deplacer sur la place (quatre directions)
       Espace / Maj     esquive (invincible, puis un temps de recharge)
       X                frapper — sur les Serra seulement
       C                onde de choc — sur Kirby 67, jauge pleine uniquement
   ========================================================================== */
'use strict';

/* --- La place ------------------------------------------------------------- */

/* LE CADRAGE, ET COMMENT IL A ETE TROUVE

   Ces cinq nombres ne sont pas libres : ils sont lies par ce que l'on veut
   voir. Le sol projete occupe a l'ecran la bande

       sy = F_HORIZON + F_HAUTEUR_CAM * F_FOCALE / (z + F_DIST_CAM)

   entre son bord le plus loin et son bord le plus proche. Le premier reglage
   donnait une bande de cent-cinq pixels tout en bas, surmontee de cent-trente
   pixels de sol vide entre l'horizon et l'arene : les trois quarts de l'image
   ne montraient rien, et les personnages y faisaient trente-huit pixels.

   Ces valeurs-ci placent le fond de la place a 238 et son bord avant a 338 —
   Brad reste toujours dans le cadre, meme colle au bord — et surtout, les
   FACADES sont maintenant posees sur le fond de la place et non sur la ligne
   d'horizon. Ce qui remplissait de vide est devenu la Grand-Place elle-meme. */
const F_ARENE_X = 460;           // demi-largeur jouable, en unites de monde
const F_ARENE_Z = 120;           // demi-profondeur
const F_HORIZON = 96;            // point de fuite a l'ecran
const F_HAUTEUR_CAM = 175;
const F_DIST_CAM = 460;
const F_FOCALE = 470;

/* --- Brad ----------------------------------------------------------------- */

const F_VITESSE = 190;           // px/s lateralement
const F_VITESSE_Z = 130;         // px/s en profondeur (la place est peu profonde)
const F_ACCEL = 1500;
const F_PORTEE_COUP = 46;        // allonge du poing, en x
const F_PORTEE_COUP_Z = 34;      // et en profondeur
const F_RECHARGE_COUP = 0.26;
const F_DUREE_ESQUIVE = 0.26;
const F_VITESSE_ESQUIVE = 470;
const F_REPOS_ESQUIVE = 0.55;
const F_INVINCIBILITE = 1.0;

/* L'onde. `F_PORTEE_ONDE` est la distance a laquelle elle atteint encore
   Kirby 67 : assez large pour ne pas demander un pixel-perfect, assez courte
   pour qu'il faille aller le chercher au lieu de tirer du fond de la place. */
const F_PORTEE_ONDE = 190;
const F_DUREE_ONDE = 0.7;

/* --- Kirby 67 ------------------------------------------------------------- */

const F_PV_KIRBY = 3;
const F_REPOS = [2.4, 1.9, 1.4];         // entre deux attaques, par phase
/* L'ASPIRATION, ET POURQUOI ELLE N'ASPIRE PLUS SI FORT.

   Elle tirait a 260 px/s. Brad court a 190 lateralement : la fuite etait donc
   arithmetiquement impossible, et le bandeau « ÉLOIGNE-TOI » demandait quelque
   chose que le jeu interdisait. Pire, les degats se declenchaient tant que la
   distance restait courte — deux fois par aspiration une fois l'invincibilite
   ecoulee, soit quatre a six points de vie pour une attaque qu'on ne pouvait
   pas eviter.

   A 165 px/s, courir a contresens fait gagner du terrain, lentement : on s'en
   sort en abandonnant tout le reste pendant deux secondes, ce qui est
   exactement le prix qu'une attaque doit couter. L'esquive, elle, la brise d'un
   coup. Et la morsure ne compte qu'UNE FOIS par aspiration.

   Le manoir enseigne deja cette regle : la-bas elle tire a 230 contre 250 de
   course. Les deux combats disent donc la meme chose. */
const F_ASPIRATION = { duree: 1.7, force: 165, degats: 2 };
const F_CHARGE = { preparation: 0.9, vitesse: 520, duree: 0.85, degats: 3 };
const F_PLUIE = { annonce: 1.4, degats: 2, rayon: 40, nombre: [0, 0, 4] };
const F_VAGUES = [
  { nombre: 3, delai: 6.0 },
  { nombre: 4, delai: 5.0 },
  { nombre: 5, delai: 4.2 },
];
const F_PV_MAX_BRAD_BONUS = 4;           // le combat final rend un peu de marge

const finale = {
  actif: false,
  fini: false,
  mort: false,
  t: 0,
  cam: 0,
  secousse: 0,
  message: '',
  messageT: 0,
  banniere: 0,

  brad: null,
  kirby: null,
  sbires: [],
  meules: [],       // les projectiles roulants de Kirby 67
  marques: [],      // {x, z, t} — les impacts annonces de la pluie
  ondes: [],        // {x, z, t}
  prochaineVague: 0,
};

/* --- Entrees propres a la scene ------------------------------------------ */

const entreesFinal = {
  gauche: false, droite: false, avancer: false, reculer: false,
  esquive: false, attaque: false, onde: false,
};
let esquivePresseeCeTick = false;
let coupPresseCeTick = false;
let ondeFinalePresseeCeTick = false;

const MAP_FINAL_CODE = {
  ArrowLeft: 'gauche', KeyA: 'gauche',
  ArrowRight: 'droite', KeyD: 'droite',
  ArrowUp: 'avancer', KeyW: 'avancer',
  ArrowDown: 'reculer', KeyS: 'reculer',
  Space: 'esquive', ShiftLeft: 'esquive', ShiftRight: 'esquive',
  KeyX: 'attaque', KeyJ: 'attaque',
  KeyC: 'onde', KeyK: 'onde',
};
const MAP_FINAL_TOUCHE = {
  q: 'gauche', a: 'gauche', d: 'droite',
  z: 'avancer', w: 'avancer', s: 'reculer',
  x: 'attaque', j: 'attaque', c: 'onde', k: 'onde',
};

function actionFinale(e) {
  return MAP_FINAL_CODE[e.code] || MAP_FINAL_TOUCHE[(e.key || '').toLowerCase()] || null;
}

function marquerFrontFinal(a) {
  if (a === 'esquive') esquivePresseeCeTick = true;
  else if (a === 'attaque') coupPresseCeTick = true;
  else if (a === 'onde') ondeFinalePresseeCeTick = true;
}

function relacherFinal() {
  Object.keys(entreesFinal).forEach(k => { entreesFinal[k] = false; });
}

/* --- Projection ----------------------------------------------------------- */

function projeter(x, y, z) {
  const d = z + F_DIST_CAM;
  const k = F_FOCALE / d;
  return {
    sx: LARGEUR / 2 + (x - finale.cam) * k,
    sy: F_HORIZON + (F_HAUTEUR_CAM - y) * k,
    k,
  };
}

/* --- Mise en place -------------------------------------------------------- */

function demarrerCombatFinal(avecCinematique) {
  finale.actif = true;
  finale.fini = false;
  finale.mort = false;
  finale.t = 0;
  finale.cam = 0;
  finale.secousse = 0;
  finale.sbires.length = 0;
  finale.meules.length = 0;
  finale.marques.length = 0;
  finale.ondes.length = 0;
  finale.prochaineVague = 2.4;
  finale.message = '';
  finale.messageT = 0;
  finale.banniere = 3.4;

  /* Brad garde ses ameliorations : c'est tout l'interet du passage a la
     boutique avant de franchir le portail. On lui ajoute quelques points de
     vie, parce qu'ici il n'y a ni soin ramasse au sol ni retour a la base. */
  finale.brad = {
    x: -180, z: 0, y: 0,
    vx: 0, vz: 0, sens: 1,
    pvMax: pvMaxDeBrad() + F_PV_MAX_BRAD_BONUS,
    pv: pvMaxDeBrad() + F_PV_MAX_BRAD_BONUS,
    shy: 0,
    invincible: 0,
    esquiveT: 0, esquiveRepos: 0, esquiveDX: 0, esquiveDZ: 0,
    attaque: 0, recharge: 0,
    phaseMarche: 0, phaseRepos: 0,
  };

  finale.kirby = {
    x: 180, z: 0,
    pv: F_PV_KIRBY, pvMax: F_PV_KIRBY,
    sens: -1,
    etat: 'repos', tEtat: 0, repos: 2.0,
    viseX: 0, viseZ: 0,
    invincible: 0,
    phase: 0,          // 0, 1, 2 : le nombre de mecaniques debloquees - 1
    touche: 0,         // clignotement quand il encaisse
  };

  relacherFinal();
  relacherTout();
  scene = 'final';
  audio.debloquer();
  audio.jouerMusiqueDifferee(sourceMusique('mega-kirby'), 0.8);
  if (avecCinematique !== false) annoncerFinal('KIRBY 67 — COMBAT FINAL', 3.4);
}

function annoncerFinal(texte, duree) {
  finale.message = texte;
  finale.messageT = duree || 2.4;
}

function secousseFinale(force, duree) {
  finale.secousse = Math.max(finale.secousse, duree);
  finale.forceSecousse = force;
}

/* --- Simulation ----------------------------------------------------------- */

function majFinal(dt) {
  finale.t += dt;
  if (finale.messageT > 0) finale.messageT -= dt;
  if (finale.banniere > 0) finale.banniere -= dt;
  if (finale.secousse > 0) finale.secousse -= dt;

  /* LE BUG QUI FIGEAIT LE JEU A LA VICTOIRE.

     Ce garde-fou arretait TOUTE la simulation des que le combat etait gagne —
     y compris `majOndesFinales`, qui porte le compte a rebours menant a la
     cinematique de fin. Le compteur n'etait donc jamais decremente,
     `terminerLeJeu()` n'etait jamais appele, et l'ecran restait bloque sur une
     place ou plus rien ne repondait. Le joueur qui gagnait le jeu se retrouvait
     coince dedans.

     La regle est desormais separee en deux : le COMBAT s'arrete, mais ce qui
     fait AVANCER LA SCENE — les compteurs, les particules, la camera — continue
     de tourner. C'est d'ailleurs ce qui permet a la victoire de respirer trois
     secondes avant la cinematique. */
  if (finale.mort) {
    esquivePresseeCeTick = false;
    coupPresseCeTick = false;
    ondeFinalePresseeCeTick = false;
    return;
  }

  if (finale.fini) {
    majMinuteursFinal(dt);
    // Kirby 67 reste a terre, mais la camera se pose doucement sur lui : c'est
    // lui qu'on regarde tomber, pas le vide autour.
    const viseFin = finale.brad.x * 0.4 + finale.kirby.x * 0.6;
    finale.cam += (Math.max(-F_ARENE_X * 0.5,
                   Math.min(F_ARENE_X * 0.5, viseFin)) - finale.cam)
                  * Math.min(1, 1.6 * dt);
    esquivePresseeCeTick = false;
    coupPresseCeTick = false;
    ondeFinalePresseeCeTick = false;
    return;
  }

  majBradFinal(dt);
  majKirbyFinal(dt);
  majSbiresFinal(dt);
  majMeulesFinales(dt);
  majMarquesFinales(dt);
  majOndesFinales(dt);

  /* La camera cadre Brad ET Kirby 67, ponderee vers Brad.
     Callee sur Brad seul, elle laissait regulierement Kirby hors champ — or il
     tourne a deux cent trente pixels, et toutes ses attaques sont annoncees
     par un geste qu'il faut VOIR. Un boss qui frappe depuis l'exterieur du
     cadre n'est pas difficile, il est injuste. */
  const vise = finale.brad.x * 0.66 + finale.kirby.x * 0.34;
  const cible = Math.max(-F_ARENE_X * 0.5, Math.min(F_ARENE_X * 0.5, vise));
  finale.cam += (cible - finale.cam) * Math.min(1, 3.2 * dt);

  esquivePresseeCeTick = false;
  coupPresseCeTick = false;
  ondeFinalePresseeCeTick = false;
}

function majBradFinal(dt) {
  const b = finale.brad;
  b.invincible = Math.max(0, b.invincible - dt);
  b.recharge = Math.max(0, b.recharge - dt);
  b.attaque = Math.max(0, b.attaque - dt);
  b.esquiveRepos = Math.max(0, b.esquiveRepos - dt);

  const dx = (entreesFinal.droite ? 1 : 0) - (entreesFinal.gauche ? 1 : 0);
  const dz = (entreesFinal.avancer ? 1 : 0) - (entreesFinal.reculer ? 1 : 0);

  /* L'ESQUIVE. Elle part dans la direction demandee ; si aucune n'est
     demandee, elle part en arriere — c'est ce qu'on veut quand on appuie en
     panique, et cela evite une esquive qui ne bouge pas. */
  if (esquivePresseeCeTick && b.esquiveT <= 0 && b.esquiveRepos <= 0) {
    const n = Math.hypot(dx, dz);
    b.esquiveDX = n > 0 ? dx / n : -b.sens;
    b.esquiveDZ = n > 0 ? dz / n : 0;
    b.esquiveT = F_DUREE_ESQUIVE;
    b.esquiveRepos = F_DUREE_ESQUIVE + F_REPOS_ESQUIVE;
    b.invincible = Math.max(b.invincible, F_DUREE_ESQUIVE + 0.12);
    audio.bruit('saut');
  }

  if (b.esquiveT > 0) {
    b.esquiveT -= dt;
    b.x += b.esquiveDX * F_VITESSE_ESQUIVE * dt;
    b.z += b.esquiveDZ * F_VITESSE_ESQUIVE * dt;
    b.vx = 0; b.vz = 0;
  } else {
    const cx = dx * F_VITESSE, cz = dz * F_VITESSE_Z;
    b.vx += Math.max(-F_ACCEL * dt, Math.min(F_ACCEL * dt, cx - b.vx));
    b.vz += Math.max(-F_ACCEL * dt, Math.min(F_ACCEL * dt, cz - b.vz));
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    if (dx !== 0) b.sens = dx;
  }

  b.x = Math.max(-F_ARENE_X, Math.min(F_ARENE_X, b.x));
  b.z = Math.max(-F_ARENE_Z, Math.min(F_ARENE_Z, b.z));

  // Les animations reutilisent les compteurs de la planche de Brad.
  const vitesse = Math.hypot(b.vx, b.vz);
  if (vitesse > 8) { b.phaseMarche += (vitesse * dt) / 12; b.phaseRepos = 0; }
  else b.phaseRepos += dt;

  // --- Le coup de poing
  if (coupPresseCeTick && b.recharge <= 0) {
    b.recharge = F_RECHARGE_COUP;
    b.attaque = 0.16;
    audio.bruit('coup');
    frapperAuFinal();
  }

  // --- L'onde de choc
  if (ondeFinalePresseeCeTick) tirerOndeFinale();
}

/* Le poing. Il touche les Serra, jamais Kirby 67 — et quand le joueur essaie
   quand meme, on le lui DIT. Un coup qui ne fait rien sans explication passe
   pour un bug, c'est la lecon du niveau 6. */
function frapperAuFinal() {
  const b = finale.brad;
  const zx = b.x + b.sens * (F_PORTEE_COUP * 0.6);
  let touche = false;

  for (let i = finale.sbires.length - 1; i >= 0; i--) {
    const s = finale.sbires[i];
    if (Math.abs(s.x - zx) > F_PORTEE_COUP || Math.abs(s.z - b.z) > F_PORTEE_COUP_Z) continue;
    s.pv -= 1;
    s.flash = 0.14;
    s.vx += b.sens * 130;
    touche = true;
    if (s.pv <= 0) tuerSbireFinal(i);
  }

  // Les meules se brisent au poing, comme au manoir.
  for (let i = finale.meules.length - 1; i >= 0; i--) {
    const m = finale.meules[i];
    if (Math.abs(m.x - zx) > F_PORTEE_COUP + 10 || Math.abs(m.z - b.z) > F_PORTEE_COUP_Z + 10) continue;
    particulesFinales(m.x, m.z, 12, '#f0d98a');
    finale.meules.splice(i, 1);
    touche = true;
  }

  if (touche) return;

  const k = finale.kirby;
  if (Math.abs(k.x - zx) < 60 && Math.abs(k.z - b.z) < 50) {
    k.touche = 0.15;
    audio.bruit('blinde');
    texteFinal(k.x, k.z, 'tes poings ne suffisent pas', '#9aa0bb');
  }
}

function tuerSbireFinal(i) {
  const s = finale.sbires[i];
  particulesFinales(s.x, s.z, 10, '#f0a0a0');
  audio.bruit('ecrase');
  /* LA MUNITION. C'est ici, et nulle part ailleurs, que la jauge se remplit :
     le lien entre « nettoyer les vagues » et « pouvoir blesser Kirby 67 » doit
     etre direct et visible, sinon les Serra ne sont qu'une gene. */
  const gain = 100 / (F_SBIRES_PAR_DECHARGE * (aPermanent('shy') ? 0.77 : 1));
  finale.brad.shy = Math.min(100, finale.brad.shy + gain);
  texteFinal(s.x, s.z, '+ Brad-Shy', '#7ee0ff');
  finale.sbires.splice(i, 1);
}

/* Combien de Serra il faut abattre pour une decharge. Six : assez pour que la
   jauge soit un objectif, assez peu pour qu'une vague entiere la remplisse
   presque. */
const F_SBIRES_PAR_DECHARGE = 6;

function tirerOndeFinale() {
  const b = finale.brad;
  if (b.shy < 100) {
    audio.bruit('refus');
    texteFinal(b.x, b.z, 'jauge incomplète', '#9aa0bb');
    return;
  }
  b.shy = 0;
  finale.ondes.push({ x: b.x, z: b.z, t: F_DUREE_ONDE });
  audio.bruit('onde');
  secousseFinale(7, 0.4);

  // Les Serra pris dans l'onde tombent tous.
  for (let i = finale.sbires.length - 1; i >= 0; i--) {
    const s = finale.sbires[i];
    if (Math.hypot(s.x - b.x, (s.z - b.z) * 1.8) > F_PORTEE_ONDE) continue;
    particulesFinales(s.x, s.z, 8, '#f0a0a0');
    finale.sbires.splice(i, 1);
  }

  const k = finale.kirby;
  const d = Math.hypot(k.x - b.x, (k.z - b.z) * 1.8);
  if (d > F_PORTEE_ONDE) {
    texteFinal(b.x, b.z, 'trop loin de lui', '#ffb37c');
    annoncerFinal('TROP LOIN — APPROCHE-TOI', 2.2);
    return;
  }
  blesserKirbyFinal();
}

function blesserKirbyFinal() {
  const k = finale.kirby;
  k.pv--;
  k.touche = 0.6;
  k.etat = 'sonne';
  k.tEtat = 1.6;
  k.repos = 1.6;
  audio.bruit('victoire');
  secousseFinale(12, 0.7);
  particulesFinales(k.x, k.z, 26, '#7ee0ff');

  if (k.pv <= 0) { gagnerCombatFinal(); return; }

  k.phase = Math.min(2, F_PV_KIRBY - k.pv);
  const nouvelle = ['L\'ASPIRATION', 'LA CHARGE', 'LA PLUIE DE MEULES'][k.phase];
  annoncerFinal('IL PASSE À ' + (k.pv) + ' — ' + nouvelle, 3.2);
}

function gagnerCombatFinal() {
  finale.fini = true;
  finale.sbires.length = 0;
  finale.meules.length = 0;
  finale.marques.length = 0;
  audio.arreterMusique(0.6);
  audio.fanfare();
  secousseFinale(14, 1.2);
  annoncerFinal('KIRBY 67 EST À TERRE', 4.0);
  // Un temps de respiration avant la cinematique : gagner doit s'entendre.
  finale.attenteFin = 3.2;
}

function blesserBradFinal(degats, sourceX, nom) {
  const b = finale.brad;
  if (b.invincible > 0) return;
  if (Math.random() < chanceBlocage()) {
    b.invincible = F_INVINCIBILITE * 0.5;
    audio.bruit('bouclier');
    texteFinal(b.x, b.z, 'bloqué', '#78beff');
    return;
  }
  degats = Math.max(1, Math.round(degats * reglageDifficulte().degats));
  b.pv -= degats;
  b.invincible = F_INVINCIBILITE;
  audio.bruit('degat');
  texteFinal(b.x, b.z, '-' + degats, '#ff6b6b');
  secousseFinale(5, 0.22);
  const vers = Math.sign(b.x - sourceX) || 1;
  b.x += vers * 26;
  if (b.pv <= 0) {
    b.pv = 0;
    finale.mort = true;
    finale.tueur = nom || 'Kirby 67';
    audio.arreterMusique(0.5);
    audio.bruit('mort');
  }
}

/* --- Kirby 67 ------------------------------------------------------------- */

function majKirbyFinal(dt) {
  const k = finale.kirby;
  const b = finale.brad;
  k.touche = Math.max(0, k.touche - dt);
  k.tEtat = Math.max(0, k.tEtat - dt);
  k.sens = Math.sign(b.x - k.x) || k.sens;

  switch (k.etat) {
    case 'sonne':
      if (k.tEtat <= 0) { k.etat = 'repos'; k.repos = 1.2; }
      return;

    case 'aspire': {
      if (k.tEtat > 0) {
        const dx = k.x - b.x, dz = k.z - b.z;
        const d = Math.hypot(dx, dz) || 1;
        // L'esquive brise l'aspiration : c'est sa contre-mesure immediate.
        if (b.esquiveT <= 0) {
          b.x += (dx / d) * F_ASPIRATION.force * dt;
          b.z += (dz / d) * F_ASPIRATION.force * dt;
        }
        if (d < 46 && !k.aMordu) {
          k.aMordu = true;
          blesserBradFinal(F_ASPIRATION.degats, k.x, 'l\'aspiration');
        }
      } else {
        k.etat = 'repos';
        k.repos = F_REPOS[k.phase];
      }
      return;
    }

    case 'prepare':
      if (k.tEtat <= 0) {
        k.etat = 'charge';
        k.tEtat = F_CHARGE.duree;
        audio.bruit('onde');
      }
      return;

    case 'charge': {
      const dx = k.viseX - k.x, dz = k.viseZ - k.z;
      const d = Math.hypot(dx, dz) || 1;
      k.x += (dx / d) * F_CHARGE.vitesse * dt;
      k.z += (dz / d) * F_CHARGE.vitesse * dt;
      k.x = Math.max(-F_ARENE_X, Math.min(F_ARENE_X, k.x));
      k.z = Math.max(-F_ARENE_Z, Math.min(F_ARENE_Z, k.z));
      if (Math.hypot(k.x - b.x, (k.z - b.z) * 1.6) < 40) {
        blesserBradFinal(F_CHARGE.degats, k.x, 'la charge');
      }
      if (d < 26 || k.tEtat <= 0) { k.etat = 'repos'; k.repos = F_REPOS[k.phase]; }
      return;
    }

    default: {
      /* Au repos il tourne autour de Brad, a distance. Il ne fonce jamais de
         lui-meme : tout ce qui fait mal ici est ANNONCE. */
      const angle = finale.t * 0.5;
      const viseX = b.x + Math.cos(angle) * 230;
      const viseZ = b.z + Math.sin(angle) * 90;
      k.x += (viseX - k.x) * Math.min(1, 0.9 * dt);
      k.z += (viseZ - k.z) * Math.min(1, 0.9 * dt);
      k.x = Math.max(-F_ARENE_X, Math.min(F_ARENE_X, k.x));
      k.z = Math.max(-F_ARENE_Z, Math.min(F_ARENE_Z, k.z));

      /* Une meule roulee de temps a autre, en plus des attaques annoncees.
         Elle n'appartient a aucune des trois mecaniques : c'est une pression
         de fond, qui empeche de rester plante a attendre la prochaine annonce.
         Elle n'arrive qu'a partir du deuxieme palier. */
      if (k.phase >= 1) {
        k.reposMeule = (k.reposMeule || 3.0) - dt;
        if (k.reposMeule <= 0) {
          k.reposMeule = 3.4 - k.phase * 0.6;
          const dx = b.x - k.x, dz = b.z - k.z;
          const d = Math.hypot(dx, dz) || 1;
          finale.meules.push({
            x: k.x, z: k.z, rot: 0, vie: 3.2,
            vx: (dx / d) * 250, vz: (dz / d) * 250,
          });
          audio.bruit('coup');
        }
      }

      k.repos -= dt;
      if (k.repos <= 0) choisirAttaqueFinale(k, b);
      return;
    }
  }
}

/* Le choix de l'attaque. Le tirage n'a lieu que parmi les mecaniques DEJA
   debloquees : c'est la promesse faite au joueur — trois points de vie, trois
   paliers, et rien qui arrive avant son heure. */
function choisirAttaqueFinale(k, b) {
  const dispo = ['aspiration'];
  if (k.phase >= 1) dispo.push('charge');
  if (k.phase >= 2) dispo.push('pluie');
  const choix = dispo[Math.floor(Math.random() * dispo.length)];

  if (choix === 'aspiration') {
    k.etat = 'aspire';
    k.aMordu = false;               // une seule morsure par aspiration
    k.tEtat = F_ASPIRATION.duree;
    audio.bruit('onde');
    annoncerFinal('IL ASPIRE — ÉLOIGNE-TOI', 1.8);
    return;
  }
  if (choix === 'charge') {
    k.etat = 'prepare';
    k.tEtat = F_CHARGE.preparation;
    k.viseX = b.x;
    k.viseZ = b.z;
    audio.bruit('blinde');
    annoncerFinal('IL CHARGE — ÉCARTE-TOI', 1.8);
    return;
  }
  // La pluie : quatre impacts, marques au sol, autour de Brad.
  k.etat = 'repos';
  k.repos = F_REPOS[k.phase];
  for (let i = 0; i < F_PLUIE.nombre[2]; i++) {
    finale.marques.push({
      x: Math.max(-F_ARENE_X, Math.min(F_ARENE_X, b.x + (Math.random() - 0.5) * 260)),
      z: Math.max(-F_ARENE_Z, Math.min(F_ARENE_Z, b.z + (Math.random() - 0.5) * 170)),
      t: F_PLUIE.annonce + i * 0.22,
    });
  }
  audio.bruit('asteroide');
  annoncerFinal('ÇA TOMBE — REGARDE LE SOL', 2.0);
}

/* --- Les Serra de Kirby 67 ------------------------------------------------ */

function majSbiresFinal(dt) {
  const b = finale.brad;
  const k = finale.kirby;

  finale.prochaineVague -= dt;
  if (finale.prochaineVague <= 0 && finale.sbires.length < 8) {
    const v = F_VAGUES[k.phase];
    finale.prochaineVague = v.delai;
    for (let i = 0; i < v.nombre; i++) {
      const cote = Math.random() < 0.5 ? -1 : 1;
      finale.sbires.push({
        x: cote * (F_ARENE_X - 20),
        z: (Math.random() - 0.5) * F_ARENE_Z * 1.7,
        vx: 0, vz: 0, sens: -cote,
        pv: 2, flash: 0, phase: Math.random() * 6,
        lourd: Math.random() < 0.25,
      });
    }
    audio.bruit('porte');
    annoncerFinal('IL EN ENVOIE ' + v.nombre, 1.6);
  }

  for (const s of finale.sbires) {
    s.flash = Math.max(0, s.flash - dt);
    s.phase += dt * 3;
    const vitesse = (s.lourd ? 52 : 84) * (aPermanent('lenteur') ? 0.85 : 1);
    const dx = b.x - s.x, dz = b.z - s.z;
    const d = Math.hypot(dx, dz) || 1;
    s.vx += ((dx / d) * vitesse - s.vx) * Math.min(1, 4 * dt);
    s.vz += ((dz / d) * vitesse - s.vz) * Math.min(1, 4 * dt);
    s.x += s.vx * dt;
    s.z += s.vz * dt;
    s.z = Math.max(-F_ARENE_Z, Math.min(F_ARENE_Z, s.z));
    s.sens = Math.sign(dx) || s.sens;

    if (d < 30 && b.invincible <= 0) {
      blesserBradFinal(s.lourd ? 2 : 1, s.x, 'un Serra');
    }
  }
}

/* --- Meules et impacts ---------------------------------------------------- */

function majMeulesFinales(dt) {
  const b = finale.brad;
  for (let i = finale.meules.length - 1; i >= 0; i--) {
    const m = finale.meules[i];
    m.x += m.vx * dt;
    m.z += m.vz * dt;
    m.rot += dt * 6;
    m.vie -= dt;
    if (m.vie <= 0 || Math.abs(m.x) > F_ARENE_X + 40) { finale.meules.splice(i, 1); continue; }
    if (b.invincible <= 0 && Math.hypot(m.x - b.x, (m.z - b.z) * 1.6) < 30) {
      blesserBradFinal(F_PLUIE.degats, m.x, 'une meule');
      finale.meules.splice(i, 1);
    }
  }
}

function majMarquesFinales(dt) {
  const b = finale.brad;
  for (let i = finale.marques.length - 1; i >= 0; i--) {
    const m = finale.marques[i];
    m.t -= dt;
    if (m.t > 0) continue;
    particulesFinales(m.x, m.z, 16, '#e8c98a');
    secousseFinale(6, 0.3);
    audio.bruit('ecrase');
    if (b.invincible <= 0 &&
        Math.hypot(m.x - b.x, (m.z - b.z) * 1.6) < F_PLUIE.rayon) {
      blesserBradFinal(F_PLUIE.degats, m.x, 'une meule');
    }
    finale.marques.splice(i, 1);
  }
}

function majOndesFinales(dt) {
  for (let i = finale.ondes.length - 1; i >= 0; i--) {
    finale.ondes[i].t -= dt;
    if (finale.ondes[i].t <= 0) finale.ondes.splice(i, 1);
  }
}

/* Ce qui doit continuer de tourner meme quand le combat est fini : les ondes
   encore visibles, et le compte a rebours vers la cinematique. Separe du reste
   pour que la victoire ne puisse plus geler la scene. */
function majMinuteursFinal(dt) {
  majOndesFinales(dt);
  if (!(finale.attenteFin > 0)) return;
  finale.attenteFin -= dt;
  if (finale.attenteFin > 0) return;
  finale.attenteFin = 0;
  if (typeof terminerLeJeu === 'function') terminerLeJeu();
}

/* --- Effets legers -------------------------------------------------------- */

const particulesFinal = [];
const textesFinal = [];

function particulesFinales(x, z, n, couleur) {
  for (let i = 0; i < n; i++) {
    particulesFinal.push({
      x, z, y: 10 + Math.random() * 20,
      vx: (Math.random() - 0.5) * 160,
      vz: (Math.random() - 0.5) * 90,
      vy: 40 + Math.random() * 120,
      vie: 0.5 + Math.random() * 0.4, couleur,
    });
  }
}

function texteFinal(x, z, texte, couleur) {
  textesFinal.push({ x, z, texte, couleur, vie: 1.1 });
}

function majEffetsFinal(dt) {
  for (let i = particulesFinal.length - 1; i >= 0; i--) {
    const p = particulesFinal[i];
    p.vie -= dt;
    p.x += p.vx * dt; p.z += p.vz * dt;
    p.y += p.vy * dt; p.vy -= 420 * dt;
    if (p.y < 0) { p.y = 0; p.vy = 0; }
    if (p.vie <= 0) particulesFinal.splice(i, 1);
  }
  for (let i = textesFinal.length - 1; i >= 0; i--) {
    textesFinal[i].vie -= dt;
    if (textesFinal[i].vie <= 0) textesFinal.splice(i, 1);
  }
}

/* =============================================================================
   RENDU
   ========================================================================== */

function dessinerFinal() {
  ctx.save();
  if (finale.secousse > 0) {
    const f = (finale.forceSecousse || 6) * finale.secousse;
    ctx.translate(Math.round((Math.random() - 0.5) * f), Math.round((Math.random() - 0.5) * f));
  }

  dessinerCielLille();
  dessinerSolPlace();
  dessinerMarquesFinales();
  dessinerActeursFinal();
  dessinerOndesFinales();
  dessinerPluieLille();

  ctx.restore();
  hudFinal();
}

function dessinerCielLille() {
  /* Le FOND DE LA PLACE, et non l'horizon geometrique : c'est la que se posent
     les facades. Le point de fuite est plus haut, mais il n'y a rien a voir
     entre les deux — la place s'arrete la ou les maisons commencent. */
  const solFond = projeter(0, 0, F_ARENE_Z).sy;

  const g = ctx.createLinearGradient(0, 0, 0, solFond);
  g.addColorStop(0, '#2b3244');
  g.addColorStop(1, '#8b8376');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LARGEUR, solFond + 2);

  // Le beffroi, tout au fond : il defile presque pas, il est trop loin.
  const bx = Math.round(LARGEUR * 0.74 - finale.cam * 0.05);
  ctx.fillStyle = '#463a36';
  ctx.fillRect(bx - 19, solFond - 210, 38, 210);
  ctx.beginPath();
  ctx.moveTo(bx - 25, solFond - 210); ctx.lineTo(bx, solFond - 262);
  ctx.lineTo(bx + 25, solFond - 210); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,226,170,.45)';
  ctx.fillRect(bx - 7, solFond - 190, 14, 20);
  ctx.fillStyle = 'rgba(255,226,170,.25)';
  ctx.fillRect(bx - 13, solFond - 150, 26, 10);

  /* Les facades a pignon a redents — la signature de la Grand-Place. Elles
     defilent a un dixieme de la camera : ce sont des batiments lointains, pas
     des elements de l'arene. */
  const d = finale.cam * 0.1;
  for (let k = -2; k < 13; k++) {
    const x = Math.round(k * 78 - restePositifFinal(d, 78));
    const h = 126 + restePositifFinal(k * 37, 4) * 26;
    ctx.fillStyle = restePositifFinal(k, 2) ? '#59413a' : '#6a5245';
    ctx.fillRect(x, solFond - h, 70, h + 4);
    // Le pignon : quatre redents qui montent en marches d'escalier.
    for (let m = 0; m < 4; m++) {
      ctx.fillRect(x + 8 + m * 7, solFond - h - 8 - m * 7, 54 - m * 14, 9 + m * 7);
    }
    // Les fenetres, chaudes et regulieres.
    ctx.fillStyle = 'rgba(255,226,170,.32)';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillRect(x + 9 + c * 21, solFond - h + 14 + r * 27, 13, 17);
      }
    }
    // Le rez-de-chaussee, en pierre plus claire, et son arcade.
    ctx.fillStyle = 'rgba(226,214,190,.16)';
    ctx.fillRect(x, solFond - 34, 70, 34);
    ctx.fillStyle = 'rgba(0,0,0,.34)';
    ctx.fillRect(x + 22, solFond - 26, 26, 26);
  }

  // La barriere qui ferme la place : elle marque le fond du terrain jouable.
  ctx.fillStyle = 'rgba(30,26,24,.55)';
  ctx.fillRect(0, solFond - 2, LARGEUR, 5);
}

function restePositifFinal(n, m) { return ((n % m) + m) % m; }

/* Le pave de la Grand-Place, en perspective. Les lignes de profondeur sont
   posees a pas constant en z : c'est leur RESSERREMENT a l'ecran qui donne
   toute la lecture de la distance, et donc la possibilite de juger ou tombe
   une meule. */
function dessinerSolPlace() {
  const bas = projeter(0, 0, -F_ARENE_Z).sy;
  ctx.fillStyle = '#4a4740';
  ctx.fillRect(0, F_HORIZON, LARGEUR, HAUTEUR - F_HORIZON);

  // Les bandes de profondeur, alternees, pour que le damier se voie.
  const PAS_Z = 30;
  for (let z = -F_ARENE_Z; z < F_ARENE_Z; z += PAS_Z) {
    const y1 = projeter(0, 0, z).sy;
    const y2 = projeter(0, 0, z + PAS_Z).sy;
    /* Le contraste etait a peine perceptible (.035 contre .07) : la place
       paraissait uniformement grise et rien ne disait a quelle distance
       tombait une meule. La lecture de la profondeur est ici la moitie du
       combat — elle merite d'etre franche. */
    ctx.fillStyle = restePositifFinal(Math.round(z / PAS_Z), 2)
      ? 'rgba(232,226,214,.09)' : 'rgba(0,0,0,.16)';
    ctx.fillRect(0, y2, LARGEUR, y1 - y2 + 1);
  }

  // Les lignes de fuite : un pave tous les 60 px de monde.
  ctx.strokeStyle = 'rgba(255,255,255,.14)';
  ctx.lineWidth = 1;
  const x0 = Math.floor((finale.cam - 700) / 60) * 60;
  for (let x = x0; x < finale.cam + 700; x += 60) {
    const a = projeter(x, 0, -F_ARENE_Z);
    const bpt = projeter(x, 0, F_ARENE_Z);
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy); ctx.lineTo(bpt.sx, bpt.sy);
    ctx.stroke();
  }

  // Les bords de la place : deux trottoirs qui bornent le terrain jouable.
  for (const s of [-1, 1]) {
    const a = projeter(s * F_ARENE_X, 0, -F_ARENE_Z);
    const bpt = projeter(s * F_ARENE_X, 0, F_ARENE_Z);
    ctx.strokeStyle = 'rgba(226,214,190,.35)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(bpt.sx, bpt.sy); ctx.stroke();
  }
  // Le fond et l'avant de la place
  for (const z of [-F_ARENE_Z, F_ARENE_Z]) {
    const a = projeter(-F_ARENE_X, 0, z);
    const bpt = projeter(F_ARENE_X, 0, z);
    ctx.strokeStyle = 'rgba(226,214,190,.28)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(bpt.sx, bpt.sy); ctx.stroke();
  }
  // Reflet mouille sur le pave, devant
  const g = ctx.createLinearGradient(0, bas - 40, 0, HAUTEUR);
  g.addColorStop(0, 'rgba(180,200,225,0)');
  g.addColorStop(1, 'rgba(180,200,225,.10)');
  ctx.fillStyle = g;
  ctx.fillRect(0, bas - 40, LARGEUR, HAUTEUR - bas + 40);
}

function dessinerMarquesFinales() {
  for (const m of finale.marques) {
    const p = projeter(m.x, 0, m.z);
    const avance = 1 - Math.max(0, m.t) / F_PLUIE.annonce;
    const r = F_PLUIE.rayon * p.k * (1.3 - avance * 0.3);
    ctx.save();
    ctx.translate(p.sx, p.sy);
    ctx.scale(1, 0.36);
    ctx.fillStyle = 'rgba(255,140,80,' + (0.12 + 0.26 * avance).toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,130,' + (0.5 + 0.4 * avance).toFixed(2) + ')';
    ctx.lineWidth = 2 / 0.36;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,200,' + (0.3 + 0.6 * avance).toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(0, 0, r * (1 - avance) + 2, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    // La meule qui tombe, au-dessus du marquage
    const chute = projeter(m.x, Math.max(0, m.t) * 420, m.z);
    ctx.fillStyle = '#8d6a34';
    ctx.beginPath(); ctx.arc(chute.sx, chute.sy, 13 * chute.k, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8c98a';
    ctx.beginPath(); ctx.arc(chute.sx, chute.sy, 10 * chute.k, 0, Math.PI * 2); ctx.fill();
  }
}

/* Tous les acteurs, tries du plus LOIN au plus PROCHE. C'est la seule regle de
   tri necessaire : dans une projection en trou d'epingle, dessiner dans l'ordre
   des z decroissants suffit a obtenir un recouvrement correct. */
function dessinerActeursFinal() {
  const liste = [];
  liste.push({ z: finale.brad.z, dessin: dessinerBradFinal });
  liste.push({ z: finale.kirby.z, dessin: dessinerKirbyFinal });
  for (const s of finale.sbires) liste.push({ z: s.z, dessin: () => dessinerSbireFinal(s) });
  for (const m of finale.meules) liste.push({ z: m.z, dessin: () => dessinerMeuleFinale(m) });
  for (const p of particulesFinal) liste.push({ z: p.z, dessin: () => dessinerParticuleFinale(p) });
  liste.sort((a, b) => b.z - a.z);
  for (const e of liste) e.dessin();

  for (const t of textesFinal) {
    const p = projeter(t.x, 40 + (1.1 - t.vie) * 26, t.z);
    ctx.globalAlpha = Math.min(1, t.vie * 1.6);
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = t.couleur;
    ctx.fillText(t.texte, p.sx, p.sy);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
}

function ombreFinale(x, z, largeur) {
  const p = projeter(x, 0, z);
  ctx.fillStyle = 'rgba(0,0,0,.32)';
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy, largeur * p.k, largeur * 0.34 * p.k, 0, 0, Math.PI * 2);
  ctx.fill();
}

function dessinerBradFinal() {
  const b = finale.brad;
  ombreFinale(b.x, b.z, 12);
  if (b.invincible > 0 && Math.floor(b.invincible * 14) % 2 === 0) return;
  const p = projeter(b.x, 0, b.z);
  const pose = poseBrad({
    auSol: true, vx: Math.hypot(b.vx, b.vz), vy: 0,
    phaseRepos: b.phaseRepos, phaseMarche: b.phaseMarche, inactif: 0,
  });
  dessinerCellulePersonnage(imgBrad, pose, p.sx, p.sy, b.sens, p.k, b.esquiveT > 0);
  // Le trait du coup de poing
  if (b.attaque > 0) {
    ctx.save();
    ctx.globalAlpha = b.attaque / 0.16;
    ctx.strokeStyle = '#fff2c0';
    ctx.lineWidth = 3 * p.k;
    ctx.beginPath();
    ctx.arc(p.sx + b.sens * 16 * p.k, p.sy - 24 * p.k, 18 * p.k, -0.9, 0.9);
    ctx.stroke();
    ctx.restore();
  }
}

function dessinerKirbyFinal() {
  const k = finale.kirby;
  ombreFinale(k.x, k.z, 13);
  const p = projeter(k.x, 0, k.z);

  // Le trait de visee de la charge : meme grammaire que partout ailleurs.
  if (k.etat === 'prepare') {
    const cible = projeter(k.viseX, 0, k.viseZ);
    const avance = 1 - k.tEtat / F_CHARGE.preparation;
    ctx.strokeStyle = 'rgba(255,120,140,' + (0.3 + 0.5 * avance).toFixed(2) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(p.sx, p.sy); ctx.lineTo(cible.sx, cible.sy); ctx.stroke();
    ctx.save();
    ctx.translate(cible.sx, cible.sy);
    ctx.scale(1, 0.36);
    ctx.strokeStyle = 'rgba(255,150,170,.8)';
    ctx.lineWidth = 2 / 0.36;
    ctx.beginPath(); ctx.arc(0, 0, 34 * cible.k * (1 - avance * 0.4), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // Le souffle de l'aspiration
  if (k.etat === 'aspire') {
    const t = performance.now() / 1000;
    ctx.strokeStyle = 'rgba(150,230,255,.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 1.5;
      const d1 = 110 - ((t * 150 + i * 22) % 96);
      ctx.beginPath();
      ctx.moveTo(p.sx + Math.cos(a) * (d1 + 22) * p.k, p.sy - 24 * p.k + Math.sin(a) * (d1 + 22) * 0.45 * p.k);
      ctx.lineTo(p.sx + Math.cos(a) * d1 * p.k, p.sy - 24 * p.k + Math.sin(a) * d1 * 0.45 * p.k);
      ctx.stroke();
    }
  }

  const img = sprites['kirby'];
  const pose = k.etat === 'charge'
    ? { ligne: BRAD_PLANCHE.course, colonne: Math.floor(finale.t * 14) % 4 }
    : (k.etat === 'sonne'
        ? { ligne: BRAD_PLANCHE.repos, colonne: 0 }
        : { ligne: BRAD_PLANCHE.marche, colonne: Math.floor(finale.t * 5) % 4 });
  dessinerCellulePersonnage(img, pose, p.sx, p.sy, k.sens, p.k * 1.12, k.touche > 0);

  if (k.etat === 'sonne') {
    ctx.fillStyle = '#ffe9a8';
    for (let i = 0; i < 3; i++) {
      const a = finale.t * 3 + (i * Math.PI * 2) / 3;
      ctx.fillRect(Math.round(p.sx + Math.cos(a) * 20 * p.k) - 2,
                   Math.round(p.sy - 58 * p.k + Math.sin(a) * 6 * p.k) - 2, 4, 4);
    }
  }
}

function dessinerSbireFinal(s) {
  ombreFinale(s.x, s.z, 10);
  const p = projeter(s.x, 0, s.z);
  const img = sprites[s.lourd ? 'Serra-Lourd' : 'Serra'];
  if (!img) {
    ctx.fillStyle = '#c9564f';
    ctx.fillRect(p.sx - 10 * p.k, p.sy - 32 * p.k, 20 * p.k, 32 * p.k);
    return;
  }
  const source = s.flash > 0 ? silhouette(img) : teinter(img, 'rgba(190,150,70,.5)');
  const ech = (s.lourd ? 1.1 : 1) * p.k;
  const respire = 1 + Math.sin(s.phase * 2.2) * 0.05;
  ctx.save();
  ctx.translate(p.sx, p.sy);
  ctx.scale(-s.sens * ech / respire, ech * respire);
  ctx.drawImage(source, -img.width / 2, -img.height);
  ctx.restore();
}

function dessinerMeuleFinale(m) {
  ombreFinale(m.x, m.z, 10);
  const p = projeter(m.x, 12, m.z);
  ctx.save();
  ctx.translate(p.sx, p.sy);
  ctx.rotate(m.rot);
  ctx.scale(p.k, p.k);
  ctx.fillStyle = '#8d6a34';
  ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8c98a';
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function dessinerParticuleFinale(p) {
  const q = projeter(p.x, p.y, p.z);
  ctx.globalAlpha = Math.max(0, Math.min(1, p.vie * 2));
  ctx.fillStyle = p.couleur;
  ctx.fillRect(Math.round(q.sx), Math.round(q.sy), Math.max(1, Math.round(2 * q.k)),
               Math.max(1, Math.round(2 * q.k)));
  ctx.globalAlpha = 1;
}

/* Une cellule de planche, posee dans le repere ecran, mise a l'echelle par la
   perspective. C'est l'equivalent de dessinerPlancheBrad() pour cette scene :
   meme decoupage, meme point d'ancrage aux pieds. */
function dessinerCellulePersonnage(img, pose, sx, sy, sens, echelle, blanc) {
  if (!img) {
    ctx.fillStyle = '#191b26';
    ctx.fillRect(sx - 11 * echelle, sy - 46 * echelle, 22 * echelle, 46 * echelle);
    return;
  }
  const { cw, ch, piedsDansCellule } = BRAD_PLANCHE;
  const source = blanc ? silhouette(img) : img;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(sens * echelle, echelle);
  ctx.drawImage(source, pose.colonne * cw, pose.ligne * ch, cw, ch,
                -cw / 2, -piedsDansCellule, cw, ch);
  ctx.restore();
}

function dessinerOndesFinales() {
  for (const o of finale.ondes) {
    const avance = 1 - o.t / F_DUREE_ONDE;
    const p = projeter(o.x, 0, o.z);
    const r = F_PORTEE_ONDE * avance * p.k;
    ctx.save();
    ctx.translate(p.sx, p.sy);
    ctx.scale(1, 0.36);
    ctx.strokeStyle = 'rgba(126,224,255,' + (0.85 * (1 - avance)).toFixed(2) + ')';
    ctx.lineWidth = 8 / 0.36;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.6 * (1 - avance)).toFixed(2) + ')';
    ctx.lineWidth = 3 / 0.36;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

function dessinerPluieLille() {
  const t = performance.now() / 1000;
  ctx.strokeStyle = 'rgba(200,214,235,.30)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 90; k++) {
    const x = (k * 173 + t * 210) % (LARGEUR + 60) - 30;
    const y = (k * 97 + t * 520) % HAUTEUR;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 12); ctx.stroke();
  }
}

/* --- Interface ------------------------------------------------------------ */

function hudFinal() {
  const b = finale.brad, k = finale.kirby;

  // Vie de Brad
  ctx.fillStyle = 'rgba(9,11,20,.55)';
  ctx.fillRect(8, 8, 12 * b.pvMax + 8, 16);
  for (let i = 0; i < b.pvMax; i++) {
    ctx.fillStyle = i < b.pv ? '#d8483c' : 'rgba(255,255,255,.14)';
    ctx.fillRect(12 + i * 12, 12, 8, 8);
  }

  // La jauge de Brad-Shy. Elle est le compteur de munitions : quand elle est
  // pleine, elle doit se voir de l'autre bout de l'ecran.
  const pleine = b.shy >= 100;
  ctx.fillStyle = 'rgba(9,11,20,.55)';
  ctx.fillRect(8, 28, 160, 14);
  ctx.fillStyle = pleine ? '#7ee0ff' : 'rgba(126,224,255,.45)';
  ctx.fillRect(11, 31, Math.round(154 * (b.shy / 100)), 8);
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.fillStyle = pleine ? '#0a0c14' : 'rgba(255,255,255,.7)';
  ctx.fillText(pleine ? 'ONDE PRÊTE — C' : 'BRAD-SHY', 16, 39);
  if (pleine) {
    ctx.strokeStyle = 'rgba(126,224,255,' + (0.5 + 0.5 * Math.sin(finale.t * 8)).toFixed(2) + ')';
    ctx.lineWidth = 2;
    ctx.strokeRect(9, 29, 158, 12);
  }

  // Les trois points de vie de Kirby 67, en gros, au centre.
  const l = 200, x = (LARGEUR - l) / 2, y = 22;
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7ee0ff';
  ctx.fillText('KIRBY 67', LARGEUR / 2, y - 6);
  ctx.textAlign = 'left';
  for (let i = 0; i < k.pvMax; i++) {
    const px = x + 26 + i * 64;
    ctx.fillStyle = i < k.pv ? '#3ac0dc' : 'rgba(255,255,255,.12)';
    ctx.fillRect(px, y, 52, 10);
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + .5, y + .5, 51, 9);
  }

  if (finale.messageT > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, finale.messageT * 1.6);
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const w = ctx.measureText(finale.message).width + 30;
    ctx.fillStyle = 'rgba(9,11,20,.72)';
    ctx.fillRect((LARGEUR - w) / 2, 62, w, 26);
    ctx.fillStyle = '#e8b62c';
    ctx.fillText(finale.message, LARGEUR / 2, 80);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  if (finale.banniere > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, finale.banniere / 1.2);
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(9,11,20,.6)';
    ctx.fillRect(LARGEUR / 2 - 190, HAUTEUR - 46, 380, 34);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillText('↑ ↓ ← →  se déplacer sur la place  ·  Espace  esquive', LARGEUR / 2, HAUTEUR - 32);
    ctx.fillText('X  frapper les Serra  ·  C  onde de choc (jauge pleine)', LARGEUR / 2, HAUTEUR - 20);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  if (finale.mort) ecranMortFinale();
}

function ecranMortFinale() {
  ctx.fillStyle = 'rgba(9,11,20,.78)';
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  ctx.textAlign = 'center';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillStyle = '#d8483c';
  ctx.fillText('BRAD EST TOMBÉ', LARGEUR / 2, 140);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.fillText(finale.tueur ? 'Vaincu par ' + finale.tueur + '.' : '', LARGEUR / 2, 168);
  ctx.fillText('Le portail tient encore. Espace pour recommencer le combat.', LARGEUR / 2, 194);
  ctx.fillText('Échap pour retourner à la base.', LARGEUR / 2, 212);
  ctx.textAlign = 'left';
  zone(0, 0, LARGEUR, HAUTEUR, 'rejouer-final');
}
