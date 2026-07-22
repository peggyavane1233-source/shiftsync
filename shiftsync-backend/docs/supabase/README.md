# Supabase migrations

Run these in order in **Supabase → SQL Editor** (safe to re-run):

1. `V1__schema.sql` — create tables **and** `ALTER … IF NOT EXISTS` upgrades for older DBs  
2. `V2__seed_dev.sql` — demo data (`ON CONFLICT DO NOTHING`)

Insert shapes:

```sql
INSERT INTO departments (id, site_id, name) VALUES (...);
INSERT INTO certifications (id, site_id, name, description, expiry_days) VALUES (...);
```

## Seeded users (dev)

**Password for every account below: `1234`**

| Role | Name | Email | Employee no |
|------|------|-------|-------------|
| SUPERVISOR | Kwame Mensah | `kwame@shiftsync.io` | SUP-100 |
| SUPERVISOR | Akua Osei | `akua@shiftsync.io` | SUP-101 |
| SUPERVISOR | Yaw Appiah | `yaw@shiftsync.io` | SUP-102 |
| ADMIN | Afiya Baah | `admin@shiftsync.io` | ADM-001 |
| SAFETY | Kofi Owusu | `safety@shiftsync.io` | SAF-001 |
| WORKER | Ama Boateng | `ama.boateng@shiftsync.io` | WRK-1000 |
| WORKER | Kwadwo Asare | `kwadwo.asare@shiftsync.io` | WRK-1001 |
| WORKER | Abena Pokua | `abena.pokua@shiftsync.io` | WRK-1002 |
| WORKER | Kwabena Frimpong | `kwabena.frimpong@shiftsync.io` | WRK-1003 |
| WORKER | Yaa Asantewaa | `yaa.asantewaa@shiftsync.io` | WRK-1004 |

Dev only — change passwords before any real production use.
