// Percentuais de calculo de horas extras e sobreaviso
export const OVERTIME_75_MULTIPLIER = 1.75;
export const OVERTIME_100_MULTIPLIER = 2;
export const ON_CALL_MULTIPLIER = 1 / 3;

// limite de hora extra 75% em dia util ( em minutos )
export const MAX_OVERTIME_75_MINUTES_WEEKDAY = 120; // 2 horas

// Faixas horarias FHC e FHCN
export const FHC_START_HOUR = 6;
export const FHC_START_MINUTE = 1;
export const FHC_END_HOUR = 21;
export const FHC_END_MINUTE = 59;
export const FHCN_START_HOUR = 22;
export const FHCN_END_HOUR = 6;

// Sobreavio em minutos
export const ON_CALL_WEEKDAY_MINUTES = 900; // 15 horas
export const ON_CALL_WEEKEND_MINUTES = 1440; // 24 horas
