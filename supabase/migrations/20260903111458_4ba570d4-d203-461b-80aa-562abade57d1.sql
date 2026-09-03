-- ROLES -----------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ENUMS ------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.compliance_level AS ENUM ('iniciante','regular','confiavel','avancado','excelente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.compliance_event_type AS ENUM (
    'payment_on_time','payment_late','payment_missed','cycle_completed',
    'obligation_created','obligation_resolved','rule_violation'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- EVENTS -----------------------------------------------------------------
CREATE TABLE public.compliance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type public.compliance_event_type NOT NULL,
  description text NOT NULL DEFAULT '',
  days_late integer NOT NULL DEFAULT 0,
  group_ref text NOT NULL DEFAULT '',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX compliance_events_user_idx ON public.compliance_events (user_id, occurred_at DESC);
GRANT SELECT ON public.compliance_events TO authenticated;
GRANT ALL ON public.compliance_events TO service_role;
ALTER TABLE public.compliance_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own compliance events" ON public.compliance_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- STATS ------------------------------------------------------------------
CREATE TABLE public.compliance_stats (
  user_id uuid PRIMARY KEY,
  compliance_rate numeric(5,2) NOT NULL DEFAULT 0,
  level public.compliance_level NOT NULL DEFAULT 'iniciante',
  on_time_count integer NOT NULL DEFAULT 0,
  late_count integer NOT NULL DEFAULT 0,
  missed_count integer NOT NULL DEFAULT 0,
  violation_count integer NOT NULL DEFAULT 0,
  cycles_completed integer NOT NULL DEFAULT 0,
  pending_obligations integer NOT NULL DEFAULT 0,
  recent_late_count integer NOT NULL DEFAULT 0,
  history_started_at timestamptz NOT NULL DEFAULT now(),
  history_days integer NOT NULL DEFAULT 0,
  last_rate_change numeric(5,2) NOT NULL DEFAULT 0,
  level_changed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.compliance_stats TO authenticated;
GRANT ALL ON public.compliance_stats TO service_role;
ALTER TABLE public.compliance_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own compliance stats" ON public.compliance_stats
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- AUDIT ------------------------------------------------------------------
CREATE TABLE public.compliance_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_id uuid,
  source text NOT NULL DEFAULT 'system',
  previous_rate numeric(5,2),
  new_rate numeric(5,2),
  previous_level public.compliance_level,
  new_level public.compliance_level,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX compliance_audit_user_idx ON public.compliance_audit_log (user_id, created_at DESC);
GRANT SELECT ON public.compliance_audit_log TO authenticated;
GRANT ALL ON public.compliance_audit_log TO service_role;
ALTER TABLE public.compliance_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own compliance audit log" ON public.compliance_audit_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all compliance audit log" ON public.compliance_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- NOTIFICATIONS ----------------------------------------------------------
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can mark their own notifications read" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_compliance_stats_updated_at BEFORE UPDATE ON public.compliance_stats
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LEVEL HELPERS ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compliance_level_rank(_level public.compliance_level)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _level
    WHEN 'iniciante' THEN 0 WHEN 'regular' THEN 1 WHEN 'confiavel' THEN 2
    WHEN 'avancado' THEN 3 WHEN 'excelente' THEN 4 END
$$;

CREATE OR REPLACE FUNCTION public.compliance_eligible_level(
  _rate numeric, _history_days integer, _cycles integer, _pending integer, _violations integer
) RETURNS public.compliance_level LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _rate >= 98 AND _history_days >= 180 AND _cycles >= 4 AND _pending = 0 AND _violations = 0 THEN 'excelente'::public.compliance_level
    WHEN _rate >= 95 AND _history_days >= 90  AND _cycles >= 1 AND _pending = 0 THEN 'avancado'::public.compliance_level
    WHEN _rate >= 85 AND _history_days >= 60  AND _pending = 0 THEN 'confiavel'::public.compliance_level
    WHEN _rate >= 70 AND _history_days >= 30 THEN 'regular'::public.compliance_level
    ELSE 'iniciante'::public.compliance_level
  END
$$;

-- RECALCULATION ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_compliance(_user_id uuid)
RETURNS public.compliance_stats LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.compliance_stats;
  prev_rate numeric(5,2);
  prev_level public.compliance_level;
  on_time int; late int; missed int; cycles int; violations int; pending int; recent_late int;
  first_at timestamptz; days int;
  weighted_ok numeric; weighted_total numeric; raw numeric; target numeric; new_rate numeric(5,2);
  eligible public.compliance_level; new_level public.compliance_level;
  max_step constant numeric := 3;
BEGIN
  INSERT INTO public.compliance_stats (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO s FROM public.compliance_stats WHERE user_id = _user_id FOR UPDATE;
  prev_rate := s.compliance_rate; prev_level := s.level;

  SELECT
    count(*) FILTER (WHERE event_type = 'payment_on_time'),
    count(*) FILTER (WHERE event_type = 'payment_late'),
    count(*) FILTER (WHERE event_type = 'payment_missed'),
    count(*) FILTER (WHERE event_type = 'cycle_completed'),
    count(*) FILTER (WHERE event_type = 'rule_violation'),
    count(*) FILTER (WHERE event_type = 'payment_late' AND occurred_at > now() - interval '30 days'),
    min(occurred_at)
  INTO on_time, late, missed, cycles, violations, recent_late, first_at
  FROM public.compliance_events WHERE user_id = _user_id;

  pending := GREATEST(
    (SELECT count(*) FROM public.compliance_events WHERE user_id = _user_id AND event_type = 'obligation_created')
    - (SELECT count(*) FROM public.compliance_events WHERE user_id = _user_id AND event_type = 'obligation_resolved'), 0);

  first_at := COALESCE(first_at, s.history_started_at, now());
  days := GREATEST(0, EXTRACT(DAY FROM (now() - first_at))::int);

  -- Regras objetivas e verificáveis, com prior neutro para contas novas.
  weighted_ok := on_time + 0.5 * late + 2 * cycles + 6;
  weighted_total := on_time + late + 2 * missed + 2 * cycles + 2 * violations + pending + 8;
  raw := 100 * weighted_ok / GREATEST(weighted_total, 1);
  target := raw - (2 * recent_late) - (3 * pending);
  target := LEAST(100, GREATEST(0, target));

  -- Nenhuma ação isolada muda a taxa drasticamente: variação máxima por evento.
  IF prev_rate = 0 AND (on_time + late + missed + cycles + violations) = 0 THEN
    new_rate := ROUND(target, 2);
  ELSE
    new_rate := ROUND(LEAST(prev_rate + max_step, GREATEST(prev_rate - max_step, target)), 2);
  END IF;

  eligible := public.compliance_eligible_level(new_rate, days, cycles, pending, violations);

  IF public.compliance_level_rank(eligible) > public.compliance_level_rank(prev_level) THEN
    -- Subida gradual: um nível de cada vez.
    new_level := CASE public.compliance_level_rank(prev_level) + 1
      WHEN 1 THEN 'regular' WHEN 2 THEN 'confiavel' WHEN 3 THEN 'avancado' ELSE 'excelente' END;
  ELSE
    new_level := eligible;
  END IF;

  UPDATE public.compliance_stats SET
    compliance_rate = new_rate, level = new_level,
    on_time_count = on_time, late_count = late, missed_count = missed,
    violation_count = violations, cycles_completed = cycles,
    pending_obligations = pending, recent_late_count = recent_late,
    history_started_at = first_at, history_days = days,
    last_rate_change = new_rate - prev_rate,
    level_changed_at = CASE WHEN new_level <> prev_level THEN now() ELSE s.level_changed_at END
  WHERE user_id = _user_id RETURNING * INTO s;

  IF new_rate <> prev_rate OR new_level <> prev_level THEN
    INSERT INTO public.compliance_audit_log (user_id, source, previous_rate, new_rate, previous_level, new_level, reason)
    VALUES (_user_id, 'system', prev_rate, new_rate, prev_level, new_level, 'Recalculo automatico por historico de cumprimento');
  END IF;

  IF new_rate > prev_rate THEN
    INSERT INTO public.notifications (user_id, kind, title, body)
    VALUES (_user_id, 'rate_up', 'A sua Taxa de Cumprimento subiu',
      'A sua taxa passou de ' || prev_rate || '% para ' || new_rate || '%.');
  ELSIF new_rate < prev_rate THEN
    INSERT INTO public.notifications (user_id, kind, title, body)
    VALUES (_user_id, 'rate_down', 'A sua Taxa de Cumprimento desceu',
      'A sua taxa passou de ' || prev_rate || '% para ' || new_rate || '%. Pagamentos no prazo ajudam a recuperar.');
  END IF;

  IF public.compliance_level_rank(new_level) > public.compliance_level_rank(prev_level) THEN
    INSERT INTO public.notifications (user_id, kind, title, body)
    VALUES (_user_id, 'level_up', 'Parabens! Subiu de nivel',
      'O seu historico de cumprimento melhorou e passou para o nivel ' || upper(new_level::text) || '.');
  ELSIF public.compliance_level_rank(new_level) < public.compliance_level_rank(prev_level) THEN
    INSERT INTO public.notifications (user_id, kind, title, body)
    VALUES (_user_id, 'level_down', 'O seu nivel foi ajustado',
      'O seu nivel passou para ' || upper(new_level::text) || '. Cumprimento continuo permite recuperar gradualmente.');
  END IF;

  IF pending > 0 THEN
    INSERT INTO public.notifications (user_id, kind, title, body)
    VALUES (_user_id, 'pending', 'Tem obrigacoes pendentes',
      'Existem ' || pending || ' obrigacao(oes) por regularizar. Isto trava a subida de nivel.');
  END IF;

  RETURN s;
END; $$;

REVOKE ALL ON FUNCTION public.recalculate_compliance(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.on_compliance_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.recalculate_compliance(NEW.user_id); RETURN NEW; END; $$;

CREATE TRIGGER compliance_event_recalc AFTER INSERT ON public.compliance_events
FOR EACH ROW EXECUTE FUNCTION public.on_compliance_event();

-- Criar estado inicial para cada novo perfil
CREATE OR REPLACE FUNCTION public.init_compliance_stats()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.compliance_stats (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER profiles_init_compliance AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.init_compliance_stats();

INSERT INTO public.compliance_stats (user_id)
SELECT id FROM public.profiles ON CONFLICT (user_id) DO NOTHING;

-- CORRECAO EXCECIONAL (unica forma de alteracao manual, sempre auditada) ---
CREATE OR REPLACE FUNCTION public.admin_override_compliance(
  _user_id uuid, _new_rate numeric, _new_level public.compliance_level, _reason text
) RETURNS public.compliance_stats LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.compliance_stats; prev_rate numeric(5,2); prev_level public.compliance_level;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Nao autorizado';
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 10 THEN
    RAISE EXCEPTION 'E obrigatorio registar um motivo detalhado';
  END IF;
  SELECT compliance_rate, level INTO prev_rate, prev_level FROM public.compliance_stats WHERE user_id = _user_id;
  IF prev_rate IS NULL THEN RAISE EXCEPTION 'Participante sem estado de cumprimento'; END IF;

  UPDATE public.compliance_stats
  SET compliance_rate = LEAST(100, GREATEST(0, _new_rate)), level = _new_level,
      last_rate_change = LEAST(100, GREATEST(0, _new_rate)) - prev_rate,
      level_changed_at = CASE WHEN _new_level <> prev_level THEN now() ELSE level_changed_at END
  WHERE user_id = _user_id RETURNING * INTO s;

  INSERT INTO public.compliance_audit_log (user_id, actor_id, source, previous_rate, new_rate, previous_level, new_level, reason)
  VALUES (_user_id, auth.uid(), 'admin_override', prev_rate, s.compliance_rate, prev_level, _new_level, _reason);

  INSERT INTO public.notifications (user_id, kind, title, body)
  VALUES (_user_id, 'override', 'Correcao excecional no seu historico',
    'A sua taxa/nivel foi corrigida por autorizacao especial. Motivo: ' || _reason);

  RETURN s;
END; $$;

REVOKE ALL ON FUNCTION public.admin_override_compliance(uuid, numeric, public.compliance_level, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_override_compliance(uuid, numeric, public.compliance_level, text) TO authenticated;