# WTPPW-Website

Static website for the **WTPPW** War Thunder squadron, hosted via GitHub Pages.
[Premium Players Worldwide](https://RainbowCastle25.github.io/WTPPW-Website/)
## Pages

| File | Description |
|------|-------------|
| `index.html` | Home / landing page with squadron overview and stats |
| `members.html` | Squadron roster, command staff, and rank guide |
| `recruitment.html` | How to join — requirements, steps, application template, and FAQ |
| `rules.html` | Code of conduct, in-game rules, and disciplinary procedure |
| `style.css` | Shared War Thunder military dark-theme stylesheet |

## Hosting on GitHub Pages

1. Go to **Settings → Pages** in this repository.
2. Under *Source*, select **Deploy from a branch**.
3. Choose the `main` branch and `/ (root)` folder.
4. Click **Save**. Your site will be live at `https://RainbowCastle25.github.io/WTPPW-Website/`.

## Live Roster

The members page fetches the live squadron roster from the Discord bot at the URL configured in the `ppw-roster-api` meta tag in [members.html](members.html).

The bot exposes `GET /api/squadron-members` and returns the current squadron list as JSON. The current public host is `https://ppw-api.ensignenterprises.com`. If you move the bot API to a different public host, update that meta tag so GitHub Pages can reach it.

## Live Battle Log

The homepage now fetches recent squadron battle summaries from the same bot host and renders the latest recorded matches automatically.

The bot exposes `GET /api/squadron-battle-log` and the homepage reads it from the public API host configured in [index.html](index.html). If the bot host changes, update that meta tag so the battle log keeps loading.

Rank badge classes used elsewhere on the site are:

- `rank-commander` — Commander
- `rank-officer` — Officer
- `rank-sergeant` — Sergeant
- `rank-private` — Private
