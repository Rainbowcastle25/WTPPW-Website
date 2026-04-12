# WTPPW-Website

Static website for the **WTPPW** War Thunder squadron, hosted via GitHub Pages.

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
4. Click **Save**. Your site will be live at `https://<your-username>.github.io/WTPPW-Website/`.

## Updating the Roster

Edit `members.html` and add rows to the `<tbody>` of the members table. Use the existing row for `Rainbowcastle25` as a template. Rank badge classes are:

- `rank-commander` — Commander
- `rank-officer` — Officer
- `rank-sergeant` — Sergeant
- `rank-private` — Private
