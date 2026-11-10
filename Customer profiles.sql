CREATE TABLE public.profiles(
  id UUID REFERANCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  crated_ TIMESTAMPTZ DEFAULT NOW()
