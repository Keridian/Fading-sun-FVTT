# Initiative 0.19.0

## Périmètre

La version 0.19.0 adapte le Combat Tracker de Foundry VTT 14.367 aux deux méthodes d'initiative demandées:

1. initiative interactive officielle;
2. méthode alternative officielle au d20.

Le réglage de monde `fadingsuns4e.initiativeMode` accepte uniquement `interactive` et `rolled`. Sa valeur par défaut est `interactive`, car les livres la présentent comme la règle générale et décrivent le d20 comme une méthode alternative.

Un changement de réglage pendant un Combat actif n'altère pas le round en cours. Le nouveau mode est lu au démarrage du round suivant. L'état de l'ancien mode peut rester dans les flags historiques, mais il est ignoré dès que le flag du round courant annonce l'autre mode.

## Sources normatives

1. Guide du joueur VF p. 10: résumé de la chaîne, choix initial, choix suivant et fin du round.
2. Guide du joueur VF p. 12 à 13: initiative interactive, avantage, fin de file, PNJ et interruption du MJ.
3. Guide du joueur VF p. 13 à 14: méthodes alternatives et justification de la méthode interactive.
4. Guide du joueur VF p. 14: procédure complète de la méthode au d20.
5. Guide du joueur VF p. 14 à 15: action principale, action réflexe et action retardée.
6. Character Book EN p. 10 et p. 12 à 15: confirmation anglaise des mêmes procédures.
7. Guide du maître VF p. 94 à 99 et Gamemaster Book EN p. 94 à 99: exemples de surprise, avantage, chaîne de choix et interruption.
8. Errata officiel de septembre 2022 p. 1: correction explicite de la règle centrale de l'initiative.

Errata: https://ulisses-spiele.de/wp-content/uploads/2022/11/Fading-Suns-Errata-2022-09.pdf

## Méthode interactive

### Règle et solution Foundry

La règle officielle indique que le chef de troupe choisit le premier protagoniste, puis que le joueur du protagoniste qui vient d'agir choisit le suivant parmi ceux qui n'ont pas encore agi.

Les livres ne fournissent pas de donnée informatique permettant de reconnaître le chef de troupe. La solution Foundry est donc une désignation explicite par le MJ dans le Tracker. Aucun Actor n'est sélectionné automatiquement selon ses traits, son nom, son propriétaire ou son ordre de création.

### État du Combat

`flags.fadingsuns4e.initiative` contient:

1. `schemaVersion`;
2. `mode`;
3. `round`;
4. `revision`;
5. `phase`;
6. `leaderCombatantId`;
7. `currentCombatantId`;
8. `chooserCombatantId`;
9. `remainingIds`;
10. `actedIds`;
11. `order`.

Les phases sont `awaitingLeader`, `chooseFirst`, `active`, `chooseNext` et `roundComplete`. Aucun score numérique fictif n'est créé.

La fin du dernier tour initialise immédiatement le round suivant. La liste des protagonistes est reconstruite, la liste des protagonistes ayant agi est vidée et le chef de troupe doit effectuer un nouveau choix initial. Sa désignation de table est conservée tant que le Combatant existe; elle ne conserve jamais l'ordre du round précédent.

### Permissions et concurrence

Le MJ peut toujours désigner le chef, choisir un protagoniste ou terminer un tour pour administrer et débloquer la rencontre.

Un joueur peut choisir le suivant seulement s'il contrôle légitimement le Combatant indiqué par `chooserCombatantId`. Il peut terminer le tour seulement s'il contrôle le `currentCombatantId`. La vérification utilise les propriétaires exposés par `Combatant.players` et les permissions Owner du Combatant ou de son Actor.

Avec plusieurs propriétaires, tous restent légitimes. Aucun propriétaire principal n'est inventé. Chaque décision contient le round et la révision observés. Elle est envoyée par le socket du système à `game.users.activeGM`, qui sérialise les opérations du Combat et refuse toute révision devenue obsolète. Un double clic ou deux choix concurrents ne peuvent donc pas valider deux protagonistes dans le même état normal multi-client.

Cette sérialisation repose sur l'active GM et le serveur Foundry. Elle ne prétend pas fournir une transaction distribuée indépendante de Foundry.

### Tracker

Le Tracker affiche le mode, la phase, le chef de troupe, le protagoniste actuel, le Combatant qui doit choisir et les choix encore éligibles. Les lignes distinguent l'actuel, ceux ayant agi et ceux qui restent. Les contrôles de score numérique sont masqués en mode interactif.

Un Combatant caché n'est jamais ajouté aux noms ou aux choix rendus pour un joueur qui ne peut pas le voir. Il reste dans l'état mécanique et peut être administré par le MJ.

Le bouton natif de fin de tour appelle la transition interactive. Les modifications directes du `round` ou du `turn` natif sont refusées pendant un round interactif, sauf lorsqu'elles proviennent de l'orchestration du système.

## Méthode alternative au d20

### Procédure normative, point par point

| Point | Règle | Source |
| --- | --- | --- |
| Qui lance | Chaque joueur lance; le MJ lance pour ses PNJ | Guide du joueur VF p. 14; Character Book EN p. 14 |
| Dé | 1d20 | mêmes pages |
| Premier | Meilleur résultat | mêmes pages |
| Ordre | Résultats décroissants | mêmes pages |
| Premier départage | Dextérité la plus élevée | mêmes pages |
| Second départage | Intuition la plus élevée | mêmes pages |
| Égalité restante | Nouveau jet des ex aequo | mêmes pages |
| Fréquence | Nouveau jet au début de chaque nouveau round | mêmes pages |
| Avantage | Jet favorable | mêmes pages |
| Goal | Aucun | mêmes pages et définition d'un simple d20 |
| Réussite ou critique | Aucun | mêmes pages |
| Modificateur universel | Aucun indiqué | mêmes pages |
| PJ | Jet du joueur | mêmes pages |
| PNJ | Jet du MJ pour ses PNJ | mêmes pages |
| Groupes de PNJ | Le mode interactif indique que certains agissent en groupe sans critère universel | Guide du joueur VF p. 13; Character Book EN p. 13 |
| Surprise | Aucun ajout général à la méthode alternative n'est défini dans ce passage | Guide du joueur VF p. 14; exemples partiels du Guide du maître VF p. 94 à 95 |

### Projection Foundry

Foundry ordonne des Combatants, tandis que le texte parle des joueurs et du MJ. Le système crée donc un groupe de jet par ensemble exact de propriétaires. Les Combatants contrôlés par le même ensemble de joueurs partagent le même d20; aucun joueur principal n'est choisi. Les Combatants classés PNJ ou sans propriétaire joueur partagent le d20 du MJ. Chaque Combatant conserve ensuite sa Dextérité et son Intuition propres pour les départages.

Un avantage est indiqué manuellement par le MJ dans le Tracker et reste actif tant que le MJ laisse cette case cochée. Le groupe conserve son d20 commun et les membres avantagés partagent le second d20 nécessaire au jet favorable. Le meilleur des deux résultats est retenu pour eux. Aucune dérivation depuis un Item, un état ou une circonstance n'est inventée.

Si Dextérité et Intuition ne suffisent pas, seuls les Combatants encore ex aequo reçoivent des relances de départage jusqu'à obtenir un ordre. Les résultats sont conservés explicitement dans `flags.fadingsuns4e.initiativeRoll`.

Le champ natif `Combatant.initiative` conserve uniquement le d20 retenu. `_sortCombatants()` applique séparément la suite de critères officielle:

1. d20 décroissant;
2. Dextérité décroissante;
3. Intuition décroissante;
4. relances successives décroissantes.

Aucun score composite ou nombre magique n'est construit. Un nouveau jet complet est produit à chaque round. Le Tracker affiche le d20 et les traits de départage, sans créer de ChatMessage à chaque transition.

## Tokens et Combatants

L'état temporaire appartient au Combat ou au Combatant:

1. un Token lié ne provoque aucune écriture sur l'Actor de monde;
2. un Token synthétique non lié ne provoque aucune écriture sur son Actor source;
3. plusieurs Tokens du même Actor restent plusieurs Combatants;
4. ils partagent le jet d'un même ensemble de propriétaires en mode au jet, puis leurs traits individuels les départagent;
5. un PNJ sans propriétaire est administré par le MJ;
6. un Combatant supprimé est retiré de l'état interactif;
7. un Combatant ajouté en cours de round rejoint la procédure au round suivant.

Le regroupement narratif de plusieurs PNJ en un seul protagoniste reste une décision du MJ lors de la constitution du Combat. Le système ne groupe jamais des Tokens par nom, Actor, type ou ordre de création.

## Fonctions différées

### Interruption du MJ

La règle est suffisamment claire sur son principe: une fois par round, le MJ peut imposer le prochain protagoniste et transfère normalement 1 PV du puits au personnage interrompu; l'interruption est gratuite si un PNJ du MJ a agi en dernier au tour précédent. Sources: Guide du joueur VF p. 13; Character Book EN p. 13; Guide du maître VF p. 98 à 99.

L'automatisation reste différée parce que le système ne représente pas le puits partagé et ne possède pas une transaction capable d'identifier sans ambiguïté le choix interrompu, le bénéficiaire et l'exception gratuite. Le MJ peut administrer la chaîne, mais aucun PV n'est créé ou déplacé par Initiative.

### Action retardée

Le personnage peut, pendant son propre tour, retarder son action principale pour en faire une action réflexe conditionnelle plus tard dans le même round. Si la condition ne se produit pas, l'action est perdue. Sources: Guide du joueur VF p. 14 à 15; Character Book EN p. 14 à 15.

Cette règle nécessite un moteur d'actions, de conditions et de réactions qui n'existe pas encore. Elle ne modifie pas le fait que le protagoniste a pris son tour dans la chaîne interactive. Son automatisation reste différée.

### Autres limites

Avantage supérieur, fin de file, surprise générale, Frère du Combat, invalidation du noble et dérivation des avantages contextuels restent manuels. Ils sont décrits dans l'audit, mais ne sont pas transformés en états automatiques incomplets.

## API Foundry V14 utilisées

1. `game.settings.register()` avec un Setting de scope `world`;
2. `CONFIG.Combat.documentClass`;
3. sous-classe de `foundry.documents.Combat`;
4. flags de Combat et de Combatant;
5. `game.users.activeGM`;
6. socket de système `system.fadingsuns4e` activé par le manifeste;
7. hook `renderCombatTracker` de l'ApplicationV2 Combat Tracker;
8. hooks `createCombatant` et `deleteCombatant` pour la réconciliation;
9. moteur `Roll` natif pour les d20.

Références API:

1. https://foundryvtt.com/api/interfaces/foundry.types.SettingConfig.html
2. https://foundryvtt.com/api/v14/classes/foundry.documents.Combat.html
3. https://foundryvtt.com/api/classes/foundry.documents.Combatant.html
4. https://foundryvtt.com/api/v14/variables/CONFIG.Combat.html
5. https://foundryvtt.com/api/v14/classes/foundry.applications.sidebar.tabs.CombatTracker.html
6. https://foundryvtt.com/api/classes/foundry.documents.collections.Users.html
7. https://foundryvtt.com/api/v14/functions/hookEvents.renderApplicationV2.html

## Validation automatisée

La suite locale contient 547 cas réussis sur 547:

1. 506 cas historiques conservés;
2. 41 nouveaux cas Initiative couvrant règles pures, réglage, rounds, permissions, propriétaires multiples, requêtes concurrentes, Tokens, groupes de jet, avantage, d20, Dextérité, Intuition, relances, changements de mode, Tracker, localisation, manifeste et bootstrap.

La syntaxe de tous les nouveaux modules ES et les trois fichiers JSON modifiés a également été validée. La validation dans un client Foundry VTT 14.367 reste requise avant de déclarer 0.19.0 validée en runtime réel.

## Validation runtime progressive

### Interactive

1. Dans les paramètres du World, choisir Initiative interactive.
2. Créer un Combat avec au moins trois Combatants.
3. Inclure un PJ, un PNJ et, si possible, un Token synthétique non lié.
4. Démarrer le Combat.
5. Vérifier que le Tracker demande au MJ de désigner le chef de troupe.
6. Désigner le chef de troupe.
7. Depuis un client propriétaire de ce Combatant, choisir le premier protagoniste.
8. Terminer son tour avec le contrôle natif du Tracker.
9. Depuis son client propriétaire, choisir le suivant.
10. Vérifier que le protagoniste ayant agi n'est plus proposé.
11. Répéter jusqu'au dernier protagoniste.
12. Vérifier que le round suivant réinitialise les listes et demande un nouveau choix initial.
13. Avec deux propriétaires du même Combatant, cliquer presque simultanément sur deux choix différents et vérifier qu'un seul est accepté.
14. Supprimer un Combatant encore disponible et vérifier qu'il disparaît des choix.
15. Vérifier qu'aucun Actor, lié ou synthétique, ne reçoit de flag Initiative.

### Jet d'initiative

1. Dans les paramètres du World, choisir Jet d'initiative.
2. Créer un Combat avec plusieurs PJ et PNJ.
3. Cocher Avantage à l'initiative sur un Combatant dans le panneau du Tracker.
4. Démarrer le Combat.
5. Vérifier que chaque ligne affiche son d20 et ses valeurs de Dextérité et d'Intuition.
6. Vérifier que le meilleur d20 agit en premier.
7. Pour une égalité, vérifier Dextérité, puis Intuition.
8. Pour une égalité complète, vérifier la présence d'une relance de départage dans les flags ou avec l'API publique.
9. Terminer les tours jusqu'à la fin du round.
10. Vérifier qu'un nouveau d20 est lancé au round suivant.
11. Vérifier que les PNJ partagent le jet du MJ et que les Combatants d'un même ensemble de propriétaires partagent le jet de leurs joueurs.

### Changement de mode

1. Pendant un round interactif, changer le Setting vers Jet d'initiative.
2. Vérifier que le Tracker annonce l'application au prochain round et que le round courant reste interactif.
3. Terminer le round et vérifier l'initialisation du d20 au round suivant.
4. Refaire l'opération de Jet d'initiative vers Interactive.
5. Vérifier que le round suivant n'utilise plus les résultats numériques historiques et attend le choix du chef de troupe.
