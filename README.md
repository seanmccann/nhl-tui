# nhl-tui

A terminal UI for following NHL games, built with TypeScript, Node.js, React, and Ink.

`nhl-tui` is designed to feel like a real TUI, not a web dashboard squeezed into a terminal. It opens on a compact scoreboard, supports keyboard-first navigation, drills into live game detail, and keeps NHL-specific logic out of the rendering layer.

## Status

This is an early but usable v1.

Current capabilities:

- date-based scoreboard browsing
- stable row selection
- game detail view with summary, play-by-play, and box score tabs
- adaptive polling for scoreboard and game detail
- standings screen with conference playoff-cut grouping
- leaders screen with top-10 skater and goalie stat tables
- diff-based domain events for goals, game starts, period changes, and finals
- queued goal banners
- reducer-based state management with separate API, domain, and UI layers

## Screens

Scoreboard:

- grouped by `LIVE`, `UPCOMING`, and `FINAL`
- away and home team abbreviations
- score and game state
- live period and clock
- scheduled puck drop time for upcoming games

Game detail:

- summary
- play-by-play
- box score

Standings:

- Eastern and Western conference sections
- top three teams in each division
- two conference wild card teams
- teams below the wild card line

Leaders:

- skater leaders for points, goals, and assists
- goalie leaders for goals against average, save percentage, and shutouts
- top 10 rows per table

The summary view includes scoring, penalties, and three stars. Where the upstream payload exposes enough information, player labels are rendered as sweater number plus short name, for example `97 C. McDavid`.

## Quick Start

### Requirements

- Node.js 22+
- network access to `https://api-web.nhle.com`

### Run locally

```bash
npm install
npm start
```

### Build the CLI

```bash
npm run build
node dist/index.js
```

The package is configured with a `nhl-tui` bin entry for future npm publishing.

## Releases

GitHub Releases are automated with Actions on semantic-version tags. Pushing a tag such as `v0.1.0` runs typecheck and build, then creates a GitHub Release with generated notes.

Example:

```bash
git checkout main
git pull
git tag v0.1.0
git push origin main --tags
```

Version selection is still manual. The workflow only builds and publishes the GitHub Release after the tag exists.

## Controls

### Scoreboard

- `up` / `down`: move selection
- `left` / `right`: previous or next date
- `g`: jump to top
- `G`: jump to bottom
- `enter`: open selected game
- `s`: open standings
- `l`: open leaders
- `r`: manual refresh
- `esc` or `q`: quit

### Standings view

- `esc`: back to scoreboard

### Leaders view

- `esc`: back to scoreboard

### Game view

- `left` / `right`: cycle tabs
- `1`: summary
- `2`: play-by-play
- `3`: box score
- `r`: manual refresh
- `esc`: back to scoreboard
- `q`: quit

## Architecture

The app is split into three layers:

- `src/api`
  Public endpoint access only.
- `src/domain`
  Stable types, normalization, diffing, event emission, and reducer logic.
- `src/ui`
  Ink components that render already-processed state and dispatch actions.

Runtime flow:

`fetch -> normalize -> diff -> emit events -> reducer -> Ink render`

Ink is only the renderer. Components do not interpret raw upstream payloads.

The data-fetching layer is intentionally isolated in `src/api` so endpoints can be swapped or replaced if upstream services change.

## Data Sources And API Usage

Game data is retrieved from publicly accessible endpoints used by NHL web applications.

Current endpoint usage is isolated in `src/api/nhl.ts`:

- `/v1/score/YYYY-MM-DD`
- `/v1/standings/YYYY-MM-DD`
- `/v1/skater-stats-leaders/current?categories=points,goals,assists&limit=10`
- `/v1/goalie-stats-leaders/current?categories=goalsAgainstAverage,savePctg,shutouts&limit=10`
- `/v1/gamecenter/{gameId}/landing`
- `/v1/gamecenter/{gameId}/play-by-play`
- `/v1/gamecenter/{gameId}/boxscore`

No API key is currently required for these endpoints, but their availability and permitted use can change over time.

The application uses adaptive polling to minimize load on upstream services. It limits requests to the current scoreboard date or the currently selected game, slows down aggressively when possible, and is intended for personal and educational use. The standings screen is fetched once per selected date and then served from in-memory state. The leaders screen is also fetched once and then served from in-memory state.

## Legal And Trademark Considerations

This project is not affiliated with, endorsed by, or sponsored by the National Hockey League.

Additional safeguards and project conventions:

- The UI uses team abbreviations only, not team logos or NHL branding assets.
- The repository does not bundle NHL logos, team logos, broadcast assets, or other league branding materials.
- This project does not stream NHL video, bundle broadcast media, or distribute copyrighted game footage or other copyrighted media.
- `NHL`, team names, club names, logos, shields, and other league or team branding remain the property of their respective owners.
- References to the league, clubs, players, and game data are for identification and informational use only.
- This project is intended for personal and educational use. The MIT license applies to this source code, but it does not grant any rights to NHL trademarks, logos, or media.
- Public NHL web endpoints and related terms may change or be restricted at any time, and this project should not be presented as an official NHL product or service.

## Events

Meaningful state transitions are detected in the domain layer by diffing normalized snapshots.

Current event types:

- `goal_scored`
- `game_started`
- `period_changed`
- `game_ended`

Goal events are surfaced through a queued banner system so multiple notifications do not overlap.

## Development

Useful commands:

```bash
npm start
npm run check
npm run build
```

## Contributing

Issues and pull requests are welcome.

Before opening a PR, run:

```bash
npm run check
npm run build
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contributor expectations, including trademark and branding restrictions.

## Roadmap

Likely next improvements:

- play-by-play-id-based event detection instead of score-only goal diffs
- additional domain events such as penalties, lead changes, and goalie pulls
- optional sound hooks driven from emitted domain events
- richer box score and play-by-play layouts

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
