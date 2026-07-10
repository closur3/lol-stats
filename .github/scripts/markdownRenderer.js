import { pct, rate } from '../../src/utils/data/stats.js';
import { sortTeams } from '../../src/utils/data/teamSort.js';
import { timeGridColumnCount } from '../../src/constants/index.js';
import { timePolicy } from '../../src/utils/timePolicy.js';
import { summarizeFullRate } from '../../src/core/analysis/fullRateSummary.js';

export function renderFullRateSummary(stats) {
  const summary = summarizeFullRate(stats);
  if (summary.hasNoData) return "";
  const parts = summary.parts.map(part => `${part.label}: **${part.fullMatchCount}/${part.totalMatchCount}** (${part.percentText})`);
  return `📊 **Fullrate**: ${parts.join(" | ")}\n\n`;
}

function readMarkdownTournamentTimeGrid(timeGridBySlug, slug) {
  if (!timeGridBySlug || typeof timeGridBySlug !== "object" || Array.isArray(timeGridBySlug)) {
    throw new Error("timeGrid must be a JSON object");
  }
  const tournamentTimeGrid = timeGridBySlug[slug];
  if (!tournamentTimeGrid || typeof tournamentTimeGrid !== "object" || Array.isArray(tournamentTimeGrid)) {
    throw new Error(`Invalid markdown timeGrid: ${slug}`);
  }
  return tournamentTimeGrid;
}

export function generateMarkdown(tournament, stats, timeGrid) {
  const sorted = sortTeams(stats);
  const fullRateStr = renderFullRateSummary(sorted);

  let markdown = `# ${tournament.name}\n\n${fullRateStr}| TEAM | BO3 FULL | BO3% | BO5 FULL | BO5% | SERIES | SERIES WR | GAMES | GAME WR | STREAK | LAST DATE |\n| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  if (sorted.length === 0) {
    markdown += "| - | - | - | - | - | - | - | - | - | - | - |\n";
  } else {
    sorted.forEach(teamStats => {
      const bestOf3SummaryText = teamStats.bestOf3TotalMatchCount ? `${teamStats.bestOf3FullMatchCount}/${teamStats.bestOf3TotalMatchCount}` : "-";
      const bestOf3PercentText = pct(rate(teamStats.bestOf3FullMatchCount, teamStats.bestOf3TotalMatchCount));
      const bestOf5SummaryText = teamStats.bestOf5TotalMatchCount ? `${teamStats.bestOf5FullMatchCount}/${teamStats.bestOf5TotalMatchCount}` : "-";
      const bestOf5PercentText = pct(rate(teamStats.bestOf5FullMatchCount, teamStats.bestOf5TotalMatchCount));
      const seriesSummaryText = teamStats.seriesTotalMatchCount ? `${teamStats.seriesWinCount}-${teamStats.seriesTotalMatchCount - teamStats.seriesWinCount}` : "-";
      const seriesWinRateText = pct(rate(teamStats.seriesWinCount, teamStats.seriesTotalMatchCount));
      const gameSummaryText = teamStats.gameTotalCount ? `${teamStats.gameWinCount}-${teamStats.gameTotalCount - teamStats.gameWinCount}` : "-";
      const gameWinRateText = pct(rate(teamStats.gameWinCount, teamStats.gameTotalCount));
      const streakText = teamStats.winStreakCount > 0 ? `${teamStats.winStreakCount}W` : (teamStats.lossStreakCount > 0 ? `${teamStats.lossStreakCount}L` : "-");
      const lastMatchText = teamStats.last ? timePolicy.formatDateTime(teamStats.last) : "-";
      markdown += `| ${teamStats.name} | ${bestOf3SummaryText} | ${bestOf3PercentText} | ${bestOf5SummaryText} | ${bestOf5PercentText} | ${seriesSummaryText} | ${seriesWinRateText} | ${gameSummaryText} | ${gameWinRateText} | ${streakText} | ${lastMatchText} |\n`;
    });
  }

  markdown += `\n## \n📅 **Time Slot Distribution**\n\n| Time Slot | Mon | Tue | Wed | Thu | Fri | Sat | Sun | Total |\n| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  const tournamentTimeGrid = readMarkdownTournamentTimeGrid(timeGrid, tournament.slug);
  const hours = Object.keys(tournamentTimeGrid).filter(hourKey => hourKey !== "Total" && !isNaN(hourKey)).map(Number).sort((leftHour, rightHour) => leftHour - rightHour);

  [...hours, "Total"].forEach(hourOrTotal => {
    if (!tournamentTimeGrid[hourOrTotal]) return;
    const label = hourOrTotal === "Total" ? `**Total**` : `**${String(hourOrTotal).padStart(2,'0')}:00**`;
    let line = `| ${label} |`;
    for (let weekdayIndex = 0; weekdayIndex < timeGridColumnCount; weekdayIndex++) {
      const cell = tournamentTimeGrid[hourOrTotal][weekdayIndex];
      if (!cell || cell.totalMatchCount === 0) line += " - |";
      else {
        const rate = Math.round((cell.fullLengthMatchCount / cell.totalMatchCount) * 100);
        line += ` ${cell.fullLengthMatchCount}/${cell.totalMatchCount} (${rate}%) |`;
      }
    }
    markdown += line + "\n";
  });

  return markdown;
}
