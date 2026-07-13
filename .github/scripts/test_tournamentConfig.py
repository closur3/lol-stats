import unittest
from datetime import date

from tournamentConfig import (
    TOURNAMENT_FIELDS,
    assert_active_source_complete,
    assert_configs_disjoint,
    assign_stable_slugs,
    build_membership_transition,
    build_transition_manifest,
    classify_lifecycle,
    deduplicate_source_rows,
    is_eligible_row,
    order_tournament_fields,
)


def tournament(slug: str, overview_page: str, start_date="2026-01-01", end_date="2026-01-31", **extra):
    return {
        "slug": slug,
        "name": extra.pop("name", slug),
        "leagueShort": "LCK",
        "overviewPage": [overview_page],
        "startDate": start_date,
        "endDate": end_date,
        **extra,
    }


def candidate(name: str, overview_page: str, start_date="2026-01-01", end_date="2026-01-31"):
    return {
        "name": name,
        "leagueShort": "LCK",
        "overviewPage": [overview_page],
        "startDate": start_date,
        "endDate": end_date,
    }


class EligibilityTest(unittest.TestCase):
    def test_applies_region_filters_locally(self):
        row = {
            "Name": "LCK 2026",
            "OverviewPage": "LCK/2026",
            "TournamentLevel": "Primary",
            "IsQualifier": "0",
            "Region": "Korea",
        }

        self.assertTrue(is_eligible_row(row, ["Korea"], [], []))
        self.assertFalse(is_eligible_row({**row, "IsQualifier": "1"}, ["Korea"], [], []))

    def test_whitelist_bypasses_default_filters_and_blacklist(self):
        row = {
            "Name": "Special Opening",
            "OverviewPage": "Special/2026",
            "TournamentLevel": "Secondary",
            "IsQualifier": "1",
            "Region": "Europe",
        }

        self.assertTrue(is_eligible_row(row, ["Korea"], ["Special"], ["Opening"]))


class SourceContractTest(unittest.TestCase):
    def test_fails_when_an_active_overview_page_is_missing(self):
        old_active = [tournament("active", "Active/2026")]

        with self.assertRaisesRegex(ValueError, "Active Cargo source missing: active:Active/2026"):
            assert_active_source_complete(old_active, [])

    def test_rejects_conflicting_rows_for_the_same_overview_page(self):
        first = {"title": {"OverviewPage": "Active/2026", "Name": "First"}}
        second = {"title": {"OverviewPage": "Active/2026", "Name": "Second"}}

        with self.assertRaisesRegex(ValueError, "Cargo tournament source conflict: Active/2026"):
            deduplicate_source_rows([first, second])

    def test_rejects_overview_page_identity_shared_by_configs(self):
        active = [tournament("active", "Shared/2026")]
        archive = [tournament("archive", "Shared/2026")]

        with self.assertRaisesRegex(ValueError, "Tournament overviewPage identity conflict: Shared/2026"):
            assert_configs_disjoint(active, archive)


class StableIdentityTest(unittest.TestCase):
    def test_preserves_existing_slug_by_overview_page(self):
        old_active = [tournament("stable-slug", "Stable/2026")]

        result = assign_stable_slugs(
            [candidate("Renamed Tournament", "Stable/2026")],
            old_active,
            [],
        )

        self.assertEqual(result[0]["slug"], "stable-slug")
        self.assertEqual(next(iter(result[0])), "slug")

    def test_rejects_a_current_tournament_matching_archive(self):
        archive = [tournament("archived", "Archived/2026")]

        with self.assertRaisesRegex(ValueError, "matches TournamentConfig.archive"):
            assign_stable_slugs([candidate("Archived", "Archived/2026")], [], archive)


class ConfigFieldOrderTest(unittest.TestCase):
    def test_orders_fields_and_team_map_deterministically(self):
        value = tournament(
            "ordered",
            "Ordered/2026",
            teamMap={"Zulu": "Z", "Alpha": "A"},
        )

        ordered = order_tournament_fields(value)

        self.assertEqual(tuple(ordered), TOURNAMENT_FIELDS)
        self.assertEqual(list(ordered["teamMap"]), ["Alpha", "Zulu"])


class LifecycleTest(unittest.TestCase):
    def test_cross_year_tournament_uses_normal_active_lifecycle(self):
        value = tournament("cross-year", "Cross/2025", "2025-12-20", "2026-01-10")

        self.assertEqual(classify_lifecycle(value, date(2026, 1, 2), 7, 0), "active")

    def test_next_year_tournament_enters_preheat_without_year_logic(self):
        value = tournament("next-year", "Next/2027", "2027-01-03", "2027-01-10")

        self.assertEqual(classify_lifecycle(value, date(2026, 12, 28), 7, 0), "active")


class MembershipTransitionTest(unittest.TestCase):
    def test_archives_only_an_explicitly_expired_old_active(self):
        old_active = [tournament("expired", "Expired/2026")]
        expired = tournament("expired", "Expired/2026", end_date="2026-01-31", name="Current Name")

        result = build_membership_transition(
            old_active,
            [],
            [expired],
            date(2026, 2, 1),
            7,
            0,
        )

        self.assertEqual(result["archivedSlugs"], ["expired"])
        self.assertEqual(result["droppedSlugs"], [])
        self.assertEqual(result["archive"][0]["name"], "Current Name")

    def test_marks_filtered_old_active_as_dropped(self):
        old_active = [tournament("filtered", "Filtered/2026")]

        result = build_membership_transition(
            old_active,
            [],
            [],
            date(2026, 1, 15),
            7,
            0,
        )

        self.assertEqual(result["archivedSlugs"], [])
        self.assertEqual(result["droppedSlugs"], ["filtered"])


class TransitionManifestTest(unittest.TestCase):
    def test_tracks_active_update_without_membership_change(self):
        old_active = [tournament("updated", "Updated/2026", teamMap={"Team": "OLD"})]
        new_active = [tournament("updated", "Updated/2026", teamMap={"Team": "NEW"})]

        manifest = build_transition_manifest(old_active, new_active, [], [])

        self.assertEqual(manifest["activeUpdatedSlugs"], ["updated"])
        self.assertFalse(manifest["membershipChanged"])

    def test_membership_change_tracks_dropped_active(self):
        old_active = [tournament("dropped", "Dropped/2026")]

        manifest = build_transition_manifest(old_active, [], [], ["dropped"])

        self.assertEqual(manifest["activeDroppedSlugs"], ["dropped"])
        self.assertTrue(manifest["membershipChanged"])

    def test_manifest_describes_config_change_without_worker_commands(self):
        new_active = [tournament("added", "Added/2026")]

        added_manifest = build_transition_manifest([], new_active, [], [])
        archived_manifest = build_transition_manifest(
            [tournament("archived", "Archived/2026")],
            [],
            ["archived"],
            [],
        )

        self.assertEqual(
            set(added_manifest),
            {"activeAddedSlugs", "activeUpdatedSlugs", "activeArchivedSlugs", "activeDroppedSlugs", "archiveAddedSlugs", "membershipChanged"},
        )
        self.assertEqual(archived_manifest["archiveAddedSlugs"], ["archived"])


if __name__ == "__main__":
    unittest.main()
