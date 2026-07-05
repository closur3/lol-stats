import { kvKeys } from "../../infrastructure/kv/keyFactory.js";

function normalizeOverviewPage(value, label) {
  const pages = Array.isArray(value)
    ? value.filter(page => typeof page === "string" && page.trim()).map(page => page.trim())
    : (typeof value === "string" && value.trim() ? [value.trim()] : []);
  if (pages.length === 0) throw new Error(`${label}.overview_page missing`);
  return pages;
}

function normalizeActiveTournament(tournament, label) {
  if (!tournament || typeof tournament !== "object" || Array.isArray(tournament)) {
    throw new Error(`${label} must be a JSON object`);
  }
  const slug = typeof tournament.slug === "string" ? tournament.slug.trim() : "";
  const name = typeof tournament.name === "string" ? tournament.name.trim() : "";
  const league = typeof tournament.league === "string" ? tournament.league.trim() : "";
  const startDate = typeof tournament.start_date === "string" ? tournament.start_date.trim() : "";
  const endDate = typeof tournament.end_date === "string" ? tournament.end_date.trim() : "";
  if (!slug || !name || !league || !startDate || !endDate) {
    throw new Error(`${label} fields missing`);
  }
  return {
    slug,
    name,
    overview_page: normalizeOverviewPage(tournament.overview_page, label),
    league,
    start_date: startDate,
    end_date: endDate
  };
}

export function buildActiveTournamentMap(tournaments) {
  if (!Array.isArray(tournaments)) throw new Error("tournaments must be an array");
  const active = {};
  for (const tournament of tournaments) {
    const normalized = normalizeActiveTournament(tournament, "ACTIVE_TOURNAMENTS.tournament");
    active[normalized.slug] = normalized;
  }
  return active;
}

function normalizeActiveTournamentMap(value) {
  if (value == null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("ACTIVE_TOURNAMENTS must be a JSON object");
  }
  const normalized = {};
  for (const [slug, tournament] of Object.entries(value)) {
    const normalizedTournament = normalizeActiveTournament(tournament, `ACTIVE_TOURNAMENTS.${slug}`);
    if (normalizedTournament.slug !== slug) {
      throw new Error(`ACTIVE_TOURNAMENTS slug mismatch: ${slug}`);
    }
    normalized[slug] = normalizedTournament;
  }
  return normalized;
}

export async function readActiveTournamentMap(env) {
  const active = await env["lol-stats-kv"].get(kvKeys.activeTournaments(), { type: "json" });
  return normalizeActiveTournamentMap(active);
}

export async function writeActiveTournamentMap(env, active) {
  const normalized = normalizeActiveTournamentMap(active);
  if (normalized == null) throw new Error("ACTIVE_TOURNAMENTS write payload missing");
  await env["lol-stats-kv"].put(kvKeys.activeTournaments(), JSON.stringify(normalized));
  return normalized;
}

export async function removeActiveTournament(env, slug) {
  if (typeof slug !== "string" || !slug.trim()) throw new Error("ACTIVE_TOURNAMENTS slug missing");
  const active = await readActiveTournamentMap(env);
  if (active == null) return false;
  if (!Object.prototype.hasOwnProperty.call(active, slug)) return false;
  delete active[slug];
  await writeActiveTournamentMap(env, active);
  return true;
}
