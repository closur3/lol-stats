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
    assert_config_digest,
    assert_active_source_complete,
    assert_configs_disjoint,
    assign_stable_slugs,
    build_tournament_config,
    build_membership_transition,
    build_transition_manifest,
    classify_tournament_eligibility,
    deduplicate_source_rows,
    parse_date,
)

now = datetime.now()
today_dt = now.date()
CONFIG_FILE = "config/TournamentConfig.json"

# ==================== 配置区 ====================
DISCOVERY_DAYS = 180
PREHEAT_DAYS = 7
EXPIRE_DAYS = 0
REGIONS = ["International", "China", "Korea"]
WHITELIST = []
BLACKLIST = ["Opening"]

NAME_MAPPING = {
    "Rounds 1-4": ["Rounds 1-2", "Rounds 3-4"],
}

CARGO_FIELDS = [
    "Name", "OverviewPage",
    "DateStart=startDate", "Date=endDate",
    "League", "Region", "IsPlayoffs", "Year",
    "TournamentLevel", "IsQualifier",
]
# ================================================

# ==================== 工具函数 ====================

def validate_tournament_list(value, label: str) -> list:
    if not isinstance(value, list):
        raise ValueError(f"{label} must be a JSON array")
    schema_fields = set(TOURNAMENT_FIELDS)
    required = ("slug", "name", "startDate", "endDate")
    slugs = set()
    for index, item in enumerate(value):
        if not isinstance(item, dict):
            raise ValueError(f"{label}[{index}] must be an object")
        if set(item) != schema_fields:
            raise ValueError(f"{label}[{index}] fields must match the tournament schema")
        if any(not isinstance(item.get(field), str) or not item[field].strip() for field in required):
            raise ValueError(f"{label}[{index}] fields missing")
        if not isinstance(item.get("leagueShort"), str) or not item["leagueShort"].strip():
            raise ValueError(f"{label}[{index}].leagueShort must be a non-empty string")
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
            raise ValueError(f"{label}[{index}].teamMap must be a non-empty string map")
        overviewPages = item.get("overviewPage")
        if not isinstance(overviewPages, list) or not overviewPages or any(not isinstance(page, str) or not page.strip() for page in overviewPages):
            raise ValueError(f"{label}[{index}].overviewPage must be a non-empty string array")
        if len(set(overviewPages)) != len(overviewPages):
            raise ValueError(f"{label}[{index}].overviewPage contains duplicates")
        start_date = parse_date(item["startDate"])
        end_date = parse_date(item["endDate"])
        if start_date > end_date:
            raise ValueError(f"{label}[{index}] date range invalid")
        if item["slug"] in slugs:
            raise ValueError(f"Duplicate slug in {label}: {item['slug']}")
        slugs.add(item["slug"])
    return value


def load_tournament_config(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as file:
        value = json.load(file)
    if not isinstance(value, dict) or set(value) != {"configDigest", "active", "archive"}:
        raise ValueError(f"{path} fields must be configDigest, active and archive")
    stored_digest = assert_config_digest(value["configDigest"], f"{path}.configDigest")
    active = validate_tournament_list(value["active"], f"{path}.active")
    archive = validate_tournament_list(value["archive"], f"{path}.archive")
    config = build_tournament_config(active, archive)
    if config["configDigest"] != stored_digest:
        raise ValueError(f"{path}.configDigest does not match config content")
    assert_configs_disjoint(config["active"], config["archive"])
    return config

def add_overview_page(event: dict, overview_page: str, start_date, end_date) -> None:
    dates = (start_date, end_date)
    existing = event["overviewPageDates"].get(overview_page)
    if existing is not None and existing != dates:
        raise ValueError(f"Tournament overviewPage dates conflict: {overview_page}")
    event["overviewPageDates"][overview_page] = dates


def project_overview_pages(event: dict) -> list:
    return [
        overview_page
        for overview_page, _ in sorted(
            event["overviewPageDates"].items(),
            key=lambda item: (*item[1], item[0]),
        )
    ]

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
    validate_filter_values(REGIONS, "REGIONS")
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

def calculate_cargo_retry_delay(attempt: int, response=None) -> float:
    retry_after = 0
    if response is not None:
        value = response.headers.get("Retry-After")
        if isinstance(value, str) and value.isdigit():
            retry_after = int(value)
    return max(30 * (2 ** (attempt - 1)), retry_after) + random.uniform(0, 5)


def fetch_cargo(session: requests.Session, url: str, base_params: dict) -> list:
    all_data, offset, limit, max_attempts = [], 0, 100, 4

    while True:
        params = {**base_params, "limit": str(limit), "offset": str(offset)}
        page_data = None
        last_error = None

        for attempt in range(1, max_attempts + 1):
            time.sleep(1)
            try:
                resp = session.get(url, params=params, timeout=30)
                resp.raise_for_status()
                resp_json = resp.json()
            except requests.exceptions.RequestException as error:
                last_error = error
                if attempt == max_attempts:
                    break
                delay = calculate_cargo_retry_delay(attempt, getattr(error, "response", None))
                print(f"⚠️ 网络异常 | {delay:.0f}s 后重试 {attempt}/{max_attempts} | {error}", flush=True)
                time.sleep(delay)
                continue

            if not isinstance(resp_json, dict):
                raise ValueError("Cargo response must be an object")
            api_error = resp_json.get("error")
            if api_error is not None:
                code = api_error.get("code") if isinstance(api_error, dict) else None
                if code not in {"ratelimited", "maxlag"}:
                    raise RuntimeError(f"Cargo API error: {api_error}")
                last_error = api_error
                if attempt == max_attempts:
                    break
                delay = calculate_cargo_retry_delay(attempt, resp)
                print(f"⚠️ API受限 | {delay:.0f}s 后重试 {attempt}/{max_attempts} | {api_error}", flush=True)
                time.sleep(delay)
                continue

            page_data = resp_json.get("cargoquery")
            if not isinstance(page_data, list):
                raise ValueError("Cargo response cargoquery must be an array")
            break

        if page_data is None:
            raise RuntimeError(f"Cargo page failed after retries: offset={offset} | {last_error}")

        if not page_data:
            break

        all_data.extend(page_data)
        if len(page_data) < limit:
            break

        offset += limit

    return all_data

def tournament_query(where: str) -> dict:
    return {
        "action": "cargoquery",
        "format": "json",
        "tables": "Tournaments",
        "fields": ", ".join(CARGO_FIELDS),
        "where": where,
        "order_by": "DateStart ASC, OverviewPage ASC",
    }

def build_discovery_window_where() -> str:
    latest_start = today_dt + timedelta(days=DISCOVERY_DAYS)
    return " AND ".join([
        f"Date >= {cargo_string_literal(today_dt, 'Date')}",
        f"DateStart <= {cargo_string_literal(latest_start, 'DateStart')}",
    ])

def chunked(values: list, size: int):
    for index in range(0, len(values), size):
        yield values[index:index + size]

def fetch_tournament_source_rows(session, url: str, old_active: list) -> list:
    discovery_rows = deduplicate_source_rows(
        fetch_cargo(session, url, tournament_query(build_discovery_window_where()))
    )
    discovery_pages = {item["title"]["OverviewPage"] for item in discovery_rows}
    active_pages = {
        page
        for tournament in old_active
        for page in tournament["overviewPage"]
    }
    missing_active_pages = sorted(active_pages - discovery_pages)
    reconciliation_rows = []
    for pages in chunked(missing_active_pages, 40):
        where = build_field_condition("OverviewPage", pages)
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

def collect_fandom_leagues(source_rows: list) -> list:
    leagues = set()
    for item in source_rows:
        row = item.get("title")
        if not isinstance(row, dict):
            raise ValueError("Cargo tournament row missing title")
        league = row.get("League")
        if isinstance(league, str) and league:
            leagues.add(league)
    return sorted(leagues)


def read_league_group_short_map(session, url: str, fandom_leagues: list) -> dict:
    validate_filter_values(fandom_leagues, "Fandom leagues")
    league_short_rows = fetch_cargo(session, url, {
        "action": "cargoquery",
        "format": "json",
        "tables": "LeagueGroups,LeagueGroups__Leagues",
        "fields": "LeagueGroups__Leagues._value=League,LeagueGroups.ShortName=leagueShort",
        "join_on": "LeagueGroups._ID=LeagueGroups__Leagues._rowID",
        "where": build_field_condition("LeagueGroups__Leagues._value", fandom_leagues),
        "order_by": "LeagueGroups__Leagues._value ASC",
    })
    league_short_by_fandom_league = {}
    for item in league_short_rows:
        row = item.get("title", {})
        fandom_league = row.get("League", "")
        league_short = row.get("leagueShort", "")
        if not fandom_league or not league_short:
            raise ValueError(f"Invalid League Group row: {row}")
        existing = league_short_by_fandom_league.get(fandom_league)
        if existing is not None and existing != league_short:
            raise ValueError(f"Conflicting League Group Short: {fandom_league}")
        league_short_by_fandom_league[fandom_league] = league_short
    return league_short_by_fandom_league


def missing_string_fields(row: dict, fields: tuple) -> list:
    return [
        field
        for field in fields
        if not isinstance(row.get(field), str) or not row[field]
    ]


def group_tournament_rows(source_rows: list, league_short_map: dict, active_overview_pages: set) -> dict:
    main_events, playoff_events = {}, []
    blocked_count = 0
    deferred_rows = []
    mapped_names = []

    for item in source_rows:
        t = item.get("title")
        if not isinstance(t, dict):
            raise ValueError("Cargo tournament row missing title")
        ov = t.get("OverviewPage")
        if not isinstance(ov, str) or not ov:
            raise ValueError(f"Tournament row identity missing: {t}")

        missing_identity_fields = missing_string_fields(t, ("Name",))
        if missing_identity_fields:
            if ov in active_overview_pages:
                raise ValueError(f"Active tournament row incomplete: {ov} | missing: {', '.join(missing_identity_fields)}")
            deferred_rows.append({"overviewPage": ov, "missingFields": missing_identity_fields})
            continue

        name = t["Name"]
        eligibility = classify_tournament_eligibility(t, REGIONS, WHITELIST, BLACKLIST)
        if eligibility == "undetermined":
            missing_fields = missing_string_fields(
                t,
                (
                    "TournamentLevel",
                    "IsQualifier",
                    "Region",
                    "Year",
                    "League",
                    "IsPlayoffs",
                    "startDate",
                    "endDate",
                ),
            )
            if ov in active_overview_pages:
                raise ValueError(f"Active tournament row incomplete: {ov} | missing: {', '.join(missing_fields)}")
            deferred_rows.append({"overviewPage": ov, "missingFields": missing_fields})
            continue
        if eligibility == "ineligible":
            blocked_count += 1
            continue

        missing_projection_fields = missing_string_fields(
            t,
            ("Region", "Year", "League", "IsPlayoffs", "startDate", "endDate"),
        )
        if missing_projection_fields:
            if ov in active_overview_pages:
                raise ValueError(f"Active tournament projection incomplete: {ov} | missing: {', '.join(missing_projection_fields)}")
            deferred_rows.append({"overviewPage": ov, "missingFields": missing_projection_fields})
            continue

        region = t["Region"]
        y = t["Year"]
        fandom_league = t["League"]
        is_playoffs = t["IsPlayoffs"]
        league_short = league_short_map.get(fandom_league)
        if not league_short:
            if ov in active_overview_pages:
                raise ValueError(
                    f"Active tournament League Short missing: {ov} | league: {fandom_league}"
                )
            deferred_rows.append({
                "overviewPage": ov,
                "missingFields": [f"LeagueShort:{fandom_league}"],
            })
            continue

        start_date = parse_date(t["startDate"])
        end_date = parse_date(t["endDate"])
        if start_date > end_date:
            raise ValueError(f"Tournament date range invalid: {ov}")

        mapped_name = apply_name_mapping(name)
        if mapped_name:
            mapped_names.append(f"{name} → {mapped_name}")
            name = mapped_name

        ev = {
            "overviewPageDates": {ov: (start_date, end_date)},
            "year": y,
            "name": name,
            "region": region,
            "startDate": start_date,
            "endDate": end_date,
            "leagueShort": league_short,
        }

        if is_playoffs == "1" and region != "International":
            playoff_events.append(ev)
        else:
            key = f"INTL_{name}_{y}" if region == "International" else (f"{name}_{y}" if mapped_name else f"{ov}_{y}")
            if key not in main_events:
                main_events[key] = ev
            else:
                main_events[key]["startDate"] = min(main_events[key]["startDate"], start_date)
                main_events[key]["endDate"] = max(main_events[key]["endDate"], end_date)
                add_overview_page(main_events[key], ov, start_date, end_date)

    return {
        "mainEvents": main_events,
        "playoffEvents": playoff_events,
        "blockedCount": blocked_count,
        "deferredRows": deferred_rows,
        "mappedNames": mapped_names,
    }


def log_group_summary(source_count: int, groups: dict) -> None:
    main_events = groups["mainEvents"]
    playoff_events = groups["playoffEvents"]
    total_after = len(main_events) + len(playoff_events)
    log("")
    log(f"⚙️ 处理阶段 ({source_count} 条 → {total_after} 条)")
    lines = [f"├─ 🚫 拦截: {groups['blockedCount']} 条"]
    if groups["deferredRows"]:
        lines.append(f"├─ ⏳ 待完善: {len(groups['deferredRows'])} 条")
        for row in groups["deferredRows"]:
            lines.append(f"│  └─ {row['overviewPage']} | missing: {', '.join(row['missingFields'])}")
    else:
        lines.append("├─ ⏳ 待完善: 无")
    if groups["mappedNames"]:
        for mapping in groups["mappedNames"]:
            lines.append(f"├─ 🔗 聚合: {mapping}")
    else:
        lines.append("├─ 🔗 聚合: 无")
    lines.append(f"└─ 🏟️ 季后赛: {len(playoff_events)} 条待匹配")
    log_tree(lines)


def merge_playoff_events(main_events: dict, playoff_events: list) -> dict:
    merged_playoffs = []
    independent_playoffs = []

    for p in playoff_events:
        playoff_overview_page = project_overview_pages(p)[0]
        m_key = next((
            k for k, m in main_events.items()
            if m["region"] != "International"
            and m["year"] == p["year"]
            and (
                m["name"] in p["name"]
                or playoff_overview_page.startswith(project_overview_pages(m)[0])
            )
        ), None)

        if m_key:
            old_end = main_events[m_key]["endDate"]
            new_end = max(old_end, p["endDate"])
            main_events[m_key]["endDate"] = new_end
            add_overview_page(
                main_events[m_key],
                playoff_overview_page,
                p["startDate"],
                p["endDate"],
            )
            merged_playoffs.append((main_events[m_key]["name"], p["name"], str(new_end)))
        else:
            independent_playoffs.append(p["name"])
            main_events[f"{playoff_overview_page}_{p['year']}_PO"] = p

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
            "overviewPage": project_overview_pages(event),
            "startDate": str(event["startDate"]),
            "endDate": str(event["endDate"]),
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


def write_config(active: list, archive: list) -> None:
    config = build_tournament_config(active, archive)
    with open(CONFIG_FILE, "w", encoding="utf-8") as file:
        json.dump(config, file, indent=4, ensure_ascii=False)
        file.write("\n")


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


def log_change_summary(source_count: int, active_count: int, archive_count: int, summary: dict) -> None:
    log("")
    log(f"📊 Summary | {f'Candidates: {source_count}':<14} | {f'Active: {active_count}':<10} | {f'Archive: {archive_count}':<10}")
    log(f"📝 {'Active':<7} | {summary['activeParts'] or 'No changes'}")
    log(f"🗄️ {'Archive':<7} | {summary['archiveParts'] or 'No changes'}")


def write_github_outputs(commit_message: str) -> None:
    output_path = os.environ.get("GITHUB_OUTPUT")
    if not output_path:
        return
    with open(output_path, "a", encoding="utf-8") as file:
        file.write(f"commit_msg={commit_message}\n")


# ==================== 主流程 ====================

def run_tournament_sync():
    start_time = time.time()
    old_config = load_tournament_config(CONFIG_FILE)
    old_active = old_config["active"]
    old_archive = old_config["archive"]
    validate_filters()

    url = "https://lol.fandom.com/api.php"
    session = make_session(url, os.environ.get("FANDOM_BOT_USERNAME"), os.environ.get("FANDOM_BOT_PASSWORD"))
    source_rows = fetch_tournament_source_rows(session, url, old_active)
    fandom_leagues = collect_fandom_leagues(source_rows)
    league_short_map = read_league_group_short_map(session, url, fandom_leagues) if fandom_leagues else {}
    log(f"📥 抓取完成 | 原始: {len(source_rows)} 条 | 耗时: {time.time() - start_time:.1f}s")

    active_overview_pages = {
        page
        for tournament in old_active
        for page in tournament["overviewPage"]
    }
    groups = group_tournament_rows(source_rows, league_short_map, active_overview_pages)
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
    write_config(transition["active"], transition["archive"])

    summary = build_change_summary(manifest)
    commit_message = build_commit_message(manifest, summary)
    log_change_summary(
        len(source_rows),
        len(transition["active"]),
        len(transition["archive"]),
        summary,
    )
    write_github_outputs(commit_message)

if __name__ == "__main__":
    run_tournament_sync()
