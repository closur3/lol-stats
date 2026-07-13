import importlib.util
import pathlib
import sys
import unittest
from unittest.mock import Mock, patch


MODULE_PATH = pathlib.Path(__file__).with_name("syncTours.py")
SPEC = importlib.util.spec_from_file_location("syncTours", MODULE_PATH)
sync_tours = importlib.util.module_from_spec(SPEC)
sys.modules.setdefault("requests", Mock())
SPEC.loader.exec_module(sync_tours)


class Response:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


class Session:
    def __init__(self, outcomes):
        self.outcomes = list(outcomes)

    def get(self, *_args, **_kwargs):
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return Response(outcome)


class FetchCargoTest(unittest.TestCase):
    def test_accepts_a_successful_empty_source(self):
        session = Session([{"cargoquery": []}])

        self.assertEqual(sync_tours.fetch_cargo(session, "url", {}), [])

    @patch.object(sync_tours.time, "sleep", return_value=None)
    def test_fails_instead_of_treating_a_failed_page_as_complete(self, _sleep):
        session = Session([RuntimeError("network")] * 5)

        with self.assertRaisesRegex(RuntimeError, "Cargo page failed after retries: offset=0"):
            sync_tours.fetch_cargo(session, "url", {})


class QueryScopeTest(unittest.TestCase):
    def test_uses_lifecycle_dates_without_a_year_filter(self):
        where = sync_tours.build_lifecycle_window_where()

        self.assertIn("Date >=", where)
        self.assertIn("DateStart <=", where)
        self.assertNotIn("Year", where)
        self.assertNotIn("TournamentLevel", where)
        self.assertNotIn("Region", where)

    @patch.object(sync_tours, "fetch_cargo")
    def test_reconciles_every_old_active_page_outside_the_lifecycle_query(self, fetch_cargo):
        source_row = {"title": {"OverviewPage": "Old/2025"}}
        fetch_cargo.side_effect = [[], [source_row]]
        old_active = [{"slug": "old", "overviewPage": ["Old/2025"]}]

        result = sync_tours.fetch_tournament_source_rows(Mock(), "url", old_active)

        self.assertEqual(result, [source_row])
        reconciliation_where = fetch_cargo.call_args_list[1].args[2]["where"]
        self.assertIn("OverviewPage = 'Old/2025'", reconciliation_where)
        self.assertNotIn("Year", reconciliation_where)


class TournamentGroupingTest(unittest.TestCase):
    def test_filtered_row_does_not_require_projection_fields(self):
        source_rows = [{"title": {
            "Name": "Filtered",
            "OverviewPage": "Filtered/2026",
            "Region": "Europe",
            "TournamentLevel": "Secondary",
            "IsQualifier": "1",
        }}]

        result = sync_tours.group_tournament_rows(source_rows, {})

        self.assertEqual(result["blockedCount"], 1)
        self.assertEqual(result["mainEvents"], {})

    def test_international_tournaments_from_different_years_do_not_merge(self):
        def row(year, start_date, end_date):
            return {"title": {
                "Name": "International Event",
                "OverviewPage": f"International/{year}",
                "Region": "International",
                "TournamentLevel": "Primary",
                "IsQualifier": "0",
                "Year": str(year),
                "League": "International",
                "IsPlayoffs": "0",
                "DateStart": start_date,
                "Date": end_date,
            }}

        result = sync_tours.group_tournament_rows([
            row(2026, "2026-12-20", "2027-01-05"),
            row(2027, "2027-12-20", "2028-01-05"),
        ], {"International": "INT"})

        self.assertEqual(len(result["mainEvents"]), 2)


if __name__ == "__main__":
    unittest.main()
