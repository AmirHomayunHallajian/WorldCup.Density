# World Cup Goal Density Explorer
A single interactive chart that reveals the temporal rhythm of World Cup goals, from early shocks to stoppage-time drama.

## Live demo
https://<your-username>.github.io/WorldCup.Density/
## Hero screenshot
![Scatter view](docs/assets/screenshot-scatter.png)

## Why this exists
Portfolio project showing reproducible data cleaning + no-build interactive visualization.

## What you can explore
Scatter/heatmap view, team and stage filters, knockout/penalty/own-goal toggles, minute/year windows, and live goal-timing summary.

## Methods
- `scripts/prepare_data.py` downloads source CSVs, reconciles likely column names, normalizes minute + stoppage time, standardizes stage groups, and writes compact `data/goals.csv`.
- Frontend loads CSV once with Papa Parse and re-renders Plot marks in-memory.

## Data and attribution
Source: **The Fjelstul World Cup Database** by Joshua C. Fjelstul, Ph.D.  
Repository: https://github.com/jfjelstul/worldcup  
CSV directory: https://github.com/jfjelstul/worldcup/tree/master/data-csv  
Source license: CC-BY-SA 4.0 (attribution required).

This project transforms source data into a compact goal-level table with:
- selected goal-level fields
- standardized stage labels
- derived knockout flag
- derived penalty flag (where source fields exist)
- derived own-goal flag (where source fields exist)
- normalized stoppage-time display (`display_minute`)

Assumptions/fallbacks: script checks multiple likely column names (`minute` / `goal_minute`, `stage` / `round`, etc.) and prints available columns when mismatches occur.

## Tech stack
Vanilla HTML/CSS/JS, Observable Plot (CDN), Papa Parse (CDN), Tailwind (CDN), Python preprocessing script.

## Local usage
`python -m http.server 8000` then open `http://localhost:8000`.

## Deploying to GitHub Pages
Push to `main`; GitHub Actions workflow deploys static root.

## Portfolio value
Shows data pipeline reproducibility, interaction design, browser-only rendering, static deployment, and no-build architecture.

## Limitations
Environment with blocked outbound network cannot fetch source CSVs during script execution.

## Roadmap
Richer custom tooltip, player search, animation by tournament year.

## License
Code license: MIT.  
Data license (`data/goals.csv`): CC-BY-SA 4.0.
