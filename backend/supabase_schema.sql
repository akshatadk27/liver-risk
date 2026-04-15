-- ============================================================
-- LiverRisk Platform — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension (optional, we use serial IDs here)
-- create extension if not exists "uuid-ossp";

-- ── techniques ───────────────────────────────────────────────
create table if not exists techniques (
  id                      serial primary key,
  name                    text unique not null,
  category                text not null,
  formula                 text not null,
  description             text not null,
  interpretability_score  numeric(4,2) not null,
  created_at              timestamptz default now()
);

-- ── performances ─────────────────────────────────────────────
create table if not exists performances (
  id            serial primary key,
  technique_id  int references techniques(id) on delete cascade,
  accuracy      numeric(6,4) not null,
  precision     numeric(6,4) not null,
  recall        numeric(6,4) not null,
  f1_score      numeric(6,4) not null,
  paper_source  text not null
);

-- ── risk_factors ─────────────────────────────────────────────
create table if not exists risk_factors (
  id                serial primary key,
  factor_name       text unique not null,
  normal_range_min  numeric not null,
  normal_range_max  numeric not null,
  unit              text not null
);

-- ── coefficients ─────────────────────────────────────────────
create table if not exists coefficients (
  id               serial primary key,
  technique_id     int references techniques(id) on delete cascade,
  factor_id        int references risk_factors(id) on delete cascade,
  beta_value       numeric not null,
  odds_ratio       numeric not null,
  confidence_low   numeric not null,
  confidence_high  numeric not null
);

-- ── patients ─────────────────────────────────────────────────
create table if not exists patients (
  id                    serial primary key,
  age                   int not null check (age between 1 and 120),
  gender                text not null check (gender in ('Male','Female','Other')),
  bilirubin             numeric,
  alt                   numeric,
  ast                   numeric,
  platelets             numeric,
  alcohol               text,
  smoking               text,
  bmi                   numeric,
  hbv                   boolean default false,
  hcv                   boolean default false,
  diabetes              text,
  -- Family history of liver disease (risk factor)
  -- Source: Donato et al. Hepatology 1997 (OR≈3.0 first-degree), Loomba et al. Gastroenterology 2015
  family_history_liver  text default null,
  source                text default 'manual' check (source in ('ocr','manual','camera')),
  created_at            timestamptz default now()
);

-- ── Migration: add column to existing deployments ─────────────
-- Run this ONLY if the table already exists in your Supabase project:
-- alter table patients add column if not exists family_history_liver text default null;

-- ── calculations ─────────────────────────────────────────────
create table if not exists calculations (
  id            serial primary key,
  patient_id    int references patients(id) on delete cascade,
  technique_id  int references techniques(id) on delete cascade,
  risk_result   numeric not null check (risk_result between 0 and 100),
  created_at    timestamptz default now()
);

-- ── Row-Level Security ────────────────────────────────────────
-- Only the service-role key (used by backend) can read/write.
-- Public anon users cannot access any table directly.
alter table patients    enable row level security;
alter table calculations enable row level security;
alter table techniques  enable row level security;
alter table performances enable row level security;
alter table risk_factors enable row level security;
alter table coefficients enable row level security;

-- Allow service role full access (backend uses service key)
create policy "service_role_all" on patients    for all using (true) with check (true);
create policy "service_role_all" on calculations for all using (true) with check (true);
create policy "service_role_all_t" on techniques  for all using (true) with check (true);
create policy "service_role_all_p" on performances for all using (true) with check (true);
create policy "service_role_all_r" on risk_factors for all using (true) with check (true);
create policy "service_role_all_c" on coefficients for all using (true) with check (true);

-- ── static_batches ───────────────────────────────────────────
create table if not exists static_batches (
  id                  serial primary key,
  patient_count       int not null check (patient_count > 0),
  average_risk        numeric not null check (average_risk between 0 and 100),
  created_at          timestamptz default now()
);

alter table static_batches enable row level security;
create policy "service_role_all_sb" on static_batches for all using (true) with check (true);

-- ── static_batch_techniques ──────────────────────────────────
create table if not exists static_batch_techniques (
  id              serial primary key,
  batch_id        int references static_batches(id) on delete cascade,
  technique_name  text not null,
  average_risk    numeric not null,
  accuracy        numeric not null,
  precision       numeric not null,
  recall          numeric not null,
  f1_score        numeric not null
);

alter table static_batch_techniques enable row level security;
create policy "service_role_all_sbt" on static_batch_techniques for all using (true) with check (true);
