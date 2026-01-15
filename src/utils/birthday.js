import {
  isLeapYear,
  isBefore,
  differenceInDays,
  endOfDay
} from 'date-fns';
import { toDate, fromZonedTime } from 'date-fns-tz';
import { Lunar } from 'lunar-javascript';

const TIMEZONE = 'Asia/Shanghai';

export function getZonedDate(timestamp) {
  return toDate(timestamp, { timeZone: TIMEZONE });
}

export function getNextBirthday(config, currentTimestamp) {
  const { month, day } = config;
  const celebrateType = config.celebrateType || config.type || 'solar';
  const inputType = config.inputType || config.type || 'solar';
  const nowZoned = getZonedDate(currentTimestamp);
  const currentYear = nowZoned.getFullYear();
  const currentLunarYear = Lunar.fromDate(nowZoned).getYear();

  let targetDate;

  if (celebrateType === 'solar') {
    if (inputType === 'solar') {
      targetDate = createSolarDate(currentYear, month, day);
      if (isBefore(endOfDay(targetDate), nowZoned)) {
        targetDate = createSolarDate(currentYear + 1, month, day);
      }
    } else {
      targetDate = getSolarFromLunar(currentLunarYear, month, day);
      if (isBefore(endOfDay(targetDate), nowZoned)) {
        targetDate = getSolarFromLunar(currentLunarYear + 1, month, day);
      }
    }
  } else {
    const lunarMonthDay = inputType === 'lunar'
      ? { month, day }
      : getLunarMonthDayFromSolar(config.year, month, day);
    if (!lunarMonthDay) return null;
    targetDate = getSolarFromLunar(currentLunarYear, lunarMonthDay.month, lunarMonthDay.day);
    if (isBefore(endOfDay(targetDate), nowZoned)) {
      targetDate = getSolarFromLunar(currentLunarYear + 1, lunarMonthDay.month, lunarMonthDay.day);
    }
  }

  return targetDate;
}

export function getLastBirthday(config, currentTimestamp) {
  const { month, day } = config;
  const celebrateType = config.celebrateType || config.type || 'solar';
  const inputType = config.inputType || config.type || 'solar';
  const nowZoned = getZonedDate(currentTimestamp);
  const currentYear = nowZoned.getFullYear();
  const currentLunarYear = Lunar.fromDate(nowZoned).getYear();

  let targetDate;

  if (celebrateType === 'solar') {
    if (inputType === 'solar') {
      targetDate = createSolarDate(currentYear, month, day);
      if (!isBefore(targetDate, nowZoned)) {
        targetDate = createSolarDate(currentYear - 1, month, day);
      }
    } else {
      targetDate = getSolarFromLunar(currentLunarYear, month, day);
      if (!isBefore(targetDate, nowZoned)) {
        targetDate = getSolarFromLunar(currentLunarYear - 1, month, day);
      }
    }
  } else {
    const lunarMonthDay = inputType === 'lunar'
      ? { month, day }
      : getLunarMonthDayFromSolar(config.year, month, day);
    if (!lunarMonthDay) return null;
    targetDate = getSolarFromLunar(currentLunarYear, lunarMonthDay.month, lunarMonthDay.day);
    if (!isBefore(targetDate, nowZoned)) {
      targetDate = getSolarFromLunar(currentLunarYear - 1, lunarMonthDay.month, lunarMonthDay.day);
    }
  }

  return targetDate;
}

function createSolarDate(year, month, day) {
  let d = day;
  if (month === 2 && day === 29 && !isLeapYear(new Date(year, 0, 1))) {
    d = 28;
  }
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')} 00:00:00`;
  return fromZonedTime(dateStr, TIMEZONE);
}

function getSolarFromLunar(year, month, day) {
  const lunar = Lunar.fromYmd(year, month, day);
  const solar = lunar.getSolar();
  const dateStr = `${solar.getYear()}-${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')} 00:00:00`;
  return fromZonedTime(dateStr, TIMEZONE);
}

function getLunarMonthDayFromSolar(year, month, day) {
  if (!year) return null;
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} 00:00:00`;
  const solarDate = fromZonedTime(dateStr, TIMEZONE);
  const lunar = Lunar.fromDate(solarDate);
  return { month: lunar.getMonth(), day: lunar.getDay() };
}

export function getBirthdayStats(config, currentTimestamp) {
  if (!config.year) return null;

  const nowZoned = getZonedDate(currentTimestamp);
  const inputType = config.inputType || config.type || 'solar';
  let birthDate;
  if (inputType === 'solar') {
    birthDate = fromZonedTime(`${config.year}-${String(config.month).padStart(2, '0')}-${String(config.day).padStart(2, '0')} 00:00:00`, TIMEZONE);
  } else {
    birthDate = getSolarFromLunar(config.year, config.month, config.day);
  }

  const daysAlive = differenceInDays(nowZoned, birthDate);
  const age = nowZoned.getFullYear() - config.year;

  return {
    daysAlive,
    age
  };
}
