const MONTH_NAMES: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const MONTH_NAME_PATTERN =
  'January|February|March|April|May|June|July|August|September|October|November|December';

const ISO_DATE_REGEX = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/;
const US_DATE_REGEX = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/;
const MONTH_DAY_YEAR_REGEX = new RegExp(
  `\\b(${MONTH_NAME_PATTERN})\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`,
  'i',
);
const DAY_MONTH_YEAR_REGEX = new RegExp(
  `\\b(\\d{1,2})\\s+(${MONTH_NAME_PATTERN})\\s+(\\d{4})\\b`,
  'i',
);

export function parseDateToIso(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().replace(/,$/, '');

  const isoMatch = trimmed.match(ISO_DATE_REGEX);
  if (isoMatch) {
    return toIso(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const usMatch = trimmed.match(US_DATE_REGEX);
  if (usMatch) {
    return toIso(Number(usMatch[3]), Number(usMatch[1]), Number(usMatch[2]));
  }

  const monthDayYearMatch = trimmed.match(MONTH_DAY_YEAR_REGEX);
  if (monthDayYearMatch) {
    return toIso(
      Number(monthDayYearMatch[3]),
      getMonthNumber(monthDayYearMatch[1]),
      Number(monthDayYearMatch[2]),
    );
  }

  const dayMonthYearMatch = trimmed.match(DAY_MONTH_YEAR_REGEX);
  if (dayMonthYearMatch) {
    return toIso(
      Number(dayMonthYearMatch[3]),
      getMonthNumber(dayMonthYearMatch[2]),
      Number(dayMonthYearMatch[1]),
    );
  }

  return null;
}

export function dateValuePattern(): string {
  return String.raw`(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4}|(?:${MONTH_NAME_PATTERN})\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+(?:${MONTH_NAME_PATTERN})\s+\d{4})`;
}

function getMonthNumber(monthName: string | undefined): number {
  if (!monthName) {
    return 0;
  }

  return MONTH_NAMES[monthName.toLowerCase()] ?? 0;
}

function toIso(year: number, month: number, day: number): string | null {
  if (!isValidDateParts(year, month, day)) {
    return null;
  }

  const normalizedYear = year.toString().padStart(4, '0');
  const normalizedMonth = month.toString().padStart(2, '0');
  const normalizedDay = day.toString().padStart(2, '0');

  return `${normalizedYear}-${normalizedMonth}-${normalizedDay}`;
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
