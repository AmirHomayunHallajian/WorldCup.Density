#!/usr/bin/env python3
import csv, io, os, re, urllib.request
from collections import defaultdict

BASE = "https://raw.githubusercontent.com/jfjelstul/worldcup/master/data-csv/"
FILES = ["goals.csv", "matches.csv", "tournaments.csv", "teams.csv"]
OUT = "data/goals.csv"


def fetch_csv(name):
    url = BASE + name
    with urllib.request.urlopen(url, timeout=60) as resp:
        text = resp.read().decode("utf-8")
    rows = list(csv.DictReader(io.StringIO(text)))
    if not rows:
        raise ValueError(f"No rows for {name}")
    return rows

def pick(row, *keys, default=""):
    for k in keys:
        if k in row and row[k] not in (None, ""):
            return row[k]
    return default

def parse_minute(raw):
    s = str(raw or "").strip().replace("'", "")
    m = re.match(r"^(\d+)(?:\+(\d+))?$", s)
    if m:
        minute = int(m.group(1)); stoppage = int(m.group(2) or 0)
        return minute, stoppage, f"{minute}+{stoppage}" if stoppage else str(minute)
    return 0, 0, "0"

def stage_group(stage):
    s = (stage or "").lower()
    if "group" in s: return "Group"
    if "round of 16" in s: return "Round of 16"
    if "quarter" in s: return "Quarter-final"
    if "semi" in s: return "Semi-final"
    if "third" in s: return "Third-place"
    if "final" in s and "semi" not in s: return "Final"
    return "Other"

def to_bool(v):
    s = str(v or "").strip().lower()
    return s in {"1","true","yes","y","t"}

def main():
    os.makedirs("data", exist_ok=True)
    data = {}
    for f in FILES:
        try:
            rows = fetch_csv(f)
            data[f] = rows
            print(f"Loaded {f}: {len(rows)} rows")
            print(f"Columns in {f}: {', '.join(rows[0].keys())}")
        except Exception as e:
            print(f"Failed loading {f}: {e}")
            if f == 'goals.csv':
                raise
            data[f] = []

    matches = {pick(m,'match_id','id'): m for m in data['matches.csv']}
    out_rows = []
    for g in data['goals.csv']:
        mid = pick(g,'match_id','id_match')
        match = matches.get(mid,{})
        year = pick(g,'tournament_year','year') or pick(match,'tournament_year','year')
        stage = pick(g,'stage_name','stage','round') or pick(match,'stage_name','stage','round')
        team = pick(g,'team_name','team','team1_name')
        opp = pick(g,'opponent_name','opponent','team2_name')
        minute, stoppage, display = parse_minute(pick(g,'minute','minute_regulation','goal_minute'))
        penalty = to_bool(pick(g,'is_penalty','penalty'))
        own = to_bool(pick(g,'is_own_goal','own_goal'))
        is_ko = stage_group(stage) != 'Group'
        out_rows.append({
            'tournament_year': int(year or 0), 'match_id': mid, 'minute': minute,
            'stoppage_minute': stoppage, 'display_minute': display,
            'player': pick(g,'player_name','player'), 'team': team, 'opponent': opp,
            'stage': stage, 'stage_group': stage_group(stage), 'is_knockout': str(is_ko).lower(),
            'is_penalty': str(penalty).lower(), 'is_own_goal': str(own).lower()
        })

    out_rows.sort(key=lambda r:(r['tournament_year'], r['match_id'], r['minute'], r['stoppage_minute']))
    fields = ['tournament_year','match_id','minute','stoppage_minute','display_minute','player','team','opponent','stage','stage_group','is_knockout','is_penalty','is_own_goal']
    with open(OUT,'w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=fields); w.writeheader(); w.writerows(out_rows)

    years = [r['tournament_year'] for r in out_rows if r['tournament_year']]
    teams = {r['team'] for r in out_rows if r['team']}
    print(f"total goals: {len(out_rows)}")
    print(f"years covered: {min(years) if years else 'NA'}-{max(years) if years else 'NA'}")
    print(f"number of tournaments: {len(set(years))}")
    print(f"number of teams: {len(teams)}")
    print(f"number of penalties: {sum(r['is_penalty']=='true' for r in out_rows)}")
    print(f"number of own goals: {sum(r['is_own_goal']=='true' for r in out_rows)}")

if __name__ == '__main__':
    main()
