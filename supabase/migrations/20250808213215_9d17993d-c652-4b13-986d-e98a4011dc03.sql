
-- 1) دعم التحديث التلقائي لـ updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) جداول الصفحات والبلوكات
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  seo_title text,
  seo_description text,
  seo_keywords text[],
  og_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_pages_updated_at
before update on public.pages
for each row execute procedure public.set_updated_at();

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  type text not null,
  title text,
  content jsonb not null default '{}'::jsonb,
  layout_settings jsonb not null default '{}'::jsonb,
  style_settings jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  order_index integer not null default 0,
  section text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_blocks_page_order on public.blocks(page_id, order_index);

create trigger set_blocks_updated_at
before update on public.blocks
for each row execute procedure public.set_updated_at();

alter table public.pages enable row level security;
alter table public.blocks enable row level security;

-- RLS للصفحات
drop policy if exists "Public can read active pages" on public.pages;
create policy "Public can read active pages"
on public.pages
for select
using (is_active = true);

drop policy if exists "Admins manage pages" on public.pages;
create policy "Admins manage pages"
on public.pages
for all
using (has_role(auth.uid(), 'super_admin'::user_role) or has_role(auth.uid(), 'admin'::user_role) or has_role(auth.uid(), 'manager'::user_role))
with check (has_role(auth.uid(), 'super_admin'::user_role) or has_role(auth.uid(), 'admin'::user_role) or has_role(auth.uid(), 'manager'::user_role));

-- RLS للبلوكات
drop policy if exists "Public can read active blocks" on public.blocks;
create policy "Public can read active blocks"
on public.blocks
for select
using (
  is_active = true
  and exists (
    select 1 from public.pages p
    where p.id = blocks.page_id and p.is_active = true
  )
);

drop policy if exists "Admins manage blocks" on public.blocks;
create policy "Admins manage blocks"
on public.blocks
for all
using (has_role(auth.uid(), 'super_admin'::user_role) or has_role(auth.uid(), 'admin'::user_role) or has_role(auth.uid(), 'manager'::user_role))
with check (has_role(auth.uid(), 'super_admin'::user_role) or has_role(auth.uid(), 'admin'::user_role) or has_role(auth.uid(), 'manager'::user_role));

-- 3) النماذج والحقول والردود
create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  destination_email text,
  submit_action text default 'store',
  is_public boolean not null default true,
  is_active boolean not null default true,
  captcha_enabled boolean not null default false,
  success_message text default 'تم الإرسال بنجاح، شكرًا لتواصلك',
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_forms_updated_at
before update on public.forms
for each row execute procedure public.set_updated_at();

create table if not exists public.form_fields (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  name text not null,
  label text not null,
  type text not null,
  required boolean not null default false,
  placeholder text,
  help_text text,
  options jsonb not null default '[]'::jsonb,
  validation jsonb not null default '{}'::jsonb,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(form_id, name)
);

create index if not exists idx_form_fields_form_order on public.form_fields(form_id, order_index);

create trigger set_form_fields_updated_at
before update on public.form_fields
for each row execute procedure public.set_updated_at();

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  submitted_by uuid,
  data jsonb not null,
  user_agent text,
  ip_address inet,
  status text not null default 'received'
);

create index if not exists idx_form_submissions_form_time on public.form_submissions(form_id, submitted_at desc);

create or replace function public.set_form_submission_defaults()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.submitted_by is null then
    new.submitted_by = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_form_submission_defaults on public.form_submissions;
create trigger trg_set_form_submission_defaults
before insert on public.form_submissions
for each row execute procedure public.set_form_submission_defaults();

alter table public.forms enable row level security;
alter table public.form_fields enable row level security;
alter table public.form_submissions enable row level security;

-- RLS للنماذج
drop policy if exists "Public can read active public forms" on public.forms;
create policy "Public can read active public forms"
on public.forms
for select
using (is_public = true and is_active = true);

drop policy if exists "Admins manage forms" on public.forms;
create policy "Admins manage forms"
on public.forms
for all
using (has_role(auth.uid(), 'super_admin'::user_role) or has_role(auth.uid(), 'admin'::user_role) or has_role(auth.uid(), 'manager'::user_role))
with check (has_role(auth.uid(), 'super_admin'::user_role) or has_role(auth.uid(), 'admin'::user_role) or has_role(auth.uid(), 'manager'::user_role));

-- RLS لحقول النماذج
drop policy if exists "Public can read fields of active public forms" on public.form_fields;
create policy "Public can read fields of active public forms"
on public.form_fields
for select
using (
  exists (
    select 1 from public.forms f
    where f.id = form_fields.form_id and f.is_public = true and f.is_active = true
  )
);

drop policy if exists "Admins manage form fields" on public.form_fields;
create policy "Admins manage form fields"
on public.form_fields
for all
using (has_role(auth.uid(), 'super_admin'::user_role) or has_role(auth.uid(), 'admin'::user_role) or has_role(auth.uid(), 'manager'::user_role))
with check (has_role(auth.uid(), 'super_admin'::user_role) or has_role(auth.uid(), 'admin'::user_role) or has_role(auth.uid(), 'manager'::user_role));

-- RLS لردود النماذج
drop policy if exists "Anyone can submit public active forms" on public.form_submissions;
create policy "Anyone can submit public active forms"
on public.form_submissions
for insert
with check (
  exists (
    select 1 from public.forms f
    where f.id = form_submissions.form_id and f.is_public = true and f.is_active = true
  )
);

drop policy if exists "Admins can view all form submissions" on public.form_submissions;
create policy "Admins can view all form submissions"
on public.form_submissions
for select
using (has_role(auth.uid(), 'super_admin'::user_role) or has_role(auth.uid(), 'admin'::user_role) or has_role(auth.uid(), 'manager'::user_role));

drop policy if exists "Users can view their own submissions" on public.form_submissions;
create policy "Users can view their own submissions"
on public.form_submissions
for select
using (submitted_by = auth.uid());

drop policy if exists "Admins can manage submissions" on public.form_submissions;
create policy "Admins can manage submissions"
on public.form_submissions
for update using (has_role(auth.uid(), 'super_admin'::user_role) or has_role(auth.uid(), 'admin'::user_role) or has_role(auth.uid(), 'manager'::user_role))
with check (has_role(auth.uid(), 'super_admin'::user_role) or has_role(auth.uid(), 'admin'::user_role) or has_role(auth.uid(), 'manager'::user_role));

-- 4) القوائم وروابط التنقل
create table if not exists public.menus (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_menus_updated_at
before update on public.menus
for each row execute procedure public.set_updated_at();

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus(id) on delete cascade,
  parent_id uuid references public.menu_items(id) on delete set null,
  label text not null,
  url text not null,
  target text,
  icon_name text,
  is_active boolean not null default true,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_menu_items_menu_order on public.menu_items(menu_id, order_index);

create trigger set_menu_items_updated_at
before update on public.menu_items
for each row execute procedure public.set_updated_at();

alter table public.menus enable row level security;
alter table public.menu_items enable row level security;

drop policy if exists "Public can read active menus" on public.menus;
create policy "Public can read active menus"
on public.menus
for select
using (is_active = true);

drop policy if exists "Admins manage menus" on public.menus;
create policy "Admins manage menus"
on public.menus
for all
using (has_role(auth.uid(), 'super_admin'::user_role) or has_role(auth.uid(), 'admin'::user_role) or has_role(auth.uid(), 'manager'::user_role))
with check (has_role(auth.uid(), 'super_admin'::user_role) or has_role(auth.uid(), 'admin'::user_role) or has_role(auth.uid(), 'manager'::user_role));

drop policy if exists "Public can read active menu items" on public.menu_items;
create policy "Public can read active menu items"
on public.menu_items
for select
using (is_active = true);

drop policy if exists "Admins manage menu items" on public.menu_items;
create policy "Admins manage menu items"
on public.menu_items
for all
using (has_role(auth.uid(), 'super_admin'::user_role) or has_role(auth.uid(), 'admin'::user_role) or has_role(auth.uid(), 'manager'::user_role))
with check (has_role(auth.uid(), 'super_admin'::user_role) or has_role(auth.uid(), 'admin'::user_role) or has_role(auth.uid(), 'manager'::user_role));

-- 5) بيانات أولية: صفحة Home + قائمة أساسية
-- INSERT INTO public.pages (slug, name, description, is_active)
-- values ('home', 'الصفحة الرئيسية', 'الصفحة الرئيسية للموقع', true)
-- on conflict (slug) do nothing;
-- INSERT INTO public.menus (key, name, description, is_active)
-- values ('main', 'Main Navigation', 'القائمة الرئيسية للموقع', true)
-- on conflict (key) do nothing;
