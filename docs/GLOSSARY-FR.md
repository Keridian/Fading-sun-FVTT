# Glossaire technique français

Ce glossaire décrit les libellés employés par le système. Les identifiants internes restent stables pour préserver les Worlds, les Items, les flags et les API existants.

## Mécanique générale

| Internal | English | Français officiel |
| --- | --- | --- |
| `victoryPointSystem` | Victory Point System | Système Point de Victoire |
| `vp` | VP, Victory Points | PV, points de victoire |
| `wp` | WP, Wyrd Points | PW, points de wyrd |
| `goal` | Goal | valeur ciblée |
| `goalModifier` | Goal modifier | modificateur de valeur ciblée |
| `goalRoll` | Goal roll | jet ciblé |
| `success` | Success | réussite |
| `failure` | Miss | échec |
| `criticalHit` | Critical Hit | réussite critique |
| `criticalMiss` | Critical Miss | échec critique |
| `victory` | Victory | victoire |
| `resistanceFailure` | Failure after Resistance | défaite |
| `resistance` | Resistance | Résistance |
| `impact` | Impact | Incidence |
| `result` | Result | Résultat |
| `damage` | Damage | Dégâts |

## Caractéristiques et catégories

| Internal | English | Français officiel |
| --- | --- | --- |
| `body` | Body | Corps |
| `mind` | Mind | Mental |
| `spirit` | Spirit | Esprit |
| `strength` | Strength | Force |
| `dexterity` | Dexterity | Dextérité |
| `endurance` | Endurance | Endurance |
| `wits` | Wits | Sagacité |
| `perception` | Perception | Perception |
| `will` | Will | Volonté |
| `presence` | Presence | Présence |
| `intuition` | Intuition | Intuition |
| `faith` | Faith | Foi |
| `psi` | Psi | Psi |
| `urge` | Urge | Pulsion |
| `theurgy` | Theurgy | Théurgie |
| `hubris` | Hubris | Hybris |

## Compétences

| Internal | English | Français officiel |
| --- | --- | --- |
| `academia` | Academia | Érudition |
| `alchemy` | Alchemy | Alchimie |
| `animalia` | Animalia | Animalia |
| `arts` | Arts | Arts |
| `charm` | Charm | Charme |
| `crafts` | Crafts | Artisanats |
| `disguise` | Disguise | Déguisement |
| `drive` | Drive | Conduite |
| `empathy` | Empathy | Empathie |
| `fight` | Fight | Corps à corps |
| `focus` | Focus | Focalisation |
| `impress` | Impress | Prestance |
| `interface` | Interface | Interface |
| `intrusion` | Intrusion | Intrusion |
| `knavery` | Knavery | Filouterie |
| `melee` | Melee | Mêlée |
| `observe` | Observe | Observation |
| `perform` | Perform | Représentation |
| `pilot` | Pilot | Pilotage |
| `remedy` | Remedy | Remède |
| `shoot` | Shoot | Tir |
| `sleightOfHand` | Sleight of Hand | Escamotage |
| `sneak` | Sneak | Discrétion |
| `survival` | Survival | Survie |
| `techRedemption` | Tech Redemption | Rédemption technologique |
| `vigor` | Vigor | Vigueur |

Les valeurs initiales techniques restent 0 pour `alchemy`, `interface` et `pilot`, et 3 pour les autres compétences.

## Ressources

| Internal | English | Français officiel |
| --- | --- | --- |
| `vitality` | Vitality | Vitalité |
| `cache` | Cache | cache |
| `bank` | Bank | banque |
| `troupeCoffer` | Troupe Coffer | coffre de la troupe |
| `surge` | Surge | Adrénaline |
| `surge.current` | Surge use | poussée d'adrénaline |
| `revival` | Revival | Second souffle |
| `unconscious` | Unconscious | Inconscient |
| `dying` | Dying | Mourant |

Les PV peuvent être librement transférés entre la cache et la banque. Les workflows du système peuvent donc utiliser et tracer séparément les PV disponibles dans les deux réserves.

## Types d'Item

| Internal | English | Français officiel |
| --- | --- | --- |
| `species` | Species | Espèce |
| `class` | Class | Classe |
| `faction` | Faction | Faction |
| `calling` | Calling | Vocation |
| `capability` | Capability | Aptitude |
| `perk` | Perk | Avantage |
| `affliction` | Affliction | Affliction |
| `maneuver` | Maneuver | Manœuvre |
| `weapon` | Weapon | Arme |
| `armor` | Armor | Armure |
| `energyShield` | Energy Shield | Bouclier énergétique |
| `equipment` | Equipment | Équipement |

## Tiers de PNJ

| Internal | English | Français officiel |
| --- | --- | --- |
| `headliner` | Headliner | Vedette |
| `agent` | Agent | Agent |
| `extra` | Extra | Figurant |

## Incidence de Résultat

| Internal | English | Français officiel |
| --- | --- | --- |
| `basic` | Basic | Victoire basique |
| `good` | Good | Bon |
| `better` | Better | Supérieur |
| `best` | Best | Optimal |

Les coûts restent respectivement 0, 2, 4 et 6 PV.

## Propriétés d'attaque

| Internal | English | Français officiel |
| --- | --- | --- |
| `none` | None | Aucune |
| `blaster` | Blaster | Blaster |
| `flame` | Flame | Feu |
| `hard` | Hard | Perforant |
| `laser` | Laser | Laser |
| `shock` | Shock | Choc |
| `slam` | Slam | Impact |
| `sonic` | Sonic | Sonique |
| `ultraHard` | Ultra Hard | Ultra Perforant |

Dans ce tableau, « Impact » est le nom d'une propriété d'attaque. L'Impact du moteur général est affiché « Incidence ».

## Protections d'armure

| Internal | English | Français officiel |
| --- | --- | --- |
| `blasterproof` | Blasterproof | Anti-blaster |
| `flameproof` | Flameproof | Anti-feu |
| `hardproof` | Hardproof | Anti-perforation |
| `laserproof` | Laserproof | Anti-laser |
| `shockproof` | Shockproof | Anti-choc |
| `slamproof` | Slamproof | Anti-impact |
| `metallic` | Metallic | Métallique |

Il n'existe pas de protection `ultraHardproof`. Ultra Perforant utilise `hardproof` pour déterminer si la moitié de la Résistance est conservée.

Le champ persistant `system.metallic` indique explicitement si une armure ou un bouclier à main est métallique. Sa valeur initiale est `false`; aucun nom d'Item n'est interprété. Une attaque de Choc gagne une seule fois 2 dégâts lorsqu'au moins un élément défensif équipé est métallique et dépourvu d'Anti-choc.

Sonique continue d'ignorer les contributions de l'armure, du bouclier à main et du bouclier énergétique. La protection auditive reste différée, car les données françaises disponibles dans le projet ne définissent pas assez précisément sa source persistante et son effet mécanique.

## Boucliers énergétiques

| Internal | English | Français officiel |
| --- | --- | --- |
| `energyShield` | Energy Shield | Bouclier énergétique |
| `eShield` | e-shield | bouclier-e |
| `threshold` | Threshold | Seuil |
| `hits` | Hits | Coups |
| `burnout` | Burn-Out | Épuisement |
| `distortion` | Distortion | Distorsion |
| `noisy` | Noisy | Bruyant |
| `shieldDamper` | Shield Damper | Atténuateur de champ |
| `bleedthrough` | Bleedthrough | Pénétration |
| `restraint` | Restraint | Retenue |
| `es` | eS | eS |
| `ea` | eA | eA |
| `eb` | eB | eG |

`eb` reste la valeur canonique persistée. Les saisies `eB`, `eb`, `eG` et `eg` désignent la même catégorie logique. L'anglais affiche eB et le français eG, sans migration globale des documents existants.

La Retenue réduit les dégâts de base de 1 point pour chaque tranche de 2 PV dépensés. Elle est appliquée avant le bonus de dégâts acheté par l'Incidence de dégâts.

La Pénétration est automatisée lorsque le bouclier-e s'active contre une propriété `blaster` ou `flame`. La branche technique `flame`, affichée Feu, représente aussi les effets de Brûleur décrits par cette règle. Les tests utilisent un jet Foundry natif de d2 par test, avec 1 pour un point bloqué et 2 pour un point pénétrant.
