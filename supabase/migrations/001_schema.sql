-- ============ TABLES ============

create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text,
  full_name         text,
  phone             text,
  referral_code     text unique not null
                    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  referred_by       uuid references public.profiles(id),
  email_verified_at timestamptz,
  created_at        timestamptz not null default now()
);

create table public.loans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  amount     numeric(12,2) not null check (amount > 0),
  status     text not null default 'pending'
             check (status in ('pending','approved','rejected','disbursed')),
  created_at timestamptz not null default now()
);

create table public.referrals (
  id          uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referee_id  uuid not null unique references public.profiles(id) on delete cascade, -- a person can be referred only once
  created_at  timestamptz not null default now(),
  check (referrer_id <> referee_id)
);

-- One-time email verification codes (only the Edge Functions touch this table)
create table public.email_codes (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  code_hash   text not null,
  ip          text,
  attempts    int not null default 0,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);
create index email_codes_email_created_idx on public.email_codes (email, created_at desc);
create index email_codes_ip_created_idx    on public.email_codes (ip, created_at desc);

-- ============ AUTO-CREATE PROFILE ON SIGN-UP ============
-- Sign-up metadata: { full_name, referral_code }

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referrer uuid;
begin
  select p.id into v_referrer
  from public.profiles p
  where p.referral_code = upper(new.raw_user_meta_data->>'referral_code');

  insert into public.profiles (id, email, full_name, referred_by)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', v_referrer);

  if v_referrer is not null then
    insert into public.referrals (referrer_id, referee_id) values (v_referrer, new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ ROW LEVEL SECURITY ============

alter table public.profiles    enable row level security;
alter table public.loans       enable row level security;
alter table public.referrals   enable row level security;
alter table public.email_codes enable row level security;  -- no policies = service role only

create policy "Users can view own profile" on public.profiles
  for select using ((select auth.uid()) = id);

create policy "Users can update own profile" on public.profiles
  for update using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- users may only edit these columns (not referral_code, referred_by, email_verified_at)
revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

create policy "Users can view own loans" on public.loans
  for select using ((select auth.uid()) = user_id);

create policy "Users can apply for own loans" on public.loans
  for insert with check ((select auth.uid()) = user_id and status = 'pending');

create policy "Users can view own referrals" on public.referrals
  for select using ((select auth.uid()) = referrer_id or (select auth.uid()) = referee_id);
