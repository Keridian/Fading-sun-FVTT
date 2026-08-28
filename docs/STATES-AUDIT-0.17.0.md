# Audit des États envisagés pour 0.17.0

## Conclusion

L'automatisation mécanique doit s'arrêter à l'audit.

Les sources françaises présentes dans le dépôt permettent d'identifier les libellés `Inconscient` et `Mourant`, ainsi que deux déclencheurs déjà employés par le moteur de Vitalité. Elles ne fournissent cependant pas les règles complètes nécessaires pour déterminer sans ambiguïté l'effet mécanique, la durée, la fin et le cumul ou remplacement de ces États.

Aucun État ne satisfait donc simultanément les cinq critères d'automatisation fixés pour 0.17.0. Aucun status Foundry, ActiveEffect, service d'État, changement de DataModel ou changement de version ne doit être ajouté avant que les passages normatifs français manquants soient disponibles.

## Corpus français disponible dans le dépôt

1. `docs/GLOSSARY-FR.md`, section Ressources, associe les identifiants internes `unconscious` et `dying` aux libellés français Inconscient et Mourant. Cette source fixe la terminologie, mais ne décrit aucune règle d'État.
2. `Fading-Suns-4e-PATCH-NOTES.md`, section 0.10.0, consigne le comportement historique du système : passer d'une Vitalité supérieure à zéro à zéro produit la conséquence `Unconscious`; recevoir de nouveaux dégâts en étant déjà à zéro produit `Dying`; les dégâts excédentaires du coup qui atteint zéro ne produisent pas automatiquement `Dying`.
3. `Fading-Suns-4e-ROADMAP.md`, section Phase 3, mentionne des catégories physiques, mentales et sociales ainsi que des persistances temporaires, durables et chroniques. Elle précise que les détails doivent être dérivés des livres officiels. Ces catégories sont un projet d'architecture, pas des règles utilisables.
4. `lang/fr.json` contient les libellés Inconscient et Mourant pour les cartes de dégâts et les Outils MJ. Une traduction d'interface ne constitue pas une règle.
5. Aucun livre VF, extrait normatif, PDF, document bureautique ou fichier texte de règles n'est présent dans l'arborescence du projet auditée.

Les notes de version prouvent le comportement déjà implémenté et validé en runtime. Elles ne remplacent pas une source française capable de répondre aux questions de durée, de fin, d'effet et de cumul.

## Inventaire des États identifiés

| Nom VF | Identifiant historique | Source ou règle disponible | Déclencheur disponible | Effet mécanique | Durée | Fin | Cumul ou remplacement | Automatisable | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Inconscient | `unconscious` | Glossaire pour le libellé; notes 0.10.0 pour la conséquence historique | Vitalité strictement positive avant les dégâts et égale à zéro après les dégâts | Non documenté dans la VF disponible | Non documentée | Non documentée | Relation avec Mourant non documentée | Non | PARTIAL |
| Mourant | `dying` | Glossaire pour le libellé; notes 0.10.0 pour la conséquence historique | Vitalité déjà égale à zéro et nouveaux dégâts strictement positifs | Non documenté dans la VF disponible | Non documentée | Non documentée | Remplace, complète ou cumule Inconscient : non documenté | Non | PARTIAL |

## Analyse détaillée

### Inconscient

Le moteur pur `applyDamageToVitality()` calcule déjà `unconsciousTriggered` lorsque la Vitalité passe d'une valeur strictement positive à zéro sous l'effet de dégâts positifs. Ce calcul est cohérent avec les notes de version 0.10.0 et ne doit pas être modifié dans le cadre de cet audit.

Il manque toutefois les informations suivantes :

1. l'effet exact sur les actions, les jets, les défenses ou le mouvement;
2. la durée éventuelle;
3. la procédure de récupération ou de suppression;
4. l'effet d'un soin ou d'un retour de la Vitalité au-dessus de zéro;
5. la relation avec Mourant;
6. le comportement en cas de nouveau déclenchement alors que l'État est déjà présent.

La création d'un status persistant serait déjà une automatisation de durée et de fin. Sans ces règles, même un ActiveEffect sans changements chiffrés serait une hypothèse.

### Mourant

Le moteur pur `applyDamageToVitality()` calcule déjà `dyingTriggered` lorsqu'une cible à zéro Vitalité reçoit des dégâts strictement positifs. Il conserve également la règle historique selon laquelle un seul coup qui amène une cible à zéro ne déclenche pas Mourant par ses dégâts excédentaires.

Il manque toutefois les informations suivantes :

1. l'effet exact de Mourant;
2. une éventuelle progression vers la mort;
3. la cadence et le déclencheur de cette progression;
4. la durée ou les échéances éventuelles;
5. les actions, soins, jets ou décisions qui mettent fin à l'État;
6. la relation avec Inconscient;
7. les règles de répétition ou de cumul.

Aucune transition `mourant` vers `dead` ne peut être ajoutée. Aucun État Mort n'est défini par les sources françaises présentes dans le projet.

## Termes rencontrés qui ne sont pas des États Actor automatisables

1. Affliction est un type d'Item existant. Le dépôt ne permet pas d'assimiler automatiquement chaque Affliction à un status Foundry.
2. Épuisement et Distorsion sont des états runtime du sous-système Bouclier énergétique, persistés sur l'Item concerné. Ils ont leurs propres règles et ne sont pas des États Actor génériques dans le périmètre audité.
3. Les catégories Physical States, Mental States, Social States, Temporary, Enduring et Chronic figurent uniquement dans la roadmap. Aucun État nommé et aucune mécanique correspondante ne sont décrits.
4. Les termes anglais standards `dead`, `prone`, `stunned` et `wounded` ne figurent pas comme règles du système. Ils ne doivent pas être reconstruits ni traduits par analogie.

## Inventaire du code actuel

1. Le système ne modifie pas `CONFIG.statusEffects`.
2. Aucun appel à `Actor.toggleStatusEffect()` n'existe.
3. Aucun ActiveEffect n'est créé, modifié ou supprimé par le code du système.
4. Aucun `statusId`, ensemble `statuses` ou champ Actor persistant d'États n'existe.
5. `FadingSunsActor` est une extension vide de la classe Actor et ne contient aucune logique d'État.
6. Les feuilles Character, NPC et Creature n'affichent pas de panneau d'États propre au système.
7. `applyDamageToVitality()` retourne seulement les booléens `unconsciousTriggered` et `dyingTriggered` avec le résultat de Vitalité.
8. `applyDamage()` persiste ces booléens dans `flags.fadingsuns4e.damageApplication`, mais ne crée aucun état durable.
9. Les dégâts directs des Outils MJ utilisent le même moteur pur de Vitalité et enregistrent les mêmes conséquences, sans état durable.

Les status standards éventuellement fournis par le cœur Foundry en runtime ne sont donc pas des États Fading Suns configurés par ce système.

## API Foundry V14 vérifiée

La documentation officielle Foundry V14 confirme les mécanismes adaptés à une future implémentation :

1. [`CONFIG.statusEffects`](https://foundryvtt.com/api/v14/variables/CONFIG.statusEffects.html) contient les définitions de status reconnues par le système, indexées par identifiant stable;
2. [`Actor.toggleStatusEffect(statusId, options)`](https://foundryvtt.com/api/v14/classes/foundry.documents.Actor.html#toggleStatusEffect) active ou désactive un status configuré et accepte notamment `active` et `overlay`;
3. [`Actor.statuses`](https://foundryvtt.com/api/v14/classes/foundry.documents.Actor.html#statuses) expose les identifiants appliqués par les ActiveEffects;
4. [`ActiveEffect`](https://foundryvtt.com/api/v14/classes/foundry.documents.ActiveEffect.html) est un document embarqué de l'Actor;
5. [`TokenDocument.actor`](https://foundryvtt.com/api/v14/classes/foundry.documents.TokenDocument.html#actor) renvoie l'Actor principal pour un Token lié et l'Actor synthétique matérialisé par l'ActorDelta pour un Token non lié.

Ces API sont appropriées pour éviter un second stockage parallèle. Elles ne sont pas appelées tant que les règles françaises manquantes empêchent de définir correctement les status.

## Architecture minimale proposée après réception des règles

Cette architecture est une proposition, pas une implémentation 0.17.0 actuelle.

1. Rules Engine : fonctions pures évaluant des transitions à partir d'un événement de Vitalité et d'un ensemble d'États existants.
2. State service : traduction d'une transition confirmée en activation ou retrait idempotent d'un status.
3. Foundry : définitions dans `CONFIG.statusEffects`, persistance par ActiveEffect et application avec `Actor.toggleStatusEffect()`.
4. Actor ou Token : le service reçoit toujours l'Actor réellement ciblé; un Actor de monde persiste sur lui-même, un Token lié utilise ce même Actor et un Token non lié utilise son Actor synthétique.
5. UI : affichage natif ou compact des status, sans données techniques.

Les identifiants `unconscious` et `dying` sont déjà stables dans le glossaire et peuvent être conservés si les règles confirment ces deux États.

## Analyse transactionnelle future

Le workflow actuel protège l'application des dégâts avec un verrou local, un `operationId` et un flag ChatMessage `pending`, puis met à jour la Vitalité avant de finaliser le flag en `resolved`.

Une future création d'ActiveEffect et une mise à jour de Vitalité sont deux écritures documentaires distinctes dans Foundry. Elles ne constituent pas une transaction distribuée atomique. L'implémentation devra donc :

1. conserver le verrou et l'identifiant d'opération existants;
2. ne finaliser le ChatMessage qu'après la Vitalité et le status;
3. rendre l'activation du status idempotente;
4. conserver un état récupérable si la Vitalité change mais que l'ActiveEffect échoue;
5. ne jamais prétendre qu'un rollback complet est garanti par Foundry.

La stratégie exacte dépendra aussi de la règle de remplacement entre Inconscient et Mourant, qui est actuellement inconnue.

## Informations normatives requises

Pour chaque État à automatiser, il faut fournir le passage français qui répond explicitement aux points suivants :

1. déclencheur complet;
2. effet mécanique complet;
3. durée ou absence de durée;
4. fin automatique, action de récupération, soin, jet ou décision nécessaire;
5. cumul, renouvellement ou remplacement;
6. relation avec les autres États;
7. permissions attendues si un joueur peut le retirer lui-même.

Pour Mourant, il faut en plus la règle éventuelle de progression vers la mort. Pour Inconscient, il faut en plus l'effet d'une Vitalité restaurée au-dessus de zéro.

## Plus petit périmètre 0.17.0 sûr

Après réception de passages VF complets, le plus petit périmètre sûr serait limité à Inconscient et Mourant :

1. conserver sans changement le calcul pur actuel des déclencheurs s'il est confirmé;
2. ajouter uniquement les deux définitions de status nécessaires;
3. appliquer leurs transitions confirmées avec un service idempotent;
4. intégrer le service aux dégâts normaux et directs, sans branche MJ spéciale;
5. ne créer aucun modificateur mécanique, aucune durée et aucune transition vers Mort non explicitement documentés;
6. tester Actor de monde, Token lié, Actor synthétique non lié, Actor sans Token, permissions et réapplication d'un même message.

En l'état actuel des sources, même ce périmètre ne peut pas être livré honnêtement. La version reste donc 0.16.0.
