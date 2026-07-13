# nhl-tui

A terminal UI for following NHL games.

## Install

```bash
npx nhl-tui
```

Or install it globally:

```bash
npm install -g nhl-tui
nhl-tui
```

Requires Node.js 22+.

## What You Get

- **Scoreboard** — browse games by date, grouped by live, upcoming, and final
- **Game detail** — summary, play-by-play, and box score tabs
- **Standings** — conference view with playoff-cut grouping
- **Leaders** — top-10 skater and goalie stats
- **Goal banners** — queued notifications when goals are scored
- **Live updates** — adaptive polling that speeds up for live games

## Controls

### Scoreboard

| Key | Action |
|-----|--------|
| `up` / `down` | Move selection |
| `left` / `right` | Previous / next date |
| `enter` | Open game |
| `s` | Standings |
| `l` | Leaders |
| `g` / `G` | Jump to top / bottom |
| `r` | Refresh |
| `q` | Quit |

### Game Detail

| Key | Action |
|-----|--------|
| `left` / `right` | Cycle tabs |
| `1` `2` `3` | Summary / play-by-play / box score |
| `r` | Refresh |
| `esc` | Back to scoreboard |
| `q` | Quit |

### Standings / Leaders

| Key | Action |
|-----|--------|
| `esc` | Back to scoreboard |

## Reliability

`nhl-tui` is built to keep running and to never show you something it can't stand behind:

- **Resilient polling** — transient network errors and rate limits are retried with backoff; a hung request times out instead of stalling updates. When a refresh fails, the last-known data stays on screen and the status line flags that it's retrying.
- **Honest freshness** — the status line always shows when the data was last updated, and turns yellow when it goes stale, so you're never guessing whether a score is current.
- **Shape-change safe** — if the NHL API returns something unrecognizable, the app keeps your last good view and surfaces the anomaly rather than silently blanking to "no games".
- **Correct game day** — "today" follows the NHL's own Eastern-time day boundary, so the right slate shows regardless of your timezone.
- **Terminal-safe** — content adapts to your terminal size, a render error is isolated to a recoverable panel instead of crashing, and the terminal is always restored cleanly on exit.

Run `nhl-tui --version` or `nhl-tui --help` for CLI info.

## Legal

This project is not affiliated with or endorsed by the National Hockey League. `NHL`, team names, logos, and branding remain property of their respective owners. Intended for personal use.

## License

MIT — see [LICENSE](./LICENSE).
