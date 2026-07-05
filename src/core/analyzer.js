import { TIME_GRID_COLUMN_COUNT, DEFAULT_MAX_SCHEDULE_DAYS } from '../constants/index.js';
import { timePolicy } from '../utils/timePolicy.js';
import { computeScheduleMetaFromRawMatches } from './analysis/scheduleMeta.js';
import { calculateFullRateStats, generateFullRateString } from './analysis/fullRateStats.js';
import { buildResolveName } from './analysis/teamResolver.js';
import { parseAllMatches } from './analysis/matchParser.js';
import { buildTimeGridAndSchedule } from './analysis/gridBuilder.js';
import { buildScheduleMap } from './analysis/futureMatchBuilder.js';

/**
 * 统计分析核心模块
 */
export class Analyzer {
  static computeScheduleMetaFromRawMatches = computeScheduleMetaFromRawMatches;

  /**
   * 运行完整分析
   */
  static runFullAnalysis(allRawMatches, tournaments, maxScheduleDays = DEFAULT_MAX_SCHEDULE_DAYS) {
    if (!Array.isArray(tournaments)) {
      throw new Error("tournaments must be an array");
    }
    const globalStats = {};
    const scheduleMetaBySlug = {};

    const timeGrid = { "ALL": {} };
    const createSlot = () => {
      const slot = {};
      for (let dayIndex = 0; dayIndex < TIME_GRID_COLUMN_COUNT; dayIndex++) {
        slot[dayIndex] = { totalMatchCount: 0, fullLengthMatchCount: 0, matches: [] };
      }
      return slot;
    };
    timeGrid.ALL = createSlot();

    const todayStr = timePolicy.getNow().dateString;
    const allFutureMatches = {};

    tournaments.forEach((tournament, tournamentIndex) => {
      const rawMatches = allRawMatches[tournament.slug];
      if (!Array.isArray(rawMatches)) throw new Error(`RawMatches missing in analyzer input: ${tournament.slug}`);

      const resolveName = buildResolveName(tournament.teamMap);
      const { stats, parsedMatches, scheduleMeta } = parseAllMatches(rawMatches, resolveName, todayStr, tournament.slug, tournament.league, tournamentIndex, allFutureMatches);

      globalStats[tournament.slug] = stats;

      buildTimeGridAndSchedule(tournament.slug, parsedMatches, timeGrid);

      scheduleMetaBySlug[tournament.slug] = scheduleMeta;
    });

    const scheduleMap = buildScheduleMap(allFutureMatches, tournaments, maxScheduleDays, scheduleMetaBySlug);

    return {
      globalStats,
      timeGrid,
      scheduleMap,
      scheduleMetaBySlug
    };
  }

  /**
   * 计算队伍完整率统计
   */
  static calculateFullRateStats = calculateFullRateStats;

  /**
   * 生成完整率字符串
   */
  static generateFullRateString = generateFullRateString;
}
