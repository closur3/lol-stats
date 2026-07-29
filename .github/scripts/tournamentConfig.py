import hashlib
import json
import re
from datetime import datetime, timedelta


TOURNAMENT_FIELDS = (
    "slug",
    "name",
    "leagueShort",
    "overviewPage",
    "startDate",
    "endDate",
    "teamMap",
)
CONFIG_DIGEST_PATTERN = re.compile(r"^[a-f0-9]{64}$")


def parse_date(value: str):
    return datetime.strptime(value, "%Y-%m-%d").date()


def order_tournament_fields(tournament: dict) -> dict:
    if set(tournament) != set(TOURNAMENT_FIELDS):
        raise ValueError("Tournament fields must match the Config schema")
    ordered = {field: tournament[field] for field in TOURNAMENT_FIELDS}
    ordered["teamMap"] = dict(sorted(ordered["teamMap"].items()))
    return ordered


def assert_config_digest(value, label: str) -> str:
    if not isinstance(value, str) or not CONFIG_DIGEST_PATTERN.fullmatch(value):
        raise ValueError(f"{label} must be a SHA-256 digest")
    return value


def build_tournament_config(active: list, archive: list) -> dict:
    payload = {
        "active": [order_tournament_fields(tournament) for tournament in active],
        "archive": [order_tournament_fields(tournament) for tournament in archive],
    }
    serialized = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return {
        "configDigest": hashlib.sha256(serialized).hexdigest(),
        **payload,
    }


def slugify_name(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if not slug:
        raise ValueError("Tournament slug empty")
    return slug


def matches_tournament_filter(name: str, overview_page: str, values: list) -> bool:
    haystack = f"{name}\n{overview_page}".lower()
    return any(keyword.strip().lower() in haystack for keyword in values)


def assert_boolean_field(row: dict, field: str) -> None:
    value = row.get(field)
    if isinstance(value, str) and value and value not in {"0", "1"}:
        raise ValueError(f"Tournament {field} must be 0 or 1: {row['OverviewPage']}")


def classify_tournament_eligibility(row: dict, regions: list, whitelist: list, blacklist: list) -> str:
    name = row["Name"]
    overview_page = row["OverviewPage"]
    assert_boolean_field(row, "IsPlayoffs")
    whitelisted = matches_tournament_filter(name, overview_page, whitelist)
    blacklisted = matches_tournament_filter(name, overview_page, blacklist)
    if whitelisted:
        return "eligible"
    if blacklisted:
        return "ineligible"

    tournament_level = row.get("TournamentLevel")
    region = row.get("Region")
    if isinstance(tournament_level, str) and tournament_level and tournament_level != "Primary":
        return "ineligible"
    if isinstance(region, str) and region and region not in regions:
        return "ineligible"

    filter_values = (tournament_level, region)
    if any(
        not isinstance(value, str) or not value
        for value in filter_values
    ):
        return "undetermined"
    return "eligible"


def deduplicate_source_rows(rows: list) -> list:
    rows_by_page = {}
    for item in rows:
        row = item.get("title")
        if not isinstance(row, dict):
            raise ValueError("Cargo tournament row missing title")
        overview_page = row.get("OverviewPage")
        if not isinstance(overview_page, str) or not overview_page:
            raise ValueError("Cargo tournament row missing OverviewPage")
        existing = rows_by_page.get(overview_page)
        if existing is not None and existing != item:
            raise ValueError(f"Cargo tournament source conflict: {overview_page}")
        rows_by_page[overview_page] = item
    return list(rows_by_page.values())


def assert_active_source_complete(old_active: list, source_rows: list) -> None:
    source_pages = {
        item["title"].get("OverviewPage")
        for item in source_rows
        if isinstance(item.get("title"), dict)
    }
    missing = [
        f"{tournament['slug']}:{page}"
        for tournament in old_active
        for page in tournament["overviewPage"]
        if page not in source_pages
    ]
    if missing:
        raise ValueError(f"Active Cargo source missing: {', '.join(missing)}")


def assert_configs_disjoint(active: list, archive: list) -> None:
    active_slugs = {tournament["slug"] for tournament in active}
    overlap = sorted(
        tournament["slug"]
        for tournament in archive
        if tournament["slug"] in active_slugs
    )
    if overlap:
        raise ValueError(f"TournamentConfig active/archive overlap: {', '.join(overlap)}")

    page_owners = {}
    for label, tournaments in (("TournamentConfig.active", active), ("TournamentConfig.archive", archive)):
        for tournament in tournaments:
            for page in tournament["overviewPage"]:
                owner = f"{label}:{tournament['slug']}"
                existing = page_owners.get(page)
                if existing is not None and existing != owner:
                    raise ValueError(f"Tournament overviewPage identity conflict: {page}")
                page_owners[page] = owner


def assign_name_slugs(candidates: list, old_active: list, archive: list) -> list:
    archive_by_page = {}
    for tournament in archive:
        for page in tournament["overviewPage"]:
            archive_by_page.setdefault(page, set()).add(tournament["slug"])

    old_by_slug = {
        tournament["slug"]: set(tournament["overviewPage"])
        for tournament in old_active
    }
    archive_slugs = {tournament["slug"] for tournament in archive}
    assigned_slugs = set()
    assigned = []

    for candidate in candidates:
        pages = candidate["overviewPage"]
        archived_matches = {
            slug
            for page in pages
            for slug in archive_by_page.get(page, set())
        }
        if archived_matches:
            raise ValueError(
                f"Current tournament matches TournamentConfig.archive: {candidate['name']}:{','.join(sorted(archived_matches))}"
            )

        slug = slugify_name(candidate["name"])
        old_pages = old_by_slug.get(slug)
        if old_pages is not None and old_pages.isdisjoint(pages):
            raise ValueError(f"Generated slug collides with another Active tournament: {slug}")
        if slug in archive_slugs:
            raise ValueError(f"Generated slug collides with TournamentConfig.archive: {slug}")

        if slug in assigned_slugs:
            raise ValueError(f"Duplicate current tournament slug: {slug}")
        assigned_slugs.add(slug)
        assigned.append({"slug": slug, **candidate})

    return assigned


def classify_lifecycle(tournament: dict, current_date, preheat_days: int, expire_days: int) -> str:
    start_date = parse_date(tournament["startDate"])
    end_date = parse_date(tournament["endDate"])
    if start_date > current_date + timedelta(days=preheat_days):
        return "tooEarly"
    if current_date > end_date + timedelta(days=expire_days):
        return "expired"
    return "active"


def sort_tournaments(tournaments: list) -> list:
    return sorted(
        tournaments,
        key=lambda tournament: (
            tournament["startDate"],
            tournament["endDate"],
            tournament["slug"],
        ),
        reverse=True,
    )


def build_membership_transition(
    old_active: list,
    old_archive: list,
    candidates: list,
    current_date,
    preheat_days: int,
    expire_days: int,
) -> dict:
    classified = {"active": [], "expired": [], "tooEarly": []}
    for candidate in candidates:
        lifecycle = classify_lifecycle(candidate, current_date, preheat_days, expire_days)
        classified[lifecycle].append(candidate)

    active = sort_tournaments(classified["active"])
    old_active_by_slug = {tournament["slug"]: tournament for tournament in old_active}
    active_slugs = {tournament["slug"] for tournament in active}
    expired_by_slug = {tournament["slug"]: tournament for tournament in classified["expired"]}
    removed_slugs = set(old_active_by_slug) - active_slugs
    archived_slugs = sorted(slug for slug in removed_slugs if slug in expired_by_slug)
    dropped_slugs = sorted(removed_slugs - set(archived_slugs))

    archive_by_slug = {tournament["slug"]: tournament for tournament in old_archive}
    for slug in archived_slugs:
        if slug in archive_by_slug:
            raise ValueError(f"Archive transition slug already exists: {slug}")
        archive_by_slug[slug] = expired_by_slug[slug]

    return {
        "active": active,
        "archive": sort_tournaments(list(archive_by_slug.values())),
        "archivedSlugs": archived_slugs,
        "droppedSlugs": dropped_slugs,
        "tooEarly": sort_tournaments(classified["tooEarly"]),
        "expired": sort_tournaments(classified["expired"]),
    }


def build_transition_manifest(
    old_active: list,
    new_active: list,
    archived_slugs: list,
    dropped_slugs: list,
) -> dict:
    old_active_by_slug = {tournament["slug"]: tournament for tournament in old_active}
    new_active_by_slug = {tournament["slug"]: tournament for tournament in new_active}

    active_added = sorted(set(new_active_by_slug) - set(old_active_by_slug))
    active_updated = sorted(
        slug
        for slug in set(new_active_by_slug) & set(old_active_by_slug)
        if new_active_by_slug[slug] != old_active_by_slug[slug]
    )
    expected_active_removed = set(old_active_by_slug) - set(new_active_by_slug)
    declared_active_removed = set(archived_slugs) | set(dropped_slugs)
    if set(archived_slugs) & set(dropped_slugs):
        raise ValueError("Active transition categories overlap")
    if expected_active_removed != declared_active_removed:
        raise ValueError("Active transition manifest is incomplete")

    return {
        "activeAddedSlugs": active_added,
        "activeUpdatedSlugs": active_updated,
        "activeArchivedSlugs": sorted(archived_slugs),
        "activeDroppedSlugs": sorted(dropped_slugs),
        "archiveAddedSlugs": sorted(archived_slugs),
    }
