# Audit de l'initiative envisagée pour 0.19.0

## Conclusion mise à jour pour 0.19.0

L'initiative officielle principale de Fading Suns 4e n'est ni un Trait Pair, ni un jet donnant un score individuel, ni un ordre numérique fixé avant le round. C'est une initiative interactive, parfois appelée initiative popcorn ou en équipe. Un protagoniste est choisi pour agir, puis son joueur choisit le prochain protagoniste qui n'a pas encore agi. Le processus recommence à chaque round.

La nouvelle exigence 0.19.0 résout les deux décisions d'orchestration qui empêchaient la première implémentation:

1. le MJ peut désigner explicitement le chef de troupe sur le Combat; ce choix est une configuration de table et non une règle de détermination automatique;
2. tout propriétaire légitime du Combatant qui vient d'agir peut proposer le suivant; l'active GM sérialise et revalide la décision afin qu'une seule proposition concurrente soit acceptée.

Le World Setting `initiativeMode` expose exactement deux méthodes officielles:

1. `interactive`, méthode principale et valeur par défaut;
2. `rolled`, méthode alternative au d20 du Guide du joueur VF p. 14 et du Character Book EN p. 14.

Les limites que les sources ne permettent toujours pas d'automatiser restent explicites: dérivation des avantages contextuels, avantage supérieur, fin de file, groupes de PNJ, surprise générale, interférences optionnelles, interruption du MJ et actions retardées. Elles ne bloquent plus la chaîne interactive de base parce que le MJ conserve l'administration du Combat Tracker et que le moteur n'invente aucune dérivation depuis les Actors ou les Items.

## Corpus audité

### Sources Fading Suns 4e prioritaires

1. `Guide du joueur Fading Suns 4e`, version française locale, pages imprimées 10 et 12 à 15 pour la règle centrale, les alternatives et les actions; pages 198 à 201 pour certains états; pages 208 à 209 pour des avantages et arts martiaux; pages 224 à 227 et 234 à 235 pour les armes, modes de tir et le fait de dégainer.
2. `Fading Suns Character Book`, version anglaise locale, pages imprimées 10 et 12 à 15 pour la règle centrale, les alternatives et les actions. La version anglaise confirme le sens de la version française sur les points nécessaires à cet audit.
3. `Guide du maître Fading Suns 4e`, version française locale, pages imprimées 94 à 99 pour les exemples de surprise, avantage, choix du prochain protagoniste, interruption et nouveau round.
4. `Fading Suns Gamemaster Book`, version anglaise locale, pages imprimées 94 à 99. Les exemples ne révèlent pas de divergence normative utile avec la version française.
5. `Fading Suns Errata, September 2022`, page 1 du PDF, correction de la page 10 du Character Book. L'errata confirme explicitement le choix initial par le chef de troupe, le choix suivant par le joueur qui vient d'agir et la fin du round après l'action de tous les PJ et PNJ.
6. `Fading Suns Universe Book` et `Fading Suns Factions Book`, versions locales française et anglaise lorsque disponibles. Aucun calcul universel supplémentaire d'initiative n'y a été trouvé.

L'errata officiel est disponible à l'adresse suivante: https://ulisses-spiele.de/wp-content/uploads/2022/11/Fading-Suns-Errata-2022-09.pdf

### Sources Foundry VTT 14

1. Combat V14: https://foundryvtt.com/api/v14/classes/foundry.documents.Combat.html
2. Combatant V14: https://foundryvtt.com/api/classes/foundry.documents.Combatant.html
3. Actor V14: https://foundryvtt.com/api/v14/classes/foundry.documents.Actor.html
4. `CONFIG.Combat` V14: https://foundryvtt.com/api/v14/variables/CONFIG.Combat.html
5. Combat Tracker V14: https://foundryvtt.com/api/v14/classes/foundry.applications.sidebar.tabs.CombatTracker.html
6. Guide officiel des combats: https://foundryvtt.com/article/combat/
7. Hooks V14: `combatStart`, `combatRound`, `combatTurn` et `combatTurnChange` dans https://foundryvtt.com/api/v14/modules/hookEvents.html

La documentation API consultée est celle de la branche V14. La page de configuration indique actuellement une documentation générée pour V14.365; les signatures et structures vérifiées appartiennent néanmoins bien à l'API V14 ciblée par Foundry 14.367.

## Règle officielle par défaut

### Séquence du round

1. Au début de chaque round, les protagonistes ayant un avantage à l'initiative sont prioritaires.
2. Si plusieurs personnages ont un avantage, leurs joueurs lancent chacun 1d20. Le meilleur résultat désigne le joueur qui choisit le premier protagoniste. Ce choix peut être son personnage, un autre PJ ou un PNJ.
3. Si personne n'a d'avantage, le joueur du chef de troupe choisit le premier protagoniste.
4. Si ce joueur ou ce personnage est absent, chaque joueur lance 1d20; le meilleur résultat désigne le joueur qui choisit le premier protagoniste.
5. Le protagoniste choisi effectue son tour.
6. Son joueur choisit ensuite un protagoniste qui n'a pas encore agi.
7. La chaîne continue jusqu'à ce que tous les PJ et tous les PNJ aient agi.
8. Le round se termine et la procédure entière recommence au round suivant.

Cette séquence est `IMPLEMENTABLE` comme règle pure si le moteur reçoit déjà toutes les entrées nécessaires: chef de troupe, joueurs autorisés, avantages, positions en fin de file, groupes de PNJ, protagonistes ayant agi et choix explicite du prochain protagoniste. La production fiable de ces entrées dans le système actuel est `PARTIAL` ou `INFORMATION_MISSING` selon les cas.

### Avantage, fin de file et interruptions

1. Un avantage à l'initiative peut provenir d'une manoeuvre, d'un avantage de personnage, d'un jet d'observation réussi, d'une position favorable, d'un appareil stimulant l'adrénaline ou de circonstances décidées par le MJ.
2. Certaines actions et situations placent un personnage en fin de file. Ce personnage agit en dernier même s'il est choisi plus tôt.
3. Plusieurs personnages en fin de file départagent leur priorité selon la règle de départage indiquée précédemment.
4. Un avantage et une position en fin de file s'annulent mutuellement. Le personnage rejoint alors la file ordinaire.
5. Les ouvrages décrivent aussi un avantage supérieur, notamment pour Prémonition, qui surpasse les avantages normaux.
6. Une fois par round, le MJ peut interrompre le choix du prochain protagoniste et désigner un PJ ou un PNJ qui n'a pas encore agi.
7. Cette interruption transfère normalement 1 PV du puits au personnage dont le tour a été interrompu.
8. Si un PNJ du MJ a agi en dernier lors du tour précédent, le MJ bénéficie d'une interruption gratuite pour le round.
9. Les règles optionnelles d'interférence donnent aussi un droit de priorité au Frère du Combat et un droit d'invalidation au noble, avec leurs propres limites et départages.

La logique de priorité est `IMPLEMENTABLE` lorsqu'elle reçoit des états et décisions explicites. Sa dérivation automatique depuis tous les Items, états, circonstances et actions est `DEFERRED` et, pour les circonstances libres, relève nécessairement d'une saisie ou décision du MJ.

### Méthodes alternatives

Les méthodes suivantes sont explicitement alternatives et ne remplacent pas la règle par défaut:

1. jet de 1d20 au début de chaque round, en ordre décroissant;
2. jet favorable pour un personnage ayant l'avantage;
3. égalité départagée par la Dextérité, puis l'Intuition, puis un nouveau jet;
4. un seul jet du MJ pour ses PNJ;
5. ordre des places autour de la table.

La méthode alternative au d20 est `IMPLEMENTABLE` sur le plan normatif. En 0.19.0, elle est exposée uniquement par le réglage de monde explicite `initiativeMode`; elle ne remplace jamais silencieusement la méthode interactive et n'utilise pas le moteur Trait Pair.

## Audit des 25 points d'initiative

### 1. Moment de détermination

`IMPLEMENTABLE`. L'initiative est déterminée au début du round en temps Instantané. Sources: Guide du joueur VF p. 10 et p. 12 à 13; Character Book EN p. 12 à 13; errata de septembre 2022 p. 1.

### 2. Fréquence

`IMPLEMENTABLE`. La procédure recommence à chaque round. Il n'existe pas un score conservé pour tout le combat. Sources: Guide du joueur VF p. 13; Character Book EN p. 13.

### 3. Utilisation d'un jet

`IMPLEMENTABLE`. La méthode par défaut n'utilise pas de jet général. Un d20 sert seulement à certains départages et à l'absence du chef de troupe. Le livre précise que la méthode en équipe a été choisie en partie pour éviter un jet d'initiative. Sources: Guide du joueur VF p. 13 à 14; Character Book EN p. 13 à 14.

### 4. Type de jet

`IMPLEMENTABLE`. Quand un départage est requis, il s'agit d'un simple d20, résultat le plus élevé. Ce n'est pas un jet ciblé ni un Trait Pair. La méthode alternative utilise également 1d20. Sources: Guide du joueur VF p. 13 à 14; Character Book EN p. 13 à 14.

### 5. Traits impliqués

`IMPLEMENTABLE` pour constater qu'aucun Trait n'intervient dans la méthode par défaut. La Dextérité puis l'Intuition ne servent que de départage dans la méthode alternative au d20. Sources: Guide du joueur VF p. 14; Character Book EN p. 14.

### 6. Valeur ciblée

`IMPLEMENTABLE`. Aucune valeur ciblée n'est calculée pour l'initiative par défaut ou son d20 de départage. Il n'y a donc ni Goal, ni succès, ni échec. Sources: Guide du joueur VF p. 13 à 14; Character Book EN p. 13 à 14.

### 7. Favorabilité

`IMPLEMENTABLE`. La Favorabilité ne s'applique pas au départage de la méthode par défaut. Dans la méthode alternative au d20 uniquement, le jet d'un personnage ayant l'avantage est favorable. Source: Guide du joueur VF p. 14; Character Book EN p. 14.

### 8. Réussite critique

`IMPLEMENTABLE`. Sans jet ciblé, aucune réussite critique n'intervient dans l'initiative par défaut. Aucun effet critique n'est indiqué pour le d20 de départage ou la méthode alternative. Sources: Guide du joueur VF p. 13 à 14; Character Book EN p. 13 à 14.

### 9. Échec critique

`IMPLEMENTABLE`. Sans jet ciblé, aucun échec critique n'intervient dans l'initiative par défaut. Un 20 au départage n'est pas traité comme un échec critique. Sources: Guide du joueur VF p. 13 à 14; Character Book EN p. 13 à 14.

### 10. Points de victoire

`PARTIAL` pour l'orchestration. L'initiative ordinaire ne produit pas de PV. L'interruption du MJ transfère normalement 1 PV du puits au personnage interrompu. Des capacités peuvent aussi demander des PV pour obtenir un avantage. Le système actuel n'a pas de représentation du puits ni d'état de choix interrompu. Sources: Guide du joueur VF p. 13 et exemples du Guide du maître VF p. 98 à 99.

### 11. Points de wyrd

`IMPLEMENTABLE`. Aucun coût, gain ou départage en PW n'est indiqué pour la règle centrale d'initiative. Les PW n'interviennent pas dans le calcul de l'ordre. Sources: Guide du joueur VF p. 12 à 14; Character Book EN p. 12 à 14.

### 12. Ressources dépensées

`PARTIAL`. L'interruption du MJ utilise normalement 1 PV du puits, transféré au personnage interrompu. Certaines sources d'avantage ont leurs propres coûts. Une transaction sûre exigerait un modèle du puits et de la décision interrompue, absents de 0.18.0. Sources: Guide du joueur VF p. 13; Guide du maître VF p. 99.

### 13. Modificateurs

`IMPLEMENTABLE` pour la règle, `DEFERRED` pour la dérivation. Il n'existe pas de bonus numérique universel. Les catégories sont avantage, avantage supérieur, file ordinaire et fin de file. Elles proviennent de multiples règles et décisions contextuelles. Sources: Guide du joueur VF p. 12 à 13, p. 198 à 201, p. 208 à 209, p. 224 à 227, p. 234 à 235 et p. 278 à 279.

### 14. Ordre final

`IMPLEMENTABLE` comme chaîne de choix explicites. Le joueur du protagoniste qui vient d'agir choisit le suivant parmi ceux qui n'ont pas encore agi, sous réserve des priorités et interruptions. L'ordre complet n'est pas connu au début du round. Sources: Guide du joueur VF p. 10 et p. 13; errata de septembre 2022 p. 1.

### 15. Égalités

`IMPLEMENTABLE` pour les cas décrits. Plusieurs détenteurs d'un avantage lancent 1d20 et le meilleur résultat choisit le premier protagoniste. Les personnages en fin de file sont départagés de la même façon. Les interférences optionnelles possèdent des règles propres. La méthode alternative départage par Dextérité, Intuition puis relance. Sources: Guide du joueur VF p. 13 à 14; Character Book EN p. 13 à 14.

### 16. PJ et PNJ

`IMPLEMENTABLE` pour la règle, `PARTIAL` pour les permissions. Tous doivent agir une fois. Un joueur peut choisir un PNJ. Le MJ gère ses PNJ et peut interrompre une fois par round. Foundry peut associer plusieurs joueurs propriétaires à un Combatant, alors que le livre parle d'un joueur décideur. Sources: Guide du joueur VF p. 10 et p. 13; API Combatant V14.

### 17. Plusieurs PNJ identiques

`INFORMATION_MISSING`. Le livre dit que certains PNJ agissent comme un groupe et d'autres séparément, mais ne fixe pas le critère de regroupement. L'identité de type, l'Actor partagé, le nom, le Token ou l'ordre de création ne peuvent pas être utilisés arbitrairement. Source: Guide du joueur VF p. 13; Character Book EN p. 13.

### 18. Surprise et embuscade

`PARTIAL`. L'observation réussie, une position favorable et les circonstances peuvent accorder un avantage. L'exemple des chiens mutants indique que les chiens surprennent toute la troupe, agissent en premier et sont les seuls à utiliser une action pendant ce premier round. Le corpus inspecté ne fournit pas une procédure générale complète définissant qui est surpris, comment une embuscade devient ce round spécial, ni comment traiter une surprise partielle. Sources: Guide du joueur VF p. 12 à 13; Guide du maître VF p. 94 à 95; Gamemaster Book EN p. 94 à 95.

### 19. Action retardée

`IMPLEMENTABLE` comme règle d'action, `DEFERRED` hors du périmètre Initiative. Pendant son propre tour, un personnage peut retarder son action principale et la convertir en action réflexe déclenchée plus tard au cours du même round. Si la condition ne se produit pas, l'action est perdue. Sources: Guide du joueur VF p. 14 à 15; Character Book EN p. 14 à 15.

### 20. Action préparée

`IMPLEMENTABLE` sous la forme de l'action retardée conditionnelle décrite ci-dessus. Le corpus ne définit pas une seconde mécanique générique distincte nommée Préparer. Toute autre interprétation est `INFORMATION_MISSING`. Sources: Guide du joueur VF p. 14 à 15; Character Book EN p. 14 à 15.

### 21. Changement pendant le round

`IMPLEMENTABLE`. L'ordre change après chaque tour par le choix du protagoniste suivant. Le MJ, un Frère du Combat ou un noble peuvent aussi le modifier selon les règles applicables. Sources: Guide du joueur VF p. 13; Character Book EN p. 13.

### 22. Changement entre les rounds

`IMPLEMENTABLE`. Toute la procédure recommence à chaque round. Le choix du premier protagoniste et toute la chaîne peuvent donc changer. Sources: Guide du joueur VF p. 13; Character Book EN p. 13.

### 23. États affectant l'initiative

`PARTIAL`. Des états nommés affectent l'ordre, par exemple Euphorique place en fin de file et Stimulé donne un avantage. Inconscient interdit toute action. Le système n'a pas encore de moteur d'états ou d'ActiveEffects génériques. Sources: Guide du joueur VF p. 198 à 201; `docs/STATES-AUDIT-0.17.0.md` pour l'état du code.

### 24. Blessures affectant l'initiative

`PARTIAL`. Aucun modificateur numérique universel d'initiative lié à une perte de Vitalité n'a été trouvé. Des conséquences et états causés par des blessures peuvent empêcher ou modifier l'action, mais leur cycle complet n'est pas automatisé dans le système. Sources: Guide du joueur VF p. 198 à 201 et règles de dégâts p. 224 à 225.

### 25. Capacités et équipements

`PARTIAL`. De nombreuses capacités et options modifient l'initiative: avantages personnels, Prémonition, dégainage, objets Peu maniables, modes de tir et manoeuvres d'arts martiaux. Les Items 0.18.0 conservent ces données surtout sous forme descriptive et aucun moteur général ne peut en dériver sans perte une catégorie d'initiative. Sources: Guide du joueur VF p. 208 à 209, p. 224 à 227, p. 234 à 235 et p. 278 à 279.

## Audit du combat et des actions

### Début du combat

1. Quand la situation devient tendue et exige un suivi tour par tour, le jeu passe en temps Instantané.
2. Le premier round commence par la procédure d'initiative.
3. La surprise peut produire un premier round particulier, mais sa procédure générale reste `PARTIAL`.

### Début et fin du round

1. Au début de chaque round, les avantages et priorités déterminent qui peut choisir le premier protagoniste.
2. Chaque PJ et PNJ, ou groupe de PNJ décidé par le MJ, doit être inclus.
3. Le round se termine après que tous les protagonistes autorisés ont agi.
4. L'ordre n'est pas conservé pour le round suivant.
5. Certaines durées sont exprimées en rounds, notamment des dégâts persistants. Leur automatisation est `DEFERRED`.

### Début et fin du tour

1. Au début du tour, les PV et PW non conservés dans la cache retournent au puits selon les règles de ressources.
2. Le système 0.18.0 n'automatise pas cette remise au puits et ne représente pas le puits comme Document partagé.
3. Le personnage accomplit ses actions, puis son joueur choisit le prochain protagoniste.
4. Une action réflexe peut se produire avant le tour normal et consommer l'action concernée.
5. Une action retardée peut être déclenchée plus tard dans le round.
6. Des effets peuvent se résoudre au tour du personnage, par exemple certains dégâts persistants. Leur cycle est `DEFERRED`.

### Économie d'actions

1. Un tour permet normalement une action principale.
2. Il permet une action de mouvement.
3. Il permet autant d'actions secondaires que le MJ l'autorise.
4. Une action réflexe est généralement principale, parfois secondaire.
5. Une action principale réflexe utilise effectivement l'action à ce moment au lieu du tour normal.
6. Le mouvement peut accompagner l'action réflexe principale; s'il n'est pas utilisé alors, il est perdu pour le reste du round.
7. Certaines manoeuvres et certains pouvoirs accordent une action principale supplémentaire selon leurs propres règles.

Cette économie est documentée mais classée `DEFERRED`: l'initiative 0.19.0 ne doit pas devenir un moteur d'actions ou d'ActiveEffects incomplet.

## Audit du code et décision d'architecture 0.19.0

### Base 0.18.0 constatée

1. Aucun comportement historique d'initiative propre au système ne devait être migré.
2. Les DataModels Actor contenaient déjà Dextérité et Intuition, sans chef de troupe ni état temporaire de round.
3. Le moteur Trait Pair était impropre à l'initiative, car le d20 d'initiative n'a ni Goal, ni réussite, ni critique, ni gain de PV.
4. Le Combat Tracker natif ne pouvait pas représenter seul une chaîne interactive.

### Architecture retenue

1. `scripts/rules/initiative.mjs` contient les transitions pures et le comparateur de la méthode au jet.
2. `scripts/rolls/fadingSunsInitiative.mjs` orchestre les Documents, permissions, d20, flags et requêtes multi-client.
3. `scripts/documents/fadingSunsCombat.mjs` adapte `startCombat()`, `nextTurn()`, `nextRound()`, `rollInitiative()` et `_sortCombatants()`.
4. `scripts/applications/combatTrackerInitiative.mjs` et son template ajoutent uniquement les contrôles et états visuels nécessaires au Tracker V14.
5. `CONFIG.Combat.documentClass` enregistre la classe du système.
6. Le socket `system.fadingsuns4e` transmet les décisions des joueurs à l'active GM.
7. Aucun DataModel Actor ou Item n'est modifié.
8. Aucune valeur temporaire d'initiative n'est écrite sur un Actor, y compris un Actor synthétique.

### Interactions préservées

1. Trait Pair et ses gains de ressources restent inchangés.
2. Weapon, Triple-tir et munitions restent inchangés.
3. Armor, Resistance, Impact, Energy Shield, Damage et Vitality restent inchangés.
4. Aucun tour Foundry ne vide une cache et aucun dégât persistant n'est appliqué par Initiative.

## Audit de Foundry VTT V14

### Modèle natif

1. `CONFIG.Combat.initiative` expose une formule et un nombre de décimales. Cette structure est adaptée à un score numérique, pas à une chaîne de décisions interactives.
2. `Combat.rollInitiative(ids, options)` lance une formule pour un ou plusieurs Combatants puis écrit des scores.
3. `Combat.rollAll()` et `Combat.rollNPC()` reposent sur ce même modèle de scores.
4. `Combat.setInitiative(id, value)` écrit un score numérique manuel.
5. `Combat.setupTurns()` construit un tableau trié avant l'avancement des tours.
6. La documentation V14 décrit un départage alphabétique dans `setupTurns()`, tandis que le comparateur protégé `_sortCombatants()` documente un départage par identifiant. Cette divergence interne n'affecte pas la conclusion: ni le nom ni l'identifiant ne sont un départage Fading Suns.
7. `Combat.startCombat()` commence au round 1 et au tour 1.
8. `nextTurn()` et `nextRound()` avancent dans l'ordre déjà trié.
9. Les hooks `combatStart`, `combatRound`, `combatTurn` et `combatTurnChange` permettent d'observer les transitions, mais un hook seul ne remplace pas la sélection interactive et les contrôles du Tracker.
10. Le Combat Tracker V14 est une ApplicationV2 Handlebars. Une intégration fidèle demanderait des contrôles propres au système et une orchestration synchronisée, pas une simple formule.

### Combatants, Actors et Tokens

1. Un Combatant est embarqué dans un Combat et référence son Actor et éventuellement son Token.
2. `Combatant.players` retourne tous les utilisateurs non MJ propriétaires. Cela ne désigne pas automatiquement le joueur qui doit prendre la décision Fading Suns.
3. `Combatant.isNPC` dépend de l'absence d'Actor ou de joueur pouvant le contrôler, pas seulement du type Actor.
4. Un Actor de monde qui appelle `Actor.rollInitiative()` cible tous ses Tokens associés dans le Combat actif.
5. Un Actor synthétique de Token non lié ne cible que ce Token.
6. Plusieurs Tokens d'un même Actor peuvent donc être plusieurs Combatants distincts. Les regrouper ou les faire agir ensemble serait une décision de règles non fournie.
7. Un Combatant peut techniquement ne pas avoir de Token, mais le workflow d'interface normal de Foundry ajoute des Tokens à une rencontre. Aucune règle Initiative ne doit dépendre arbitrairement de la présence d'un Token.
8. La persistance 0.19.0 appartient au Combat et, pour le détail du d20 alternatif, aux Combatants. Elle n'appartient jamais à l'Actor source.

### Permissions natives

1. Le guide officiel permet aux joueurs d'ajouter leurs propres Tokens à une rencontre.
2. Les joueurs peuvent lancer l'initiative de leurs propres Combatants dans le modèle natif.
3. Le MJ peut lancer toutes les initiatives ou celles des PNJ.
4. Un joueur peut terminer le tour du personnage qu'il contrôle lorsqu'il s'agit du tour courant.
5. Un MJ ou Assistant termine les tours de PNJ.
6. Les Documents exposent `testUserPermission()` et `Combatant.players`; l'orchestration les utilise pour reconnaître tous les propriétaires légitimes.
7. Plusieurs propriétaires restent tous autorisés. Aucun joueur principal n'est inventé.
8. L'active GM, obtenue par `game.users.activeGM`, revalide et sérialise l'écriture sur le Combat.

## État et synchronisation 0.19.0

### État interactif sur le Combat

Le flag `flags.fadingsuns4e.initiative` conserve la version de schéma, le mode, le round, la révision, la phase, le chef de troupe, le protagoniste actuel, le Combatant autorisant le prochain choix, les identifiants restants, les identifiants ayant agi et l'ordre réellement choisi. Il ne contient aucun faux score numérique.

Chaque requête de choix fournit le round et la révision observés. L'active GM traite les requêtes d'un même Combat en série, puis le moteur pur refuse la seconde requête si la première a déjà augmenté la révision. Cette protection couvre les doubles clics et les propriétaires concurrents dans le fonctionnement normal de Foundry. Elle ne prétend pas constituer une transaction distribuée indépendante du serveur Foundry.

### État de la méthode au jet

Le Combat conserve le mode et le round. Chaque Combatant conserve sous `flags.fadingsuns4e.initiativeRoll` le résultat d20, les dés du jet favorable éventuel, la Dextérité, l'Intuition et les relances de départage. Le champ natif `initiative` reçoit uniquement le résultat brut du d20 pour l'affichage; le tri réel utilise le comparateur explicite, sans nombre magique combinant plusieurs critères.

Le réglage manuel `flags.fadingsuns4e.initiativeEdge` permet au MJ d'indiquer qu'un Combatant bénéficie d'un avantage tant que cette case reste cochée. La dérivation automatique depuis les circonstances, Items ou états reste différée.

### Chat et API publique

1. Aucun ChatMessage n'est créé pour les transitions interactives ou pour chaque changement de tour.
2. Le résultat alternatif est visible dans le Tracker et ne passe pas par Trait Pair.
3. `game.fadingsuns4e.rules.initiative` expose les fonctions pures.
4. `game.fadingsuns4e.initiative` expose les opérations d'orchestration utiles.

## Classification consolidée

| Élément | Classification | Décision | Motif |
| --- | --- | --- | --- |
| Règle interactive de choix du suivant | `IMPLEMENTABLE` | Implémentée | État dynamique, choix explicite et refus des doubles activations |
| Nouveau round interactif | `IMPLEMENTABLE` | Implémenté | Liste réinitialisée et nouveau choix initial du chef de troupe |
| Avantage interactif et fin de file | `PARTIAL` | Administration MJ | Dérivation automatique absente; le MJ peut administrer le prochain choix |
| Avantage supérieur | `PARTIAL` | Différé | Inventaire exhaustif et état runtime absents |
| Chef de troupe | `INFORMATION_MISSING` dans les données | Configuration explicite | Le MJ désigne un Combatant sans règle automatique |
| Groupes de PNJ | `INFORMATION_MISSING` | Configuration de rencontre | Chaque Combatant est distinct; le MJ décide quels PNJ sont représentés comme groupe |
| Surprise et embuscade | `PARTIAL` | Différé | Effet illustré, procédure générale incomplète |
| Interruption du MJ | `PARTIAL` | Non implémentée | Règle connue, puits et choix interrompu non représentés |
| Frère du Combat et noble | `DEFERRED` | Non implémenté | Règles optionnelles et moteur de Perks absents |
| Action retardée | `DEFERRED` | Non implémentée | Règle connue, hors du périmètre d'une initiative minimale |
| Alternative au d20 | `IMPLEMENTABLE` | Implémentée | Réglage explicite, d20 décroissant, Dextérité, Intuition, relances |
| Formule `CONFIG.Combat.initiative` | `DEFERRED` | Non configurée | Le workflow dédié évite une formule Trait Pair ou un score composite |
| Combat Tracker | `IMPLEMENTABLE` | Adapté | Panneau et styles propres aux deux méthodes |
| Effets de début de tour ou round | `DEFERRED` | Non implémentés | Cache, états et dégâts persistants dépassent le périmètre et ne sont pas tous automatisés |

## Points encore différés

1. L'interruption du MJ est formalisée aux pages 13 du Guide du joueur et du Character Book, mais le système ne représente pas le puits partagé et ne peut pas transférer sûrement le PV au personnage interrompu. Elle reste manuelle.
2. L'action retardée est décrite p. 14 à 15. Elle appartient au moteur d'actions, de conditions et de réactions, pas à la sélection de base; elle reste manuelle.
3. Les avantages interactifs, fins de file, avantages supérieurs et interférences optionnelles restent administrés par le MJ.
4. Les groupes de PNJ et la surprise restent des décisions de rencontre du MJ.
5. Les Combatants ajoutés pendant un round interactif rejoignent la liste au round suivant; ceux qui sont supprimés sont retirés par réconciliation.

## Validation de l'audit mis à jour

1. Le Guide du joueur VF p. 12 à 15 et le Character Book EN p. 12 à 15 ont été relus dans leur contexte.
2. Le texte alternatif exact p. 14 confirme le d20 au début de chaque nouveau round, l'ordre décroissant, le jet favorable, Dextérité, Intuition et relance.
3. L'errata officiel p. 1 confirme la chaîne interactive et la fin après l'action de tous les PJ et PNJ.
4. Les exemples du Guide du maître VF et EN p. 94 à 99 confirment surprise, avantage, choix successifs et interruption.
5. Les API Foundry V14 de SettingConfig, Combat, Combatant, Combat Tracker, `CONFIG.Combat`, hooks de rendu et `Users.activeGM` ont été vérifiées.
6. La mise en oeuvre conserve `compatibility.verified` à 14.367 et passe la version système à 0.19.0.
