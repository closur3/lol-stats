import { FandomClient } from "../../api/fandomClient.js";
import { dataUtils } from "../../utils/dataUtils.js";

const BASELINE_CRON = "0 0 * * *";
const WORKER_NAME = "lol-stats";
const CRON_CONTROL_KV_KEY = "__cron_control__";
const WEEKDAY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function formatUtcDate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseUtcDateTime(raw) {
  const dt = new Date(raw.replace(" ", "T") + "Z");
  if (Number.isNaN(dt.getTime())) throw new Error(`Invalid DateTimeUTC: ${raw}`);
  return dt;
}

function toSinglePointCron(date) {
  return `${date.getUTCMinutes()} ${date.getUTCHours()} * * ${WEEKDAY[date.getUTCDay()]}`;
}

async function loginFandom(env) {
  return FandomClient.login(env.FANDOM_BOT_USERNAME, env.FANDOM_BOT_PASSWORD);
}

async function fetchTodayMatchesUtc(tournaments, fandomClient, targetDateUtc) {
  const dateStr = formatUtcDate(targetDateUtc);
  const all = [];
  for (const tournament of tournaments) {
    const slug = tournament?.slug;
    if (!slug) continue;
    const pages = dataUtils.normalizeOverviewPages(tournament.overview_page);
    if (!pages.length) throw new Error(`overview_page missing: ${slug}`);
    const matches = await fandomClient.fetchAllMatches(slug, pages, { start: dateStr, end: dateStr });
    all.push(...matches);
  }
  return all;
}

function buildWindowCron(matches, nowUtc) {
  if (!matches.length) return null;
  let earliest = null;
  for (const match of matches) {
    const raw = match?.DateTimeUTC;
    if (!raw) continue;
    const dt = parseUtcDateTime(raw);
    if (!earliest || dt < earliest) earliest = dt;
  }
  if (!earliest) return null;
  const day = WEEKDAY[nowUtc.getUTCDay()];
  const startHour = earliest.getUTCHours();
  return `*/2 ${startHour}-23 * * ${day}`;
}

function isMatchFinished(match) {
  const s1 = match?.Team1Score;
  const s2 = match?.Team2Score;
  if (s1 == null || s2 == null) return false;
  if (String(s1).trim() === "" || String(s2).trim() === "") return false;
  return true;
}

function allMatchesFinished(matches) {
  if (!matches.length) return false;
  return matches.every(isMatchFinished);
}

async function readControl(env) {
  const kv = env["lol-stats-kv"];
  return await kv.get(CRON_CONTROL_KV_KEY, { type: "json" });
}

async function writeControl(env, state) {
  const kv = env["lol-stats-kv"];
  await kv.put(CRON_CONTROL_KV_KEY, JSON.stringify(state));
}

async function updateSchedules(env, schedules) {
  const token = env.CLOUDFLARE_API_TOKEN;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !accountId) {
    throw new Error("Missing Cloudflare schedule env: CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID");
  }
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${WORKER_NAME}/schedules`;
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(schedules.map(cron => ({ cron })))
  });
  if (!response.ok) throw new Error(`Cloudflare schedules HTTP ${response.status}: ${await response.text()}`);
  const payload = await response.json();
  if (!payload?.success) throw new Error(`Cloudflare schedules failed: ${JSON.stringify(payload)}`);
}

export function isBaselineCron(cron) {
  return cron === BASELINE_CRON;
}

export async function planTodayWindow(env, tournaments, scheduledTimeMs) {
  const now = new Date(scheduledTimeMs);
  const auth = await loginFandom(env);
  const fandomClient = new FandomClient(auth);
  const matches = await fetchTodayMatchesUtc(tournaments, fandomClient, now);
  const windowCron = buildWindowCron(matches, now);
  const finalSchedules = windowCron ? [BASELINE_CRON, windowCron] : [BASELINE_CRON];
  await updateSchedules(env, finalSchedules);
  await writeControl(env, {
    date: formatUtcDate(now),
    phase: windowCron ? "window" : "idle",
    windowCron: windowCron || null,
    finalCron: null
  });
  console.log(`[CRON-PLAN] date=${formatUtcDate(now)} window=${windowCron || "none"}`);
}

export async function handleHighFreqTick(env, tournaments, scheduledTimeMs, eventCron) {
  const now = new Date(scheduledTimeMs);
  const today = formatUtcDate(now);
  const state = await readControl(env);
  if (!state || state.date !== today) return;

  if (state.phase === "final_wait" && state.finalCron === eventCron) {
    await updateSchedules(env, [BASELINE_CRON]);
    await writeControl(env, { date: today, phase: "idle", windowCron: null, finalCron: null });
    console.log(`[CRON-END] date=${today} finalCron-hit -> baseline only`);
    return;
  }

  if (state.phase !== "window" || state.windowCron !== eventCron) return;

  const auth = await loginFandom(env);
  const fandomClient = new FandomClient(auth);
  const matches = await fetchTodayMatchesUtc(tournaments, fandomClient, now);
  if (!allMatchesFinished(matches)) return;

  const finalAt = new Date(now.getTime() + 60 * 60 * 1000);
  const finalCron = toSinglePointCron(finalAt);
  await updateSchedules(env, [BASELINE_CRON, finalCron]);
  await writeControl(env, { date: today, phase: "final_wait", windowCron: null, finalCron });
  console.log(`[CRON-SHRINK] date=${today} all-finished=1 -> finalCron=${finalCron}`);
}
