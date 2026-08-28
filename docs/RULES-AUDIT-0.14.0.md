# Audit des règles 0.14.0

Cet audit décrit l'état technique du dépôt ciblant Foundry VTT 14.367. « Correct » signifie conforme au périmètre réellement implémenté, et non que l'ensemble du jeu est automatisé.

## 0.1 Actor

STATUS: partially implemented

RULE DIFFERENCE: Les DataModels `character`, `npc` et `creature`, leurs valeurs initiales et leurs champs dérivés sont opérationnels. Les États complets, l'initiative et la création de personnage complète restent différés.

CHANGE: Aucun champ persistant ni calcul Actor modifié en 0.14.0. Les libellés français des caractéristiques, compétences, ressources, Résistances et tiers ont été consolidés dans `lang/fr.json`.

## 0.2 Item

STATUS: partially implemented

RULE DIFFERENCE: Les douze types d'Item existants restent pris en charge sans changement de schéma. Les compendiums et les Starships ne sont pas implémentés.

CHANGE: Aucun DataModel Item modifié. Les noms français des types et des champs visibles ont été corrigés.

## 0.3 Character Sheet

STATUS: partially implemented

RULE DIFFERENCE: La feuille moderne permet l'édition du socle Actor, affiche les valeurs dérivées et les Items embarqués. Elle ne constitue pas un système complet de création de personnage et n'automatise pas les manœuvres ou pouvoirs occultes.

CHANGE: Aucune logique de feuille modifiée. Les clés i18n existantes fournissent désormais les termes français officiels.

## 0.4 NPC Sheet

STATUS: corrected in 0.14.0

RULE DIFFERENCE: Vedette conserve les ressources complètes. Agent garde un niveau, aucune banque, l'Adrénaline, aucun Second souffle et une Vitalité de `5 + taille + niveau`. Figurant n'affiche ni niveau utile, ni banque, ni Adrénaline, ni Second souffle et conserve une Vitalité de `5 + taille`. L'interdiction de la manœuvre Se reprendre n'est pas automatisée, car le moteur complet de manœuvres est différé. Les exceptions manuelles de statblocks restent possibles.

CHANGE: Mécanique inchangée. Terminologie Vedette, Agent, Figurant, valeur ciblée et Incidence corrigée dans `lang/fr.json`.

## 0.5 Creature Sheet

STATUS: partially implemented

RULE DIFFERENCE: La feuille réutilise les règles de tiers du PNJ et gère les actions et aptitudes spéciales éditables. Les règles exhaustives de créatures et leurs contenus publiés ne sont pas automatisés.

CHANGE: Mécanique inchangée. Libellés français consolidés.

## 0.6 Item Sheet

STATUS: corrected in 0.14.0

RULE DIFFERENCE: La feuille générique couvre les douze types existants. La classe persistée `eb` était affichée eB en français.

CHANGE: L'affichage français utilise eG. La normalisation accepte eB, eb, eG et eg comme alias de la valeur canonique `eb`. Aucun document n'est migré globalement.

## 0.7 Trait Pair

STATUS: corrected in 0.14.0

RULE DIFFERENCE: Avant 0.14.0, une valeur ciblée supérieure ou égale à 20 ne reconnaissait pas 19 comme réussite critique et n'ajoutait pas le bonus de PV au-dessus de 20.

CHANGE: `scripts/rules/traitPair.mjs` conserve 20 comme échec critique naturel, reconnaît 19 comme réussite critique lorsque la valeur ciblée est supérieure ou égale à 20 et ajoute `max(0, goal - 20)` aux PV de chaque réussite. La sélection Favorable ou Défavorable réutilise cette évaluation pure. Les dialogues ne dupliquent pas la règle.

## 0.8 Resistance

STATUS: corrected in 0.14.0

RULE DIFFERENCE: Le moteur de Résistance et le contournement sur réussite critique étaient déjà fonctionnels. La locale française affichait encore Goal Roll, VP, Bank et Échec pour une défaite après Résistance.

CHANGE: Les libellés deviennent jet ciblé, PV, banque et défaite. Les paramètres techniques `cacheSpend` et `bankSpend` restent compatibles et tracent séparément les PV dépensés depuis chaque réserve. Les PV peuvent être librement transférés entre la cache et la banque; les workflows peuvent donc utiliser les deux réserves. Une seule mise à jour Actor est conservée.

## 0.9 Result Impact

STATUS: corrected in 0.14.0

RULE DIFFERENCE: Les coûts 0, 2, 4 et 6 étaient corrects, mais les libellés français restaient Impact, Basic, Good, Better et Best.

CHANGE: L'interface affiche Incidence, Victoire basique, Bon, Supérieur et Optimal. Les clés internes `impact`, `basic`, `good`, `better` et `best` et les API existantes restent inchangées. Les dépenses combinées depuis la cache et la banque restent autorisées et sont présentées séparément pour assurer leur traçabilité.

## 0.10 Damage/Vitality

STATUS: correct

RULE DIFFERENCE: Un point de dégâts retire un point de Vitalité, sans descendre sous zéro. Une cible au-dessus de zéro qui tombe à zéro devient Inconsciente. Une cible déjà à zéro qui subit des dégâts devient Mourante. Le dépassement sur le même coup ne déclenche pas Mourant.

CHANGE: Aucune règle modifiée. La couverture de régression est conservée.

## 0.11 Armor

STATUS: correct

RULE DIFFERENCE: Le périmètre actuel gère l'armure portée, le bouclier à main, leurs protections et la Résistance effective. Ultra Perforant conserve la moitié arrondie à l'inférieur avec Anti-perforation, sinon zéro. Les propriétés de dégâts complètes restent différées.

CHANGE: Aucun calcul modifié. Les libellés français des protections ont été corrigés.

## 0.11.1 Attack Properties

STATUS: partially implemented

RULE DIFFERENCE: Aucune, Blaster, Feu, Perforant, Laser, Choc, Impact, Sonique et Ultra Perforant participent aux règles d'armure actuelles. Le bonus de 2 dégâts de Choc contre une armure métallique non Anti-choc et la défense auditive contre Sonique ne sont pas implémentés.

CHANGE: Aucun calcul modifié. Terminologie française corrigée, avec une distinction explicite entre Impact, propriété d'attaque, et Incidence, terme du moteur général.

## 0.12 Energy Shields

STATUS: partially implemented

RULE DIFFERENCE: Le moteur gère Seuils, Coups, activation, compatibilité d'armure, blocage, dégâts pénétrants et suivi de transaction. La Pénétration de Blaster ou brûleur et la Retenue restent différées.

CHANGE: Alias de compatibilité eB et eG ajouté sans migration destructive. Les libellés Bouclier énergétique, bouclier-e, Seuils, Coups, Bruyant et Atténuateur de champ sont documentés ou localisés selon les écrans disponibles.

## 0.12.1 Burn-Out/Distortion

STATUS: partially implemented

RULE DIFFERENCE: Les clés techniques `burnout` et `distortion` restent stables. L'orchestration existante gère les activations par round, les déclencheurs, le jet d'épuisement, l'indisponibilité temporaire et la Distorsion. Les interactions ambiguës de déclencheurs restent volontairement manuelles.

CHANGE: Aucune logique modifiée. Burn-Out est désormais affiché Épuisement et Burn-out goal devient valeur ciblée d'épuisement en français.

## 0.12.2 GM Tools

STATUS: partially implemented

RULE DIFFERENCE: Les jets contrôlés réutilisent le moteur Trait Pair, y compris la règle corrigée pour une valeur ciblée supérieure ou égale à 20. Les dégâts MJ normaux et directs conservent leurs flags techniques et leurs transactions. Le véritable coffre global des adversaires du MJ n'existe pas; un échec critique conserve seulement `gmWyrdAward = 1` dans le résultat.

CHANGE: Aucun second moteur de règle créé. Les tests de jets imposés couvrent les valeurs ciblées 20 et 22. Les libellés français du panneau MJ ont été consolidés.

## 0.13 UX

STATUS: corrected in 0.14.0

RULE DIFFERENCE: Plusieurs écrans français affichaient encore des termes provisoires ou anglais, notamment Goal, VP, WP, Impact, Headliner, Surge, Revival, Hits, Burn-Out et les noms anglais de propriétés et protections.

CHANGE: `lang/fr.json` emploie la terminologie officielle dans les feuilles, dialogues, cartes de chat et Outils MJ. `docs/GLOSSARY-FR.md` fixe la correspondance entre identifiants internes, anglais et français officiel. Aucun CSS ni template n'a dû être modifié.

## Éléments différés

STATUS: deferred

Les éléments suivants ne sont pas annoncés comme implémentés:

1. véritable coffre des adversaires du MJ;
2. cycle automatique de la cache au début du tour;
3. Pénétration des boucliers-e pour Blaster et brûleur;
4. Retenue;
5. bonus de 2 dégâts de Choc contre une armure métallique non Anti-choc;
6. défense auditive contre Sonique;
7. propriétés de dégâts complètes;
8. États complets;
9. initiative complète;
10. création de personnage complète;
11. manœuvres complètes;
12. pouvoirs occultes;
13. compendiums;
14. Starships.
