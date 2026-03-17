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

## Legal

This project is not affiliated with or endorsed by the National Hockey League. `NHL`, team names, logos, and branding remain property of their respective owners. Intended for personal use.

## License

MIT — see [LICENSE](./LICENSE).
