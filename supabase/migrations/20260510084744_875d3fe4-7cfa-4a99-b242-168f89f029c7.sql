-- Profiles
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  locale text default 'fr',
  plan text default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles viewable by owner" on public.profiles for select using (auth.uid() = user_id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = user_id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = user_id);

-- Updated_at trigger function
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.update_updated_at_column();

-- Auto create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end; $$;

-- Roles
create type public.app_role as enum ('admin', 'moderator', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users view own roles" on public.user_roles for select using (auth.uid() = user_id);
create policy "Admins manage roles" on public.user_roles for all using (public.has_role(auth.uid(), 'admin'));

-- Connected accounts (Vercel, GitHub, Zoho, etc.)
create table public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scopes text[] default '{}',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);
alter table public.connected_accounts enable row level security;

create policy "Users view own connections" on public.connected_accounts for select using (auth.uid() = user_id);
create policy "Users insert own connections" on public.connected_accounts for insert with check (auth.uid() = user_id);
create policy "Users update own connections" on public.connected_accounts for update using (auth.uid() = user_id);
create policy "Users delete own connections" on public.connected_accounts for delete using (auth.uid() = user_id);

create trigger connected_accounts_updated_at before update on public.connected_accounts
for each row execute function public.update_updated_at_column();

-- Trigger on signup
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();