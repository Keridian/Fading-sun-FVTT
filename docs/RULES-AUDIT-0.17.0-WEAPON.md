# Audit de règles Weapon 0.17.0

> Note historique : ce résumé correspond au point d'arrêt antérieur à la fourniture des règles explicites du tir simple 0.17.0. Le workflow désormais implémenté est décrit dans `docs/WEAPON-ATTACK-0.17.0.md`. Les classifications ci-dessous restent conservées comme état historique de l'audit.

## Décision de livraison

STATUS: deferred

Le point d'arrêt obligatoire est déclenché. L'audit détaillé figure dans `docs/WEAPON-AUDIT-0.17.0.md`.

## Classification synthétique

| Mécanique | Classification | Motif |
| --- | --- | --- |
| Persistance et affichage des données Weapon | IMPLEMENTABLE | Déjà opérationnels, sans interprétation mécanique |
| Trait Pair général | IMPLEMENTABLE | Moteur existant validé, mais sélection propre à Weapon non documentée |
| Sélection du Trait Pair Weapon | INFORMATION_MISSING | Aucune correspondance normative arme, Caractéristique et Compétence |
| Attaque simple Weapon | PARTIAL | Moteurs disponibles, orchestration et consommation non définies |
| Portée canonique manuelle | IMPLEMENTABLE | Déjà utilisée par Résistance et Distorsion |
| Conversion des portées numériques Weapon | INFORMATION_MISSING | Seuils, unités et modificateurs non documentés |
| Munitions | PARTIAL | Champs persistants présents, coût et instant de consommation absents |
| Rechargement | INFORMATION_MISSING | Aucune réserve ni règle de rechargement fiable |
| Three-Round Burst | INFORMATION_MISSING | Nom de roadmap sans règle ni déclencheur canonique |
| Rafale | PARTIAL | Déclencheur manuel d'Épuisement existant, mode de tir complet absent |
| Chargeur vidé | PARTIAL | Déclencheur manuel d'Épuisement existant, consommation et effets absents |
| Spread | INFORMATION_MISSING | Nom de roadmap sans règle ni clé canonique |
| Attaque de zone | PARTIAL | Déclencheur manuel d'Épuisement existant, ciblage et effets absents |
| Propriété d'attaque unique | IMPLEMENTABLE | Moteurs existants validés hors Weapon |
| Plusieurs propriétés d'attaque | INFORMATION_MISSING | Ordre et cumul non définis |
| Propriétés de dégâts | DEFERRED | Non décrites et non modélisées |
| Incidence, Armor, Bouclier énergétique et Vitalité | IMPLEMENTABLE | Moteurs existants à réutiliser sans changement |
| Binding de cible après Résistance | IMPLEMENTABLE | Sécurisé dans le workflow existant |
| Binding dès le lancement Weapon | PARTIAL | Aucun contexte Weapon n'existe dans le flag initial |

## Résultat du point d'arrêt

1. Aucun workflow Weapon n'est créé.
2. Aucun mode de tir n'est automatisé.
3. Aucune munition n'est consommée ou rechargée.
4. Aucun champ DataModel n'est ajouté ou modifié.
5. Aucune feuille Item ou Actor n'est modifiée.
6. Aucun moteur Trait Pair, Résistance, Incidence, Damage, Armor ou Bouclier énergétique n'est modifié.
7. Aucun workflow spécial MJ n'est créé.
8. Aucune API publique n'est ajoutée.
9. Aucun fichier de localisation n'est modifié.
10. Les audits States 0.17.0 restent inchangés.

## Version

`system.json` reste en 0.16.0 avec `compatibility.verified` à 14.367. La version 0.17.0 n'est pas forcée.

## Condition de reprise

L'implémentation peut reprendre lorsque les passages français normatifs définissent au minimum le Trait Pair d'une attaque simple, les règles de portée nécessaires, le coût en munitions et le moment de la consommation. Chaque mode de tir exige ensuite son coût, ses modificateurs, ses dégâts, son nombre de jets et de cibles, ses restrictions et son interaction avec l'Épuisement.
