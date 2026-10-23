const GUATEMALA_OFFSET_HOURS = 6;
const GUATEMALA_OFFSET_MS = GUATEMALA_OFFSET_HOURS * 60 * 60 * 1000;

export interface DateRangeUtc {
  startUtc: Date;
  endUtc: Date;
}

export interface GuatemalaDateParts {
  year: number;
  month: number; // 1 - 12
  day: number; // 1 - 31
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
}

function getGuatemalaShiftedDate(date: Date): Date {
  return new Date(date.getTime() - GUATEMALA_OFFSET_MS);
}

export function getGuatemalaDateParts(date: Date = new Date()): GuatemalaDateParts {
  const shifted = getGuatemalaShiftedDate(date);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    dayOfWeek: shifted.getUTCDay(),
  };
}

export function formatGuatemalaDate(date: Date = new Date()): string {
  const parts = getGuatemalaDateParts(date);
  const mm = String(parts.month).padStart(2, '0');
  const dd = String(parts.day).padStart(2, '0');
  return `${parts.year}-${mm}-${dd}`;
}

export function getGuatemalaDayRange(date: Date = new Date()): DateRangeUtc {
  const shifted = getGuatemalaShiftedDate(date);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();

  const startUtc = new Date(Date.UTC(y, m, d, GUATEMALA_OFFSET_HOURS, 0, 0, 0));
  const endUtc = new Date(Date.UTC(y, m, d + 1, GUATEMALA_OFFSET_HOURS, 0, 0, 0));
  return { startUtc, endUtc };
}

export function getGuatemalaWeekRange(date: Date = new Date()): DateRangeUtc {
  const shifted = getGuatemalaShiftedDate(date);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  const dayOfWeek = shifted.getUTCDay();

  // Monday is index 0 in ISO week
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const mondayDate = d - daysSinceMonday;

  const startUtc = new Date(Date.UTC(y, m, mondayDate, GUATEMALA_OFFSET_HOURS, 0, 0, 0));
  const endUtc = new Date(Date.UTC(y, m, mondayDate + 7, GUATEMALA_OFFSET_HOURS, 0, 0, 0));
  return { startUtc, endUtc };
}

export function getGuatemalaMonthRange(date: Date = new Date()): DateRangeUtc {
  const shifted = getGuatemalaShiftedDate(date);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();

  const startUtc = new Date(Date.UTC(y, m, 1, GUATEMALA_OFFSET_HOURS, 0, 0, 0));
  const endUtc = new Date(Date.UTC(y, m + 1, 1, GUATEMALA_OFFSET_HOURS, 0, 0, 0));
  return { startUtc, endUtc };
}

export function getGuatemalaYearRange(date: Date = new Date()): DateRangeUtc {
  const shifted = getGuatemalaShiftedDate(date);
  const y = shifted.getUTCFullYear();

  const startUtc = new Date(Date.UTC(y, 0, 1, GUATEMALA_OFFSET_HOURS, 0, 0, 0));
  const endUtc = new Date(Date.UTC(y + 1, 0, 1, GUATEMALA_OFFSET_HOURS, 0, 0, 0));
  return { startUtc, endUtc };
}

const DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateRangeInGuatemala(startDateStr: string, endDateStr: string): DateRangeUtc {
  const startMatch = DATE_REGEX.exec(startDateStr.trim());
  const endMatch = DATE_REGEX.exec(endDateStr.trim());

  if (!startMatch || !endMatch) {
    throw new Error('Dates must be in YYYY-MM-DD format');
  }

  const [, startYearStr, startMonthStr, startDayStr] = startMatch;
  const [, endYearStr, endMonthStr, endDayStr] = endMatch;

  if (!startYearStr || !startMonthStr || !startDayStr || !endYearStr || !endMonthStr || !endDayStr) {
    throw new Error('Dates must be in YYYY-MM-DD format');
  }

  const startYear = parseInt(startYearStr, 10);
  const startMonth = parseInt(startMonthStr, 10) - 1;
  const startDay = parseInt(startDayStr, 10);

  const endYear = parseInt(endYearStr, 10);
  const endMonth = parseInt(endMonthStr, 10) - 1;
  const endDay = parseInt(endDayStr, 10);

  const startUtc = new Date(Date.UTC(startYear, startMonth, startDay, GUATEMALA_OFFSET_HOURS, 0, 0, 0));
  const endUtc = new Date(Date.UTC(endYear, endMonth, endDay + 1, GUATEMALA_OFFSET_HOURS, 0, 0, 0));

  if (Number.isNaN(startUtc.getTime()) || Number.isNaN(endUtc.getTime())) {
    throw new Error('Invalid calendar date specified');
  }

  if (startUtc >= endUtc) {
    throw new Error('startDate must be on or before endDate');
  }

  return { startUtc, endUtc };
}
