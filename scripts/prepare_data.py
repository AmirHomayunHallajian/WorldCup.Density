#!/usr/bin/env python3
"""Fetch the Fjelstul World Cup dataset and emit a compact goal-level CSV.

Source: https://github.com/jfjelstul/worldcup (CC-BY-SA 4.0)

The upstream goals table does not carry a tournament year or opponent column,
so we join goals -> matches -> tournaments to derive both.
"""

import csv
import io
import os
import re
import sys
import urllib.request
from typing import Iterable

BASE = "https://raw.githubusercontent.com/jfjelstul/worldcup/master/data-csv/"
FILES = ["goals.csv", "matches.csv", "tournaments.csv", "teams.csv"]
OUT = "data/goals.csv"


def fetch_csv(name: str) -> list[dict]:
    url = BASE + name
    with urllib.request.urlopen(url, timeout=60) as resp:
        text = resp.read().decode("utf-8")
    return list(csv.DictReader(io.StringIO(text)))


def pick(row: dict, *keys: str, default: str = "") -> str:
    for k in keys:
        v = row.get(k)
        if v not in (None, ""):
            return v
    return default


def parse_minute(raw) -> tuple[int, int, str]:
    s = str(raw or "").strip().replace("'", "")
    m = re.match(r"^(\d+)(?:\+(\d+))?$", s)
    if m:
        minute = int(m.group(1))
        stoppage = int(m.group(2) or 0)
        return minute, stoppage, f"{minute}+{stoppage}" if stoppage else str(minute)
    return 0, 0, "0"


def stage_group(stage: str) -> str:
    s = (stage or "").lower()
    if "group" in s:
        return "Group"
    if "round of 16" in s:
        return "Round of 16"
    if "quarter" in s:
        return "Quarter-final"
    if "semi" in s:
        return "Semi-final"
    if "third" in s:
        return "Third-place"
    if "final" in s and "semi" not in s:
        return "Final"
    return "Other"


def to_bool(v) -> bool:
    return str(v or "").strip().lower() in {"1", "true", "yes", "y", "t"}


def derive_year(match: dict, tournament: dict) -> int:
    for source in (match, tournament):
        for key in ("year", "tournament_year"):
            if source.get(key):
                try:
                    return int(source[key])
                except ValueError:
                    pass
        date = source.get("match_date") or source.get("start_date") or ""
        m = re.search(r"(\d{4})", date)
        if m:
            return int(m.group(1))
        name = source.get("tournament_name") or ""
        m = re.search(r"(\d{4})", name)
        if m:
            return int(m.group(1))
    return 0


def player_name(g: dict) -> str:
    given = (g.get("given_name") or "").strip()
    family = (g.get("family_name") or "").strip()
    full = f"{given} {family}".strip()
    return full or pick(g, "player_name", "player")


def join_lookup(rows: Iterable[dict], *keys: str) -> dict:
    out = {}
    for row in rows:
        for k in keys:
            v = row.get(k)
            if v:
                out[v] = row
                break
    return out


def main() -> int:
    os.makedirs("data", exist_ok=True)

    data: dict[str, list[dict]] = {}
    for name in FILES:
        try:
            rows = fetch_csv(name)
            data[name] = rows
            print(f"Loaded {name}: {len(rows)} rows")
        except Exception as exc:  # noqa: BLE001
            print(f"Failed to load {name}: {exc}", file=sys.stderr)
            if name == "goals.csv":
                return 1
            data[name] = []

    matches = join_lookup(data["matches.csv"], "match_id", "id")
    tournaments = join_lookup(data["tournaments.csv"], "tournament_id")

    out_rows: list[dict] = []
    for g in data["goals.csv"]:
        match = matches.get(pick(g, "match_id", "id_match"), {})
        tournament = tournaments.get(
            pick(g, "tournament_id") or match.get("tournament_id", ""), {}
        )

        year = derive_year(match, tournament)
        stage = pick(g, "stage_name", "stage", "round") or pick(
            match, "stage_name", "stage", "round"
        )
        team = pick(g, "team_name", "team", "player_team_name")
        home = pick(match, "home_team_name", "team1_name")
        away = pick(match, "away_team_name", "team2_name")
        opponent = ""
        if team and team == home:
            opponent = away
        elif team and team == away:
            opponent = home
        else:
            opponent = pick(g, "opponent_name", "opponent")

        minute_src = pick(g, "minute_regulation", "minute", "goal_minute")
        stoppage_src = pick(g, "minute_stoppage")
        if stoppage_src:
            try:
                minute = int(minute_src or 0)
                stoppage = int(stoppage_src or 0)
                display = f"{minute}+{stoppage}" if stoppage else str(minute)
            except ValueError:
                minute, stoppage, display = parse_minute(minute_src)
        else:
            minute, stoppage, display = parse_minute(minute_src)

        is_ko = to_bool(match.get("knockout_stage")) or stage_group(stage) != "Group"
        out_rows.append(
            {
                "tournament_year": year,
                "match_id": pick(g, "match_id", "id_match"),
                "minute": minute,
                "stoppage_minute": stoppage,
                "display_minute": display,
                "player": player_name(g),
                "team": team,
                "opponent": opponent,
                "stage": stage,
                "stage_group": stage_group(stage),
                "is_knockout": str(is_ko).lower(),
                "is_penalty": str(to_bool(pick(g, "penalty", "is_penalty"))).lower(),
                "is_own_goal": str(to_bool(pick(g, "own_goal", "is_own_goal"))).lower(),
            }
        )

    out_rows.sort(
        key=lambda r: (
            r["tournament_year"],
            r["match_id"],
            r["minute"],
            r["stoppage_minute"],
        )
    )

    fields = [
        "tournament_year",
        "match_id",
        "minute",
        "stoppage_minute",
        "display_minute",
        "player",
        "team",
        "opponent",
        "stage",
        "stage_group",
        "is_knockout",
        "is_penalty",
        "is_own_goal",
    ]
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(out_rows)

    years = [r["tournament_year"] for r in out_rows if r["tournament_year"]]
    print(f"Wrote {OUT}: {len(out_rows)} goals")
    if years:
        print(f"Years covered: {min(years)}-{max(years)} across {len(set(years))} tournaments")
    print(f"Teams: {len({r['team'] for r in out_rows if r['team']})}")
    print(f"Penalties: {sum(r['is_penalty'] == 'true' for r in out_rows)}")
    print(f"Own goals: {sum(r['is_own_goal'] == 'true' for r in out_rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
