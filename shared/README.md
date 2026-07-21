# Shared domain (`@pahadlink/shared`)

Rules and catalogs used by **both** the React frontend (`src/`) and the Express API (`server/`).

## Boundaries

| Folder | Owns |
|--------|------|
| `src/` | UI, React, Vite, browser-only helpers |
| `server/` | Express routes, Mongo models, JWT, SMTP, inventory store |
| `shared/` | Coupons, pricing catalog, roles, qty limits, rating math |

**Never** import `src/` from `server/`, or `server/` from `src/`.
Import shared rules from `@pahadlink/shared` (or `../shared/...` on the server).
