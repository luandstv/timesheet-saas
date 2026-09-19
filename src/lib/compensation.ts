import {
  ON_CALL_MULTIPLIER,
  OVERTIME_100_MULTIPLIER,
  OVERTIME_75_MULTIPLIER,
} from "./constants";

export function calculateCompensation({
  baseSalary,
  monthlyHours,
  overtime75Minutes,
  overtime100Minutes,
  onCallMinutes,
  workDays,
  restDays,
}: {
  baseSalary: number;
  monthlyHours: number;
  overtime75Minutes: number;
  overtime100Minutes: number;
  onCallMinutes: number;
  workDays: number;
  restDays: number;
}) {
  const hourlyRate = monthlyHours > 0 ? baseSalary / monthlyHours : 0;
  const overtimeValue =
    (overtime75Minutes / 60) * hourlyRate * OVERTIME_75_MULTIPLIER +
    (overtime100Minutes / 60) * hourlyRate * OVERTIME_100_MULTIPLIER;
  const onCallValue = (onCallMinutes / 60) * hourlyRate * ON_CALL_MULTIPLIER;
  const variableValue = overtimeValue + onCallValue;
  const dsrValue = workDays > 0 ? (variableValue / workDays) * restDays : 0;

  return {
    hourlyRate,
    overtimeValue,
    onCallValue,
    dsrValue,
    variableValue,
    estimatedGrossValue: baseSalary + variableValue + dsrValue,
  };
}
