import logsCSS from '../../styles/logs.js';
import { renderPageShell } from './page.js';
import { resolveScheduleMetaPhase } from '../../utils/scheduleMetaPhase.js';
import { escapeHtml, escapeUrl } from '../../utils/htmlEscape.js';
import { rpad2 } from '../../core/updater/logWriter.js';
import { getSchedulePhaseLabel, renderSchedulePhaseIcon } from '../components/schedulePhaseIcon.js';

function formatDelta(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error("log entry must be a JSON object");
  }
  if (!Number.isInteger(entry.added) || entry.added < 0) {
    throw new Error(`Invalid log entry added: ${entry.displayName || ""}`);
  }
  if (!Number.isInteger(entry.updated) || entry.updated < 0) {
    throw new Error(`Invalid log entry updated: ${entry.displayName || ""}`);
  }
  const added = entry.added;
  const updated = entry.updated;
  if (entry.action === "SYNC") {
    let delta = "";
    if (added > 0) delta += `+${rpad2(added)}`;
    if (updated > 0) delta += `~${rpad2(updated)}`;
    return delta || "~0 ";
  }
  return `~${rpad2(added + updated)}`;
}

function renderTrigger(entry, icon) {
  if (entry.isForce) return ` | ${icon} Force`;
  const trigger = entry.trigger;
  if (!trigger?.diffUrl || trigger.revid == null) return "";
  return ` | ${icon} <a class="log-trigger-link" href="${escapeUrl(trigger.diffUrl)}" target="_blank" rel="noopener">${escapeHtml(trigger.revid)}</a>`;
}

function renderStatusLabel(icon, label) {
  return `${icon} ${label}`;
}

function renderLogMessage(entry) {
  const suffix = entry.isAnon ? " 👻" : "";
  const displayName = escapeHtml(entry.displayName || "");
  if (entry.action === "SYNC") {
    return `${renderStatusLabel("🟢", "[SYNC]")} | 🔄 ${displayName} ${formatDelta(entry)}${renderTrigger(entry, "➕")}${suffix}`;
  }
  if (entry.action === "SKIP") {
    return `${renderStatusLabel("⚪", "[SKIP]")} | 🔍 ${displayName} ${formatDelta(entry)}${renderTrigger(entry, "🟰")}${suffix}`;
  }
  if (entry.action === "BREAKER") {
    return `${renderStatusLabel("🔴", "[ERR!]")} | 🚧 ${displayName} ${escapeHtml(entry.dropInfo || "(Drop)")}${suffix}`;
  }
  if (entry.action === "API_ERROR") {
    return `${renderStatusLabel("🔴", "[ERR!]")} | ❌ ${displayName} (Fail)${suffix}`;
  }
  throw new Error(`Invalid log entry action: ${entry.action}`);
}

function isSyncEntry(entry) {
  return entry.action === "SYNC";
}

function isErrorEntry(entry) {
  return entry.action === "BREAKER" || entry.action === "API_ERROR" || entry.level === "ERROR";
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

function normalizeEntryList(item) {
  if (item.logs === undefined) return [];
  if (!Array.isArray(item.logs)) throw new Error(`Invalid active logs: ${item.name || ""}`);
  return item.logs;
}

export function renderLogPage(activeLogItems, time, sha, hasActiveCron = false, options = {}) {
  const maxLogEntries = Number(options.maxLogEntries);
  const items = normalizeActiveLogItems(activeLogItems);

  const cardsHtml = items.map(item => {
    const name = item.name || "";
    const safeName = escapeHtml(name);
    const entries = normalizeEntryList(item);
    const lastEntry = entries[0];
    const phase = resolveScheduleMetaPhase(item);
    const phaseCls = `phase-${phase}`;

    const syncCount = entries.filter(isSyncEntry).length;
    const errCount = entries.filter(isErrorEntry).length;
    const totalCount = Number.isFinite(item.totalMatches) ? item.totalMatches : null;
    const lastTime = lastEntry?.loggedAt || "";
    const bars = entries.slice(0, 10).reverse().map(entry => {
      const cls = isSyncEntry(entry) ? "bar-sync" : isErrorEntry(entry) ? "bar-err" : "bar-idle";
      const heightCls = isSyncEntry(entry) ? "bar-tall" : isErrorEntry(entry) ? "bar-mid" : "bar-low";
      return `<div class="bar ${cls} ${heightCls}"></div>`;
    }).join("");

    const rows = entries.slice(0, maxLogEntries).map(entry => {
      const rowTime = entry.loggedAt || "";
      const formattedMessage = renderLogMessage(entry).replace(/(\+\d+(?:~\d+)?|~\d+|±0)/g, '<span class="hl">$1</span>');
      return `<div class="log-mini-row"><span class="log-mini-time">${escapeHtml(rowTime)}</span><span class="log-mini-time-separator"> </span><span class="log-mini-msg">${formattedMessage}</span></div>`;
    }).join("");

    return `<div class="tournament-card">
      <div class="tournament-card-header"><div class="tournament-card-title"><span class="tournament-card-name">${safeName}</span>${totalCount == null ? '' : `<span class="tournament-total-pill">${totalCount}</span>`}</div><div class="tournament-card-status"><span class="phase-tag ${phaseCls}">${renderSchedulePhaseIcon(phase)}<span>${getSchedulePhaseLabel(phase)}</span></span></div></div>
      <div class="card-stats"><span>SYNC <span class="stat-val">${syncCount}</span></span><span>ERR <span class="stat-val">${errCount}</span></span><span>LAST <span class="stat-val">${escapeHtml(lastTime)}</span></span></div>
      <div class="timeline">${bars}</div>
      <div class="tournament-card-logs">${rows}</div>
    </div>`;
  }).join("");

  const bodyContent = cardsHtml || '<div class="empty-logs">No logs found</div>';

  return renderPageShell("Logs", bodyContent, "logs", time, sha, hasActiveCron, {
    css: logsCSS,
    containerClass: "logs-cards-container",
    showModal: false
  });
}
