/* =============================================================================
   BRAD BITT, MAIS LE JEU — arenes et boss

   Tous les trois niveaux, une piece de l'appareil a raclette est gardee par un
   boss. Le principe demande dans les notes :

     « un Serra-Lourd faisant plus de degats avec plus de vie, ou pendant un
       moment il est blinde et il faut eliminer les autres ennemis aux alentours
       pour pouvoir de nouveau lui faire des degats »

   D'ou la structure du combat. Le boss a trois tranches de vie. A chaque
   tranche entamee il se blinde et appelle une vague de sbires : tant qu'il en
   reste un debout, les coups portes au boss rebondissent. La vague nettoyee,
   son blindage tombe et il repart, plus rapide et plus nerveux qu'avant.

   C'est ce qui evite le boss-sac-a-PV : le joueur ne gagne pas en tapant plus
   fort, il gagne en gerant la salle.

   L'arene est declaree dans le fichier du niveau (champ `arene`), jamais ici :
   ce fichier tient les regles, les niveaux tiennent la mise en scene.
   ========================================================================== */
'use strict';

/* Fractions de vie restantes auxquelles le boss se blinde. Trois seuils, donc
   trois vagues, donc quatre passages a l'attaque pour le joueur. */
const SEUILS_BLINDAGE = [0.72, 0.45, 0.2];

/* -----------------------------------------------------------------------------
   LE SECOND GENRE DE COMBAT : LA DUPLICATION (niveau 6)

   Le Serra-Seraphin ne se blinde pas, il se DIVISE. Trois fois au cours du
   combat, il eteint le manoir et se repand en copies identiques ; l'une
   d'elles est lui. Le joueur l'a vue au depart — elle clignote une seconde —
   puis tout se melange. Frapper la bonne l'assomme et lui retire sa
   resistance ; frapper une fausse la creve et relance un melange eclair.

   Ce que ce combat evite, par construction :

   - Aucune loterie. Le vrai est MONTRE avant le melange. Perdre sa trace est
     une faute d'attention, pas un tirage au sort.
   - Aucun blocage. Passe vingt secondes sans reponse, les copies se
     recomposent d'elles-memes : le joueur n'a rien gagne, mais rien n'est
     casse et le combat continue.
   - Aucune confusion entre les copies et les renforts. Les Spectres verts
     n'arrivent QUE pendant la phase geante, jamais pendant un melange : un
     ennemi different a l'ecran pendant le bonneteau donnerait au joueur une
     information qu'il n'a pas a avoir.
-------------------------------------------------------------------------- */

/* Seuils de duplication. Ils etaient a 75 / 50 / 25 % : avec une resistance
   qui ne laisse passer qu'un point tous les trois coups, le joueur devait en
   placer dix-huit avant de voir la premiere division. Le bonneteau est le
   coeur du combat, pas sa recompense finale — il doit arriver tot. */
const SEUILS_DUPLICATION = [0.9, 0.6, 0.3];
const COPIES_PAR_CYCLE = [5, 7, 9];
const DUREE_REVELATION = 1.5;                    // le vrai est designe
const DUREES_MELANGE = [3.4, 4.4, 5.4];
const INTERVALLES_ECHANGE = [0.58, 0.46, 0.36];  // entre deux permutations
const DUREE_ASSOMME = 3.6;                       // fenetre de degats pleins
const LIMITE_DUPLICATION = 20;                   // filet anti-blocage

const arene = {
  active: false,        // Brad est entre, le combat a commence
  finie: false,         // le boss est tombe
  boss: null,           // l'ennemi boss, tant qu'il vit
  blinde: false,
  vague: 0,             // combien de vagues ont deja ete appelees
  sbires: [],           // les renforts encore en vie
  tempsBlinde: 0,       // duree de la phase blindee en cours (filet anti-blocage)
  banniere: 0,          // duree restante du bandeau d'annonce
  message: '',
  messageT: 0,
  objetLache: false,
  secousseFin: 0,
  trampolines: [],      // {x, y, w, h, compression}

  // --- propres au combat de duplication ---
  phase: 'geant',       // geant | revelation | melange | choix | assomme
  tPhase: 0,
  cycle: 0,             // duplications deja jouees
  copies: [],
  slots: [],            // positions de repos des copies
  prochainEchange: 0,
  intervalleEchange: 0.5,
  tempsDup: 0,
  noirceur: 0,          // obscurite courante, 0 a 1
  noirceurCible: 0,
};

function reinitialiserArene() {
  arene.active = false;
  arene.finie = false;
  arene.boss = null;
  arene.blinde = false;
  arene.vague = 0;
  arene.sbires = [];
  arene.tempsBlinde = 0;
  arene.banniere = 0;
  arene.message = '';
  arene.messageT = 0;
  arene.objetLache = false;
  arene.secousseFin = 0;
  arene.trampolines = ARENE ? ARENE.trampolines.map(t => ({
    x: t.x, y: t.y, w: t.w, h: 10, compression: 0,
  })) : [];

  arene.phase = 'geant';
  arene.tPhase = 0;
  arene.cycle = 0;
  arene.copies = [];
  arene.slots = [];
  arene.prochainEchange = 0;
  arene.tempsDup = 0;
  // L'obscurite doit repartir a zero : mourir pendant un melange laissait
  // sinon le niveau entier dans le noir jusqu'a la fin de la partie.
  arene.noirceur = 0;
  arene.noirceurCible = 0;
}

/* La sortie du niveau reste verrouillee tant qu'un boss vit encore : un niveau
   a boss ne se contourne pas en courant vers la porte. */
function porteVerrouillee() {
  return !!ARENE && !arene.finie;
}

/* Brad est mort et le moteur vient de reconstruire la liste des ennemis a
   partir du decor : ni le boss ni ses renforts n'y figurent. Deux cas.

   - Combat non gagne : on remet l'arene a zero, le boss reapparaitra quand
     Brad refranchira la ligne d'entree.
   - Combat deja gagne : on n'y touche pas, sinon le boss ressusciterait. Mais
     si la piece etait tombee sans avoir ete ramassee, elle vient d'etre
     effacee avec le reste : on la repose, sans quoi elle serait perdue pour
     toujours et l'objet du niveau deviendrait inatteignable. */
function rejouerArene() {
  if (!ARENE) return;
  if (!arene.finie) { reinitialiserArene(); return; }

  const o = ARENE.objet ? OBJETS_MAJEURS.find(x => x.cle === ARENE.objet) : null;
  if (!o || aObjet(o.cle)) return;
  if (ramassages.some(r => r.genre === 'objet')) return;
  const dep = ARENE.depart;
  ramassages.push({
    genre: 'objet', objet: o.cle,
    x: dep.x - 9, y: dep.y - 40, w: 18, h: 18,
    vx: 0, vy: 0, vie: 9999, phase: 0,
  });
}

/* Les invocations n'ont pas d'index dans ENNEMIS_DEPART : on leur en donne un
   negatif, unique, qui ne heurtera jamais celui d'un ennemi du decor. Les
   ensembles d'ennemis elimines s'en accommodent, et reinitialiserEnnemis() ne
   parcourt que les indices positifs. */
let prochainIndexInvoque = -1;

function invoquer(type, xPx, yPx) {
  const e = creerEnnemi({ type, x: xPx / TUILE, y: yPx / TUILE }, prochainIndexInvoque--);
  e.dort = false;                 // un renfort appele est deja reveille
  e.etat = 'charge';
  e.invoque = true;
  ennemis.push(e);
  particules(xPx, yPx - e.h / 2, 10, '#ffd0a0');
  return e;
}

function annoncerArene(texte, duree) {
  arene.message = texte;
  arene.messageT = duree || 2.6;
}

/* -----------------------------------------------------------------------------
   DEROULEMENT DU COMBAT
-------------------------------------------------------------------------- */

function majArene(dt) {
  if (!ARENE) return;

  if (arene.messageT > 0) arene.messageT -= dt;
  if (arene.banniere > 0) arene.banniere -= dt;
  if (arene.secousseFin > 0) arene.secousseFin -= dt;

  /* L'obscurite se dissipe TOUJOURS, y compris une fois le combat fini.
     Elle etait geree dans le scenario de duplication, qui ne tourne plus des
     que le boss est tombe : s'il mourait pendant que la salle etait encore
     sombre — ce qui arrive a chaque fois, puisqu'on le tue assomme — le
     niveau restait a moitie eteint jusqu'a la porte. */
  if (arene.finie || !arene.active) arene.noirceurCible = 0;
  arene.noirceur += (arene.noirceurCible - arene.noirceur) * Math.min(1, 2.2 * dt);

  // --- Declenchement : Brad franchit la ligne d'entree ---------------------
  if (!arene.active && !arene.finie) {
    if (brad.x + brad.w / 2 > ARENE.x1) declencherArene();
    return;
  }
  if (!arene.active) return;

  // --- Le boss est tombe ---------------------------------------------------
  if (!arene.boss || arene.boss.etat === 'mort') {
    if (!arene.finie) terminerArene();
    return;
  }

  const b = arene.boss;

  /* Deux genres de combat, deux scenarios. Le genre est declare par le niveau
     et jamais devine : ajouter un troisieme boss se fera en ajoutant un
     scenario ici, sans toucher a celui des deux autres. */
  if (ARENE.genre === 'duplication') {
    majAreneDuplication(dt, b);
    return;
  }

  // --- Gestion du blindage -------------------------------------------------
  if (arene.blinde) {
    arene.tempsBlinde += dt;
    // Un sbire tombe au fond d'un trou disparait de `ennemis` : on filtre sur
    // la presence reelle, pas sur un compteur, sinon le blindage ne tombe
    // jamais et le combat se bloque.
    arene.sbires = arene.sbires.filter(s => s.etat !== 'mort' && ennemis.indexOf(s) >= 0);

    /* Filet de securite. Le blindage ne tombe normalement qu'une fois la salle
       vide — c'est la regle du combat. Mais un seul renfort devenu inatteignable
       (coince derriere un decor, parti trop haut) transformerait le combat en
       attente infinie, sans meme un ecran de mort pour en sortir. Passe une
       demi-minute, on rend donc la main au joueur. Aucune partie normale
       n'atteint ce delai : les vagues se nettoient en une dizaine de secondes. */
    const secours = arene.tempsBlinde > 30;

    if (arene.sbires.length === 0 || secours) {
      arene.blinde = false;
      b.blinde = false;
      b.enrage = arene.vague;                  // il accelere a chaque vague
      audio.bruit('victoire');
      annoncerArene(secours ? 'SON BLINDAGE LÂCHE TOUT SEUL' : 'BLINDAGE TOMBÉ — FRAPPE !', 2.2);
      particules(b.x + b.w / 2, b.y + b.h / 2, 26, '#ffe9a8');
      secousse(6, 0.3);
    }
  } else if (arene.vague < SEUILS_BLINDAGE.length &&
             b.pv <= b.pvMax * SEUILS_BLINDAGE[arene.vague]) {
    lancerVague();
  }

  // Le boss reste dans sa salle : rien ne l'oblige a poursuivre Brad dehors,
  // et le voir sortir de l'arene casserait la scene.
  const cx = b.x + b.w / 2;
  if (cx < ARENE.x1 + 20) { b.x = ARENE.x1 + 20 - b.w / 2; b.sens = 1; }
  if (cx > ARENE.x2 - 20) { b.x = ARENE.x2 - 20 - b.w / 2; b.sens = -1; }

  degagerDuBoss(b);
}

/* -----------------------------------------------------------------------------
   LE COMBAT DU SERAPHIN
-------------------------------------------------------------------------- */

function majAreneDuplication(dt, b) {
  arene.tPhase = Math.max(0, arene.tPhase - dt);

  switch (arene.phase) {
    case 'geant':
      arene.noirceurCible = 0;
      // Il reste dans sa salle, comme le Colosse.
      contenirDansArene(b);
      degagerDuBoss(b);
      if (arene.cycle < SEUILS_DUPLICATION.length &&
          b.pv <= b.pvMax * SEUILS_DUPLICATION[arene.cycle]) {
        lancerDuplication(b);
      }
      break;

    case 'revelation':
      arene.noirceurCible = 0.86;
      if (arene.tPhase <= 0) {
        arene.phase = 'melange';
        arene.tPhase = DUREES_MELANGE[Math.min(arene.cycle - 1, DUREES_MELANGE.length - 1)];
        arene.intervalleEchange =
          INTERVALLES_ECHANGE[Math.min(arene.cycle - 1, INTERVALLES_ECHANGE.length - 1)];
        arene.prochainEchange = 0;
        annoncerArene('SUIS-LE', 1.6);
      }
      break;

    case 'melange':
      arene.noirceurCible = 0.86;
      majEchanges(dt);
      if (arene.tPhase <= 0) {
        arene.phase = 'choix';
        // Pendant le choix, les copies continuent de bouger, mais lentement :
        // une scene figee donnerait l'impression que le jeu attend, alors que
        // c'est le joueur qui doit decider.
        arene.intervalleEchange = 1.5;
        annoncerArene('LEQUEL ?', 2.0);
      }
      break;

    case 'choix':
      arene.noirceurCible = 0.86;
      majEchanges(dt);
      arene.tempsDup += dt;
      if (arene.tempsDup > LIMITE_DUPLICATION) recomposerSeraphin(b, false);
      break;

    case 'assomme':
      arene.noirceurCible = 0;
      contenirDansArene(b);
      degagerDuBoss(b);
      if (arene.tPhase <= 0) {
        b.assomme = 0;
        arene.phase = 'geant';
        annoncerArene('IL SE RESSAISIT', 2.0);
        lancerVagueSpectres();
      }
      break;
  }
}

/* Ou la camera doit regarder, et avec quelle insistance.

   `poids` vaut 1 quand la camera doit se poser franchement sur les copies,
   0 quand elle appartient a Brad. Pendant la revelation, le joueur n'a rien
   d'autre a faire que regarder : la camera y va entierement. Pendant le
   melange, elle garde un quart de Brad pour qu'il reste situe. Au moment du
   choix, elle lui rend la main — c'est la qu'il doit se deplacer et frapper.

   Appele par majCamera(), qui interpole le poids : rien ne bascule d'un coup. */
function regardArene() {
  if (!ARENE || !arene.active || !arene.copies.length) return { x: null, poids: 0 };
  const poids = arene.phase === 'revelation' ? 1
              : arene.phase === 'melange' ? 0.75
              : 0;
  if (poids === 0) return { x: null, poids: 0 };

  /* Le centre de l'eventail, pas le centre de l'arene : si une copie est
     creuvee, le groupe se decale et la camera doit suivre ce qui reste. */
  let somme = 0;
  for (const c of arene.copies) somme += c.x + c.w / 2;
  return { x: somme / arene.copies.length, poids };
}

function contenirDansArene(b) {
  const cx = b.x + b.w / 2;
  if (cx < ARENE.x1 + 20) { b.x = ARENE.x1 + 20 - b.w / 2; b.sens = 1; }
  if (cx > ARENE.x2 - 20) { b.x = ARENE.x2 - 20 - b.w / 2; b.sens = -1; }
}

/* Les positions de repos des copies. Toutes sont a portee d'un saut : une
   copie hors d'atteinte transformerait l'enigme en attente, et la mauvaise
   reponse serait alors la seule accessible. */
/* Largeur maximale de l'eventail de copies. Elle n'a rien d'esthetique : les
   copies doivent TENIR DANS UN ECRAN. Etalees sur toute la largeur de l'arene
   (soixante-quatre tuiles), les deux extremites sortaient du champ, et suivre
   le vrai des yeux devenait impossible des qu'il passait par un bord — l'oeil
   perdait ce que le jeu lui demandait justement de garder. */
const ETALEMENT_COPIES = 460;

function poserSlots(nombre) {
  const centre = (ARENE.x1 + ARENE.x2) / 2;
  const demi = Math.min(ETALEMENT_COPIES, (ARENE.x2 - ARENE.x1) - 140) / 2;
  const gauche = centre - demi;
  const droite = centre + demi;
  const pas = (droite - gauche) / Math.max(1, nombre - 1);
  arene.slots = [];
  for (let i = 0; i < nombre; i++) {
    /* Trois hauteurs, toutes DANS la portee du coup. Brad mesure 46 px et
       frappe sur toute sa hauteur : une copie posee a plus de 60 px du sol
       aurait demande un saut parfaitement calé pour chaque tentative, et
       l'enigme serait devenue un exercice d'adresse. Les deux premieres
       rangees se frappent debout, la troisieme d'un petit saut. */
    arene.slots.push({
      x: gauche + i * pas,
      y: ARENE.sol - 52 - (i % 3) * 20,
    });
  }
}

function lancerDuplication(b) {
  arene.cycle++;
  arene.phase = 'revelation';
  arene.tPhase = DUREE_REVELATION;
  arene.tempsDup = 0;

  // Le geant quitte la scene : on le retire de la liste des ennemis pour qu'il
  // ne soit ni dessine, ni touche, ni percute pendant qu'il est « divise ».
  const i = ennemis.indexOf(b);
  if (i >= 0) ennemis.splice(i, 1);

  /* Les Spectres encore en vie s'evanouissent avec la lumiere. C'est la
     demande explicite : aucun ennemi d'une autre couleur ne doit se trouver a
     l'ecran pendant un melange, sous peine de renseigner le joueur — ou de le
     perdre — sur ce qu'il doit deviner seul. Ils ne sont pas « tues » : ils
     partent, et la vague suivante les remplacera. */
  for (let k = ennemis.length - 1; k >= 0; k--) {
    if (ennemis[k].type !== 'Serra-Spectre') continue;
    particules(ennemis[k].x + 12, ennemis[k].y + 14, 8, '#7effbe');
    ennemis.splice(k, 1);
  }
  arene.sbires = [];

  const nombre = COPIES_PAR_CYCLE[Math.min(arene.cycle - 1, COPIES_PAR_CYCLE.length - 1)];
  poserSlots(nombre);
  const vrai = Math.floor(Math.random() * nombre);

  arene.copies = arene.slots.map((s, k) => {
    const c = invoquer('Serra-Copie', s.x, s.y + 14);
    c.slot = k;
    c.vrai = k === vrai;
    c.x = s.x - c.w / 2;
    c.y = s.y;
    c.etat = 'patrouille';        // elles ne poursuivent pas : elles dansent
    return c;
  });

  audio.bruit('onde');
  secousse(8, 0.45);
  annoncerArene('IL SE DIVISE — REGARDE BIEN', 2.4);
}

/* Une permutation : deux copies echangent leur emplacement. Elles s'y rendent
   en glissant (voir majPilote), donc le croisement se VOIT — c'est la seule
   chose que le joueur ait a suivre. */
function majEchanges(dt) {
  if (arene.copies.length < 2) return;
  arene.prochainEchange -= dt;
  if (arene.prochainEchange > 0) return;
  arene.prochainEchange = arene.intervalleEchange;

  const a = Math.floor(Math.random() * arene.copies.length);
  let b = Math.floor(Math.random() * arene.copies.length);
  if (b === a) b = (b + 1) % arene.copies.length;
  const t = arene.copies[a].slot;
  arene.copies[a].slot = arene.copies[b].slot;
  arene.copies[b].slot = t;
}

/* Appele par blesserEnnemi() des qu'une copie est touchee, au poing comme au
   saut. */
function frapperCopie(c) {
  if (arene.phase !== 'melange' && arene.phase !== 'choix' &&
      arene.phase !== 'revelation') return;

  const i = arene.copies.indexOf(c);
  if (i >= 0) arene.copies.splice(i, 1);
  const j = ennemis.indexOf(c);
  if (j >= 0) ennemis.splice(j, 1);

  if (c.vrai) { assommerSeraphin(c.x + c.w / 2, c.y + c.h / 2); return; }

  // Une fausse : elle creve sans faire de mal, mais le melange repart de plus
  // belle. Deviner reste possible ; ça coute juste tout le benefice d'avoir
  // suivi le bon des yeux.
  particules(c.x + c.w / 2, c.y + c.h / 2, 12, '#c8a0ff');
  audio.bruit('ecrase');
  texteFlottant(c.x + c.w / 2, c.y, 'ce n\'était pas lui', '#c8a0ff');
  brad.vy = Math.min(brad.vy, -R.forceSaut * R.rebond);

  if (arene.copies.length > 1) {
    arene.phase = 'melange';
    arene.tPhase = 1.0;
    arene.intervalleEchange = 0.22;
    arene.prochainEchange = 0;
  } else {
    arene.phase = 'choix';
    arene.intervalleEchange = 1.5;
  }
}

function assommerSeraphin(x, y) {
  const b = arene.boss;
  // Toutes les autres copies s'evaporent.
  for (const c of arene.copies) {
    const j = ennemis.indexOf(c);
    if (j >= 0) ennemis.splice(j, 1);
    particules(c.x + c.w / 2, c.y + c.h / 2, 6, '#c8a0ff');
  }
  arene.copies = [];

  /* Il se recompose la ou la copie a ete touchee, mais DECALE du cote oppose a
     Brad et remonte d'un cran. Le joueur vient de sauter dessus : le laisser
     apparaitre pile sur lui donnait l'impression d'une punition immediate,
     meme sans degats. On lui laisse de la place, et une seconde d'invincibilite
     pour le cas ou la geometrie de l'arene ne le permette pas. */
  const versLoin = Math.sign(x - (brad.x + brad.w / 2)) || 1;
  b.x = x - b.w / 2 + versLoin * 30;
  b.y = Math.min(y - b.h / 2 - 20, ARENE.sol - b.h - 24);
  b.x = Math.max(ARENE.x1 + 10, Math.min(ARENE.x2 - 10 - b.w, b.x));
  b.vx = 0; b.vy = 0;
  b.assomme = DUREE_ASSOMME;
  b.piqueT = 0; b.prepareT = 0; b.recharge = 0;
  b.etat = 'charge';
  brad.invincible = Math.max(brad.invincible, 1.0);
  if (ennemis.indexOf(b) < 0) ennemis.push(b);

  arene.phase = 'assomme';
  arene.tPhase = DUREE_ASSOMME;
  audio.bruit('victoire');
  secousse(10, 0.5);
  particules(x, y, 26, '#ffe9a8');
  annoncerArene('C\'ÉTAIT LUI — FRAPPE !', 2.6);
}

/* Le filet : personne ne trouve, les copies se recomposent. Aucun degat pour
   le joueur, aucun pour le boss — on reprend simplement le combat. */
function recomposerSeraphin(b, touche) {
  for (const c of arene.copies) {
    const j = ennemis.indexOf(c);
    if (j >= 0) ennemis.splice(j, 1);
  }
  arene.copies = [];
  b.x = (ARENE.x1 + ARENE.x2) / 2 - b.w / 2;
  b.y = ARENE.sol - b.h - 110;
  b.vx = 0; b.vy = 0;
  b.assomme = 0;
  if (ennemis.indexOf(b) < 0) ennemis.push(b);
  arene.phase = 'geant';
  audio.bruit('blinde');
  secousse(7, 0.4);
  annoncerArene(touche ? 'IL SE RECOMPOSE' : 'TROP TARD — IL SE RECOMPOSE', 2.8);
  lancerVagueSpectres();
}

/* La volee de Spectres. Elle n'arrive JAMAIS pendant un melange : voir un
   ennemi d'une autre couleur au milieu des copies dirait au joueur ce qu'il
   doit deviner tout seul. Elle accompagne la phase geante, ou elle sert a
   l'empecher de marteler tranquillement. */
function lancerVagueSpectres() {
  const vague = (ARENE.renforts || [])[Math.min(arene.cycle - 1, (ARENE.renforts || []).length - 1)];
  if (!vague || !vague.length) return;
  arene.sbires = vague.map(r => invoquer(r.type, r.x, r.y));
  audio.bruit('onde');
}

/* -----------------------------------------------------------------------------
   PILOTAGE DU SERAPHIN ET DE SES COPIES

   Ecrit ici et non dans acteurs.js : ces deplacements ne decrivent pas un type
   d'ennemi, ils font partie de la mise en scene du combat.
-------------------------------------------------------------------------- */

/* HAUTEUR DE VOL. Elle etait de 118 px, et ces 118 px etaient un defaut de
   conception invisible a la lecture : avec un corps de 66 px, le bas du
   Seraphin se trouvait alors a six pixels AU-DESSUS du crane de Brad. Chaque
   coup demandait donc un saut, et il en fallait dix-huit qui portent avant que
   la premiere duplication ne se declenche. Le combat n'arrivait jamais a sa
   propre mecanique — un robot de test n'y parvenait pas en cinq minutes.

   A 96 px, le bas du boss descend dans la hauteur de Brad debout : on peut le
   frapper au sol, et le saut sert a le poursuivre quand il remonte. */
const HAUTEUR_VOL = 96;

/* LE PIQUÉ, ET LE TEMPS D'ESQUIVER.

   Premiere version : quatre dixiemes de seconde d'elan, puis une plongee a
   560 px/s vers la position de Brad AU MOMENT OU LA PLONGEE COMMENCE. Deux
   defauts qui se cumulaient :

     - quatre dixiemes, c'est moins que le temps de decider et de sauter ;
     - viser a la fin de l'elan rendait l'esquive pendant l'elan inutile, la
       cible suivait le joueur jusqu'au dernier instant.

   Desormais il VERROUILLE SA CIBLE AU DEBUT de l'elan, le montre par un trait
   au sol, et met presque une seconde a se lancer. Bouger pendant l'elan suffit
   donc a l'eviter — ce qui est exactement ce qu'un joueur essaie de faire. */
const PREPARATION_PIQUE = 0.9;    // duree de l'elan, cible deja verrouillee
const VITESSE_PIQUE = 460;
const REPOS_PIQUE = 3.2;          // avant qu'il puisse recommencer

function majPilote(e, dt, dx, dy) {
  if (e.t.pilotage === 'copie') return majCopie(e, dt);
  return majSeraphin(e, dt, dx, dy);
}

function majCopie(c, dt) {
  /* Toutes les copies doivent avoir EXACTEMENT la meme tete. La machine a
     etats des ennemis les faisait passer en « alerte » a l'approche de Brad,
     ce qui allumait un point d'exclamation au-dessus des plus proches : un
     signal qui ne veut rien dire mais qui attire l'oeil au pire moment. On les
     fige donc dans un etat unique. */
  c.etat = 'patrouille';
  c.dort = false;
  c.flash = 0;

  const s = arene.slots[c.slot];
  if (!s) return;
  const cibleX = s.x - c.w / 2;
  const cibleY = s.y + Math.sin(performance.now() / 700 + c.slot) * 4;
  // Glissement rapide mais continu : c'est le trajet qui doit se suivre a
  // l'oeil, pas la telepotation d'un point a l'autre.
  const k = Math.min(1, 5.5 * dt);
  c.x += (cibleX - c.x) * k;
  c.y += (cibleY - c.y) * k;
  c.vx = 0;
  c.sens = cibleX > c.x ? 1 : -1;
}

function majSeraphin(b, dt, dx, dy) {
  const solVol = ARENE ? ARENE.sol - HAUTEUR_VOL : brad.y;

  if (b.assomme > 0) {
    // Assomme : il tombe lentement et ne fait plus rien. C'est la fenetre.
    b.vy = Math.min(140, b.vy + 320 * dt);
    b.y = Math.min(b.y + b.vy * dt, ARENE.sol - b.h - 6);
    b.vx = 0;
    return;
  }

  b.recharge = Math.max(0, (b.recharge || 0) - dt);

  // --- Piqué : declenche par un coup encaisse (voir plus bas), prepare puis
  //     lance en ligne droite vers la position visee.
  if (b.prepareT > 0) {
    b.prepareT -= dt;
    b.vx = 0;
    // Il se cabre pendant l'elan : le mouvement annonce le piqué, et il ne
    // suit plus Brad — la cible est deja fixee.
    b.y += (solVol - 34 - b.y) * Math.min(1, 4 * dt);
    if (b.prepareT <= 0) {
      b.piqueT = 0.85;
      audio.bruit('onde');
    }
    return;
  }
  if (b.piqueT > 0) {
    b.piqueT -= dt;
    const vx = (b.viseX - (b.x + b.w / 2));
    const vy = (b.viseY - (b.y + b.h / 2));
    const d = Math.hypot(vx, vy) || 1;
    b.x += (vx / d) * VITESSE_PIQUE * dt;
    b.y += (vy / d) * VITESSE_PIQUE * dt;
    b.vx = (vx / d) * VITESSE_PIQUE;
    b.sens = Math.sign(b.vx) || b.sens;
    // Il ne traverse pas le sol.
    b.y = Math.min(b.y, ARENE.sol - b.h - 2);
    if (d < 26) b.piqueT = 0;
    return;
  }

  // --- Vol de croisiere : il suit Brad, sans jamais le rattraper d'un coup.
  const base = b.t.vitesse * vitesseEnnemiEffective() * 62;
  const viseX = brad.x + brad.w / 2 - b.w / 2;
  const ecart = viseX - b.x;
  b.vx = Math.max(-base, Math.min(base, ecart * 1.6));
  b.x += b.vx * dt;
  b.sens = Math.sign(ecart) || b.sens;

  const flotte = solVol + Math.sin(performance.now() / 900) * 12;
  b.y += (flotte - b.y) * Math.min(1, 1.6 * dt);
}

/* Declenche le piqué. Appele quand le Seraphin encaisse un coup : c'est ce qui
   punit le joueur qui reste colle dessous a marteler. */
function seraphinTouche(b) {
  if (b.assomme > 0 || b.piqueT > 0 || b.prepareT > 0 || b.recharge > 0) return;
  b.prepareT = PREPARATION_PIQUE;
  b.recharge = REPOS_PIQUE;
  // La cible est prise MAINTENANT, au debut de l'elan. C'est ce qui rend
  // l'esquive possible : bouger pendant que le boss se cabre suffit.
  b.viseX = brad.x + brad.w / 2;
  b.viseY = brad.y + brad.h / 2;
  texteFlottant(b.x + b.w / 2, b.y, 'il vise — bouge !', '#ff9ad0');
}

/* Le trait au sol pendant l'elan : il montre OU le piqué va tomber. Un
   avertissement sonore et un texte ne suffisent pas quand la salle est pleine
   de mouvement ; il faut voir l'endroit a quitter. */
function dessinerVisee() {
  const b = arene.boss;
  if (!b || b.prepareT <= 0 || b.viseX === undefined) return;
  const x = Math.round(b.viseX - cam.x);
  const sol = Math.round(ARENE.sol - cam.y);
  const avance = 1 - b.prepareT / PREPARATION_PIQUE;   // 0 au debut, 1 a la fin
  const t = performance.now() / 1000;

  // Le trait se resserre a mesure que l'echeance approche : la duree restante
  // se lit sans compter.
  const demi = 34 * (1 - avance * 0.55);
  ctx.fillStyle = 'rgba(255,120,180,' + (0.25 + 0.35 * avance).toFixed(2) + ')';
  ctx.fillRect(x - demi, sol - 3, demi * 2, 3);
  ctx.fillStyle = 'rgba(255,180,210,' + (0.4 + 0.4 * avance).toFixed(2) + ')';
  ctx.fillRect(x - 1, sol - 40, 2, 40);

  // Deux chevrons qui descendent : le sens de la menace.
  ctx.fillStyle = 'rgba(255,150,200,' + (0.5 + 0.3 * Math.sin(t * 9)).toFixed(2) + ')';
  for (let k = 0; k < 2; k++) {
    const cy = sol - 58 + ((t * 60 + k * 20) % 26);
    ctx.beginPath();
    ctx.moveTo(x - 6, cy);
    ctx.lineTo(x + 6, cy);
    ctx.lineTo(x, cy + 7);
    ctx.closePath();
    ctx.fill();
  }
}

/* -----------------------------------------------------------------------------
   NE PAS RESTER COINCE SUR LE BOSS

   Le Serra-Colosse est large et haut. Un Brad qui retombe dessus se retrouvait
   pose sur son crane, hors de portee de ses propres coups, pousse contre un mur
   de l'arene — et ne pouvait qu'attendre de mourir. Ce n'est pas une punition,
   c'est une impasse.

   Des qu'il se retrouve au-dessus, on l'ejecte : vers le centre de la salle
   s'il est dans un coin, sinon du cote oppose au boss. Et surtout, ce contact
   ne lui coute AUCUN degat — se cogner au sommet d'un boss n'est pas une faute
   de jeu, c'est le decor qui manque de place.
-------------------------------------------------------------------------- */
function degagerDuBoss(b) {
  if (b.etat === 'mort') return;

  const auDessus = brad.y + brad.h <= b.y + 18;
  const chevauchement = brad.x + brad.w > b.x + 2 && brad.x < b.x + b.w - 2 &&
                        brad.y + brad.h > b.y - 4 && brad.y < b.y + b.h;
  if (!auDessus || !chevauchement) return;

  const centreSalle = (ARENE.x1 + ARENE.x2) / 2;
  const bcx = brad.x + brad.w / 2;
  // Vers le centre de la salle, jamais vers le mur le plus proche.
  const sens = bcx < centreSalle ? 1 : -1;

  brad.x += sens * 6;
  brad.vx = sens * 260;
  brad.vy = -R.forceSaut * 0.72;         // un rebond franc, pas une chute molle
  brad.auSol = false;
  brad.invincible = Math.max(brad.invincible, 0.35);
  audio.bruit('saut');
  particules(bcx, brad.y + brad.h, 8, '#ffe9a8');
}

function declencherArene() {
  arene.active = true;
  // La musique du mini-boss remplace celle du niveau, et repart en fondu
  // court : le combat commence, on ne laisse pas trainer l'ambiance.
  if (ARENE.musique) audio.jouerMusiqueDifferee(sourceMusique(ARENE.musique), 0.6);
  arene.banniere = 3.2;
  const dep = ARENE.depart;
  arene.boss = creerEnnemi(
    { type: ARENE.boss, x: dep.x / TUILE, y: dep.y / TUILE }, prochainIndexInvoque--);
  arene.boss.dort = false;
  arene.boss.estBoss = true;
  ennemis.push(arene.boss);
  audio.bruit('porte');
  secousse(9, 0.5);
  annoncerArene(ARENE.nom, 3.2);
}

function lancerVague() {
  const vague = ARENE.renforts[Math.min(arene.vague, ARENE.renforts.length - 1)] || [];
  arene.vague++;
  arene.blinde = true;
  arene.tempsBlinde = 0;
  arene.boss.blinde = true;
  arene.sbires = vague.map(r => invoquer(r.type, r.x, r.y));
  audio.bruit('blinde');
  secousse(7, 0.4);
  annoncerArene('IL SE BLINDE — NETTOIE LA SALLE', 3.0);

  // Cas limite : une vague vide (ou un niveau mal decrit) laisserait le boss
  // blinde pour toujours. On refuse ce blocage tout de suite.
  if (arene.sbires.length === 0) {
    arene.blinde = false;
    arene.boss.blinde = false;
  }
}

function terminerArene() {
  arene.finie = true;
  // Une copie survivante resterait a flotter dans une salle sans boss.
  for (const c of arene.copies) {
    const j = ennemis.indexOf(c);
    if (j >= 0) ennemis.splice(j, 1);
  }
  arene.copies = [];
  arene.phase = 'geant';
  arene.noirceurCible = 0;
  if (ARENE.musique && AUDIO_NIVEAU) audio.jouerMusiqueDifferee(AUDIO_NIVEAU, 1.6);
  arene.active = false;
  arene.secousseFin = 1.2;
  secousse(12, 0.8);
  audio.bruit('victoire');

  if (partie.bossVaincus.indexOf(niveauCourant) < 0 && !ENTRAINEMENT) {
    partie.bossVaincus.push(niveauCourant);
    enregistrerPartie();
  }

  // La piece tombe au sol, a ramasser : la voir apparaitre et aller la
  // chercher vaut mieux que de la recevoir dans un ecran de bilan.
  const o = ARENE.objet ? OBJETS_MAJEURS.find(x => x.cle === ARENE.objet) : null;
  if (o && !aObjet(o.cle)) {
    const dep = ARENE.depart;
    ramassages.push({
      genre: 'objet', objet: o.cle,
      x: dep.x - 9, y: dep.y - 40, w: 18, h: 18,
      vx: 0, vy: -180,
      vie: 9999, phase: 0,
    });
    arene.objetLache = true;
    annoncerArene('IL A LÂCHÉ QUELQUE CHOSE', 3.4);
  } else {
    annoncerArene('LA SORTIE S\'OUVRE', 2.8);
  }
}

/* La piece ramassee pendant ce niveau, en attente d'etre commentee au retour
   a la base. Le BRADDY3000 doit parler de l'evenement, pas debiter sa phrase
   de mission habituelle. */
let objetFraisRamasse = null;

/* -----------------------------------------------------------------------------
   LES TRAMPOLINES DE L'ARENE

   Ils sont la pour une raison precise : sans eux, un joueur accule dans un
   coin par le boss n'avait plus aucune sortie. Le Colosse est plus large que
   Brad et le repousse contre le mur ; il n'y avait ni la place de le contourner
   ni la hauteur de lui passer par-dessus. Le combat se terminait par une mort
   qui ne devait rien au niveau de jeu.

   Chaque coin en a donc un. Il propulse Brad par-dessus le boss et lui rend
   l'initiative, sans lui donner de degats gratuits : on retombe derriere, il
   faut encore frapper.

   Appele depuis majBrad(), apres le deplacement vertical.
-------------------------------------------------------------------------- */

const IMPULSION_TRAMPOLINE = 1.55;      // multiplie la force de saut

function majTrampolines(dt) {
  for (const t of arene.trampolines) {
    if (t.compression > 0) t.compression = Math.max(0, t.compression - dt * 4);

    const dessus = brad.x + brad.w > t.x && brad.x < t.x + t.w &&
                   brad.y + brad.h >= t.y - 2 && brad.y + brad.h <= t.y + t.h + 6 &&
                   brad.vy >= 0;
    if (!dessus) continue;

    brad.y = t.y - brad.h;
    brad.vy = -R.forceSaut * IMPULSION_TRAMPOLINE;
    brad.rebond = 0.5;              // gravite normale pendant la montee
    brad.auSol = false;
    brad.etirement = 1.35;
    t.compression = 1;
    audio.bruit('saut');
    particules(brad.x + brad.w / 2, t.y, 8, '#7ee08a');
  }
}

function dessinerTrampolines() {
  for (const t of arene.trampolines) {
    const x = Math.round(t.x - cam.x);
    const y = Math.round(t.y - cam.y + t.compression * 5);
    if (x > LARGEUR + 40 || x + t.w < -40) continue;

    // Pieds
    ctx.fillStyle = '#2b2f3c';
    ctx.fillRect(x + 2, y + 6, 4, 14);
    ctx.fillRect(x + t.w - 6, y + 6, 4, 14);
    // Toile, qui s'enfonce quand on rebondit
    ctx.fillStyle = '#4a8f5c';
    ctx.fillRect(x, y, t.w, 6);
    ctx.fillStyle = '#7ee08a';
    ctx.fillRect(x, y, t.w, 2);
    // Ressorts
    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.lineWidth = 1;
    for (let k = 0; k <= 3; k++) {
      const sx = x + 4 + k * ((t.w - 8) / 3);
      ctx.beginPath(); ctx.moveTo(sx, y + 6); ctx.lineTo(sx, y + 14); ctx.stroke();
    }
    // Fleche vers le haut : le role de l'objet doit se lire sans notice.
    const a = 0.35 + 0.3 * Math.sin(performance.now() / 300);
    ctx.fillStyle = 'rgba(126,224,138,' + a.toFixed(2) + ')';
    ctx.beginPath();
    ctx.moveTo(x + t.w / 2, y - 16);
    ctx.lineTo(x + t.w / 2 - 6, y - 8);
    ctx.lineTo(x + t.w / 2 + 6, y - 8);
    ctx.closePath();
    ctx.fill();
  }
}

/* Appele par majRamassages() quand Brad touche une piece. */
function prendreObjet(cle) {
  const o = OBJETS_MAJEURS.find(x => x.cle === cle);
  if (!o) return;
  const nouveau = ramasserObjet(cle);
  audio.bruit('victoire');
  texteFlottant(brad.x + brad.w / 2, brad.y - 6, o.nom, '#e8b62c');
  annoncerArene(o.nom.toUpperCase(), 4.0);
  arene.messageT = 4.0;
  particules(brad.x + brad.w / 2, brad.y + brad.h / 2, 22, '#ffe9a8');
  if (nouveau) objetFraisRamasse = cle;
}

/* Consomme le drapeau : la replique speciale ne se dit qu'une fois. */
function prendreRepliqueObjet() {
  if (!objetFraisRamasse) return null;
  const t = repliqueObjetRapporte(objetFraisRamasse);
  objetFraisRamasse = null;
  return t;
}

/* -----------------------------------------------------------------------------
   RENDU
-------------------------------------------------------------------------- */

/* Les murs de la salle, dessines dans le repere du monde (appele depuis le
   rendu du niveau, camera deja appliquee). */
function dessinerArene() {
  if (!ARENE) return;
  const y0 = ARENE.sol;

  for (const x of [ARENE.x1, ARENE.x2]) {
    const dedans = x === ARENE.x1 ? 1 : -1;
    // Un montant de porte, ferme pendant le combat, ouvert apres.
    const ferme = arene.active;
    ctx.fillStyle = ferme ? 'rgba(200,70,60,.5)' : 'rgba(120,130,160,.28)';
    ctx.fillRect(x - 3, y0 - 132, 6, 132);
    ctx.fillStyle = ferme ? 'rgba(255,150,120,.75)' : 'rgba(170,180,210,.4)';
    ctx.fillRect(x - 3, y0 - 132, 6, 6);
    if (ferme) {
      // Barreaux : on voit tout de suite qu'on ne repart pas par la.
      ctx.fillStyle = 'rgba(220,110,90,.35)';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(x - 3 + dedans * (i * 5 + 4), y0 - 128, 3, 124);
      }
    }
  }
}

/* -----------------------------------------------------------------------------
   LES TROIS PIECES, DESSINEES

   En primitives, comme les cadenas : ce sont des objets uniques, ils doivent
   avoir exactement la meme tete au sol, dans la vitrine de la base et dans une
   bulle de dialogue. Un emoji de raclette n'existe pas, et un asset de plus
   pour trois icones ne se justifie pas.

   (cx, cy) est le CENTRE. `echelle` vaut 1 pour la taille de reference (18 px),
   `halo` ajoute l'aureole clignotante de l'objet pose au sol.
-------------------------------------------------------------------------- */

function dessinerObjetMajeur(cx, cy, cle, echelle, halo) {
  const e = echelle || 1;
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));

  if (halo) {
    const t = performance.now() / 1000;
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 4);
    ctx.fillStyle = '#e8b62c';
    ctx.beginPath();
    ctx.arc(0, 0, 13 * e, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.translate(0, Math.sin(t * 2.4) * 2 * e);
  }
  ctx.scale(e, e);

  if (cle === 'poelon') {
    // Un poelon : coupelle ovale, manche noir.
    ctx.fillStyle = '#2b2f3c';
    ctx.fillRect(2, -1, 11, 2.5);                 // manche
    ctx.fillStyle = '#8d939f';
    ctx.beginPath(); ctx.ellipse(-3, 0, 8, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c3c9d6';
    ctx.beginPath(); ctx.ellipse(-3, -1, 6.5, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f0d98a';                    // un reste de fromage
    ctx.beginPath(); ctx.ellipse(-3, -0.5, 4, 2.4, 0, 0, Math.PI * 2); ctx.fill();

  } else if (cle === 'garniture') {
    // Une meule entamee et deux tranches de charcuterie.
    ctx.fillStyle = '#c9a23c';
    ctx.fillRect(-9, -6, 11, 9);
    ctx.fillStyle = '#f0d98a';
    ctx.fillRect(-9, -6, 11, 2.5);
    ctx.fillStyle = '#a8842c';                    // les trous
    ctx.fillRect(-6, -2, 2, 2); ctx.fillRect(-2.5, 0.5, 2, 2);
    ctx.fillStyle = '#b4564f';
    ctx.beginPath(); ctx.arc(5, 1, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8f3f3c';
    ctx.beginPath(); ctx.arc(5, 1, 4.5, 0.4, 2.2); ctx.fill();
    ctx.fillStyle = '#e0a6a0';
    ctx.beginPath(); ctx.arc(3.6, -0.4, 1.1, 0, Math.PI * 2); ctx.fill();

  } else {
    // L'appareil : socle, resistance rouge, plateau.
    ctx.fillStyle = '#3a4055';
    ctx.fillRect(-10, 1, 20, 5);
    ctx.fillStyle = '#565f7d';
    ctx.fillRect(-10, -1, 20, 2.5);
    ctx.fillStyle = '#d8483c';                    // la resistance
    ctx.fillRect(-8, -3.5, 16, 2);
    ctx.fillStyle = '#8d939f';
    ctx.fillRect(-11, -8, 22, 3);                 // plateau superieur
    ctx.fillStyle = '#c3c9d6';
    ctx.fillRect(-11, -8, 22, 1.2);
    ctx.fillStyle = '#2b2f3c';
    ctx.fillRect(-12, 6, 3, 2); ctx.fillRect(9, 6, 3, 2);
  }

  ctx.restore();
}

/* -----------------------------------------------------------------------------
   L'OBSCURITE DU MANOIR

   Pendant le bonneteau, la salle s'eteint. Deux exigences, non negociables :

   1. La transition est CONTINUE. `arene.noirceur` rejoint sa cible par une
      interpolation ; rien ne bascule d'une image a l'autre. Un manoir qui
      clignote serait exactement le defaut corrige au niveau 3.
   2. Brad reste visible. Le voile est un degrade radial centre sur lui : on
      voit toujours ou l'on est, on ne voit plus le reste de la salle.

   Les copies, elles, luisent faiblement — sinon l'enigme deviendrait un test
   de vision plutot que d'attention.
-------------------------------------------------------------------------- */

function dessinerObscurite() {
  if (arene.noirceur <= 0.01) return;
  const n = arene.noirceur;
  const bx = Math.round(brad.x + brad.w / 2 - cam.x);
  const by = Math.round(brad.y + brad.h / 2 - cam.y);

  const g = ctx.createRadialGradient(bx, by, 26, bx, by, 210);
  g.addColorStop(0, 'rgba(6,4,14,0)');
  g.addColorStop(0.55, 'rgba(6,4,14,' + (0.55 * n).toFixed(3) + ')');
  g.addColorStop(1, 'rgba(6,4,14,' + (0.93 * n).toFixed(3) + ')');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
}

/* Les lueurs, dessinees APRES le voile : c'est ce qui rend les copies
   lisibles dans le noir. Le vrai porte un halo dore pendant la revelation, et
   seulement pendant elle. */
function dessinerLueursArene() {
  if (arene.noirceur <= 0.01 || !arene.copies.length) return;
  const n = arene.noirceur;

  for (const c of arene.copies) {
    const x = Math.round(c.x + c.w / 2 - cam.x);
    const y = Math.round(c.y + c.h / 2 - cam.y);
    const g = ctx.createRadialGradient(x, y, 2, x, y, 34);
    g.addColorStop(0, 'rgba(206,168,255,' + (0.5 * n).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(206,168,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 36, y - 36, 72, 72);
  }

  if (arene.phase !== 'revelation') return;
  const vrai = arene.copies.find(c => c.vrai);
  if (!vrai) return;
  const x = Math.round(vrai.x + vrai.w / 2 - cam.x);
  const y = Math.round(vrai.y + vrai.h / 2 - cam.y);
  const t = performance.now() / 1000;

  // Un halo dore, un anneau, et une fleche : trois signaux pour une seconde et
  // demie. C'est court, et c'est la seule information gratuite du combat.
  const g = ctx.createRadialGradient(x, y, 4, x, y, 46);
  g.addColorStop(0, 'rgba(255,220,120,.75)');
  g.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 48, y - 48, 96, 96);

  ctx.strokeStyle = 'rgba(255,233,168,' + (0.6 + 0.3 * Math.sin(t * 8)).toFixed(2) + ')';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 24 + Math.sin(t * 6) * 2, 0, Math.PI * 2);
  ctx.stroke();

  const fy = y - 40 - Math.abs(Math.sin(t * 5)) * 4;
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.moveTo(x, fy + 10);
  ctx.lineTo(x - 7, fy);
  ctx.lineTo(x + 7, fy);
  ctx.closePath();
  ctx.fill();

  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('LUI', x, fy - 4);
  ctx.textAlign = 'left';
}

/* Aureole de blindage autour du boss. Dessinee apres le sprite, dans le
   repere ecran. */
function dessinerBlindage(cx, bas, e) {
  /* Le Seraphin ne se blinde pas : il resiste, ou il est assomme. Deux etats
     qui doivent se voir d'un coup d'oeil, parce que toute la lecture du combat
     tient a savoir si les coups comptent. */
  if (e.t && e.t.resistance !== undefined && e.etat !== 'mort') {
    const t = performance.now() / 1000;
    if (e.assomme > 0) {
      // Assomme : des etoiles au-dessus de la tete, et rien d'autre.
      ctx.fillStyle = '#ffe9a8';
      for (let i = 0; i < 3; i++) {
        const a = t * 3 + (i * Math.PI * 2) / 3;
        const sx = cx + Math.cos(a) * 18;
        const sy = bas - e.h - 8 + Math.sin(a) * 5;
        ctx.fillRect(Math.round(sx) - 2, Math.round(sy) - 2, 4, 4);
      }
    } else {
      // Resistant : une coque violette, dense mais jamais opaque — il n'est
      // pas invulnerable et le dessin ne doit pas le laisser croire.
      ctx.save();
      ctx.translate(cx, bas - e.h / 2);
      ctx.strokeStyle = 'rgba(198,150,255,' + (0.35 + 0.15 * Math.sin(t * 3)).toFixed(2) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, e.w * 0.62, e.h * 0.58, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    return;
  }
  if (!e.blinde) return;
  const t = performance.now() / 1000;
  const r = e.w * 0.9 + Math.sin(t * 5) * 3;
  ctx.save();
  ctx.translate(cx, bas - e.h / 2);
  ctx.strokeStyle = 'rgba(120,190,255,' + (0.5 + 0.25 * Math.sin(t * 5)).toFixed(2) + ')';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t * 0.6;
    const px = Math.cos(a) * r, py = Math.sin(a) * r * 1.25;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

/* Barre de vie du boss et bandeaux, dessines par-dessus tout, en repere
   ecran. */
function hudArene() {
  if (!ARENE) return;
  const b = arene.boss;

  if (arene.active && b && b.etat !== 'mort') {
    const l = 300, x = (LARGEUR - l) / 2, y = 30;
    ctx.fillStyle = 'rgba(9,11,20,.7)';
    ctx.fillRect(x - 3, y - 15, l + 6, 26);

    /* L'etat du combat, en un mot. Il faut qu'on sache a tout instant si les
       coups portent : c'est la seule chose que le joueur ait besoin de lire
       pendant un combat de boss. */
    const duplication = ARENE.genre === 'duplication';
    const etats = {
      geant: ['IL RÉSISTE', '#c8a0ff'],
      revelation: ['REGARDE BIEN', '#ffe9a8'],
      melange: ['SUIS-LE', '#ffe9a8'],
      choix: ['LEQUEL ?', '#ffe9a8'],
      assomme: ['ASSOMMÉ — FRAPPE !', '#7ee08a'],
    };
    const etat = duplication ? etats[arene.phase] : null;
    const couleur = duplication ? etat[1] : (arene.blinde ? '#78beff' : '#e8b62c');

    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = couleur;
    ctx.fillText(ARENE.nom, x, y - 5);

    if (duplication) {
      ctx.textAlign = 'right';
      ctx.fillStyle = couleur;
      ctx.fillText(etat[0] + (arene.copies.length ? ' · ' + arene.copies.length + ' copies' : ''),
                   x + l, y - 5);
      ctx.textAlign = 'left';
    } else if (arene.blinde) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#78beff';
      ctx.fillText('BLINDÉ · ' + arene.sbires.length + ' restant' +
                   (arene.sbires.length > 1 ? 's' : ''), x + l, y - 5);
      ctx.textAlign = 'left';
    }

    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fillRect(x, y, l, 7);
    const f = Math.max(0, b.pv / b.pvMax);
    ctx.fillStyle = duplication
      ? (b.assomme > 0 ? '#7ee08a' : '#8b5fc0')
      : (arene.blinde ? '#4a86c8' : '#d8483c');
    ctx.fillRect(x, y, Math.round(l * f), 7);
    // Reperes des seuils : le joueur voit venir la prochaine bascule.
    ctx.fillStyle = 'rgba(9,11,20,.75)';
    for (const s of (duplication ? SEUILS_DUPLICATION : SEUILS_BLINDAGE)) {
      ctx.fillRect(x + Math.round(l * s), y, 2, 7);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + .5, y + .5, l - 1, 6);
  }

  if (arene.messageT > 0) {
    const a = Math.min(1, arene.messageT * 1.6);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(9,11,20,.72)';
    const w = ctx.measureText(arene.message).width + 30;
    ctx.fillRect((LARGEUR - w) / 2, 68, w, 28);
    ctx.fillStyle = arene.blinde ? '#78beff' : '#e8b62c';
    ctx.fillText(arene.message, LARGEUR / 2, 88);
    ctx.textAlign = 'left';
    ctx.restore();
  }
}
