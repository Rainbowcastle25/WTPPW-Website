# WTPPW Website — API Contract

This document defines every endpoint the frontend website calls, the exact
response shape it expects, and what it does with the data. Use it as the
ground-truth spec when implementing or modifying the Discord bot's REST API
(`rosterApi.js`, port 8787, proxied via Traefik at
`https://ppw-api.ensignenterprises.com`).

---

## Authentication

Every request includes:

```
X-API-Key: <key>
```

The key is stored in each page's `<head>`:

```html
<meta name="ppw-api-base" content="https://ppw-api.ensignenterprises.com" />
<meta name="ppw-api-key"  content="<key>" />
```

Return `401` if the key is wrong. The frontend does not retry on 401.

---

## Endpoints

### 1. `GET /api/squadron-members`

**Used by:** `index.html` (member count), `members.html` (full roster)

**Response shape:**

```json
{
  "players": [
    {
      "name": "Rainbowcastle25",
      "role": "Commander",
      "personalClanRating": 1842,
      "activity": 96,
      "dateOfEntry": "12.03.2020",
      "specialty": "Air / Jets",
      "country": "US",
      "joinedDays": 1995
    }
  ]
}
```

**Field notes:**

| Field | Type | Description |
|---|---|---|
| `name` | string | In-game username |
| `role` | string | One of: `"Commander"`, `"Executive Officer"`, `"Recruitment Officer"`, `"Officer"`, `"Sergeant"`, `"Private"` |
| `personalClanRating` | number | Player's personal clan rating (integer) |
| `activity` | number | Activity score 0–100 |
| `dateOfEntry` | string | `"DD.MM.YYYY"` format |
| `specialty` | string | e.g. `"Air / Jets"`, `"Ground / MBT"`, `"Naval"` |
| `country` | string | Two-letter country code or full name |
| `joinedDays` | number | Days since joining |

**Alternative field names the frontend also accepts** (normalised in `members.js`):

- `player_name` → `name`
- `clanRating` or `rating` or `personal_clan_rating` → `personalClanRating`
- `activityScore` or `activity_score` → `activity`
- `date_of_entry` or `joinDate` or `join_date` → `dateOfEntry`
- `theatre` → `specialty`
- `nation` → `country`
- `joined_days` or `days_in_squadron` → `joinedDays`
- `rank` → `role`

**Role string normalisation** (done client-side):

| API string contains | Maps to |
|---|---|
| `command`, `founder` | Commander |
| `officer`, `exec`, `xo`, `recruit` | Officer |
| `sergeant`, `sgt` | Sergeant |
| anything else | Private |

**`index.html` only reads:** `data.players.length` (count of members).

**`members.html` renders all fields.** If `players` array is empty or the
request fails, the roster grid shows an error message — no fallback data.

---

### 2. `GET /api/announcements?limit=4`

**Used by:** `index.html`

**Response shape:**

```json
{
  "announcements": [
    {
      "header": "SRE Season 12 starts Friday",
      "timestamp": "2025-11-19T18:00:00Z",
      "summary": "Optional short blurb",
      "url": "https://discord.com/channels/..."
    }
  ]
}
```

**Field notes:**

| Field | Type | Description |
|---|---|---|
| `header` | string | Announcement title / subject line |
| `timestamp` | string | ISO 8601 datetime — used to render month + day |
| `summary` | string (optional) | Short description — currently unused in rendering |
| `url` | string (optional) | Direct Discord message link — shown as "Open in Discord" |

**Rendering:** shows up to 4 items. First item gets badge `"Briefing"`, rest
get `"Discord"`. If the array is empty or the request fails, shows a
"check Discord directly" message — no fallback data.

---

### 3. `GET /api/squadron-battle-log?limit=50&tag=WTPPW`

**Used by:** `index.html` (last 5 results mini-log), `battles.html` (full list)

**Response shape:**

```json
{
  "recentReplays": [
    {
      "mapName": "Sinai",
      "leftLabel": "WTPPW",
      "rightLabel": "VRTX",
      "leftScore": 4500,
      "rightScore": 3120,
      "winnerSide": "left",
      "playerCount": 16,
      "gameMode": "Ground RB",
      "battleDate": "2025-11-19T18:22:00Z"
    }
  ]
}
```

**Field notes:**

| Field | Type | Description |
|---|---|---|
| `mapName` | string | Map display name |
| `leftLabel` | string | WTPPW's side label (used by `index.html` to filter) |
| `rightLabel` | string | Opponent squadron tag |
| `leftScore` | number | PPW team score |
| `rightScore` | number | Opponent score |
| `winnerSide` | string | `"left"` = PPW win, `"right"` = PPW loss, anything else = draw |
| `playerCount` | number | Total players in match |
| `gameMode` | string | e.g. `"Ground RB"`, `"Air SB"`, `"SQB"` |
| `battleDate` | string | ISO 8601 datetime |

**Alternative field names the frontend also accepts:**

- `battles` or `replays` → top-level array key instead of `recentReplays`
- `map` → `mapName`
- `opp` → `rightLabel`
- `ls` → `leftScore`
- `rs` → `rightScore`
- `result: "win"/"loss"/"tie"` → instead of `winnerSide`
- `mode` → `gameMode`
- `when` → `battleDate`
- `players` → `playerCount`

**`index.html` extra behaviour:** filters replays where
`leftLabel.toLowerCase()` contains `"wtppw"` or `"premium players worldwide"`.
Win rate stat is computed from `winnerSide === "left"` across returned records.

If empty or request fails, shows "No battles recorded yet" — no fallback data.

---

### 4. `GET /api/elo-leaderboard?role=air&page=1&limit=100`
### `GET /api/elo-leaderboard?role=ground&page=1&limit=100`

**Used by:** `elo.html` — both fetched in parallel

**Query params:**

| Param | Values | Description |
|---|---|---|
| `role` | `air`, `ground` | Which leaderboard to return |
| `page` | integer ≥ 1 | Page number (website always requests page 1) |
| `limit` | integer | Max results — website requests 100 |

**Response shape:**

```json
{
  "players": [
    {
      "player_name": "Rainbowcastle25",
      "elo": 1842,
      "wins": 142,
      "losses": 58,
      "draws": 0,
      "matches_played": 204,
      "peak_elo": 1879,
      "kd": 2.84,
      "kps": 3.1
    }
  ]
}
```

**Field notes:**

| Field | Type | Description |
|---|---|---|
| `player_name` | string | In-game username |
| `elo` | number | Current ELO rating |
| `wins` | number | Wins this season |
| `losses` | number | Losses this season |
| `draws` | number | Draws (can be omitted, defaults to 0) |
| `matches_played` | number | Total matches — used for provisional flag (< 15 = provisional) |
| `peak_elo` | number (optional) | Season peak ELO — if absent, uses current ELO |
| `kd` | number (optional) | Kill/death ratio — shown as "—" if absent |
| `kps` | number (optional) | Kills per spawn — shown as "—" if absent |

**Alternative field names accepted:**

- `name` → `player_name`
- `w` → `wins`
- `l` → `losses`
- `d` → `draws`
- `gp` → `matches_played`
- `peak` → `peak_elo`
- `rating` → `elo`
- Top-level array instead of `{ players: [] }` also accepted

**Rendering:** sorted descending by `elo` client-side. Players with
`matches_played < 15` display a `~PROV` badge. The "Squadrons" tab is not yet
backed by API — it shows an empty state until a squadron-vs-squadron endpoint
is added (see below).

If the request fails or returns no data, the leaderboard shows an error
message — no fallback data.

---

### 5. `GET /api/top-20-leaderboard`

**Used by:** `tournaments.html`

**Optional query param:** `?season=2026-S2` (website sends none — defaults to current season)

**Response shape:**

```json
{
  "top20": [
    {
      "player_name": "Rainbowcastle25",
      "points": 2840
    }
  ]
}
```

**Field notes:**

| Field | Type | Description |
|---|---|---|
| `player_name` | string | In-game username |
| `points` | number | SRE season score |

**Alternative field names accepted:**

- `name` → `player_name`
- `score` → `points`
- `players` or `leaderboard` → top-level array key instead of `top20`

**Rendering:** top 3 get gold styling + rank prefix `★ 01`, `▲ 02`, `● 03`.
Rest show `#04`, `#05`, etc. If empty or request fails, shows "No data
available yet" — no fallback data.

---

## Endpoints not yet implemented (planned)

### `GET /api/elo-leaderboard?role=squadrons`

The ELO page has a "Squadrons" theatre tab that is currently empty because no
squadron-vs-squadron endpoint exists. When implemented, the expected shape is:

```json
{
  "players": [
    {
      "name": "WTPPW",
      "full": "Premium Players Worldwide",
      "elo": 1782,
      "wins": 142,
      "losses": 58,
      "draws": 4,
      "matches_played": 204,
      "peak_elo": 1810
    }
  ]
}
```

Add `?role=squadrons` support to the existing `/api/elo-leaderboard` handler.
The `full` field is the long squadron name displayed in the podium and table.

---

## Error handling summary

The website shows an empty/error state for every endpoint — it never falls
back to hardcoded data. Design your API to:

- Return `200` with an empty array rather than a non-2xx status for "no data"
  cases (e.g. no announcements this week).
- Return proper `4xx`/`5xx` for actual errors — the website logs them to
  console and shows a user-facing "unavailable" message.
- Include CORS headers allowing `https://ppw.ensignenterprises.com` (and
  `localhost` for local dev).

---

## CORS requirement

```
Access-Control-Allow-Origin: https://ppw.ensignenterprises.com
Access-Control-Allow-Headers: X-API-Key, Content-Type
Access-Control-Allow-Methods: GET, OPTIONS
```

The `OPTIONS` preflight must return `200` for all above endpoints.
