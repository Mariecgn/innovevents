# MCD - Innov'Events

```mermaid
erDiagram
USERS ||--o| CLIENTS : possede
CLIENTS ||--o{ EVENTS : commande
CLIENTS ||--o{ QUOTES : recoit
EVENTS ||--o{ QUOTES : concerne
QUOTES ||--o{ QUOTE_ITEMS : contient
EVENTS ||--o{ NOTES : contient
USERS ||--o{ NOTES : redige
EVENTS ||--o{ TASKS : contient
USERS ||--o{ TASKS : realise
EVENTS ||--o{ REVIEWS : recoit
CLIENTS ||--o{ REVIEWS : ecrit
PROSPECTS ||--o| CLIENTS : devient
```

## Règles de gestion
- Un prospect peut être converti en client.
- Un client peut avoir plusieurs événements.
- Un événement peut avoir plusieurs devis.
- Un devis contient plusieurs prestations.
- Les logs sont stockés dans MongoDB.
