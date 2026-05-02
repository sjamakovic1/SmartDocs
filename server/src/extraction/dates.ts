const monthNames: Record<string, number> = {
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

export function parseDateToIso(value: string | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().replace(/,$/, '');
  const isoMatch = trimmed.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    return toIso(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const usMatch = trimmed.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (usMatch) {
    return toIso(Number(usMatch[3]), Number(usMatch[1]), Number(usMatch[2]));
  }

  const monthDayYearMatch = trimmed.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  );
  if (monthDayYearMatch) {
    return toIso(
      Number(monthDayYearMatch[3]),
      monthNames[monthDayYearMatch[1]?.toLowerCase() ?? ''] ?? 0,
      Number(monthDayYearMatch[2]),
    );
  }

  const dayMonthYearMatch = trimmed.match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i,
  );
  if (dayMonthYearMatch) {
    return toIso(
      Number(dayMonthYearMatch[3]),
      monthNames[dayMonthYearMatch[2]?.toLowerCase() ?? ''] ?? 0,
      Number(dayMonthYearMatch[1]),
    );
  }

  return null;
}

export function dateValuePattern() {
  return String.raw`(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})`;
}

function toIso(year: number, month: number, day: number) {
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`;
}
