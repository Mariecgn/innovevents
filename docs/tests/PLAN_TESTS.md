# Plan de tests

## Fonctionnalité testée intégralement : demande de devis

| Type | Cas | Résultat attendu |
|---|---|---|
| Unitaire | Validation champs obligatoires | Rejet si champ vide |
| Fonctionnel | POST /api/prospects complet | Création prospect statut A_CONTACTER |
| E2E | Formulaire web demande de devis | Message de remerciement affiché |
| Sécurité | Champs invalides | Requête refusée |

## Coverage
Commande : `npm test -- --coverage`.
Objectif minimal ECF : prouver l'existence d'un environnement de test et d'un premier test automatisé.
