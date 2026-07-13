import re
from datetime import datetime, timedelta


def parse_date(value: str):
    return datetime.strptime(value, "%Y-%m-%d").date()


def slugify_name(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    if not slug:
        raise ValueError("Tournament slug empty")
    return slug


def is_whitelisted(name: str, overview_page: str, whitelist: list) -> bool:
    haystack = f"{name}\n{overview_page}".lower()
    return any(keyword.strip().lower() in haystack for keyword in whitelist)


def is_eligible_row(row: dict, default_regions: list, whitelist: list, blacklist: list) -> bool:
    name = row.get("Name", "")
    overview_page = row.get("OverviewPage", "")
    whitelisted = is_whitelisted(name, overview_page, whitelist)
    blacklisted = any(keyword.strip().lower() in name.lower() for keyword in blacklist)
    if blacklisted and not whitelisted:
        return False
    default_eligible = (
        row.get("TournamentLevel") == "Primary"
        and row.get("IsQualifier") == "0"
        and row.get("Region") in default_regions
    )
    return whitelisted or default_eligible


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
        raise ValueError(f"ConfigActive and ConfigArchive overlap: {', '.join(overlap)}")

    page_owners = {}
    for label, tournaments in (("ConfigActive", active), ("ConfigArchive", archive)):
        for tournament in tournaments:
            for page in tournament["overviewPage"]:
                owner = f"{label}:{tournament['slug']}"
                existing = page_owners.get(page)
                if existing is not None and existing != owner:
                    raise ValueError(f"Tournament overviewPage identity conflict: {page}")
                page_owners[page] = owner


def assign_stable_slugs(candidates: list, old_active: list, archive: list) -> list:
    old_by_page = {}
    for tournament in old_active:
        for page in tournament["overviewPage"]:
            existing = old_by_page.get(page)
            if existing is not None and existing != tournament["slug"]:
                raise ValueError(f"Active overviewPage identity conflict: {page}")
            old_by_page[page] = tournament["slug"]

    archive_by_page = {}
    for tournament in archive:
        for page in tournament["overviewPage"]:
            archive_by_page.setdefault(page, set()).add(tournament["slug"])

    old_slugs = {tournament["slug"] for tournament in old_active}
    archive_slugs = {tournament["slug"] for tournament in archive}
    assigned_slugs = set()
    matched_old_slugs = set()
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
                f"Current tournament matches ConfigArchive: {candidate['name']}:{','.join(sorted(archived_matches))}"
            )

        old_matches = {old_by_page[page] for page in pages if page in old_by_page}
        if len(old_matches) > 1:
            raise ValueError(f"Current tournament matches multiple Active slugs: {candidate['name']}")

        if old_matches:
            slug = next(iter(old_matches))
            if slug in matched_old_slugs:
                raise ValueError(f"Active tournament split detected: {slug}")
            matched_old_slugs.add(slug)
        else:
            slug = slugify_name(candidate["name"])
            if slug in old_slugs:
                raise ValueError(f"Generated slug collides with unmatched Active tournament: {slug}")
            if slug in archive_slugs:
                raise ValueError(f"Generated slug collides with ConfigArchive: {slug}")

        if slug in assigned_slugs:
            raise ValueError(f"Duplicate current tournament slug: {slug}")
        assigned_slugs.add(slug)
        assigned.append({**candidate, "slug": slug})

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

    manifest = {
        "activeAddedSlugs": active_added,
        "activeUpdatedSlugs": active_updated,
        "activeArchivedSlugs": sorted(archived_slugs),
        "activeDroppedSlugs": sorted(dropped_slugs),
        "archiveAddedSlugs": sorted(archived_slugs),
    }
    manifest["membershipChanged"] = any((
        active_added,
        archived_slugs,
        dropped_slugs,
    ))
    manifest["workerCronRequired"] = any((
        active_added,
        archived_slugs,
    ))
    return manifest
