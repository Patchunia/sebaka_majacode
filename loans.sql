CREATE TABLE public.loans(
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN('pending','appr','oved','rejected', 'disbursed')),
  created_at TIMESTAPMPTZ DEFAULT NOW()
);
