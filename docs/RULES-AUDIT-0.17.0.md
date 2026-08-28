# Audit de règles 0.17.0

## Décision de livraison

STATUS: deferred

Le point d'arrêt obligatoire est déclenché. L'audit détaillé figure dans `docs/STATES-AUDIT-0.17.0.md`.

## Classification

| Élément | Classification | Motif |
| --- | --- | --- |
| Inconscient | PARTIAL | Libellé et déclencheur historique disponibles; effet, durée, fin et cumul absents des sources françaises du dépôt |
| Mourant | PARTIAL | Libellé et déclencheur historique disponibles; effet, durée, fin, progression et relation avec Inconscient absents |
| États physiques, mentaux et sociaux | INFORMATION_MISSING | Catégories annoncées par la roadmap sans inventaire ni règles |
| Mort | INFORMATION_MISSING | Aucun État ni transition correspondante n'est documenté dans les sources françaises disponibles |

Aucun élément n'est classé IMPLEMENTABLE. Aucun effet, aucune durée et aucune transition persistante ne sont automatisés.

## Ce qui reste conforme et inchangé

1. Le moteur pur de Vitalité continue de calculer les conséquences historiques Inconscient et Mourant.
2. Les workflows Damage, Energy Shield et Outils MJ restent inchangés.
3. Les protections `operationId`, `pending` et `resolved` restent inchangées.
4. Aucun DataModel n'est modifié.
5. Aucun ActiveEffect et aucun status propre au système n'est créé.
6. Les Actor de monde, Tokens liés et Actors synthétiques conservent leur comportement 0.16.0.
7. Les anciens ChatMessages et flags restent inchangés.

## Foundry V14

L'architecture future devra utiliser les status configurés et les ActiveEffects Actor natifs, principalement `CONFIG.statusEffects`, `Actor.statuses` et `Actor.toggleStatusEffect()`. L'Actor synthétique fourni par `TokenDocument.actor` doit rester la cible documentaire d'un Token non lié.

Cette architecture n'est pas ajoutée maintenant, car choisir la présence, la suppression ou le remplacement d'un ActiveEffect serait déjà une décision de règle non couverte par la VF disponible.

## Version

`system.json` reste en 0.16.0 avec `compatibility.verified` à 14.367. La version 0.17.0 n'est pas forcée.

## Condition de reprise

L'implémentation peut reprendre lorsque les passages français normatifs décrivant le déclencheur, l'effet, la durée, la fin et le cumul ou remplacement d'Inconscient et Mourant sont disponibles.
