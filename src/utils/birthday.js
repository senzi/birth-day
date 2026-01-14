import { 
  isLeapYear, 
  isBefore, 
  differenceInDays,
  endOfDay
} from 'date-fns';
import { toDate, fromZonedTime } from 'date-fns-tz';
import { Solar, Lunar } from 'lunar-javascript';

const TIMEZONE = 'Asia/Shanghai';

/**
 * 获取东八区的当前 Date 对象
 */
export function getZonedDate(timestamp) {
  return toDate(timestamp, { timeZone: TIMEZONE });
}

/**
 * 计算下一个生日的公历日期 (返回东八区时间)
 * @param {Object} config 
 * @param {number} currentTimestamp 
 */
export function getNextBirthday(config, currentTimestamp) {
  const { type, month, day } = config;
  const nowZoned = getZonedDate(currentTimestamp);
  const currentYear = nowZoned.getFullYear();

  let targetDate;

  if (type === 'solar') {
    targetDate = createSolarDate(currentYear, month, day);
    if (isBefore(endOfDay(targetDate), nowZoned)) {
      targetDate = createSolarDate(currentYear + 1, month, day);
    }
  } else {
    targetDate = getSolarFromLunar(currentYear, month, day);
    if (isBefore(endOfDay(targetDate), nowZoned)) {
      targetDate = getSolarFromLunar(currentYear + 1, month, day);
    }
  }

  return targetDate;
}

/**
 * 创建公历日期，处理2月29日 (基于东八区)
 */
function createSolarDate(year, month, day) {
  let d = day;
  if (month === 2 && day === 29 && !isLeapYear(new Date(year, 0, 1))) {
    d = 28;
  }
  // 构造东八区的 00:00:00
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')} 00:00:00`;
  return fromZonedTime(dateStr, TIMEZONE);
}

/**
 * 农历转公历 (基于东八区)
 */
function getSolarFromLunar(year, month, day) {
  const lunar = Lunar.fromYmd(year, month, day);
  const solar = lunar.getSolar();
  const dateStr = `${solar.getYear()}-${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')} 00:00:00`;
  return fromZonedTime(dateStr, TIMEZONE);
}

/**
 * 计算年龄/天数等感性文案数据
 */
export function getBirthdayStats(config, currentTimestamp) {
  if (!config.year) return null;
  
  const nowZoned = getZonedDate(currentTimestamp);
  // 出生日期也按东八区计算
  const birthDate = fromZonedTime(`${config.year}-${String(config.month).padStart(2, '0')}-${String(config.day).padStart(2, '0')} 00:00:00`, TIMEZONE);
  
  const daysAlive = differenceInDays(nowZoned, birthDate);
  const age = nowZoned.getFullYear() - config.year;
  
  return {
    daysAlive,
    age
  };
}
