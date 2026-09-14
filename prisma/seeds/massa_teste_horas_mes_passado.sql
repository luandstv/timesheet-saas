-- ============================================================================
-- MASSA DE DADOS DE TESTE - CÁLCULO DE HORAS TRABALHADAS
-- Gera 1 apontamento (time_sheet) por dia do MÊS PASSADO (calculado
-- dinamicamente a partir de CURRENT_DATE, então pode rodar em qualquer mês),
-- alternando aleatoriamente entre cenários de 8h, 10h (2h extra), ~13h30
-- (extra 75%+100%), 16h e 17h trabalhadas — tanto em dias úteis quanto em
-- fins de semana — e, em ~15% dos dias, adiciona um acionamento noturno
-- que começa em um dia e termina no dia seguinte (ex: 23:30 às 00:30).
--
-- Diferenças em relação ao script original:
--  1) CORRIGIDO: os time_entries agora referenciam o id REAL gerado para
--     cada time_sheet (no script original, todos os time_entries apontavam
--     para um UUID fixo diferente do id gerado pelo gen_random_uuid() dos
--     time_sheets, então nenhum entry ficava de fato vinculado à sua folha).
--  2) O DELETE inicial foi restrito ao user_id de teste + período do mês
--     passado, em vez de apagar TODAS as linhas das tabelas (menos
--     destrutivo). Ainda assim, só rode isso em banco de TESTE.
--
-- Como usar:
--  1. Ajuste v_user_id abaixo para o UUID do usuário de teste, se necessário.
--  2. Rode o script inteiro no SQL editor do Supabase.
--  3. Use a query de verificação no final para pegar os ids de time_sheets
--     gerados e testar cada um em /api/test-calc?id=TIMESHEET_ID
-- ============================================================================

DO $$
DECLARE
  v_user_id     uuid := '91d28f84-3c90-49b5-9e24-41249d68de8d';
  v_start       date := date_trunc('month', current_date - interval '1 month')::date;
  v_end         date := (date_trunc('month', current_date) - interval '1 day')::date;
  v_day         date;
  v_dow         int;
  v_is_weekend  boolean;
  v_sheet_id    uuid;
  v_scenario    int;
BEGIN

  -- --------------------------------------------------------------------
  -- Limpeza: remove apenas os dados de teste desse usuário no período
  -- do mês passado (evita apagar dados de outros usuários/períodos).
  -- Aviso: só rode em banco de testes.
  -- --------------------------------------------------------------------
  DELETE FROM time_entries
  WHERE time_sheet_id IN (
    SELECT id FROM time_sheets
    WHERE user_id = v_user_id
      AND date BETWEEN v_start AND v_end
  );

  DELETE FROM time_sheets
  WHERE user_id = v_user_id
    AND date BETWEEN v_start AND v_end;

  -- --------------------------------------------------------------------
  -- Geração dia a dia do mês passado
  -- --------------------------------------------------------------------
  FOR v_day IN SELECT generate_series(v_start, v_end, interval '1 day')::date LOOP

    v_dow        := extract(dow FROM v_day);        -- 0 = domingo, 6 = sábado
    v_is_weekend := v_dow IN (0, 6);
    v_sheet_id   := gen_random_uuid();
    v_scenario   := floor(random() * 5)::int + 1;    -- 1..5, escolhido ao acaso

    INSERT INTO time_sheets (id, user_id, date, status, is_holiday, is_weekend, updated_at)
    VALUES (v_sheet_id, v_user_id, v_day, 'OPEN', false, v_is_weekend, current_timestamp);

    -- Cenário 1: dia normal, 8h (04h manhã + 04h tarde)
    IF v_scenario = 1 THEN
      INSERT INTO time_entries (id, time_sheet_id, type, timestamp, entry_mode) VALUES
        (gen_random_uuid(), v_sheet_id, 'CLOCK_IN',  v_day + TIME '08:00:00', 'REGULAR'),
        (gen_random_uuid(), v_sheet_id, 'CLOCK_OUT', v_day + TIME '12:00:00', 'REGULAR'),
        (gen_random_uuid(), v_sheet_id, 'CLOCK_IN',  v_day + TIME '13:00:00', 'REGULAR'),
        (gen_random_uuid(), v_sheet_id, 'CLOCK_OUT', v_day + TIME '17:00:00', 'REGULAR');

    -- Cenário 2: 10h trabalhadas (2h extra)
    ELSIF v_scenario = 2 THEN
      INSERT INTO time_entries (id, time_sheet_id, type, timestamp, entry_mode) VALUES
        (gen_random_uuid(), v_sheet_id, 'CLOCK_IN',  v_day + TIME '08:00:00', 'REGULAR'),
        (gen_random_uuid(), v_sheet_id, 'CLOCK_OUT', v_day + TIME '12:00:00', 'REGULAR'),
        (gen_random_uuid(), v_sheet_id, 'CLOCK_IN',  v_day + TIME '13:00:00', 'REGULAR'),
        (gen_random_uuid(), v_sheet_id, 'CLOCK_OUT', v_day + TIME '19:00:00', 'REGULAR');

    -- Cenário 3: dia longo ~13h30 (extra 75% + 100%)
    ELSIF v_scenario = 3 THEN
      INSERT INTO time_entries (id, time_sheet_id, type, timestamp, entry_mode) VALUES
        (gen_random_uuid(), v_sheet_id, 'CLOCK_IN',  v_day + TIME '08:00:00', 'REGULAR'),
        (gen_random_uuid(), v_sheet_id, 'CLOCK_OUT', v_day + TIME '12:00:00', 'REGULAR'),
        (gen_random_uuid(), v_sheet_id, 'CLOCK_IN',  v_day + TIME '13:00:00', 'REGULAR'),
        (gen_random_uuid(), v_sheet_id, 'CLOCK_OUT', v_day + TIME '22:30:00', 'REGULAR');

    -- Cenário 4: 16h trabalhadas (7h manhã + 9h tarde/noite)
    ELSIF v_scenario = 4 THEN
      INSERT INTO time_entries (id, time_sheet_id, type, timestamp, entry_mode) VALUES
        (gen_random_uuid(), v_sheet_id, 'CLOCK_IN',  v_day + TIME '05:00:00', 'REGULAR'),
        (gen_random_uuid(), v_sheet_id, 'CLOCK_OUT', v_day + TIME '12:00:00', 'REGULAR'),
        (gen_random_uuid(), v_sheet_id, 'CLOCK_IN',  v_day + TIME '13:00:00', 'REGULAR'),
        (gen_random_uuid(), v_sheet_id, 'CLOCK_OUT', v_day + TIME '22:00:00', 'REGULAR');

    -- Cenário 5: 17h trabalhadas (7h manhã + 10h tarde/noite)
    ELSE
      INSERT INTO time_entries (id, time_sheet_id, type, timestamp, entry_mode) VALUES
        (gen_random_uuid(), v_sheet_id, 'CLOCK_IN',  v_day + TIME '05:00:00', 'REGULAR'),
        (gen_random_uuid(), v_sheet_id, 'CLOCK_OUT', v_day + TIME '12:00:00', 'REGULAR'),
        (gen_random_uuid(), v_sheet_id, 'CLOCK_IN',  v_day + TIME '13:00:00', 'REGULAR'),
        (gen_random_uuid(), v_sheet_id, 'CLOCK_OUT', v_day + TIME '23:00:00', 'REGULAR');
    END IF;

    -- ----------------------------------------------------------------
    -- ~15% dos dias (útil ou fim de semana) ganham um acionamento extra
    -- que atravessa a meia-noite: começa às 23:30 desse dia e termina
    -- às 00:30 do dia seguinte, vinculado à mesma folha (v_sheet_id).
    -- ----------------------------------------------------------------
    IF random() < 0.15 THEN
      INSERT INTO time_entries (id, time_sheet_id, type, timestamp, entry_mode) VALUES
        (gen_random_uuid(), v_sheet_id, 'CLOCK_IN',  v_day + TIME '23:30:00', 'REGULAR'),
        (gen_random_uuid(), v_sheet_id, 'CLOCK_OUT', (v_day + 1) + TIME '00:30:00', 'REGULAR');
    END IF;

  END LOOP;

END $$;

-- ============================================================================
-- VERIFICAÇÃO: lista as folhas geradas para o mês passado, com contagem de
-- entradas e primeiro/último apontamento de cada dia. Use o "id" de cada
-- linha para testar em /api/test-calc?id=TIMESHEET_ID
-- ============================================================================
SELECT
  ts.id                AS timesheet_id,
  ts.date,
  CASE ts.is_weekend WHEN true THEN 'FIM DE SEMANA' ELSE 'DIA ÚTIL' END AS tipo_dia,
  count(te.id)          AS qtd_entries,
  min(te.timestamp)     AS primeiro_ponto,
  max(te.timestamp)     AS ultimo_ponto
FROM time_sheets ts
JOIN time_entries te ON te.time_sheet_id = ts.id
WHERE ts.user_id = '91d28f84-3c90-49b5-9e24-41249d68de8d'
  AND ts.date BETWEEN date_trunc('month', current_date - interval '1 month')::date
                  AND (date_trunc('month', current_date) - interval '1 day')::date
GROUP BY ts.id, ts.date, ts.is_weekend
ORDER BY ts.date;
