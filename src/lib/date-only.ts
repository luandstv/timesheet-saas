import { DateTime } from "luxon";

const DATE_FORMAT = "yyyy-MM-dd";

function dateKey(value: DateTime | string) {
  return typeof value === "string" ? value : value.toFormat(DATE_FORMAT);
}

/** Converte uma data civil para o início UTC usado pela coluna PostgreSQL DATE. */
export function dateOnlyStart(value: DateTime | string) {
  return DateTime.fromFormat(dateKey(value), DATE_FORMAT, { zone: "UTC" })
    .startOf("day")
    .toJSDate();
}

/** Converte uma data civil para o fim UTC usado pela coluna PostgreSQL DATE. */
export function dateOnlyEnd(value: DateTime | string) {
  return DateTime.fromFormat(dateKey(value), DATE_FORMAT, { zone: "UTC" })
    .endOf("day")
    .toJSDate();
}

/** Formata uma data DATE retornada pelo banco sem aplicar o fuso do servidor. */
export function formatDateOnly(value: Date) {
  return DateTime.fromJSDate(value, { zone: "UTC" }).toFormat(DATE_FORMAT);
}
