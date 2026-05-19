# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

A static HTML + CSS + JS companion web dashboard for the WTPPW Discord bot. Displays:

- Squadron member roster and activity scores
- Battle history and statistics
- ELO rating leaderboards (by air/ground role)
- Top-20 SRE seasonal badge holders
- Tournament/squadron battle sign-ups
- Community values and recruitment info

**Single source of data:** The Discord bot's REST API (port 8787).

---

## 🔌 API Integration Quick Reference

**For agents modifying API calls or data flow:**

| File | Purpose |
|---|---|
| [`members.html`](members.html) | **Roster page** — calls `/api/squadron-members`, `/api/member/:name`, `/api/battle-stats` |
| [`elo.html`](elo.html) | **ELO leaderboard page** — calls `/api/elo-leaderboard` with role/page/limit params |
| [`battles.html`](battles.html) | **Battle history page** — calls `/api/battle-history`, `/api/battle-stats` with pagination |
| [`index.html`](index.html) | **Home page** — calls `/api/announcements`, `/api/squadron-members` for featured data |
| [`tournaments.html`](tournaments.html) | **Tournament/SRE page** — calls `/api/top-20-leaderboard[?season=X]` |
| [`style.css`](style.css) | **Styling** — no API calls; shared across all pages |

**API Configuration (meta tags in HTML head):**
```html
<meta name="ppw-api-base" content="https://ppw-api.ensignenterprises.com" />
<meta name="ppw-api-key" content="[API_KEY]" />
```

All fetch calls dynamically read these meta tags. To change the API endpoint, update the meta tag value.

**Backend API docs:** See [`../discord-bot-project/CLAUDE.md#rest-api-port-8787`](../discord-bot-project/CLAUDE.md#rest-api-port-8787) for the full endpoint specification.

---

## Project structure

```
WTPPW-Website/
  index.html              — Home page; hero, announcements, featured roster
  members.html            — Full roster with searchable member cards and stats
  elo.html                — ELO rating leaderboard by air/ground role, paginated
  battles.html            — Battle history with detailed stats and filters
  tournaments.html        — SRE seasonal leaderboard and tournament info
  recruitment.html        — Recruitment info and join instructions
  rules.html              — Squadron rules and values
  values.html             — Community values and lore
  style.css               — All styling (shared across pages)
  images/                 — Static assets (logos, icons)
  uploads/                — User-uploaded content (battle screenshots, etc.)
```

---

## Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5 + CSS3 + Vanilla JavaScript |
| **API** | Fetch API (no framework) |
| **Styling** | Inline + `style.css` |
| **Build** | None (static site) |
| **Hosting** | Static file server behind Traefik reverse proxy |

---

## Common tasks

### Adding a new page

1. Create `newpage.html` with the site header/nav structure
2. Add a navigation link in the header (shared across all pages)
3. Add API fetch call(s) reading the meta tag config:
   ```javascript
   const apiBase = document.querySelector('meta[name="ppw-api-base"]').content;
   const apiKey = document.querySelector('meta[name="ppw-api-key"]').content;
   fetch(`${apiBase}/api/endpoint?api_key=${apiKey}`)
     .then(r => r.json())
     .then(data => { /* render */ });
   ```
4. Style using `style.css` or inline `<style>` blocks

### Modifying an API call

- Check [`../discord-bot-project/CLAUDE.md#rest-api-port-8787`](../discord-bot-project/CLAUDE.md#rest-api-port-8787) for current endpoint spec
- Update the fetch URL and params in the HTML file
- Test against the running bot API (default `http://localhost:8787`)

### Changing the API endpoint

Edit the meta tags in the `<head>` of each HTML file:
```html
<meta name="ppw-api-base" content="[new-url]" />
<meta name="ppw-api-key" content="[new-key]" />
```

Or search `ppw-api-base` across all HTML files to update them in bulk.

### Styling

All CSS is in [`style.css`](style.css). No CSS framework; handwritten for full control.

---

## Debugging API calls

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Trigger the page action that calls the API
4. Check the **XHR/Fetch** requests
5. Inspect the response in the **Preview** or **Response** tabs

Common issues:
- **CORS errors** — API server may not have `ALLOWED_ORIGIN` set correctly; see bot's `CLAUDE.md`
- **401/403** — API key missing or wrong; check meta tag value
- **Empty response** — API endpoint down or bot restarting; check `/health` endpoint

---

## Deployment

The site is served as-is by a static file server. No build step needed.

In production, Traefik routes traffic to this directory and the bot's API endpoint based on hostname:
- `ppw-api.ensignenterprises.com` → bot's port 8787
- `ppw.ensignenterprises.com` → this website's static files

---

## Known issues & tracking

See [`../discord-bot-project/CODE_REVIEW_FIXES.md`](../discord-bot-project/CODE_REVIEW_FIXES.md) for bot-side API issues that may affect the dashboard.

