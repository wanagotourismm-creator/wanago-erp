-- Wanago ERP — narrow read-only reporting mirror (audit §6.3 / Stage 6).
--
-- This is NOT a general database mirror. Only the fields needed for
-- customer cohort/retention reporting are copied here: customer signup
-- date and booking dates/customer linkage. Firestore remains the single
-- source of truth for all live app data — nothing here is ever written
-- back to Firestore, and nothing here is ever read by the app except the
-- one Customer Retention report.
--
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor ->
-- New query -> paste -> Run) after creating the project.

create table if not exists reporting_customers (
  id         text primary key,
  created_at timestamptz not null,
  synced_at  timestamptz not null default now()
);

create table if not exists reporting_bookings (
  id          text primary key,
  customer_id text not null,
  created_at  timestamptz not null,
  status      text not null,
  synced_at   timestamptz not null default now()
);

create index if not exists reporting_bookings_customer_id_idx on reporting_bookings (customer_id);
create index if not exists reporting_bookings_created_at_idx  on reporting_bookings (created_at);

-- Row Level Security — enabled on both tables with NO policies granted to
-- the anon/authenticated Postgres roles. This app never issues an anon/
-- publishable Supabase key to any client, so in practice only the
-- service_role key (used exclusively server-side, which bypasses RLS by
-- Supabase's design) can touch these tables at all. RLS here is
-- defense-in-depth, not the primary access boundary — the primary
-- boundary is that the service_role key is never shipped to the browser,
-- and every server-side route that uses it independently re-verifies the
-- caller is Admin/Finance via their Firebase ID token first.
alter table reporting_customers enable row level security;
alter table reporting_bookings  enable row level security;

-- service_role bypasses RLS but still needs the underlying table
-- privileges granted (Supabase's dashboard SQL Editor normally does this
-- automatically for new tables; explicit here so this script is correct
-- regardless of how it's run, e.g. via a direct Postgres connection).
grant select, insert, update, delete on public.reporting_customers to service_role;
grant select, insert, update, delete on public.reporting_bookings  to service_role;
