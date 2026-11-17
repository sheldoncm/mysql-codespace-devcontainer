# RD4.1 CICO Tracker — Complete lesson application

Covers Steps 1–35: Express/EJS, reusable layout, navigation/footer partials, CRUD, one-to-many meals, many-to-many tags, transactions/rollback, joined listing, search and empty state.

## Existing Codespaces installation (preserves data)

1. Back up existing files and MariaDB database before replacing the application.
2. Copy the contents of this ZIP into `/workspaces/mysql-codespace-devcontainer/CICO` (do not overwrite `.env`).
3. From `CICO`, run `npm install` then `node migrate.js` **once**. Migration preserves existing `food_entries` and converts legacy `meal`/JSON `tags` into relational associations without deleting old columns.
4. Run `npm start`; open forwarded port 3000.
5. Test `/`, `/?search=rice`, `/food-entry/create`, edit, and delete confirmation.

The migration checks that meals ID 1 is N/A; it stops if an existing meal mapping conflicts. Database schema changes cannot be rolled back as one transaction. Always back up first. Do not rerun the original schema.sql.

`.env` is excluded from Git. Expected keys: DB_HOST, DB_USER, DB_PASSWORD, DB_PORT, DB_NAME.
