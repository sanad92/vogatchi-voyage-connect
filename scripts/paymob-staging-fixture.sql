-- Run only on the dedicated Safar ERP Paymob staging project.
-- Keep the fixture out of the application's production migrations.
create table public.organizations (
  id uuid primary key,
  name text not null,
  base_currency text not null default 'EGP'
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text
);

create table public.subscription_plans (
  id uuid primary key,
  name text not null,
  name_ar text not null,
  description_ar text,
  price_monthly numeric(10,2) not null check (price_monthly >= 1),
  price_yearly numeric(10,2) not null check (price_yearly >= 1),
  duration_days integer not null default 30,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  plan_id uuid not null references public.subscription_plans(id),
  status text not null,
  created_at timestamptz not null default now()
);

create table public.payment_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  plan_id uuid not null references public.subscription_plans(id),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'EGP' check (currency = 'EGP'),
  merchant_order_id text not null unique,
  paymob_order_id text unique,
  provider_transaction_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired')),
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.profiles enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_checkout_sessions enable row level security;

revoke all on public.organizations, public.organization_members, public.profiles, public.subscription_plans,
  public.subscriptions, public.payment_checkout_sessions from public, anon, authenticated;
grant select on public.organizations, public.organization_members, public.profiles, public.subscription_plans,
  public.subscriptions, public.payment_checkout_sessions to authenticated;
grant all on public.organizations, public.organization_members, public.profiles, public.subscription_plans,
  public.subscriptions, public.payment_checkout_sessions to service_role;

create policy read_own_membership on public.organization_members for select to authenticated
  using (user_id = (select auth.uid()) and is_active);
create policy read_own_organization on public.organizations for select to authenticated
  using (id in (select organization_id from public.organization_members));
create policy read_own_profile on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy read_test_plan on public.subscription_plans for select to authenticated
  using (is_active and exists (select 1 from public.organization_members));
create policy read_own_subscription on public.subscriptions for select to authenticated
  using (organization_id in (select organization_id from public.organization_members));
create policy read_own_checkout on public.payment_checkout_sessions for select to authenticated
  using (created_by = (select auth.uid()) and organization_id in (select organization_id from public.organization_members));

create function public.prepare_subscription_checkout(
  _organization_id uuid, _plan_id uuid, _billing_cycle text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  cycle text := lower(trim(coalesce(_billing_cycle, '')));
  amount bigint;
  checkout public.payment_checkout_sessions;
begin
  if cycle not in ('monthly', 'yearly') then
    raise exception 'Billing cycle must be monthly or yearly';
  end if;
  if not exists (
    select 1 from public.organization_members
    where organization_id = _organization_id and user_id = caller_id
      and is_active and role in ('owner', 'manager')
  ) then
    raise exception 'Not authorized to purchase this organization subscription';
  end if;
  select round((case when cycle = 'yearly' then price_yearly else price_monthly end) * 100)
    into strict amount from public.subscription_plans where id = _plan_id and is_active;
  insert into public.payment_checkout_sessions (
    organization_id, plan_id, billing_cycle, amount_cents, merchant_order_id, created_by
  ) values (
    _organization_id, _plan_id, cycle, amount, 'safar_qa_' || gen_random_uuid(), caller_id
  ) returning * into checkout;
  return jsonb_build_object(
    'checkout_session_id', checkout.id, 'organization_id', checkout.organization_id,
    'plan_id', checkout.plan_id, 'billing_cycle', checkout.billing_cycle, 'amount_cents', checkout.amount_cents,
    'currency', checkout.currency, 'merchant_order_id', checkout.merchant_order_id, 'expires_at', checkout.expires_at
  );
end;
$$;

revoke all on function public.prepare_subscription_checkout(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.prepare_subscription_checkout(uuid, uuid, text) to authenticated;

insert into public.organizations (id, name)
  values ('c91de48d-eb19-4f42-9bb5-3167b2398593', 'Safar ERP Paymob QA');
insert into public.subscription_plans (id, name, name_ar, price_monthly, price_yearly)
  values ('d9277dec-08f2-470d-bb90-fab7aeac796d', 'Paymob QA', 'خطة اختبار باي موب', 10, 100);
