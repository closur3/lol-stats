import logsCSS from '../../styles/logs.js';
import { renderPageShell } from './page.js';
import { resolveSchedulePhase } from '../../core/scheduler/scheduleDay.js';
import { escapeHtml, escapeUrl } from '../../utils/htmlEscape.js';
import { padLogCount } from '../../core/updater/logWriter.js';
import { getSchedulePhaseLabel, renderSchedulePhaseIcon } from '../components/schedulePhaseIcon.js';
import { renderSchemaIssueCards } from '../components/schemaIssueCards.js';
import { unavailableCronInfo } from '../../core/scheduler/cronInfo.js';

function formatDelta(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error("log entry must be a JSON object");
  }
  if (!Number.isInteger(entry.added) || entry.added < 0) {
    throw new Error("Invalid log entry added");
  }
  if (!Number.isInteger(entry.updated) || entry.updated < 0) {
    throw new Error("Invalid log entry updated");
  }
  const added = entry.added;
  const updated = entry.updated;
  if (entry.action === "SYNC") {
    let delta = "";
    if (added > 0) delta += `+${padLogCount(added)}`;
    if (updated > 0) delta += `~${padLogCount(updated)}`;
    return delta || "~0 ";
  }
  return `~${padLogCount(added + updated)}`;
}

function renderTrigger(entry, icon) {
  if (entry.updateReason === "added") return ` | ${icon} Added`;
  if (entry.updateReason === "updated") return ` | ${icon} Updated`;
  if (entry.updateReason === "force") return ` | ${icon} Force`;
  if (entry.updateReason !== "revision") throw new Error(`Invalid ActiveLog updateReason: ${entry.updateReason}`);
  const trigger = entry.trigger;
  if (!trigger) return "";
  const pageTitle = encodeURIComponent(trigger.title.replace(/ /g, "_"));
  const diffUrl = `https://lol.fandom.com/wiki/${pageTitle}?diff=prev&oldid=${trigger.revid}`;
  return ` | ${icon} <a class="log-trigger-link" href="${escapeUrl(diffUrl)}" target="_blank" rel="noopener">${escapeHtml(trigger.revid)}</a>`;
}

function renderStatusLabel(icon, label) {
  return `${icon} ${label}`;
}

function renderLogMessage(entry, leagueShort) {
  const safeLeagueShort = escapeHtml(leagueShort);
  if (entry.action === "SYNC") {
    return `${renderStatusLabel("🟢", "[SYNC]")} | 🔄 ${safeLeagueShort} ${formatDelta(entry)}${renderTrigger(entry, "➕")}`;
  }
  if (entry.action === "SKIP") {
    return `${renderStatusLabel("⚪", "[SKIP]")} | 🔍 ${safeLeagueShort} ${formatDelta(entry)}${renderTrigger(entry, "🟰")}`;
  }
  if (entry.action === "BREAKER") {
    return `${renderStatusLabel("🔴", "[ERR!]")} | 🚧 ${safeLeagueShort} ${escapeHtml(entry.dropInfo || "(Drop)")}`;
  }
  if (entry.action === "API_ERROR") {
    return `${renderStatusLabel("🔴", "[ERR!]")} | ❌ ${safeLeagueShort} (Fail)`;
  }
  throw new Error(`Invalid log entry action: ${entry.action}`);
}

function isSyncEntry(entry) {
  return entry.action === "SYNC";
}

function isErrorEntry(entry) {
  return entry.action === "BREAKER" || entry.action === "API_ERROR";
}

function normalizeActiveLogItems(activeLogItems) {
  if (activeLogItems == null) return [];
  if (Array.isArray(activeLogItems)) return activeLogItems;
  if (typeof activeLogItems !== "object") throw new Error("activeLogItems must be an array or JSON object");
  return Object.keys(activeLogItems).map(name => {
    const value = activeLogItems[name];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`Invalid active log item: ${name}`);
    }
    return { name, ...value };
  });
}

function normalizeLogEntries(activeLogItem) {
  if (activeLogItem.logs === undefined) return [];
  if (!Array.isArray(activeLogItem.logs)) throw new Error(`Invalid active logs: ${activeLogItem.name || ""}`);
  return activeLogItem.logs;
}

export function renderLogPage(activeLogItems, time, sha, cronInfo = unavailableCronInfo(), options = {}) {
  const maxLogEntries = Number(options.maxLogEntries);
  const logItems = normalizeActiveLogItems(activeLogItems);
  const issueCards = renderSchemaIssueCards(options.issues === undefined ? [] : options.issues);

  const cardsHtml = logItems.map(activeLogItem => {
    const { name, leagueShort } = activeLogItem;
    if (typeof name !== "string" || !name.trim()) throw new Error("Active log item name missing");
    if (typeof leagueShort !== "string" || !leagueShort.trim()) {
      throw new Error(`Active log item leagueShort missing: ${name}`);
    }
    const safeName = escapeHtml(name);
    const entries = normalizeLogEntries(activeLogItem);
    const lastEntry = entries[0];
    const phase = resolveSchedulePhase(activeLogItem.scheduleSessions);
    const phaseCls = `phase-${phase}`;

    const syncCount = entries.filter(isSyncEntry).length;
    const errCount = entries.filter(isErrorEntry).length;
    const totalCount = Number.isFinite(activeLogItem.totalMatches) ? activeLogItem.totalMatches : null;
    const lastTime = lastEntry?.loggedAt || "";
    const bars = entries.slice(0, 10).reverse().map(entry => {
      const cls = isSyncEntry(entry) ? "bar-sync" : isErrorEntry(entry) ? "bar-err" : "bar-idle";
      const heightCls = isSyncEntry(entry) ? "bar-tall" : isErrorEntry(entry) ? "bar-mid" : "bar-low";
      return `<div class="bar ${cls} ${heightCls}"></div>`;
    }).join("");

    const rows = entries.slice(0, maxLogEntries).map(entry => {
      const rowTime = entry.loggedAt || "";
      const formattedMessage = renderLogMessage(entry, leagueShort).replace(/(\+\d+(?:~\d+)?|~\d+|±0)/g, '<span class="hl">$1</span>');
      return `<div class="log-mini-row"><span class="log-mini-time">${escapeHtml(rowTime)}</span><span class="log-mini-time-separator"> </span><span class="log-mini-msg">${formattedMessage}</span></div>`;
    }).join("");

    return `<div class="tournament-card">
      <div class="tournament-card-header"><div class="tournament-card-title"><span class="tournament-card-name">${safeName}</span>${totalCount == null ? '' : `<span class="tournament-total-pill">${totalCount}</span>`}</div><div class="tournament-card-status"><span class="phase-tag ${phaseCls}">${renderSchedulePhaseIcon(phase)}<span>${getSchedulePhaseLabel(phase)}</span></span></div></div>
      <div class="card-stats"><span>SYNC <span class="stat-val">${syncCount}</span></span><span>ERR <span class="stat-val">${errCount}</span></span><span>LAST <span class="stat-val">${escapeHtml(lastTime)}</span></span></div>
      <div class="timeline">${bars}</div>
      <div class="tournament-card-logs">${rows}</div>
    </div>`;
  }).join("");

  const bodyContent = `${cardsHtml}${issueCards}` || '<div class="empty-logs">No logs found</div>';

  return renderPageShell("Logs", bodyContent, "logs", time, sha, cronInfo, {
    css: logsCSS,
    containerClass: "logs-cards-container",
    showModal: false
  });
}
