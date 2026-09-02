-- KYC Basic: dados de identificação/endereço do utilizador para verificação básica de conta.

CREATE TABLE public.kyc_basic (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'Angola',
  birth_date DATE,
  city TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  address_reference TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'pending', 'verified', 'rejected')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.kyc_basic TO authenticated;
GRANT ALL ON public.kyc_basic TO service_role;

ALTER TABLE public.kyc_basic ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own KYC data" ON public.kyc_basic FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert their own KYC data" ON public.kyc_basic FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own KYC data" ON public.kyc_basic FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
