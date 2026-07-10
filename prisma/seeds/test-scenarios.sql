-- ====================================================
-- CENARIOS DE TESTE - CÁLCULO DE HORAS TRABALHADAS
-- ====================================================

-- Instruções:
-- 1. Substitua "USER_ID" pelo seu ID da tabela de usuários.
-- 2. Execute este script para popular a tabela de time_entries com entradas de teste.
-- 3. Depois rode a rota /api/test-calc?id=TIMESHEET_ID

-- Limpar dados anteriores
-- Aviso: so rode esses comando em banco de testes, com muita cautela.
DELETE FROM TIME_ENTRIES 
DELETE FROM TIME_SHEETS 

-- ====================================================
-- CENÁRIO 1: Dia útil normal (8h, sem horas extras)
-- Esperado: normalMinutes = 480, tudo mais = 0
-- ====================================================

INSERT INTO time_sheets (id, user_id, date, status, is_holiday, is_weekend, updated_at)
VALUES (
  gen_random_uuid(),
  '91d28f84-3c90-49b5-9e24-41249d68de8d',
  current_date,
  'OPEN',
  false,
  false,
  current_timestamp -- Adicionado aqui para preencher a coluna
);

INSERT INTO time_entries (id, time_sheet_id, type, timestamp, entry_mode)
VALUES (
  gen_random_uuid(),
  'b2c11cf4-bc07-4b86-85c7-e7d1d07bd348',
  'CLOCK_IN',
  CURRENT_DATE + TIME '08:00:00',
  'REGULAR'  
);

INSERT INTO time_entries (id, time_sheet_id, type, timestamp, entry_mode)
VALUES (
  gen_random_uuid(),
  'b2c11cf4-bc07-4b86-85c7-e7d1d07bd348',
  'CLOCK_OUT',
  CURRENT_DATE + TIME '12:00:00',
  'REGULAR'  
);

INSERT INTO time_entries (id, time_sheet_id, type, timestamp, entry_mode)
VALUES (
  gen_random_uuid(),
  'b2c11cf4-bc07-4b86-85c7-e7d1d07bd348',
  'CLOCK_IN',
  CURRENT_DATE + TIME '13:00:00',
  'REGULAR'  
);

INSERT INTO time_entries (id, time_sheet_id, type, timestamp, entry_mode)
VALUES (
  gen_random_uuid(),
  'b2c11cf4-bc07-4b86-85c7-e7d1d07bd348',
  'CLOCK_OUT',
  CURRENT_DATE + TIME '17:00:00',
  'REGULAR'  
);

-- ====================================================
-- CENÁRIO 2: Dia útil com 2h extras (75% FHC)
-- Esperado: normalMinutes = 480, overtime75Fhc = 120
-- ====================================================

INSERT INTO time_sheets (id, user_id, date, status, is_holiday, is_weekend, updated_at)
VALUES (
  gen_random_uuid(),
  '91d28f84-3c90-49b5-9e24-41249d68de8d',
  CURRENT_DATE - INTERVAL  '1 day',
  'OPEN',
  false,
  false,
  current_timestamp -- Adicionado aqui para preencher a coluna
);

INSERT INTO time_entries (id, time_sheet_id, type, timestamp, entry_mode)
VALUES (
  gen_random_uuid(),
  'b2c11cf4-bc07-4b86-85c7-e7d1d07bd348',
  'CLOCK_IN',
  CURRENT_DATE - INTERVAL  '1 day' + TIME '08:00:00',
  'REGULAR'  
),
(
  gen_random_uuid(),
  'b2c11cf4-bc07-4b86-85c7-e7d1d07bd348',
  'CLOCK_OUT',
  CURRENT_DATE - INTERVAL  '1 day' + TIME '12:00:00',
  'REGULAR'  
),
(
  gen_random_uuid(),
  'b2c11cf4-bc07-4b86-85c7-e7d1d07bd348',
  'CLOCK_IN',
  CURRENT_DATE - INTERVAL  '1 day' + TIME '13:00:00',
  'REGULAR'  
),
(
  gen_random_uuid(),
  'b2c11cf4-bc07-4b86-85c7-e7d1d07bd348',
  'CLOCK_OUT',
  CURRENT_DATE - INTERVAL  '1 day' + TIME '19:00:00',
  'REGULAR'
)

-- ====================================================
-- CENÁRIO 3: Dia útil com extras (75% + 100% FHC e FHCN)
-- Esperado: normalMinutes = 480, overtime75Fhc = 120, overtime100Fhc = 179, overtime100Fhcn = 90
-- ====================================================

INSERT INTO time_sheets (id, user_id, date, status, is_holiday, is_weekend, updated_at)
VALUES (
  gen_random_uuid(),
  '91d28f84-3c90-49b5-9e24-41249d68de8d',
  CURRENT_DATE - INTERVAL  '2 day',
  'OPEN',
  false,
  false,
  current_timestamp -- Adicionado aqui para preencher a coluna
);

INSERT INTO time_entries (id, time_sheet_id, type, timestamp, entry_mode)
VALUES (
  gen_random_uuid(),
  'b2c11cf4-bc07-4b86-85c7-e7d1d07bd348',
  'CLOCK_IN',
  CURRENT_DATE - INTERVAL  '2 day' + TIME '08:00:00',
  'REGULAR'  
),
(
  gen_random_uuid(),
  'b2c11cf4-bc07-4b86-85c7-e7d1d07bd348',
  'CLOCK_OUT',
  CURRENT_DATE - INTERVAL  '2 day' + TIME '12:00:00',
  'REGULAR'  
),
(
  gen_random_uuid(),
  'b2c11cf4-bc07-4b86-85c7-e7d1d07bd348',
  'CLOCK_IN',
  CURRENT_DATE - INTERVAL  '2 day' + TIME '13:00:00',
  'REGULAR'  
),
(
  gen_random_uuid(),
  'b2c11cf4-bc07-4b86-85c7-e7d1d07bd348',
  'CLOCK_OUT',
  CURRENT_DATE - INTERVAL  '2 day' + TIME '22:30:00',
  'REGULAR'
)




-- ====================================================
-- CENÁRIO 4: fim de semana ( 100% tudo)
-- Esperado: normalMinutes = 0, overtime75Fhc = 480
-- ====================================================

INSERT INTO time_sheets (id, user_id, date, status, is_holiday, is_weekend, updated_at)
VALUES (
  gen_random_uuid(),
  '91d28f84-3c90-49b5-9e24-41249d68de8d',
  CURRENT_DATE - INTERVAL  '3 day',
  'OPEN',
  false,
  true,
  current_timestamp -- Adicionado aqui para preencher a coluna
);

INSERT INTO time_entries (id, time_sheet_id, type, timestamp, entry_mode)
VALUES (
  gen_random_uuid(),
  'b2c11cf4-bc07-4b86-85c7-e7d1d07bd348',
  'CLOCK_IN',
  CURRENT_DATE - INTERVAL  '3 day' + TIME '10:00:00',
  'REGULAR'  
),
(
  gen_random_uuid(),
  'b2c11cf4-bc07-4b86-85c7-e7d1d07bd348',
  'CLOCK_OUT',
  CURRENT_DATE - INTERVAL  '3 day' + TIME '18:00:00',
  'REGULAR'  
)

-- ====================================================
-- CENÁRIO 5: Acionamentos noturnos (sobreaviso)
-- Dia normal + acionamento 22:00 as 23:30
-- Esperado: normalMinutes = 480, overtime75Fhc = 120, overtimeFhcn=90
-- ====================================================

INSERT INTO time_sheets (id, user_id, date, status, is_holiday, is_weekend, updated_at)
VALUES (
  gen_random_uuid(),
  '91d28f84-3c90-49b5-9e24-41249d68de8d',
  CURRENT_DATE - INTERVAL  '4 day',
  'OPEN',
  false,
  false,
  current_timestamp -- Adicionado aqui para preencher a coluna
);

INSERT INTO time_entries (id, time_sheet_id, type, timestamp, entry_mode)
VALUES (
  gen_random_uuid(),
  'b2c11cf4-bc07-4b86-85c7-e7d1d07bd348',
  'CLOCK_IN',
  CURRENT_DATE - INTERVAL  '4 day' + TIME '08:00:00',
  'REGULAR'  
),
(
  gen_random_uuid(),
  'b2c11cf4-bc07-4b86-85c7-e7d1d07bd348',
  'CLOCK_OUT',
  CURRENT_DATE - INTERVAL  '4 day' + TIME '12:00:00',
  'REGULAR'  
),
(
  gen_random_uuid(),
  'b2c11cf4-bc07-4b86-85c7-e7d1d07bd348',
  'CLOCK_IN',
  CURRENT_DATE - INTERVAL  '4 day' + TIME '13:00:00',
  'REGULAR'  
),
(
  gen_random_uuid(),
  'b2c11cf4-bc07-4b86-85c7-e7d1d07bd348',
  'CLOCK_OUT',
  CURRENT_DATE - INTERVAL  '4 day' + TIME '19:00:00',
  'REGULAR'
),
(
  gen_random_uuid(),
  'b2c11cf4-bc07-4b86-85c7-e7d1d07bd348',
  'CLOCK_IN',
  CURRENT_DATE - INTERVAL  '4 day' + TIME '22:00:00',
  'REGULAR'  
),
(
  gen_random_uuid(),
  'b2c11cf4-bc07-4b86-85c7-e7d1d07bd348',
  'CLOCK_OUT',
  CURRENT_DATE - INTERVAL  '4 day' + TIME '23:30:00',
  'REGULAR'
)
