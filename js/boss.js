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
/* -----------------------------------------------------------------------------
   LE TROISIEME GENRE DE COMBAT : LA PLUIE D'ASTEROIDES (niveau 9)

   Le Serra-Balistique ne se blinde pas et ne se divise pas : il ENCAISSE. Sa
   coque ne laisse passer qu'un quart des degats, et aucun coup de Brad n'y
   changera rien dans un delai raisonnable.

   Ce qui lui fait mal tombe du ciel. Le champ d'asteroides bombarde la salle
   en continu ; chaque impact est annonce une seconde et demie a l'avance par
   un cercle au sol, POSE LA OU SE TROUVE BRAD au moment de l'annonce.

   D'ou le combat : rester sur le cercle, laisser le Balistique venir — il
   marche vers Brad, moins vite que lui —, et s'ecarter au dernier instant. Le
   rocher trouve le boss a la place du joueur.

   Ce que cette construction garantit :

   - Aucun hasard. Le marquage suit Brad ; c'est LUI qui choisit ou tombera le
     prochain rocher. Rater l'appat est une erreur de placement, pas un tirage.
   - Deux esquives possibles. S'ecarter, ou sauter — un asteroide ne touche que
     ce qui est pres du sol, et le saut lunaire monte a 134 px. Les deux
     laissent le boss dessous.
   - Aucun blocage. La coque n'est pas une invulnerabilite : le joueur qui n'a
     rien compris finit par gagner au poing, tres lentement. Il n'est jamais
     enferme.
   - La fenetre de degats est PROPRE. Un boss assomme arrete la pluie : on ne
     lui fait pas payer sa recompense en le bombardant pendant qu'il frappe.
-------------------------------------------------------------------------- */

const ASTEROIDE = {
  annonce: 1.5,          // duree du marquage au sol, en secondes
  chute: 520,            // px/s — le rocher entre dans l'ecran ~0,55 s avant
  rayon: 30,             // demi-largeur de la zone d'impact
  hauteurLetale: 90,     // au-dessus, on est passe entre les gouttes
  degatsBrad: 2,
  degatsBoss: 7,
};

/* La cadence de la pluie se resserre a mesure que le boss faiblit : le combat
   s'accelere sans jamais changer de regle. */
const INTERVALLES_PLUIE = [3.4, 2.8, 2.2];
const DUREE_SONNE = 2.8;             // fenetre de degats apres un impact

/* -----------------------------------------------------------------------------
   LE QUATRIEME GENRE DE COMBAT : KIRBY 67 AU MANOIR (niveau 10)

   C'est le combat le plus DIRECT des quatre, et c'est deliberé. Les trois
   autres reposent chacun sur une regle qu'il faut comprendre avant de pouvoir
   gagner : vider la salle, suivre le bon volant, attirer le boss sous un
   rocher. Celui-ci n'en a aucune. On frappe Kirby 67, il perd de la vie.

   Deux raisons.

   1. C'EST LE DERNIER NIVEAU. Une cinquieme regle a apprendre a la onzieme
      heure ne recompense pas le joueur, elle le retarde.
   2. CE N'EST PAS LE VRAI COMBAT. Celui-la se joue ailleurs, et il a ses
      propres regles (js/final.js). Le combat du manoir est la pour donner un
      visage a l'adversaire, pas pour etre l'epreuve finale.

   Ce que Kirby 67 a, a la place d'une regle, c'est un RYTHME : il roule des
   meules, il aspire, il charge, il appelle sa garde. Et deux de ces quatre
   gestes — l'aspiration et la charge — sont exactement ceux qu'il reutilisera
   dans le combat final. On les apprend ici, sans enjeu, pour ne pas les
   decouvrir la-bas sous trois attaques simultanees.

   Il ne meurt pas non plus. Passe un certain seuil de vie, le combat s'arrete
   de lui-meme et la cinematique prend la main.
-------------------------------------------------------------------------- */

const KIRBY = {
  // La vie sous laquelle le combat cede la place a la cinematique. Ce n'est
  // pas zero : Kirby 67 doit rester debout pour se relever.
  finCombat: 4,
  seuilsGarde: [0.72, 0.45, 0.22],
  reposMin: 1.5,
  reposMax: 2.4,
  // L'aspiration. Elle tire Brad, elle ne le blesse pas : c'est un
  // deplacement force, et le contrer se fait en courant a contresens.
  dureeAspiration: 1.5,
  forceAspiration: 230,
  // La charge. Meme grammaire que le piqué du Seraphin : cible verrouillee au
  // debut de l'elan, trait au sol, presque une seconde pour s'ecarter.
  preparationCharge: 0.85,
  vitesseCharge: 470,
  degatsCharge: 3,
  reposCharge: 4.0,
  // Les meules de serrano, qui roulent au sol. Elles se sautent, et un coup de
  // poing les fait exploser — ce qui donne au joueur autre chose a faire que
  // d'attendre qu'elles passent.
  vitesseMeule: 200,
  degatsMeule: 2,
};

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
  retourMusique: 0,     // compte a rebours avant le retour du theme du niveau

  // --- propres au combat lunaire ---
  asteroides: [],       // {x, t, y, r, rot}
  prochaineChute: 0,
  sonneVu: false,       // le boss etait assomme a l'image precedente

  // --- propres au combat du manoir ---
  meules: [],           // {x, y, vx, r, rot}
  repos: 0,             // avant le prochain geste de Kirby 67
  gardes: 0,            // vagues de garde deja appelees
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
  arene.retourMusique = 0;

  /* Les rochers en vol doivent partir avec le reste. Mourir sous la pluie
     laissait sinon trois asteroides suspendus au-dessus d'une salle vide, qui
     tombaient sur Brad des sa reapparition. */
  arene.asteroides = [];
  arene.prochaineChute = 2.2;      // un temps de repit a l'entree dans la salle
  arene.sonneVu = false;

  arene.meules = [];
  arene.repos = 2.0;
  arene.gardes = 0;
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
  /* Vitesse d'extinction. Elle etait de 2,2 par seconde : le manoir mettait
     plus d'une seconde et demie a s'eteindre vraiment, et comme un joueur
     attentif designe la bonne copie en moins de temps que ça, l'obscurite
     n'atteignait jamais sa valeur pleine — on jouait le bonneteau dans une
     penombre tiede. A 3,6 la lumiere tombe en trois dixiemes de seconde, ce
     qui reste une transition continue et non un interrupteur. */
  if (arene.finie || !arene.active) arene.noirceurCible = 0;
  arene.noirceur += (arene.noirceurCible - arene.noirceur) * Math.min(1, 3.6 * dt);

  // Le retour de la musique du niveau, apres la fanfare de victoire.
  if (arene.retourMusique > 0) {
    arene.retourMusique -= dt;
    if (arene.retourMusique <= 0 && AUDIO_NIVEAU) {
      audio.jouerMusiqueDifferee(AUDIO_NIVEAU, 2.0);
    }
  }

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
  if (ARENE.genre === 'asteroides') {
    majAreneAsteroides(dt, b);
    return;
  }
  if (ARENE.genre === 'kirby') {
    majAreneKirby(dt, b);
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

/* -----------------------------------------------------------------------------
   LE COMBAT DU SERRA-BALISTIQUE
-------------------------------------------------------------------------- */

function majAreneAsteroides(dt, b) {
  contenirDansArene(b);
  degagerDuBoss(b);

  /* Bascule assomme -> debout. On la detecte par comparaison avec l'image
     precedente plutot qu'avec un minuteur separe : `assomme` est deja
     decremente par majEnnemis(), et deux compteurs pour un seul etat finissent
     toujours par se contredire. */
  if (b.assomme > 0) {
    arene.sonneVu = true;
  } else if (arene.sonneVu) {
    arene.sonneVu = false;
    arene.vague++;
    annoncerArene('IL SE RESSAISIT', 2.0);
    lancerRenforts(arene.vague - 1);
    // Un temps mort avant que la pluie ne reprenne : sortir d'une fenetre de
    // degats sous un rocher deja marque serait une punition qu'on n'a pas vue
    // venir.
    arene.prochaineChute = Math.max(arene.prochaineChute, 1.4);
  }

  majAsteroides(dt, b);
}

/* La cadence de la pluie, lue sur la vie du boss. */
function cadencePluie(b) {
  const f = b.pvMax > 0 ? b.pv / b.pvMax : 1;
  const i = f > 0.66 ? 0 : (f > 0.33 ? 1 : 2);
  return INTERVALLES_PLUIE[i];
}

function majAsteroides(dt, b) {
  /* Pendant qu'il est sonne, le ciel se tait. Voir le commentaire d'en-tete.
     La condition s'ecrit `!(… > 0)` et non `… <= 0` : un ennemi qui n'a jamais
     ete assomme portait autrefois `undefined`, et `undefined <= 0` vaut faux.
     `assomme` est desormais initialise a zero, mais la forme negative reste la
     bonne — elle ne peut pas se retourner contre nous. */
  if (!(b.assomme > 0)) {
    arene.prochaineChute -= dt;
    if (arene.prochaineChute <= 0) {
      arene.prochaineChute = cadencePluie(b);
      lancerAsteroide();
    }
  }

  for (let i = arene.asteroides.length - 1; i >= 0; i--) {
    const a = arene.asteroides[i];
    a.t -= dt;
    a.rot += dt * 2.6;
    /* La position VERTICALE se deduit du temps restant, elle ne s'integre pas.
       Un rocher qui accumulerait sa propre vitesse finirait par ne plus tomber
       exactement quand le cercle se ferme — et c'est precisement cette
       promesse-la que le combat demande de tenir. */
    a.y = ARENE.sol - ASTEROIDE.chute * Math.max(0, a.t);
    if (a.t > 0) continue;
    impactAsteroide(a, b);
    arene.asteroides.splice(i, 1);
  }
}

/* Le marquage tombe LA OU EST BRAD. C'est ce qui fait de la pluie un outil et
   non une nuisance : le joueur choisit l'endroit, le boss vient a lui. */
function lancerAsteroide() {
  const marge = ASTEROIDE.rayon + 14;
  const x = Math.max(ARENE.x1 + marge,
            Math.min(ARENE.x2 - marge, brad.x + brad.w / 2));
  arene.asteroides.push({
    x,
    t: ASTEROIDE.annonce,
    y: ARENE.sol - ASTEROIDE.chute * ASTEROIDE.annonce,
    r: 13 + Math.random() * 5,
    rot: Math.random() * 6.28,
  });
  audio.bruit('asteroide');
}

/* Un corps est-il dans la zone d'impact ? Deux conditions, et la seconde est
   la moitie du jeu : il faut etre PRES DU SOL. Sauter est une esquive au meme
   titre que s'ecarter. */
function toucheParImpact(a, c) {
  const cx = c.x + c.w / 2;
  if (Math.abs(cx - a.x) > ASTEROIDE.rayon + c.w / 2) return false;
  return c.y + c.h > ARENE.sol - ASTEROIDE.hauteurLetale;
}

function impactAsteroide(a, b) {
  particules(a.x, ARENE.sol - 4, 22, '#c9b9a4');
  particules(a.x, ARENE.sol - 4, 10, '#ff9a5c');
  secousse(9, 0.45);
  audio.bruit('ecrase');

  // Le boss. C'est LA maniere de lui faire mal, et la seule qui vaille.
  if (b.etat !== 'mort' && toucheParImpact(a, b)) {
    blesserEnnemi(b, ASTEROIDE.degatsBoss, Math.sign((b.x + b.w / 2) - a.x) || 1,
                  true, true);
    if (b.etat !== 'mort') {
      b.assomme = DUREE_SONNE;
      b.rechargeTir = DUREE_SONNE;
      audio.bruit('victoire');
      annoncerArene('EN PLEIN DESSUS — FRAPPE !', 2.6);
      texteFlottant(b.x + b.w / 2, b.y, 'assommé', '#7ee08a');
    }
  }

  if (brad.invincible <= 0 && brad.scenarise <= 0 && toucheParImpact(a, brad)) {
    blesserBrad(ASTEROIDE.degatsBrad, a.x, 'astéroïde');
  }
}

/* Les renforts, appeles quand le boss se ressaisit. Generique : la duplication
   s'en sert aussi (voir lancerVagueSpectres). */
function lancerRenforts(index) {
  const listes = ARENE.renforts || [];
  if (!listes.length) return;
  const vague = listes[Math.min(Math.max(0, index), listes.length - 1)];
  if (!vague || !vague.length) return;
  arene.sbires = vague.map(r => invoquer(r.type, r.x, r.y));
  audio.bruit('onde');
}

/* Le pilotage du Balistique. Il marche, il tire, et quand il est sonne il ne
   fait plus rien du tout. */
function majBalistique(b, dt) {
  const poser = () => {
    b.vy = Math.min(R.chuteMax, b.vy + graviteCourante() * dt);
    b.y += b.vy * dt;
    if (b.y > ARENE.sol - b.h) { b.y = ARENE.sol - b.h; b.vy = 0; }
  };

  if (b.assomme > 0) {
    b.vx = 0;
    poser();
    return;
  }

  /* Vitesse de marche : 1,6 x 42 = 67 px/s, contre 150 au PAS pour Brad. Il ne
     rattrape donc jamais personne — c'est la condition pour que rester sur un
     marquage soit un choix et non une condamnation. Le facteur 1,4 sur l'ecart
     le fait ralentir quand il arrive au contact : il s'attarde sous le cercle
     au lieu de le traverser. */
  const base = b.t.vitesse * vitesseEnnemiEffective();
  const ecart = (brad.x + brad.w / 2) - (b.x + b.w / 2);
  b.sens = Math.sign(ecart) || b.sens;
  b.vx = Math.max(-base, Math.min(base, ecart * 1.4));
  b.x += b.vx * dt;
  poser();

  // Le tir. Meme cloche que le Lanceur ordinaire — c'est sa famille — mais
  // plus lente, et il tire en marchant.
  b.rechargeTir = (b.rechargeTir || 0) - dt;
  if (b.rechargeTir > 0) return;
  b.rechargeTir = b.t.cadence;
  const dist = Math.abs(ecart);
  boules.push({
    x: b.x + b.w / 2 - 7, y: b.y + 10, w: 14, h: 14,
    vx: b.sens * Math.min(240, 120 + dist * 0.5),
    vy: -150 - Math.min(110, dist * 0.3),
    aBrad: false, vie: 9, phase: 0, posee: 0,
  });
}

/* -----------------------------------------------------------------------------
   LE COMBAT DU MANOIR
-------------------------------------------------------------------------- */

function majAreneKirby(dt, b) {
  contenirDansArene(b);
  degagerDuBoss(b);
  majMeules(dt);

  /* LE COMBAT S'ARRETE AVANT LA MORT. C'est ce qui permet la suite de
     l'histoire : Kirby 67 doit rester debout pour se relever, faire sauter son
     manoir et partir. Passer par tuerEnnemi() puis « ressusciter » le
     personnage pour la cinematique donnerait une seconde de flottement pendant
     laquelle il serait affiche mort. */
  if (b.pv <= KIRBY.finCombat) { terminerCombatManoir(b); return; }

  // La garde arrive a heure fixe, sur les seuils de vie.
  if (arene.gardes < KIRBY.seuilsGarde.length &&
      b.pv <= b.pvMax * KIRBY.seuilsGarde[arene.gardes]) {
    appelerLaGarde(b);
  }

  arene.tPhase = Math.max(0, arene.tPhase - dt);

  switch (arene.phase) {
    case 'appel':
      // Il claque des doigts. Une seconde et demie ou l'on ne peut rien lui
      // faire — assez pour que le geste se lise, trop court pour ennuyer.
      if (arene.tPhase <= 0) { arene.phase = 'attente'; arene.repos = 0.6; }
      break;

    case 'aspire':
      // Il inspire. Brad est TIRE vers lui, il n'est pas blesse : la punition,
      // c'est de se retrouver au contact avec une charge qui arrive.
      if (arene.tPhase > 0) {
        const vers = Math.sign((b.x + b.w / 2) - (brad.x + brad.w / 2)) || 1;
        brad.x += vers * KIRBY.forceAspiration * dt;
        if (Math.random() < 0.4) {
          particules(brad.x + brad.w / 2, brad.y + 10, 1, '#ffe9a8');
        }
      } else {
        arene.phase = 'attente';
        arene.repos = 0.5;
      }
      break;

    case 'charge':
      /* On attend l'ELAN **ET** la course. La version precedente ne testait que
         `chargeT`, qui vaut encore zero pendant les huit dixiemes de seconde
         d'elan : la phase retombait donc a « attente » des l'image suivante, et
         le boss se remettait a choisir un geste PENDANT qu'il chargeait. Il
         roulait une meule au milieu de sa propre course, ou relancait une
         seconde charge par-dessus la premiere. */
      if (b.prepareT > 0 || b.chargeT > 0) break;   // majKirby la joue
      arene.phase = 'attente';
      arene.repos = 1.0;
      break;

    default:
      arene.repos -= dt;
      if (arene.repos <= 0) choisirGesteKirby(b);
      break;
  }
}

/* Le choix du prochain geste. Il depend de la DISTANCE, pas du hasard seul :
   un boss qui aspire un joueur deja colle a lui, ou qui charge a bout portant,
   donne l'impression de tirer au sort. */
function choisirGesteKirby(b) {
  const ecart = Math.abs((b.x + b.w / 2) - (brad.x + brad.w / 2));
  const tirage = Math.random();

  /* Le seuil etait a 190 px. Or Kirby 67 vise une distance de confort de 150
     et s'y tient a une quarantaine de pixels pres : la condition n'etait
     presque jamais vraie, et un joueur qui restait au contact ne voyait jamais
     l'aspiration — c'est-a-dire jamais le geste que le manoir est justement
     charge de lui apprendre avant le combat final. */
  if (ecart > 140 && tirage < 0.45) {
    arene.phase = 'aspire';
    arene.tPhase = KIRBY.dureeAspiration;
    audio.bruit('onde');
    annoncerArene('IL ASPIRE — RECULE !', 1.8);
    return;
  }
  /* `!(x > 0)` et non `x <= 0` : `reposCharge` vaut `undefined` tant que
     majKirby n'a pas tourne une premiere fois, et `undefined <= 0` est FAUX en
     JavaScript. Ecrite dans l'autre sens, la condition interdisait la toute
     premiere charge du combat. C'est le meme piege que `assomme` au niveau 9. */
  if (ecart > 110 && !(b.reposCharge > 0) && tirage < 0.75) {
    lancerChargeKirby(b);
    return;
  }
  lancerMeule(b);
  arene.repos = KIRBY.reposMin + Math.random() * (KIRBY.reposMax - KIRBY.reposMin);
}

function lancerChargeKirby(b) {
  arene.phase = 'charge';
  b.prepareT = KIRBY.preparationCharge;
  b.reposCharge = KIRBY.reposCharge;
  b.viseX = brad.x + brad.w / 2;
  b.viseY = ARENE.sol;
  audio.bruit('blinde');
  texteFlottant(b.x + b.w / 2, b.y, 'il vise — bouge !', '#7ee0ff');
}

/* La meule de serrano. Elle roule au sol, saute par-dessus rien, et s'arrete
   au mur. Un coup de poing la fait eclater : c'est la seule chose de ce combat
   qui recompense l'attaque sans viser le boss. */
function lancerMeule(b) {
  const vers = Math.sign((brad.x + brad.w / 2) - (b.x + b.w / 2)) || 1;
  arene.meules.push({
    x: b.x + b.w / 2 + vers * 14,
    y: ARENE.sol - 13,
    vx: vers * KIRBY.vitesseMeule,
    r: 13,
    rot: 0,
  });
  b.sens = vers;
  audio.bruit('coup');
}

function majMeules(dt) {
  for (let i = arene.meules.length - 1; i >= 0; i--) {
    const m = arene.meules[i];
    m.x += m.vx * dt;
    m.rot += (m.vx / m.r) * dt;

    // Le mur de l'arene l'arrete.
    if (m.x < ARENE.x1 + 8 || m.x > ARENE.x2 - 8) {
      particules(m.x, m.y, 10, '#e8c98a');
      arene.meules.splice(i, 1);
      continue;
    }

    // Le coup de poing de Brad la fait eclater.
    if (brad.attaque > 0) {
      const z = zoneAttaque();
      if (m.x > z.x - m.r && m.x < z.x + z.w + m.r &&
          m.y > z.y - m.r && m.y < z.y + z.h + m.r) {
        particules(m.x, m.y, 14, '#f0d98a');
        audio.bruit('ecrase');
        texteFlottant(m.x, m.y - 14, 'meule brisée', '#f0d98a');
        arene.meules.splice(i, 1);
        continue;
      }
    }

    if (brad.invincible <= 0 && brad.scenarise <= 0 &&
        Math.abs(m.x - (brad.x + brad.w / 2)) < m.r + brad.w / 2 &&
        brad.y + brad.h > m.y - m.r && brad.y < m.y + m.r) {
      blesserBrad(KIRBY.degatsMeule, m.x, 'meule de serrano');
      particules(m.x, m.y, 10, '#e8c98a');
      arene.meules.splice(i, 1);
    }
  }
}

function appelerLaGarde(b) {
  arene.gardes++;
  arene.phase = 'appel';
  arene.tPhase = 1.5;
  b.invincibleCourt = 1.5;
  lancerRenforts(arene.gardes - 1);
  secousse(6, 0.35);
  annoncerArene('IL APPELLE SA GARDE', 2.4);
}

/* Le pilotage de Kirby 67 au manoir : il garde ses distances, sauf quand il
   charge. Ecrit ici et non dans acteurs.js — comme celui du Seraphin — parce
   que c'est de la mise en scene de combat, pas un comportement de type. */
function majKirby(b, dt) {
  b.reposCharge = Math.max(0, (b.reposCharge || 0) - dt);
  b.invincibleCourt = Math.max(0, (b.invincibleCourt || 0) - dt);

  const poser = () => {
    b.vy = Math.min(R.chuteMax, b.vy + graviteCourante() * dt);
    b.y += b.vy * dt;
    if (b.y > ARENE.sol - b.h) { b.y = ARENE.sol - b.h; b.vy = 0; }
  };

  // --- L'elan de la charge : il se ramasse, la cible est deja fixee.
  if (b.prepareT > 0) {
    b.prepareT -= dt;
    b.vx = 0;
    poser();
    if (b.prepareT <= 0) {
      b.chargeT = 0.9;
      audio.bruit('onde');
    }
    return;
  }
  if (b.chargeT > 0) {
    b.chargeT -= dt;
    const vers = Math.sign(b.viseX - (b.x + b.w / 2)) || b.sens;
    b.vx = vers * KIRBY.vitesseCharge;
    b.x += b.vx * dt;
    b.sens = vers;
    poser();
    // Il ne blesse qu'en chargeant : c'est la regle `degatsAuContact: false`
    // du type, et `chargeT` est la fenetre ou elle est levee.
    if (Math.abs(b.viseX - (b.x + b.w / 2)) < 20) b.chargeT = 0;
    return;
  }

  // --- L'aspiration : il est plante, bras ouverts.
  if (arene.phase === 'aspire' || arene.phase === 'appel') {
    b.vx = 0;
    b.sens = Math.sign((brad.x + brad.w / 2) - (b.x + b.w / 2)) || b.sens;
    poser();
    return;
  }

  /* --- Sinon il MAINTIENT SA DISTANCE. Il ne fonce pas sur Brad — un boss qui
     colle au joueur transforme un combat de rythme en bousculade, c'est le
     defaut corrige sur le Seraphin. Il vise une distance de confort et s'y
     tient, ce qui laisse au joueur le choix d'approcher ou non. */
  const base = b.t.vitesse * vitesseEnnemiEffective();
  const ecart = (brad.x + brad.w / 2) - (b.x + b.w / 2);
  const distance = Math.abs(ecart);
  const CONFORT = 150;
  let cible = 0;
  if (distance > CONFORT + 40) cible = Math.sign(ecart) * base;
  else if (distance < CONFORT - 40) cible = -Math.sign(ecart) * base * 1.3;
  b.vx = cible;
  b.x += b.vx * dt;
  if (Math.abs(ecart) > 4) b.sens = Math.sign(ecart);
  poser();
}

/* Fin du premier combat. Le boss reste debout, la salle se vide, et la
   cinematique prend la main — elle vit dans js/dialogue.js. */
function terminerCombatManoir(b) {
  arene.finie = true;
  arene.active = false;
  arene.meules.length = 0;
  arene.phase = 'attente';
  b.pv = Math.max(1, KIRBY.finCombat);
  b.vx = 0;
  b.prepareT = 0; b.chargeT = 0;

  // Les gardes encore debout s'evanouissent : la scene qui suit doit etre a
  // deux personnages, pas a sept.
  for (let i = ennemis.length - 1; i >= 0; i--) {
    if (ennemis[i] === b) continue;
    particules(ennemis[i].x + 12, ennemis[i].y + 14, 6, '#e8c98a');
    ennemis.splice(i, 1);
  }
  arene.sbires = [];

  audio.arreterMusique(0.5);
  secousse(10, 0.7);
  if (typeof lancerFinDuManoir === 'function') lancerFinDuManoir();
}

/* Les meules, dessinees. Une roue de serrano vue de face : croute plus sombre,
   pate claire, et une marque qui tourne pour qu'on voie qu'elle roule. */
function dessinerMeules() {
  if (!ARENE || !arene.meules.length) return;
  for (const m of arene.meules) {
    const x = Math.round(m.x - cam.x);
    const y = Math.round(m.y - cam.y);
    if (x < -40 || x > LARGEUR + 40) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(m.rot);
    ctx.fillStyle = '#8d6a34';
    ctx.beginPath(); ctx.arc(0, 0, m.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8c98a';
    ctx.beginPath(); ctx.arc(0, 0, m.r - 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c9a45c';
    ctx.beginPath(); ctx.arc(-3, -3, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, 2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(-m.r + 2, -1, m.r * 2 - 4, 2);
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.ellipse(x, Math.round(ARENE.sol - cam.y), m.r * 0.8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* Le souffle de l'aspiration : des traits qui convergent vers Kirby 67. Sans
   image, l'effet ne se distinguerait pas d'un bug de deplacement. */
function dessinerAspiration() {
  if (!ARENE || ARENE.genre !== 'kirby' || arene.phase !== 'aspire') return;
  const b = arene.boss;
  if (!b) return;
  const bx = Math.round(b.x + b.w / 2 - cam.x);
  const by = Math.round(b.y + b.h * 0.4 - cam.y);
  const t = performance.now() / 1000;
  ctx.strokeStyle = 'rgba(150,230,255,.5)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + t * 1.4;
    const d1 = 90 - ((t * 130 + k * 20) % 78);
    const d2 = d1 + 20;
    ctx.beginPath();
    ctx.moveTo(bx + Math.cos(a) * d2, by + Math.sin(a) * d2 * 0.6);
    ctx.lineTo(bx + Math.cos(a) * d1, by + Math.sin(a) * d1 * 0.6);
    ctx.stroke();
  }
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
  /* PENDANT LA REVELATION, ON REGARDE — ON NE FRAPPE PAS.

     Le vrai est montre avec un halo et une fleche : pouvoir le toucher a cet
     instant supprimerait purement et simplement l'enigme, puisqu'il suffirait
     de frapper la copie designee. Un joueur rapide gagnait ainsi le combat
     sans jamais voir un seul melange.

     On le refuse donc, et on le DIT : un coup qui ne fait rien sans explication
     passe pour un bug. */
  if (arene.phase === 'revelation') {
    audio.bruit('blinde');
    texteFlottant(c.x + c.w / 2, c.y, 'regarde d\'abord', '#ffe9a8');
    return;
  }
  if (arene.phase !== 'melange' && arene.phase !== 'choix') return;

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
  lancerRenforts(arene.cycle - 1);
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
  if (e.t.pilotage === 'balistique') return majBalistique(e, dt);
  if (e.t.pilotage === 'kirby') return majKirby(e, dt);
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

  /* --- Vol de croisiere : il suit Brad, sans jamais pouvoir le rattraper.

     ERREUR CORRIGEE ICI. La ligne etait :

         const base = b.t.vitesse * vitesseEnnemiEffective() * 62;

     J'avais pris `vitesseEnnemiEffective()` pour un multiplicateur autour de 1.
     C'est une VITESSE EN PIXELS PAR SECONDE — 42 par defaut. Le facteur 62 la
     multipliait donc une seconde fois : le Seraphin volait a 2 083 px/s, soit
     huit fois la course de Brad. Il traversait l'arene en un tiers de seconde
     des l'entree et ne le lachait plus jamais.

     Sans le facteur, il vole a 92 px/s : plus lent que la MARCHE de Brad (150).
     On peut donc toujours s'en eloigner, ce qui est la condition pour que le
     combat soit une question de placement et non d'endurance. */
  const base = b.t.vitesse * vitesseEnnemiEffective();
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
  /* La duree de l'elan depend du boss : le Seraphin met 0,9 s a piquer, Kirby
     67 met 0,85 s a charger. Le trait se resserre en fonction de l'echeance
     REELLE — le figer sur une seule des deux valeurs ferait mentir le seul
     repere temporel de l'esquive. */
  const duree = ARENE.genre === 'kirby' ? KIRBY.preparationCharge : PREPARATION_PIQUE;
  const avance = 1 - b.prepareT / duree;               // 0 au debut, 1 a la fin
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
   LA PLUIE, DESSINEE

   Deux passes, et l'ordre compte.

   1. LE MARQUAGE AU SOL, pose AVANT les acteurs. C'est une marque sur le
      terrain : la voir par-dessus Brad donnerait un autocollant flottant, et
      surtout on ne saurait plus si l'on est dedans ou devant.
   2. LE ROCHER, dessine APRES tout le monde. Il arrive du ciel, il passe
      devant.

   Le cercle se RESSERRE a mesure que l'echeance approche, exactement comme le
   trait de visee du Seraphin : la duree restante se lit sans compter.
-------------------------------------------------------------------------- */

function dessinerMarquagesAsteroides() {
  if (!ARENE || !arene.asteroides.length) return;
  const sol = Math.round(ARENE.sol - cam.y);
  const t = performance.now() / 1000;

  for (const a of arene.asteroides) {
    const x = Math.round(a.x - cam.x);
    if (x < -80 || x > LARGEUR + 80) continue;
    const avance = 1 - Math.max(0, a.t) / ASTEROIDE.annonce;   // 0 -> 1
    const r = ASTEROIDE.rayon * (1.35 - avance * 0.35);

    // Le disque : discret au debut, franc a la fin.
    ctx.save();
    ctx.translate(x, sol - 1);
    ctx.scale(1, 0.34);                       // vu en perspective, c'est une ellipse
    ctx.fillStyle = 'rgba(255,140,80,' + (0.10 + 0.26 * avance).toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,120,' + (0.45 + 0.45 * avance).toFixed(2) + ')';
    ctx.lineWidth = 2 / 0.34;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    // L'anneau interieur, qui se ferme : la seconde qui reste, en image.
    ctx.strokeStyle = 'rgba(255,236,190,' + (0.3 + 0.6 * avance).toFixed(2) + ')';
    ctx.lineWidth = 1.6 / 0.34;
    ctx.beginPath(); ctx.arc(0, 0, r * (1 - avance) + 3, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // La croix de visee, en vraies proportions par-dessus l'ellipse.
    ctx.fillStyle = 'rgba(255,210,150,' + (0.35 + 0.45 * Math.abs(Math.sin(t * 8))).toFixed(2) + ')';
    ctx.fillRect(x - r, sol - 2, r * 2, 1);
    ctx.fillRect(x - 1, sol - 8, 2, 8);
  }
}

function dessinerAsteroides() {
  if (!ARENE || !arene.asteroides.length) return;

  for (const a of arene.asteroides) {
    const x = Math.round(a.x - cam.x);
    const y = Math.round(a.y - cam.y);
    if (x < -90 || x > LARGEUR + 90 || y > HAUTEUR + 60) continue;

    // La trainee : elle dit d'ou ça vient et a quelle vitesse.
    const g = ctx.createLinearGradient(0, y - 90, 0, y);
    g.addColorStop(0, 'rgba(255,140,60,0)');
    g.addColorStop(1, 'rgba(255,170,90,.5)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 4, y - 90, 8, 90);

    // Le rocher : un polygone irregulier, jamais un cercle — un caillou rond
    // se lirait comme une balle.
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a.rot);
    ctx.fillStyle = '#6e6455';
    ctx.beginPath();
    for (let k = 0; k < 7; k++) {
      const ang = (k / 7) * Math.PI * 2;
      const rr = a.r * (0.78 + ((k * 37) % 11) / 24);
      const px = Math.cos(ang) * rr, py = Math.sin(ang) * rr;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8d8171';
    ctx.beginPath();
    ctx.arc(-a.r * 0.25, -a.r * 0.3, a.r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4c443a';
    ctx.beginPath();
    ctx.arc(a.r * 0.3, a.r * 0.18, a.r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Le bord chauffe a blanc, du cote de la course.
    ctx.fillStyle = 'rgba(255,214,150,.5)';
    ctx.fillRect(x - a.r * 0.7, y + a.r * 0.55, a.r * 1.4, 2);
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

/* Duree de la fanfare, apres quoi la musique du niveau revient en fondu. Un
   peu plus longue que la fanfare elle-meme : le silence d'une demi-seconde
   avant le retour fait respirer la victoire. */
const DUREE_FANFARE = 4.2;

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

  /* La musique du boss s'arrete NET, la fanfare joue seule, puis le niveau
     revient en fondu. Enchainer directement sur la musique du niveau donnait
     une victoire sans respiration : le combat se terminait et l'ambiance
     reprenait comme si rien ne s'etait passe.

     Le retour est compte dans majArene, pas par un setTimeout : sinon la
     musique reviendrait pendant l'ecran de pause. */
  audio.arreterMusique(0.3);
  audio.fanfare();
  arene.retourMusique = DUREE_FANFARE;

  arene.active = false;
  arene.secousseFin = 1.2;
  secousse(12, 0.8);

  if (partie.bossVaincus.indexOf(niveauCourant) < 0 && !ENTRAINEMENT) {
    partie.bossVaincus.push(niveauCourant);
    /* Un Brad Coin secret GARANTI par mini-boss, comme le prevoit la roadmap
       (« +8BC et +1BCSecret pour chaque Boss secondaire accompli »). Il tombe
       au sol comme la piece de l'appareil : on va le chercher, on ne le
       recoit pas dans un ecran de bilan. Une seule fois par boss — le
       controle sur `bossVaincus` s'en charge. */
    ramassages.push({
      genre: 'piece-secrete',
      x: arene.boss.x + arene.boss.w / 2 - 7, y: arene.boss.y + 10, w: 14, h: 14,
      vx: -60, vy: -210, vie: 9999, phase: 0,
    });
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

/* Le ramassage d'un Brad Coin secret. La premiere fois, il ouvre la section
   Secrets de la boutique et le BRADDY3000 en parlera au retour a la base :
   c'est ce qui transforme une piece rare en evenement plutot qu'en ligne de
   compteur. */
let secretFraisTrouve = false;
let premierSecret = false;

function prendrePieceSecrete() {
  partie.piecesSecretes = (partie.piecesSecretes || 0) + 1;
  const premiere = decouvrirSecrets();
  enregistrerPartie();

  secretFraisTrouve = true;
  if (premiere) premierSecret = true;

  audio.bruit('victoire');
  texteFlottant(brad.x + brad.w / 2, brad.y - 6, 'BRAD COIN SECRET', '#a8d8ff');
  particules(brad.x + brad.w / 2, brad.y + brad.h / 2, 24, '#a8d8ff');
  secousse(5, 0.25);
  if (typeof annoncerArene === 'function' && ARENE) annoncerArene('BRAD COIN SECRET', 3.0);
}

/* Consomme le drapeau : le BRADDY3000 ne commente la trouvaille qu'une fois. */
function prendreRepliqueSecret() {
  if (!secretFraisTrouve) return null;
  secretFraisTrouve = false;
  if (premierSecret) {
    premierSecret = false;
    return 'Tu as trouvé un Brad Coin SECRET. Je croyais que c\'était une légende ' +
           'que je m\'étais racontée. La boutique a maintenant un rayon de plus — ' +
           'va voir, je ne sais pas moi-même ce qu\'il y a dedans.';
  }
  return auHasard([
    'Encore un Brad Coin secret. À ce rythme tu vas m\'obliger à tenir un second tableau.',
    'Un secret de plus en poche. Ne le dépense pas n\'importe où. Enfin, il n\'y a pas beaucoup de choix.',
    'Ces pièces-là tombent une fois sur soixante. Statistiquement, tu me dois une explication.',
  ]);
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
      // La coque prend la couleur du boss : violette au manoir, bleue sur la
      // Lune. Deux combats differents ne doivent pas se ressembler a l'ecran.
      ctx.strokeStyle = 'rgba(' + (e.t.coqueRGB || '198,150,255') + ',' +
                        (0.35 + 0.15 * Math.sin(t * 3)).toFixed(2) + ')';
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
    const lunaire = ARENE.genre === 'asteroides';
    const manoir = ARENE.genre === 'kirby';
    /* L'etat du combat du manoir se lit sur son GESTE en cours. C'est la seule
       information utile : il n'a ni coque ni phase invulnerable durable, donc
       la question n'est jamais « est-ce que mes coups portent » mais « qu'est-ce
       qu'il est en train de faire ». */
    const etatManoir = b.chargeT > 0 || b.prepareT > 0 ? ['IL CHARGE', '#ff9a7c']
                     : arene.phase === 'aspire' ? ['IL ASPIRE', '#7ee0ff']
                     : arene.phase === 'appel' ? ['IL APPELLE SA GARDE', '#e8c98a']
                     : ['', '#e8b62c'];
    const etats = {
      geant: ['IL RÉSISTE', '#c8a0ff'],
      revelation: ['REGARDE BIEN', '#ffe9a8'],
      melange: ['SUIS-LE', '#ffe9a8'],
      choix: ['LEQUEL ?', '#ffe9a8'],
      assomme: ['ASSOMMÉ — FRAPPE !', '#7ee08a'],
    };
    const etat = duplication ? etats[arene.phase] : null;
    /* L'etat du combat lunaire tient en deux mots : soit sa coque tient, soit
       il est a terre. C'est exactement ce que le joueur a besoin de savoir
       pour decider s'il frappe ou s'il replace un appat. */
    const etatLune = b.assomme > 0 ? ['ASSOMMÉ — FRAPPE !', '#7ee08a']
                                   : ['SA COQUE TIENT', '#9ac4ff'];
    const couleur = duplication ? etat[1]
                  : lunaire ? etatLune[1]
                  : manoir ? etatManoir[1]
                  : (arene.blinde ? '#78beff' : '#e8b62c');

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
    } else if (lunaire) {
      ctx.textAlign = 'right';
      ctx.fillStyle = couleur;
      ctx.fillText(etatLune[0], x + l, y - 5);
      ctx.textAlign = 'left';
    } else if (manoir) {
      if (etatManoir[0]) {
        ctx.textAlign = 'right';
        ctx.fillStyle = couleur;
        ctx.fillText(etatManoir[0], x + l, y - 5);
        ctx.textAlign = 'left';
      }
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
    ctx.fillStyle = (duplication || lunaire)
      ? (b.assomme > 0 ? '#7ee08a' : (lunaire ? '#4f7bb8' : '#8b5fc0'))
      : manoir ? '#3aa8bc'
      : (arene.blinde ? '#4a86c8' : '#d8483c');
    ctx.fillRect(x, y, Math.round(l * f), 7);
    // Reperes des seuils : le joueur voit venir la prochaine bascule.
    /* Les reperes de seuil n'ont de sens que pour les combats a paliers. La
       pluie lunaire n'en a pas : elle se resserre en continu, et poser trois
       traits sur la barre annoncerait une bascule qui n'existe pas. */
    if (!lunaire) {
      ctx.fillStyle = 'rgba(9,11,20,.75)';
      const seuils = duplication ? SEUILS_DUPLICATION
                   : manoir ? KIRBY.seuilsGarde
                   : SEUILS_BLINDAGE;
      for (const s of seuils) ctx.fillRect(x + Math.round(l * s), y, 2, 7);
      /* La ligne d'arret du combat du manoir. Kirby 67 ne descend jamais plus
         bas ; la montrer evite que le joueur croie sa barre bloquee. */
      if (manoir) {
        ctx.fillStyle = 'rgba(255,236,190,.85)';
        ctx.fillRect(x + Math.round(l * (KIRBY.finCombat / b.pvMax)) - 1, y - 3, 2, 13);
      }
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
