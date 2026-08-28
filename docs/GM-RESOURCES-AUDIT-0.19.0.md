# Audit des ressources du MJ et des PNJ

## Objet et périmètre

Cet audit concerne Fading Suns 4e, la version système 0.19.0 et Foundry VTT 14.367. Il détermine les ressources que le MJ, les PNJ et la troupe peuvent réellement employer. Il ne crée aucune mécanique, aucune donnée persistante ni aucune interface.

La conclusion principale est simple : le MJ ne possède pas de pool global de PV. Le puits est un réservoir commun de jetons, distinct d'une ressource appartenant au MJ. Le MJ possède en revanche un coffre global de PW, le coffret des adversaires, créé par les échecs critiques des joueurs et utilisable pour aider un PNJ. La règle ne détaille pas son effet au-delà de cette formulation.

Les termes « MJ » et « PNJ » désignent ici le rôle à la table et les personnages contrôlés par ce rôle. Ils ne signifient pas automatiquement qu'une valeur appartient à un Actor Foundry.

## Corpus et méthode

Les passages trouvés par recherche textuelle ont été relus avec leur contexte, leurs encadrés, leurs exemples et leurs renvois.

| Source | Pages imprimées pertinentes | Apport |
| --- | --- | --- |
| Guide du joueur Fading Suns 4e, français | 10, 12 à 15, 19 à 23, 24 à 35 | cycle des PV et PW, initiative, actions, Trait Pair, dépense et options de défense |
| Fading Suns Character Book, anglais | 10, 12 à 15, 19 à 23, 24 à 35 | confirmation du texte français et terminologie originale |
| Guide du maître Fading Suns 4e, français | 8 à 10, 37 à 40, 94 à 99 | coffret des adversaires, coffre de troupe, tiers de PNJ et exemple de jeu |
| Fading Suns Gamemaster Book, anglais | 8 à 10, 37 à 40, 94 à 99 | confirmation du texte français et terminologie originale |
| Errata officiel, septembre 2022 | 1 à 4 | correction de l'ordre de l'initiative et rappel qu'un échec critique donne 1 PW au MJ ; aucune correction du coffret des adversaires, des ressources PNJ ou des transferts |

Errata officiel : <https://ulisses-spiele.de/wp-content/uploads/2022/11/Fading-Suns-Errata-2022-09.pdf>.

Les pages indiquées sont les numéros imprimés des livres. Les formulations françaises et anglaises sont cohérentes sur toutes les règles de ressources déterminantes ci-dessous.

## Terminologie officielle et propriétaires

| Ressource ou contenant | Français | Anglais | Abréviation | Propriétaire mécanique | Portée |
| --- | --- | --- | --- | --- | --- |
| Puits | puits | well | aucune | réserve commune de jetons, pas un personnage ni le MJ | table et session de jeu |
| PV | points de victoire | victory points | PV / VP | personnage, via cache, banque ou coffre ; le puits les fournit et les reçoit | cache au tour, banque persistante |
| Cache | cache | cache | aucune | personnage | jusqu'au début de son prochain tour en temps instantané ; jusqu'à la résolution de l'incidence en temps présent ou narratif |
| Banque | banque | bank | aucune | personnage | persistante, avec capacité individuelle |
| Coffre | coffre | coffer | aucune | personnage ou groupe selon l'avantage qui le crée | dépend de la règle de l'avantage |
| PW | points de wyrd | wyrd points | PW / WP | personnage, coffre de troupe ou coffret des adversaires | voir chaque contenant |
| Coffre de la troupe | coffre de la troupe | troupe coffer | aucune | troupe des PJ, gestion collective | persiste au-delà d'une scène jusqu'à dépense |
| Coffret des adversaires | coffret des adversaires | adversary coffer | aucune | MJ, pour aider un PNJ | tragédie entière ; vidé à son terme |
| Adrénaline | adrénaline | surge | aucune | personnage ou PNJ qui en possède | nombre d'utilisations persistant jusqu'au repos selon la règle générale |
| Second souffle | second souffle | revival | aucune | personnage ou PNJ Vedette qui en possède | nombre d'utilisations persistant selon la récupération applicable |
| Vitalité | Vitalité | Vitality | aucune | personnage ou PNJ | Actor individuel |

Les PW partagent physiquement le même puits que les PV, mais restent une catégorie distincte et des jetons distinctifs. Ce partage matériel ne crée pas un pool global de PW appartenant au MJ.

## PV du MJ : constat exhaustif

### Absence de pool global de PV MJ

Les quatre livres ne définissent ni banque du MJ, ni cache du MJ, ni coffre MJ de PV, ni maximum ou remise à zéro d'une telle réserve. Les règles définissent le puits comme un récipient accessible autour de la table contenant une quantité importante de jetons. Il est la source des gains et la destination habituelle des dépenses de PV.

Par conséquent, les questions suivantes n'ont pas de réponse parce que l'objet n'existe pas dans les règles : création, valeur initiale, minimum, maximum, alimentation, dépenses, remise à zéro, visibilité et conservation d'un « pool de PV du MJ ».

Le MJ peut toutefois manipuler le puits dans deux rôles précis :

1. Il prend 1 PW du puits lors de l'échec critique d'un joueur et le place dans le coffret des adversaires.
2. Lors de l'interruption d'initiative, il prend 1 PV du puits et le donne au protagoniste interrompu, sauf interruption gratuite.

Ces actions ne constituent pas des dépenses de ressources possédées par le MJ. Le livre ne précise pas de limite quantitative au puits, son comptage exact ni ce qui arrive si les jetons matériels viennent à manquer. Ces points sont `INFORMATION_MISSING` et ne doivent pas être inventés par Foundry.

### PV des personnages et des PNJ

Le Trait Pair réussi donne au protagoniste un montant de PV égal au résultat du dé. Cette règle vise les personnages qui font le jet, y compris les PNJ lorsqu'ils emploient les mêmes actions. Le gain arrive dans leur cache. Une dépense normale retourne les PV au puits. Un succès critique donne également 1 PW, tandis qu'un échec critique ne génère pas de PV et alimente le coffret des adversaires.

Les dépenses générales de PV, applicables à un personnage ayant les PV requis, sont les suivantes : bonus de précision avant le jet, dépassement de Résistance, renforcement de Résistance, augmentation des dégâts et coûts particuliers de manoeuvres, avantages, pouvoirs ou équipements. Les dépenses de Résistance et d'incidence appartiennent donc au combat et aux conflits sociaux autant qu'aux autres scènes.

Le Guide du joueur décrit la banque comme une réserve individuelle dont la capacité dépend du niveau. Les PV doivent normalement être transférés dans la cache avant d'être dépensés. Le système Foundry permet aujourd'hui des transactions traçant séparément cache et banque ; cette facilité n'établit pas une nouvelle règle concernant un pool MJ.

## PW du MJ : le coffret des adversaires

### Existence, création et cycle

Le coffret des adversaires est la seule ressource globale explicitement possédée par le MJ.

| Aspect | Règle constatée | Source | Classification |
| --- | --- | --- | --- |
| Création | aucun solde initial explicite ; le contenant est décrit comme spécial | Guide du maître VF p. 8, Gamemaster Book EN p. 8 | INFORMATION_MISSING pour un solde initial formel |
| Gain | chaque échec critique d'un joueur donne 1 PW au MJ | Guide du joueur VF p. 19, Character Book EN p. 19, Guide du maître VF p. 8 | IMPLEMENTABLE |
| Source | 1 PW est pris du puits | Guide du joueur VF p. 19, Character Book EN p. 19 | IMPLEMENTABLE |
| Destination | coffret des adversaires | mêmes sources | IMPLEMENTABLE |
| Dépense | le MJ peut le dépenser à tout moment pour aider un PNJ | Guide du maître VF p. 8, Gamemaster Book EN p. 8 | PARTIAL |
| Effet de la dépense | aucun effet, coût détaillé, cible exacte ou limite supplémentaire n'est défini | mêmes sources | INFORMATION_MISSING |
| Maximum | aucun maximum indiqué | mêmes sources | INFORMATION_MISSING |
| Fin de cycle | à la fin de la tragédie, tout le contenu retourne au puits | mêmes sources | IMPLEMENTABLE |
| Visibilité | aucune règle de publicité ou de secret | corpus | INFORMATION_MISSING |

L'errata officiel confirme que l'échec critique donne 1 PW au MJ, mais ne modifie pas le fonctionnement du coffret.

### Ce que « aider un PNJ » permet et ne permet pas de conclure

Le livre ne transforme pas ce PW en bonus fixe, reroll, PV, action ou effet prédéfini. Il autorise une dépense « anytime » afin d'aider un PNJ, puis renvoie implicitement au pouvoir général des PW de modifier le destin et aux décisions du MJ. Cette latitude est narrative, pas une API de résolution complète.

Une future interface peut donc afficher et journaliser le solde du coffret, son gain sur échec critique et sa remise à zéro de fin de tragédie. Elle ne doit pas présenter un bouton générique « dépenser 1 PW » qui inventerait automatiquement un effet. La dépense elle-même est `PARTIAL` et doit rester une décision MJ accompagnée d'une description libre ou d'un workflow ultérieurement spécifié.

### PW individuels et collectifs qui ne sont pas le coffret des adversaires

Le coffre de la troupe est un pool collectif de PW des PJ. Le MJ l'alimente depuis le puits en récompensant des moments de jeu remarquables. Les exemples officiels comprennent le bon jeu de rôle, l'apport majeur du concept ou de l'historique, le sacrifice pour la troupe, l'ingéniosité, le triomphe sur les Ténèbres, un objectif important atteint et 1 PW par membre à la fin d'une tragédie.

Un membre de la troupe peut y puiser à tout moment sauf opposition, avec vote en cas d'opposition. Le chef de troupe peut trancher un vote une fois par scène et Source d'inspiration peut transférer 1 PW du coffre à un membre une fois par scène sans vote. Le coffre est sans capacité maximale et n'est pas vidé à la fin d'une scène. Il s'agit d'une ressource de PJ, pas d'un pool MJ hostile, mais une future UI MJ peut avoir besoin de la consulter ou de l'alimenter parce que les récompenses sont attribuées par le MJ.

Les PW personnels peuvent venir d'une réussite critique, de conversions et de certains avantages. Ils peuvent être conservés en banque, occupent la même capacité qu'un PV et retournent au puits depuis une cache non transférée au début du prochain tour. Le texte ne donne pas de règle explicite attribuant un PW personnel à un PNJ qui réalise une réussite critique. Pour une Vedette, la phrase « mêmes traits que les PJ » rend cette extension plausible, mais elle n'est pas suffisamment explicite pour automatiser un gain individuel sans choix de portée. C'est `INFORMATION_MISSING`.

## Dépenses et interactions de PW pertinentes pour un PNJ ou le MJ

| Mécanique | Coût ou gain | Moment | Propriétaire explicitement défini | Portée d'un PNJ | Classification |
| --- | --- | --- | --- | --- | --- |
| Coffret des adversaires | +1 PW sur échec critique d'un joueur ; dépense non détaillée | gain immédiat, dépense à tout moment, remise à zéro fin de tragédie | MJ | aide un PNJ, effet non précisé | PARTIAL |
| Jet favorable | 1 PW, une fois par round | avant le jet concerné | personnage | possible seulement si une source de PW valide est définie | PARTIAL pour PNJ |
| Conversion | 1 PW devient 3 PV du puits | lorsque la dépense est autorisée | personnage | possible seulement si une source de PW valide est définie | PARTIAL pour PNJ |
| Mélodrame | coût en PW selon proposition, effet arbitré au cas par cas | hors séquence figée | joueur avec accord MJ | aucun automatisme fiable | DEFERRED |
| Action principale supplémentaire | 1 PW avant son jet | pendant le tour, immédiatement après l'action principale | personnage | le texte vise les personnages ; disponibilité PNJ non définie | PARTIAL |
| Défense de dernier recours, optionnelle | défenseur dépense 1 PW puis les deux protagonistes misent des PV | après dépassement de Résistance | défenseur avec PW en banque ou coffre de troupe | PNJ possible dans l'exemple abstrait, source de PW PNJ absente | PARTIAL |
| Pouvoirs occultes et avantages | coûts, gains ou conversions particuliers | selon le texte de l'Item ou du pouvoir | détenteur de la règle | à traiter règle par règle | DEFERRED |

Les PW n'interviennent pas dans le calcul de l'initiative interactive de base. Ils n'y interviennent que si une capacité distincte crée un avantage ou une autre exception, ce qui appartient à son moteur propre.

## PNJ : ressources propres, partagées et par tier

### Vedette

Une Vedette possède les mêmes traits qu'un PJ. Les exemples de profils affichent explicitement Vitalité, Second souffle, Banque et Adrénaline. Elle peut donc posséder des PV en banque, générer des PV par ses jets, les placer en cache, les dépenser selon les règles communes, utiliser l'Adrénaline et disposer des Second souffles indiqués par son profil.

La capacité de banque résulte du niveau selon la règle générale. Les exemples affichent notamment une banque de 10 pour une Vedette de niveau 3. La fiche de PNJ comporte une banque globale et ne dissocie pas visuellement PV et PW ; les règles générales autorisent pourtant les PW dans une banque. Aucun exemple ne donne un solde de PW de Vedette ni une politique d'utilisation par le MJ.

Classification : PV, banque, cache, Adrénaline et Second souffle `IMPLEMENTABLE` pour une Vedette dont le profil contient les valeurs nécessaires. PW individuels `PARTIAL` ou `INFORMATION_MISSING` selon l'effet souhaité.

### Agent

Un Agent a un niveau et la plupart des traits d'une Vedette, avec trois exceptions de ressources expressément listées : aucune banque de PV, des poussées d'Adrénaline occasionnelles pour obtenir des PV comme les PJ, aucune règle de Second souffle. Sa Vitalité vaut 5 + Taille + niveau.

Les PV issus de ses jets et de son Adrénaline passent donc par la cache. Sans banque, un Agent n'a pas de stockage persistant de PV. Les livres ne créent ni banque de PW, ni coffre individuel de PW, ni droit explicite d'utiliser le coffret des adversaires comme une réserve personnelle. L'aide du coffret est une action du MJ, non un solde de l'Agent.

Classification : cache de PV et Adrénaline `IMPLEMENTABLE` ; PW individuels `INFORMATION_MISSING` ; usage précis du coffret des adversaires `PARTIAL`.

### Figurant

Un Figurant n'a ni banque ni Adrénaline. Il n'utilise pour sa cache que les PV générés par ses jets. Il n'emploie pas la manoeuvre Se reprendre. Sa Vitalité vaut 5 + Taille.

Les livres autorisent une même fiche pour plusieurs Figurants d'un même groupe, mais ne disent pas que leurs caches, Vitalité, PW, Adrénaline ou banques sont fusionnés. Le groupe est une économie de préparation de PNJ et de narration, pas une règle de ressources partagées.

Classification : cache de PV générés par le jet `IMPLEMENTABLE` ; PW, coffres, partage de cache et ressources de groupe `INFORMATION_MISSING`.

### Créatures et groupes

Les créatures emploient les catégories de PNJ lorsque le livre leur applique un profil. Certaines possèdent des capacités ou des réservoirs fictionnels, par exemple les fragments d'âme d'une gargouille qui agissent comme un coffre de PW avec une capacité donnée. Cette donnée est propre à cette créature ou à son élément de fiction, pas une ressource MJ universelle.

Un groupe de PNJ peut recevoir une fiche commune dans la préparation et agir comme un groupe à l'initiative. Aucune règle ne fixe le critère de regroupement, ne rend les PV ou PW communs, ni ne dit qu'une dépense d'un membre affecte les autres. Toute mutualisation serait donc `INFORMATION_MISSING`.

## Trait Pair, combat et hors combat

### Trait Pair

1. Un succès donne au protagoniste un nombre de PV égal au résultat choisi. Le gain n'est ni attribué au MJ ni versé dans le coffret des adversaires.
2. Une réussite critique ignore la Résistance et donne 1 PW au protagoniste selon la règle générale.
3. Un échec critique donne 1 PW au MJ, pris au puits et versé dans le coffret des adversaires.
4. Les conditions favorables ou défavorables changent la sélection du résultat, donc le montant de PV éventuellement gagné, mais ne créent pas une ressource MJ distincte.
5. Le Goal, les modificateurs et l'Incidence n'utilisent pas le coffret des adversaires par une formule définie.

Le moteur Trait Pair actuel crédite les caches Actor en PV et PW après le Chat. Il conserve un indicateur de gain de PW MJ sur échec critique, mais ne représente ni le puits ni le coffret des adversaires. Cette différence est un constat de périmètre, pas une instruction de modification.

### Combat

Les PV sont employés avant et après les jets de combat pour précision, Résistance, renforcement de Résistance, dégâts et manoeuvres. Les actions réflexes défensives peuvent générer des PV, qui peuvent alors être dépensés pour renforcer la Résistance. Le livre illustre aussi des PNJ utilisant leur cache, leur banque ou leur Adrénaline pendant un combat.

L'option Défense de dernier recours demande 1 PW au défenseur puis une mise secrète de PV pour les deux protagonistes. Elle est explicitement optionnelle et ne doit pas être amalgamée au moteur de Résistance ordinaire. Armor, boucliers énergétiques, dégâts et Vitalité n'accordent aucun pool MJ supplémentaire.

L'initiative, l'action réflexe et l'action retardée modifient le moment d'une action mais ne modifient pas en elles-mêmes la propriété des PV ou PW. Une action réflexe principale consomme l'action concernée avant le tour normal ; si elle est déclenchée, cela compte donc pour l'économie d'actions, pas pour une dépense de ressource MJ.

### Hors combat

Les mêmes PV servent aux conflits sociaux, aux tests, aux explorations, aux manoeuvres, aux avantages et aux pouvoirs lorsqu'une règle le permet. Le coffre de troupe et le coffret des adversaires traversent donc les scènes pertinentes de la tragédie ; ils ne doivent pas être conçus uniquement comme des données de Combat. Les PW de mélodrame sont spécialement hors d'un flux de combat fixe et sont arbitrés au cas par cas.

## Interruption du MJ dans l'initiative interactive

### Règle établie

Une fois par round, le MJ peut interrompre la chaîne de choix et choisir qui agit : un joueur ou l'un de ses PNJ, à condition que le protagoniste choisi n'ait pas encore agi. Le coût normal n'est pas pris d'un pool MJ : le MJ prend 1 PV du puits et le donne au joueur dont le tour a été interrompu. Si un PNJ du MJ a agi en dernier au tour précédent, l'interruption est gratuite pour ce round.

Cette règle est confirmée par le Guide du joueur VF p. 13 et le Character Book EN p. 13. Les exemples du Guide du maître et du Gamemaster Book, p. 94 à 99, montrent la chaîne de choix, les caches de PNJ et les situations d'initiative sans contredire cette règle.

### Ce qui est explicitement connu

| Question | Réponse des sources |
| --- | --- |
| Qui interrompt | le MJ |
| Fréquence | au plus une fois par round |
| Fenêtre | pendant la chaîne de choix de l'initiative interactive |
| Protagoniste choisi | un PJ ou un PNJ du MJ qui n'a pas encore agi |
| Coût normal | 1 PV pris au puits |
| Bénéficiaire du PV | le joueur dont le tour a été interrompu, formulation anglaise et française concordante |
| Exception | gratuit si un PNJ du MJ a agi en dernier au tour précédent |
| Relation au coffret des adversaires | aucune |

### Ce qui reste non déterminé

Les livres ne précisent pas formellement la granularité UI de l'interruption : qui était en train de cliquer, si le tour interrompu est différé ou seulement le choix, qui choisit immédiatement après l'action forcée, ni si une fenêtre d'interruption existe avant le premier choix. La règle générale implique que chaque protagoniste non encore actif doit toujours agir une fois ; elle ne dit pas que le protagoniste interrompu perd son activation. Cette conservation de l'activation est l'inférence la plus prudente, mais elle doit être validée humainement avant automatisation.

La même absence concerne l'interaction détaillée avec chef de troupe, action retardée, action réflexe, fin de file, avantage supérieur et interférences optionnelles. Ces cas ne doivent pas être résolus par un choix silencieux de l'application.

### Machine d'état conceptuelle future

La machine suivante est une spécification de frontière, non une implémentation :

1. L'état existant attend le choix du prochain protagoniste et conserve la liste des protagonistes n'ayant pas encore agi.
2. Le MJ demande une interruption. Le système vérifie le round, l'unicité de l'interruption, la disponibilité du protagoniste choisi et l'exception de gratuité.
3. Si le coût normal s'applique, le système enregistre une transaction du puits vers le bénéficiaire identifié par le texte. Si le puits ne peut pas être compté de manière fiable, il refuse d'automatiser plutôt que de créer un faux solde MJ.
4. Le protagoniste choisi devient actif et est retiré des disponibles. Son tour est terminé selon le workflow normal.
5. Le système rétablit ensuite le mode de choix ordinaire avec toutes les informations de provenance de l'interruption. Le choix du prochain protagoniste reste en attente de la clarification officielle sur son auteur.

Les transitions 2, 3 et 5 sont `PARTIAL`. L'Initiative 0.19.0 ne possède ni marqueur d'interruption par round, ni représentation du puits, ni bénéficiaire explicitement modélisé, ni mode de reprise. Les transitions 1 et 4 correspondent à la chaîne existante et sont `IMPLEMENTABLE` une fois les entrées connues.

## Matrice de portée temporelle

| Ressource | Session | Scène | Combat | Round | Tour | Persistante sur Actor |
| --- | --- | --- | --- | --- | --- | --- |
| Puits | oui, réserve de table | oui | oui | oui | oui | non |
| Cache PV ou PW | non, vidée selon la règle | en temps présent ou narratif, après l'incidence | oui | oui | début du prochain tour en temps instantané | oui seulement si une future application choisit de le saisir, mais le cycle est temporel |
| Banque PV ou PW | oui | oui | oui | oui | oui | oui, par personnage qui en possède une |
| Coffres individuels | selon l'avantage | selon l'avantage | selon l'avantage | selon l'avantage | selon l'avantage | dépend de l'avantage |
| Coffre de troupe | oui, à travers les scènes | oui, non vidé en fin de scène | possible | possible | possible | non, ressource de troupe |
| Coffret des adversaires | tragédie | oui | oui | oui | oui | non, ressource MJ globale de tragédie |
| Adrénaline | oui, jusqu'à récupération prévue | oui | oui | oui | oui | oui, personnage ou PNJ admissible |
| Second souffle | oui, jusqu'à récupération prévue | oui | oui | oui | oui | oui, personnage ou PNJ admissible |
| Vitalité | oui | oui | oui | oui | oui | oui |

Le cycle exact de l'Adrénaline et du Second souffle après repos dépend des chapitres de Traits et de Personnages. Cet audit constate leur propriété PNJ selon les tiers, sans prétendre définir ici tous leurs déclencheurs ou récupérations.

## Visibilité

| Ressource | Visibilité prescrite |
| --- | --- |
| Puits | physiquement à portée des joueurs, donc son existence est publique ; le nombre exact n'est pas normé |
| Cache et banque d'un personnage | règles matérielles et fiche ; aucune politique d'affichage numérique entre joueurs n'est imposée |
| Coffre de troupe | ressource collective, usage soumis à opposition et vote ; son existence et son contenu sont fonctionnellement partagés par la troupe |
| Coffret des adversaires | aucune règle de visibilité ; `INFORMATION_MISSING` |
| Ressources de PNJ | aucune politique de révélation aux joueurs ; `INFORMATION_MISSING` |

Une future UI doit donc traiter la visibilité du coffret des adversaires, des caches PNJ et du puits compté comme une politique de World explicite, non comme une règle officielle prétendument établie.

## Spécification UX future, sans code

| Élément futur | Justification mécanique | Propriétaire | Portée | Visibilité | Actions admissibles |
| --- | --- | --- | --- | --- | --- |
| Coffret des adversaires | +1 PW sur échec critique de PJ, vidé fin de tragédie | MJ | tragédie | MJ par défaut, règle non prescrite | consulter, journaliser gain, déclarer dépense narrative, remise à zéro de fin de tragédie |
| Journal du coffret | effet de dépense non défini mais audit indispensable | MJ | tragédie | MJ | noter déclencheur, montant, PNJ aidé, description et source |
| Attribution au coffre de troupe | récompenses de rôle accordées par le MJ depuis le puits | troupe | inter-scènes | membres de la troupe | ajouter 1 ou plusieurs PW avec motif |
| Ressources d'une Vedette | banque, cache, Adrénaline, Second souffle et Vitalité décrits | PNJ individuel | Actor | MJ par défaut | afficher et modifier seulement via les règles déjà définies |
| Ressources d'un Agent | cache, Adrénaline, Vitalité, pas de banque ni Second souffle | PNJ individuel | Actor | MJ par défaut | afficher cache et Adrénaline, empêcher une banque automatique |
| Ressources d'un Figurant | cache de PV gagnés, Vitalité, pas de banque ni Adrénaline | PNJ individuel ou fiche de groupe narrative | tour et Actor | MJ par défaut | afficher cache propre, ne pas inventer une ressource commune |
| Interruption d'initiative | une fois par round, puits vers protagoniste interrompu, exception gratuite | Combat et puits | round | MJ, bénéficiaire selon politique future | proposer, valider, journaliser, refuser les cas ambigus |

Cette UX ne propose volontairement aucun compteur de « PV MJ », aucun bouton automatique d'effet pour le coffret des adversaires et aucune mutualisation de ressources de PNJ.

## Exigences de transaction future

| Mécanique | Validation préalable | Source et destination | Moment | Annulation et concurrence |
| --- | --- | --- | --- | --- |
| Gain coffret des adversaires | échec critique réellement résolu une seule fois | puits vers coffret | après résultat final | idempotence par identifiant de résolution ; aucune règle de remboursement |
| Dépense coffret | solde suffisant et effet explicitement choisi par le MJ | coffret vers puits, si le coût est consommé ; destination de l'effet non définie | avant l'effet retenu | journal obligatoire ; remboursement non défini par les livres |
| Attribution coffre de troupe | montant et motif MJ | puits vers coffre de troupe | décision MJ | sérialiser les clics ; politique d'annulation UX, pas règle officielle |
| Cache et banque PNJ | ressources et tier compatibles | cache, banque et puits selon l'opération | selon la règle de l'action | une transaction atomique ; éviter un double clic |
| Interruption initiative | round courant, interruption non utilisée, protagoniste disponible, règle de gratuité | puits vers bénéficiaire du texte, ou aucune transaction si gratuite | avant activation forcée | verrou Combat, révision d'état et journal ; aucun remboursement défini |
| Défense de dernier recours | règle optionnelle active, PW disponible, mises simultanées | caches et banques vers puits | après révélation des mises | conservation des mises même en cas de perte, conformément à la règle |

Les règles ne définissent ni concurrence Foundry ni remboursements techniques. Ces propriétés seront des garanties d'implémentation, pas des ajouts de règles.

## Classification synthétique

| Mécanique | Ressource | Propriétaire | Coût ou gain | Déclencheur | Destination | Portée | Visibilité | Source | Classification | Future intégration Foundry |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Gain de PV sur succès | PV | protagoniste | résultat du dé | Trait Pair réussi | cache | tour | non prescrite | GJ p. 20 à 21, CB p. 20 à 21 | IMPLEMENTABLE | moteur de jet et cache Actor |
| Échec critique du joueur | PW | MJ | +1 | d20 naturel 20 | coffret des adversaires | tragédie | non prescrite | GJ p. 19, GM p. 8, CB p. 19, GMB p. 8 | IMPLEMENTABLE | ressource globale distincte |
| Dépense du coffret | PW | MJ | non détaillé | aide à un PNJ | effet non défini | tragédie | non prescrite | GM p. 8, GMB p. 8 | PARTIAL | journal MJ, aucune automatisation d'effet |
| Fin de tragédie | PW | MJ | solde entier | fin de tragédie | puits | tragédie | non prescrite | GM p. 8, GMB p. 8 | IMPLEMENTABLE | action MJ explicite future |
| Récompense de troupe | PW | troupe | 1 ou plusieurs | bon jeu et critères narratifs | coffre de troupe | inter-scènes | collectif | GM p. 8 à 9, GMB p. 8 à 9 | PARTIAL | attribution MJ avec justification |
| Tirage coffre de troupe | PW | troupe | montant voté ou autorisé | demande membre | membre de troupe | scène et au-delà | collectif | GM p. 9, GMB p. 9 | PARTIAL | workflow social, pas moteur MJ hostile |
| Vedette | PV, Adrénaline, Second souffle | PNJ individuel | selon profil | actions et ressources générales | cache, banque, Vitalité | Actor | non prescrite | GM p. 37 à 38, GMB p. 37 à 38 | IMPLEMENTABLE | Actor NPC tier headliner |
| Agent | PV, Adrénaline | PNJ individuel | gain cache ou Adrénaline | action ou poussée | cache | Actor et tour | non prescrite | GM p. 39, GMB p. 39 | IMPLEMENTABLE | Actor NPC tier agent |
| Figurant | PV cache | PNJ individuel | PV du jet | action réussie | cache | tour | non prescrite | GM p. 39, GMB p. 39 | IMPLEMENTABLE | Actor NPC tier extra |
| PW individuel de PNJ | PW | PNJ incertain | non défini | critique ou capacité incertaine | cache ou banque incertaine | incertain | non prescrite | GM p. 37 à 39, GMB p. 37 à 39 | INFORMATION_MISSING | ne pas automatiser |
| Interruption MJ | PV du puits | puits puis protagoniste interrompu | 1 PV ou gratuit | une fois par round | bénéficiaire interrompu | round | non prescrite | GJ p. 13, CB p. 13 | PARTIAL | extension Combat après choix de reprise |
| Défense de dernier recours | PW puis PV | défenseur et attaquant | 1 PW et mises | option après Résistance | puits | résolution | mises secrètes | GJ p. 34 à 35, CB p. 34 à 35 | DEFERRED | moteur optionnel de combat |
| Mélodrame | PW | personnage avec accord MJ | cas par cas | proposition narrative | effet narratif | tragédie | table | GJ p. 22 à 23, CB p. 22 à 23 | DEFERRED | interface de demande, sans résolution automatique |

## Comparaison VF et EN

| Sujet | VF | EN | Conséquence |
| --- | --- | --- | --- |
| Coffret MJ | « coffret des adversaires », le MJ gagne 1 PW puis peut aider un PNJ | « adversary coffer », same rule | aucune divergence mécanique |
| Origine du PW MJ | pris du puits sur échec critique | taken from the well on critical miss | aucune divergence |
| Fin du coffret | contenu remis au puits fin de tragédie | contents emptied back into well at end of drama | aucune divergence |
| Interruption | prendre 1 PV du puits et le donner au joueur dont le tour a été interrompu | taking 1 VP from the well and giving it to the player whose turn was interrupted | aucune divergence ; bénéficiaire formulé comme joueur, non comme un pool MJ |
| Gratuité | dernier PNJ MJ du tour précédent | GM NPC acted last in the previous turn | aucune divergence |
| Agent | pas de banque, Adrénaline, pas de Second souffle | no bank, surges, no revivals | aucune divergence |
| Figurant | cache des PV générés par les jets, sans banque ni Adrénaline | cache of VP generated from rolls, no bank or surge | aucune divergence |
| Errata | pas de correction supplémentaire du coffret ou des PNJ | idem | aucune divergence pertinente |

## Questions non résolues

### Bloquantes pour la gestion des PV MJ

1. Aucune : un pool de PV MJ n'existe pas. Une implémentation ne doit donc pas être conçue autour de lui.
2. Si le puits doit être compté dans Foundry, son stock initial, sa finitude et sa réconciliation avec les jetons matériels restent non définis.

### Bloquantes pour les PW MJ

1. Solde initial explicite du coffret des adversaires.
2. Effets autorisés, coût effectif et destination d'une dépense pour « aider un PNJ ».
3. Visibilité du coffret et politique de journalisation souhaitée.

### Bloquantes pour les PNJ

1. Attribution de PW individuels aux Vedettes, Agents et Figurants.
2. Usage mécanique précis d'un PW du coffret sur un PNJ.
3. Partage éventuel de cache ou de PW dans un groupe de PNJ.
4. Politique de représentation d'une créature ayant un coffre de PW fictionnel particulier.

### Bloquantes pour l'Initiative Interactive

1. Moment exact d'ouverture de l'interruption dans la chaîne de choix.
2. Auteur du choix suivant après l'action forcée.
3. Sémantique exacte du « tour interrompu » et confirmation que son activation est seulement différée.
4. Interaction avec avantage, fin de file, action retardée, action réflexe et interférences optionnelles.
5. Représentation décidée ou non du puits commun, nécessaire seulement si la transaction de 1 PV doit être automatique.

### Non bloquantes

1. L'affichage MJ du coffret, à condition de ne pas automatiser son effet.
2. L'attribution manuelle de PW au coffre de troupe avec motif.
3. L'affichage des ressources déjà déterminées pour les trois tiers de PNJ.

## État du système 0.19.0 et conséquences futures

Le DataModel existant expose déjà cache, banque, Adrénaline, Second souffle et Vitalité pour les Actors. Il reflète correctement les grands tiers pour les PV, l'Adrénaline et le Second souffle : Vedette complète, Agent sans banque ni Second souffle, Figurant sans banque ni Adrénaline. Il ne représente pas le puits, le coffre de troupe, le coffret des adversaires, l'historique de tragédie ou un statut d'interruption.

Le moteur Trait Pair applique les gains de cache Actor et enregistre l'information d'un PW MJ à l'échec critique sans créer le coffret. L'Initiative 0.19.0 représente une chaîne de choix, mais pas l'interruption, son coût, son exception gratuite ou sa reprise. Ces écarts sont volontairement `DEFERRED` jusqu'à validation humaine des questions listées ici.

## Conclusion

Les prochaines étapes sûres, après validation humaine, sont ordonnées ainsi :

1. décider si le puits est un compteur numérique, un journal non compté ou une ressource purement matérielle hors Foundry ;
2. préciser l'effet d'un PW du coffret des adversaires ;
3. décider la politique de PW individuels des PNJ ;
4. préciser les transitions manquantes de l'interruption ;
5. seulement ensuite choisir les Documents Foundry qui porteront chaque état.

Le système ne doit pas déduire ces réponses de ce qui est simple à stocker. Les règles établissent un coffret MJ de PW, un puits commun et des ressources propres différenciées par tier de PNJ ; le reste exige une décision de table ou une source supplémentaire.
