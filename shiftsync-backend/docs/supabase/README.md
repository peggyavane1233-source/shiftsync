# Supabase migrations

Run these in order in **Supabase → SQL Editor** (or via `psql`):

1. `V1__schema.sql` — full ShiftSync schema (`sites`, `departments.site_id`, `certifications.site_id`, …)
2. `V2__seed_dev.sql` — demo data

Insert shapes:

```sql
INSERT INTO departments (id, site_id, name) VALUES (...);
INSERT INTO certifications (id, site_id, name, description, expiry_days) VALUES (...);
```

All seed IDs are valid UUIDs (Postgres rejects strings like `dept-0000-...`).

Demo login password for seeded users: `password`
