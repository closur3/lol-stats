import json
import os
import random
import re
import sys
import time
from datetime import datetime, timedelta

import requests

from tournamentConfig import (
    TOURNAMENT_FIELDS,
    assert_active_source_complete,
    assert_configs_disjoint,
    assign_stable_slugs,
    build_membership_transition,
    build_transition_manifest,
    deduplicate_source_rows,
    is_eligible_row,
    order_tournament_fields,
    parse_date,
)

now = datetime.now()
today_dt = now.date()
TARGET_FILE = "config/ConfigActive.json"
ARCHIVE_FILE = "config/ConfigArchive.json"

# ==================== 配置区 ====================
PREHEAT_DAYS, EXPIRE_DAYS = 7, 0
DEFAULT_REGIONS = ["International", "China", "Korea"]
WHITELIST = []
BLACKLIST = ["Opening"]

NAME_MAPPING = {
    "Rounds 1-4": ["Rounds 1-2", "Rounds 3-4"],
}

CARGO_FIELDS = [
    "Name", "OverviewPage", "DateStart", "Date", "League", "Region", "IsPlayoffs", "Year",
    "TournamentLevel", "IsQualifier",
]
CARGO_ORDER_BY = "DateStart ASC"
# ================================================

# ==================== 工具函数 ====================

def load_required_json_array(path: str) -> list:
    with open(path, "r", encoding="utf-8") as f:
        value = json.load(f)
    if not isinstance(value, list):
        raise ValueError(f"{path} must contain a JSON array")
    schema_fields = set(TOURNAMENT_FIELDS)
    required = ("slug", "name", "startDate", "endDate")
    slugs = set()
    for index, item in enumerate(value):
        if not isinstance(item, dict):
            raise ValueError(f"{path}[{index}] must be an object")
        if set(item) != schema_fields:
            raise ValueError(f"{path}[{index}] fields must match the tournament schema")
        if any(not isinstance(item.get(field), str) or not item[field].strip() for field in required):
            raise ValueError(f"{path}[{index}] fields missing")
        if not isinstance(item.get("leagueShort"), str) or not item["leagueShort"].strip():
            raise ValueError(f"{path}[{index}].leagueShort must be a non-empty string")
        team_map = item.get("teamMap")
        if (
            not isinstance(team_map, dict)
            or not team_map
            or any(
                not isinstance(source, str)
                or not source.strip()
                or not isinstance(target, str)
                or not target.strip()
                for source, target in team_map.items()
            )
        ):
            raise ValueError(f"{path}[{index}].teamMap must be a non-empty string map")
        overviewPages = item.get("overviewPage")
        if not isinstance(overviewPages, list) or not overviewPages or any(not isinstance(page, str) or not page.strip() for page in overviewPages):
            raise ValueError(f"{path}[{index}].overviewPage must be a non-empty string array")
        if len(set(overviewPages)) != len(overviewPages):
            raise ValueError(f"{path}[{index}].overviewPage contains duplicates")
        start_date = parse_date(item["startDate"])
        end_date = parse_date(item["endDate"])
        if start_date > end_date:
            raise ValueError(f"{path}[{index}] date range invalid")
        if item["slug"] in slugs:
            raise ValueError(f"Duplicate slug in {path}: {item['slug']}")
        slugs.add(item["slug"])
    return value

def add_extra_ov(ev: dict, ov: str) -> None:
    if ov not in ev.setdefault("extraOvs", []):
        ev["extraOvs"].append(ov)

def log(msg: str) -> None:
    print(msg, flush=True)

def log_tree(lines: list) -> None:
    for line in lines:
        print(line, flush=True)

def cargo_string_literal(value, label: str) -> str:
    text = str(value)
    if not text:
        raise ValueError(f"Empty Cargo value: {label}")
    if any(ch in text for ch in ("\0", "\r", "\n")):
        raise ValueError(f"Invalid Cargo value: {label}")
    return "'" + text.replace("'", "''") + "'"

def build_field_condition(field: str, value) -> str:
    if isinstance(value, list):
        if len(value) == 0:
            raise ValueError(f"Empty Cargo list: {field}")
        if len(value) == 1:
            return f"{field} = {cargo_string_literal(value[0], field)}"
        values = ", ".join(cargo_string_literal(item, field) for item in value)
        return f"{field} IN ({values})"
    return f"{field} = {cargo_string_literal(value, field)}"

def validate_filter_values(values: list, label: str, allow_empty: bool = False) -> None:
    if (
        not isinstance(values, list)
        or (not allow_empty and not values)
        or any(not isinstance(value, str) or not value.strip() for value in values)
    ):
        raise ValueError(f"{label} must contain non-empty strings")

def validate_filters() -> None:
    validate_filter_values(DEFAULT_REGIONS, "DEFAULT_REGIONS")
    validate_filter_values(WHITELIST, "WHITELIST", allow_empty=True)
    validate_filter_values(BLACKLIST, "BLACKLIST", allow_empty=True)

def apply_name_mapping(name: str):
    for canonical, keywords in NAME_MAPPING.items():
        for k in keywords:
            if k.lower() in name.lower():
                return re.compile(re.escape(k), re.IGNORECASE).sub(canonical, name)
    return None

def make_session(url: str, bot_user: str, bot_pass: str) -> requests.Session:
    MAX_LOGIN_ATTEMPTS = 3
    session = requests.Session()
    session.headers.update({"User-Agent": "LoLStatsWorker/2026 (User:HsuX)"})

    if not (bot_user and bot_pass):
        log("🚀 未检测到凭证 (FANDOM_BOT_USERNAME/PASSWORD)")
        print("::error::Missing Fandom API credentials", flush=True)
        sys.exit(1)

    for attempt in range(1, MAX_LOGIN_ATTEMPTS + 1):
        try:
            token_res = session.get(url, params={
                "action": "query", "meta": "tokens", "type": "login", "format": "json"
            }, timeout=15).json()
            login_token = token_res.get("query", {}).get("tokens", {}).get("logintoken")

            if login_token:
                login_res = session.post(url, data={
                    "action": "login", "lgname": bot_user, "lgpassword": bot_pass,
                    "lgtoken": login_token, "format": "json"
                }, timeout=15).json()

                if login_res.get("login", {}).get("result") == "Success":
                    log(f"🚀 认证成功 | 用户: {bot_user}")
                    return session
                else:
                    log(f"⚠️ 认证失败 | 重试 {attempt}/{MAX_LOGIN_ATTEMPTS} | {json.dumps(login_res, ensure_ascii=False)}")
            else:
                log(f"⚠️ 获取 token 失败 | 重试 {attempt}/{MAX_LOGIN_ATTEMPTS}")
        except Exception as e:
            log(f"⚠️ 认证异常 | 重试 {attempt}/{MAX_LOGIN_ATTEMPTS} | {e}")

        if attempt < MAX_LOGIN_ATTEMPTS:
            time.sleep(5 * attempt + random.uniform(0, 3))

    log("🚀 认证失败，已达最大重试次数")
    print("::error::Fandom API login failed after max retries", flush=True)
    sys.exit(1)

def fetch_cargo(session: requests.Session, url: str, base_params: dict) -> list:
    all_data, offset, limit, MAX_ATTEMPTS = [], 0, 100, 5

    while True:
        params = {**base_params, "limit": str(limit), "offset": str(offset)}
        page_data = None

        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                resp = session.get(url, params=params, timeout=30)
                resp.raise_for_status()
                resp_json = resp.json()
                if "error" in resp_json:
                    print(f"⚠️ API受限 | 重试 {attempt}/{MAX_ATTEMPTS} | {resp_json['error']}", flush=True)
                    time.sleep(15 * attempt + random.uniform(0, 5))
                    continue
                page_data = resp_json.get("cargoquery")
                if not isinstance(page_data, list):
                    raise ValueError("Cargo response cargoquery must be an array")
                break
            except Exception as e:
                print(f"⚠️ 网络异常 | 重试 {attempt}/{MAX_ATTEMPTS} | {e}", flush=True)
                time.sleep(15 * attempt + random.uniform(0, 5))

        if page_data is None:
            raise RuntimeError(f"Cargo page failed after retries: offset={offset}")

        if not page_data:
            break

        all_data.extend(page_data)
        if len(page_data) < limit:
            break

        offset += limit
        time.sleep(1)

    return all_data

def tournament_query(where: str) -> dict:
    return {
        "action": "cargoquery",
        "format": "json",
        "tables": "Tournaments",
        "fields": ", ".join(CARGO_FIELDS),
        "where": where,
        "order_by": CARGO_ORDER_BY,
    }

def build_lifecycle_window_where() -> str:
    earliest_end = today_dt - timedelta(days=EXPIRE_DAYS)
    latest_start = today_dt + timedelta(days=PREHEAT_DAYS)
    return " AND ".join([
        "DateStart IS NOT NULL",
        "Date IS NOT NULL",
        f"Date >= {cargo_string_literal(earliest_end, 'Date')}",
        f"DateStart <= {cargo_string_literal(latest_start, 'DateStart')}",
    ])

def chunked(values: list, size: int):
    for index in range(0, len(values), size):
        yield values[index:index + size]

def fetch_tournament_source_rows(session, url: str, old_active: list) -> list:
    discovery_rows = fetch_cargo(session, url, tournament_query(build_lifecycle_window_where()))
    active_pages = sorted({page for tournament in old_active for page in tournament["overviewPage"]})
    reconciliation_rows = []
    for pages in chunked(active_pages, 40):
        where = " AND ".join([
            build_field_condition("OverviewPage", pages),
            "DateStart IS NOT NULL",
            "Date IS NOT NULL",
        ])
        reconciliation_rows.extend(fetch_cargo(session, url, tournament_query(where)))

    source_rows = deduplicate_source_rows(discovery_rows + reconciliation_rows)
    assert_active_source_complete(old_active, source_rows)
    return source_rows

def attach_team_maps(session, url: str, tournaments: list) -> None:
    overviewPages = sorted({page for tournament in tournaments for page in tournament["overviewPage"]})
    if not overviewPages:
        return
    roster_rows = fetch_cargo(session, url, {
        "action": "cargoquery",
        "format": "json",
        "tables": "TournamentRosters=TR,Teamnames=TN",
        "fields": "TR.OverviewPage=OverviewPage,TR.Team=Team,TN.Short=Short",
        "join_on": "TR.Team=TN.Link",
        "where": f"TR.OverviewPage IN ({', '.join(cargo_string_literal(page, 'OverviewPage') for page in overviewPages)})",
        "order_by": "TR.OverviewPage ASC,TR.Team ASC",
    })
    maps_by_page = {page: {} for page in overviewPages}
    for item in roster_rows:
        row = item.get("title", {})
        overviewPage = row.get("OverviewPage", "")
        team = row.get("Team", "")
        short = row.get("Short", "")
        if overviewPage not in maps_by_page or not team or not short:
            raise ValueError(f"Invalid tournament team row: {row}")
        existing = maps_by_page[overviewPage].get(team)
        if existing is not None and existing != short:
            raise ValueError(f"Conflicting team short: {overviewPage}:{team}")
        maps_by_page[overviewPage][team] = short

    for tournament in tournaments:
        team_map = {}
        for overviewPage in tournament["overviewPage"]:
            page_map = maps_by_page[overviewPage]
            if not page_map:
                raise ValueError(f"Tournament team map missing: {overviewPage}")
            for team, short in page_map.items():
                existing = team_map.get(team)
                if existing is not None and existing != short:
                    raise ValueError(f"Conflicting tournament team short: {tournament['slug']}:{team}")
                team_map[team] = short
        tournament["teamMap"] = dict(sorted(team_map.items()))

def read_league_short_map(session, url: str) -> dict:
    league_short_rows = fetch_cargo(session, url, {
        "action": "cargoquery",
        "format": "json",
        "tables": "Leagues",
        "fields": "League,League_Short",
        "where": "League IS NOT NULL AND League_Short IS NOT NULL",
        "order_by": "League ASC",
    })
    league_short_by_fandom_league = {}
    for item in league_short_rows:
        row = item.get("title", {})
        fandom_league = row.get("League", "")
        league_short = row.get("League Short", "")
        if not fandom_league or not league_short:
            raise ValueError(f"Invalid League row: {row}")
        existing = league_short_by_fandom_league.get(fandom_league)
        if existing is not None and existing != league_short:
            raise ValueError(f"Conflicting League Short: {fandom_league}")
        league_short_by_fandom_league[fandom_league] = league_short
    return league_short_by_fandom_league


def group_tournament_rows(source_rows: list, league_short_map: dict) -> dict:
    main_events, playoff_events = {}, []
    blocked_count = 0
    mapped_names = []

    for item in source_rows:
        t = item.get("title")
        if not isinstance(t, dict):
            raise ValueError("Cargo tournament row missing title")
        name = t.get("Name", "")
        ov = t.get("OverviewPage", "")
        region = t.get("Region", "")
        tournament_level = t.get("TournamentLevel", "")
        is_qualifier = t.get("IsQualifier", "")
        eligibility_values = (
            name,
            ov,
            region,
            tournament_level,
            is_qualifier,
        )
        if any(not isinstance(value, str) or not value for value in eligibility_values):
            raise ValueError(f"Invalid tournament row: {t}")

        if not is_eligible_row(t, DEFAULT_REGIONS, WHITELIST, BLACKLIST):
            blocked_count += 1
            continue

        y = t.get("Year", "")
        fandom_league = t.get("League", "")
        is_playoffs = t.get("IsPlayoffs", "")
        if any(
            not isinstance(value, str) or not value
            for value in (y, fandom_league, is_playoffs)
        ):
            raise ValueError(f"Invalid eligible tournament row: {t}")
        league_short = league_short_map.get(fandom_league)
        if not league_short:
            raise ValueError(f"Tournament League Short missing: {fandom_league}")

        s_dt = parse_date(t["DateStart"])
        e_dt = parse_date(t["Date"])
        if s_dt > e_dt:
            raise ValueError(f"Tournament date range invalid: {ov}")

        mapped_name = apply_name_mapping(name)
        if mapped_name:
            mapped_names.append(f"{name} → {mapped_name}")
            name = mapped_name

        ev = {"ov": ov, "year": y, "name": name, "region": region, "start": s_dt, "end": e_dt, "leagueShort": league_short}

        if t.get("IsPlayoffs") == "1" and region != "International":
            playoff_events.append(ev)
        else:
            key = f"INTL_{name}_{y}" if region == "International" else (f"{name}_{y}" if mapped_name else f"{ov}_{y}")
            if key not in main_events:
                main_events[key] = {**ev, "extraOvs": [ov]}
            else:
                main_events[key]["start"] = min(main_events[key]["start"], s_dt)
                main_events[key]["end"]   = max(main_events[key]["end"],   e_dt)
                add_extra_ov(main_events[key], ov)

    return {
        "mainEvents": main_events,
        "playoffEvents": playoff_events,
        "blockedCount": blocked_count,
        "mappedNames": mapped_names,
    }


def log_group_summary(source_count: int, groups: dict) -> None:
    main_events = groups["mainEvents"]
    playoff_events = groups["playoffEvents"]
    total_after = len(main_events) + len(playoff_events)
    log("")
    log(f"⚙️ 处理阶段 ({source_count} 条 → {total_after} 条)")
    lines = [f"└─ 🚫 拦截: {groups['blockedCount']} 条"]
    if groups["mappedNames"]:
        for i, mapping in enumerate(groups["mappedNames"]):
            prefix = "├─" if i < len(groups["mappedNames"]) - 1 else "└─"
            lines.append(f"{prefix} 🔗 聚合: {mapping}")
    else:
        lines.append("├─ 🔗 聚合: 无")
    lines.append(f"└─ 🏟️ 季后赛: {len(playoff_events)} 条待匹配")
    log_tree(lines)


def merge_playoff_events(main_events: dict, playoff_events: list) -> dict:
    merged_playoffs = []
    independent_playoffs = []

    for p in playoff_events:
        m_key = next((
            k for k, m in main_events.items()
            if m["region"] != "International"
            and m["year"] == p["year"]
            and (m["name"] in p["name"] or p["ov"].startswith(m["ov"]))
        ), None)

        if m_key:
            old_end = main_events[m_key]["end"]
            new_end = max(old_end, p["end"])
            main_events[m_key]["end"] = new_end
            add_extra_ov(main_events[m_key], p["ov"])
            merged_playoffs.append((main_events[m_key]["name"], p["name"], str(new_end)))
        else:
            independent_playoffs.append(p["name"])
            main_events[f"{p['ov']}_{p['year']}_PO"] = p

    return {
        "merged": merged_playoffs,
        "independent": independent_playoffs,
    }


def log_playoff_summary(playoff_count: int, result: dict) -> None:
    if playoff_count == 0:
        return
    log("")
    log(f"📋 赛程合并 ({playoff_count} 条季后赛)")
    lines = []
    for i, (main_name, playoff_name, end_date) in enumerate(result["merged"]):
        prefix = "├─" if i < len(result["merged"]) - 1 or result["independent"] else "└─"
        lines.append(f"{prefix} ✅ {main_name} + {playoff_name} → {end_date}")
    for i, playoff_name in enumerate(result["independent"]):
        prefix = "├─" if i < len(result["independent"]) - 1 else "└─"
        lines.append(f"{prefix} 📌 {playoff_name} (独立保留)")
    log_tree(lines)


def project_tournament_candidates(main_events: dict) -> list:
    return [
        {
            "name": event["name"],
            "leagueShort": event["leagueShort"],
            "overviewPage": event.get("extraOvs", [event["ov"]]),
            "startDate": str(event["start"]),
            "endDate": str(event["end"]),
        }
        for event in main_events.values()
    ]


def resolve_config_transition(old_active: list, old_archive: list, candidates: list) -> dict:
    stable_candidates = assign_stable_slugs(candidates, old_active, old_archive)
    return build_membership_transition(
        old_active,
        old_archive,
        stable_candidates,
        today_dt,
        PREHEAT_DAYS,
        EXPIRE_DAYS,
    )


def log_lifecycle_summary(transition: dict) -> None:
    expired_events = [
        (tournament["name"], (today_dt - parse_date(tournament["endDate"])).days)
        for tournament in transition["expired"]
    ]
    upcoming_events = [
        (tournament["name"], (parse_date(tournament["startDate"]) - today_dt).days)
        for tournament in transition["tooEarly"]
    ]
    active = transition["active"]

    log("")
    log("📊 周期终审")

    lines = []
    if expired_events:
        lines.append(f"├─ ⏰ 已过期 ({len(expired_events)} 条):")
        for i, (name, days) in enumerate(expired_events):
            prefix = "│  ├─" if i < len(expired_events) - 1 else "│  └─"
            lines.append(f"{prefix} {name:<26} │ 已结束 {days:>3} 天")

    if upcoming_events:
        prefix = "├─" if active else "└─"
        lines.append(f"{prefix} 📅 未开赛 ({len(upcoming_events)} 条):")
        for i, (name, days) in enumerate(upcoming_events):
            sub_prefix = "│  ├─" if i < len(upcoming_events) - 1 else "│  └─"
            lines.append(f"{sub_prefix} {name:<26} │ 距离开赛 {days:>3} 天")

    if active:
        lines.append(f"└─ ✅ 准入 ({len(active)} 条):")
        for i, tournament in enumerate(active):
            sub_prefix = "   ├─" if i < len(active) - 1 else "   └─"
            lines.append(f"{sub_prefix} {tournament['name']:<26} │ {tournament['leagueShort']}")

    log_tree(lines)


def log_active_table(active: list) -> None:
    log("")
    log("✅ 最终结果")

    if active:
        log(f"┌────┬{'─'*28}┬─────────────┬────────────┬────────────┐")
        log(f"│ #  │ {'Tournament':<26} │ {'LeagueShort':<11} │ {'Start':<10} │ {'End':<10} │")
        log(f"├────┼{'─'*28}┼─────────────┼────────────┼────────────┤")
        for i, tournament in enumerate(active):
            log(f"│ {i+1:<2} │ {tournament['name']:<26} │ {tournament['leagueShort']:<11} │ {tournament['startDate']:<10} │ {tournament['endDate']:<10} │")
        log(f"└────┴{'─'*28}┴─────────────┴────────────┴────────────┘")
    else:
        log("  (无准入赛事)")


def attach_transition_team_maps(session, url: str, transition: dict) -> None:
    archived_slugs = set(transition["archivedSlugs"])
    new_archive_tournaments = [
        tournament
        for tournament in transition["archive"]
        if tournament["slug"] in archived_slugs
    ]
    attach_team_maps(session, url, transition["active"] + new_archive_tournaments)


def build_manifest(old_active: list, transition: dict) -> dict:
    return build_transition_manifest(
        old_active,
        transition["active"],
        transition["archivedSlugs"],
        transition["droppedSlugs"],
    )


def write_configs(active: list, archive: list) -> None:
    ordered_active = [order_tournament_fields(tournament) for tournament in active]
    ordered_archive = [order_tournament_fields(tournament) for tournament in archive]
    with open(TARGET_FILE, "w", encoding="utf-8") as file:
        json.dump(ordered_active, file, indent=4, ensure_ascii=False)

    with open(ARCHIVE_FILE, "w", encoding="utf-8") as file:
        json.dump(ordered_archive, file, indent=4, ensure_ascii=False)


def format_change_group(symbol: str, slugs: list, summarize: bool) -> str:
    if not slugs:
        raise ValueError("Change group slugs must be non-empty")
    if summarize:
        return f"{symbol}{len(slugs)}"
    return ", ".join(f"{symbol}{slug}" for slug in slugs)


def format_change_parts(
    add_slugs: list,
    update_slugs: list,
    remove_slugs: list,
    summarize: bool = False,
) -> str:
    parts = []
    if add_slugs:
        parts.append(format_change_group("+", add_slugs, summarize))
    if update_slugs:
        parts.append(format_change_group("~", update_slugs, summarize))
    if remove_slugs:
        parts.append(format_change_group("-", remove_slugs, summarize))
    return "; ".join(parts)


def build_change_summary(manifest: dict) -> dict:
    active_removed = sorted(manifest["activeArchivedSlugs"] + manifest["activeDroppedSlugs"])
    total_changes = sum((
        len(manifest["activeAddedSlugs"]),
        len(manifest["activeUpdatedSlugs"]),
        len(active_removed),
        len(manifest["archiveAddedSlugs"]),
    ))
    active_parts = format_change_parts(
        manifest["activeAddedSlugs"],
        manifest["activeUpdatedSlugs"],
        active_removed,
    )
    archive_parts = format_change_parts(
        manifest["archiveAddedSlugs"],
        [],
        [],
    )
    return {
        "activeParts": active_parts,
        "archiveParts": archive_parts,
        "totalChanges": total_changes,
    }


def build_commit_message(manifest: dict, summary: dict) -> str:
    active_removed = manifest["activeArchivedSlugs"] + manifest["activeDroppedSlugs"]
    if summary["totalChanges"] > 5:
        active_parts = format_change_parts(
            manifest["activeAddedSlugs"],
            manifest["activeUpdatedSlugs"],
            active_removed,
            summarize=True,
        )
        archive_parts = format_change_parts(
            manifest["archiveAddedSlugs"],
            [],
            [],
            summarize=True,
        )
    else:
        active_parts = summary["activeParts"]
        archive_parts = summary["archiveParts"]

    if not active_parts and not archive_parts:
        return "🎯 Tour: no changes"

    sections = []
    if active_parts:
        sections.append(f"Active ({active_parts})")
    if archive_parts:
        sections.append(f"Archive ({archive_parts})")
    return f"🎯 Tour: {' | '.join(sections)}"


def log_change_summary(source_count: int, active_count: int, archive_count: int, elapsed: float, summary: dict) -> None:
    log("")
    log(f"📊 Summary | {f'Candidates: {source_count}':<14} | {f'Active: {active_count}':<10} | {f'Archive: {archive_count}':<10} | Elapsed: {elapsed:.1f}s")
    log(f"📝 {'Active':<7} | {summary['activeParts'] or 'No changes'}")
    log(f"🗄️ {'Archive':<7} | {summary['archiveParts'] or 'No changes'}")


def write_github_outputs(commit_message: str, manifest: dict) -> None:
    output_path = os.environ.get("GITHUB_OUTPUT")
    if not output_path:
        return
    with open(output_path, "a", encoding="utf-8") as file:
        file.write(f"commit_msg={commit_message}\n")
        file.write(f"membership_changed={'true' if manifest['membershipChanged'] else 'false'}\n")
        file.write(f"worker_cron_required={'true' if manifest['workerCronRequired'] else 'false'}\n")
        file.write(f"active_updated_slugs={json.dumps(manifest['activeUpdatedSlugs'], separators=(',', ':'))}\n")
        file.write(f"active_dropped_slugs={json.dumps(manifest['activeDroppedSlugs'], separators=(',', ':'))}\n")


# ==================== 主流程 ====================

def run_tournament_sync():
    start_time = time.time()
    old_active = load_required_json_array(TARGET_FILE)
    old_archive = load_required_json_array(ARCHIVE_FILE)
    assert_configs_disjoint(old_active, old_archive)
    validate_filters()

    url = "https://lol.fandom.com/api.php"
    session = make_session(url, os.environ.get("FANDOM_BOT_USERNAME"), os.environ.get("FANDOM_BOT_PASSWORD"))
    league_short_map = read_league_short_map(session, url)
    source_rows = fetch_tournament_source_rows(session, url, old_active)
    log(f"📥 抓取完成 | 原始: {len(source_rows)} 条 | 耗时: {time.time() - start_time:.1f}s")

    groups = group_tournament_rows(source_rows, league_short_map)
    log_group_summary(len(source_rows), groups)
    playoff_result = merge_playoff_events(groups["mainEvents"], groups["playoffEvents"])
    log_playoff_summary(len(groups["playoffEvents"]), playoff_result)

    candidates = project_tournament_candidates(groups["mainEvents"])
    transition = resolve_config_transition(old_active, old_archive, candidates)
    log_lifecycle_summary(transition)
    log_active_table(transition["active"])

    attach_transition_team_maps(session, url, transition)
    assert_configs_disjoint(transition["active"], transition["archive"])
    manifest = build_manifest(old_active, transition)
    write_configs(transition["active"], transition["archive"])

    summary = build_change_summary(manifest)
    commit_message = build_commit_message(manifest, summary)
    log_change_summary(
        len(source_rows),
        len(transition["active"]),
        len(transition["archive"]),
        time.time() - start_time,
        summary,
    )
    write_github_outputs(commit_message, manifest)

if __name__ == "__main__":
    run_tournament_sync()
