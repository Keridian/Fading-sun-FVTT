# Audit des règles 0.15.0

Cet audit complète l'audit 0.14.0 pour le système ciblant Foundry VTT 14.367. Le périmètre 0.15.0 est limité à la Retenue et à la Pénétration des boucliers énergétiques pour Blaster et Feu.

## Retenue

STATUS: implemented

La fonction pure `evaluateRestraint` valide des dégâts de base et une dépense de PV entiers positifs ou nuls. La dépense doit être paire. Chaque tranche de 2 PV réduit les dégâts de base de 1, sans résultat négatif.

Dans l'Incidence de dégâts, l'ordre est: dégâts de base, Retenue, bonus de dégâts acheté, dégâts finaux. La Retenue et le bonus partagent la transaction atomique existante entre cache et banque, avec un seul appel de mise à jour Actor.

## Pénétration Blaster

STATUS: implemented

La Pénétration est évaluée uniquement lorsqu'un bouclier-e s'active réellement. Blaster effectue un test binaire par point de dégâts que le bouclier peut tenter de bloquer. Chaque résultat 2 pénètre et chaque résultat 1 est bloqué.

## Pénétration Feu

STATUS: implemented

La clé interne `flame`, affichée Feu en français, représente aussi les effets de Brûleur couverts par la règle. Le nombre de tests est la partie entière de la moitié des dégâts candidats. Les points non représentés par un test sont bloqués lorsque le bouclier s'active.

## Seuils et dépassement

Les dégâts candidats sont `min(dégâts finaux, seuil maximum)`. Les dégâts au-dessus du seuil maximum pénètrent structurellement et s'ajoutent aux réussites de Pénétration. Les dégâts sous le seuil minimum ne déclenchent ni activation, ni Pénétration, ni consommation de Coup.

## Jets et historique

Les tests utilisent un Roll Foundry natif `Nd2`. Le moteur inspecte chaque dé au lieu d'utiliser seulement le total. La convention est 1 pour bloqué et 2 pour pénétrant. Le Roll est ajouté à l'historique du ChatMessage lors de la finalisation.

## Épuisement et Distorsion

La règle existante reste inchangée. Un échec d'Épuisement normal avant protection empêche la Pénétration, la consommation d'un Coup et la Distorsion. Pour un déclencheur spécial, l'ordre est protection, Pénétration, Coup, Distorsion, test spécial d'Épuisement.

## Compatibilité

Les flags historiques ne sont pas renommés. Le flag du bouclier peut maintenant contenir un objet `penetration`, et les anciens messages qui ne le contiennent pas restent affichables. Les API publiques existantes sont conservées.

## Éléments différés

STATUS: deferred

1. bonus de Choc contre métal non Anti-choc;
2. défense auditive Sonique;
3. propriétés de dégâts complètes;
4. États complets;
5. modes de tir et workflow Weapon complet;
6. manœuvres complètes;
7. initiative;
8. pouvoirs;
9. Starships.
