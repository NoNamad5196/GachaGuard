alter table public.payments
  add column if not exists source text not null default 'manual',
  add column if not exists external_order_id text,
  add column if not exists import_fingerprint text,
  add column if not exists merchant text,
  add column if not exists raw_description text,
  add column if not exists currency text not null default 'KRW',
  add column if not exists imported_at timestamptz;

alter table public.payments
  drop constraint if exists payments_source_not_blank,
  add constraint payments_source_not_blank check (length(trim(source)) > 0);

alter table public.payments
  drop constraint if exists payments_currency_format,
  add constraint payments_currency_format check (currency ~ '^[A-Z]{3}$');

create unique index if not exists idx_payments_user_import_fingerprint
  on public.payments(user_id, import_fingerprint)
  where import_fingerprint is not null;

create index if not exists idx_payments_user_source_paid_at
  on public.payments(user_id, source, paid_at desc);
