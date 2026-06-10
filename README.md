# Hoops: Career Mode

A text-and-stats basketball career simulator. Create a prospect, play through college, get drafted into the real NBA, and live out up to 20 seasons — handling development, injuries, contracts, trades, awards, and a final Hall of Fame verdict.

Runs entirely client-side. No backend. Saves to `localStorage`.

---

## Running the game

```bash
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.

To build for production:

```bash
npm run build
npm run preview
```

---

## Game flow

```
Main Menu → Character Creation → College (1–4 seasons) → NBA Draft
         → NBA Career (up to 20 seasons) → Offseason → Retirement
```

- **Character creation**: Choose name, position, archetype, and physical attributes. 230 extra points to customise on top of your archetype's defaults.
- **College**: Pick a school (prestige/playing time/development trade-off). Sim seasons, watch your draft stock climb, then declare.
- **NBA Draft**: Live lottery animation, draft board, landing-spot reveal.
- **Season dashboard**: Sim the full 82-game season in one click. View your stats, standings, league leaderboards, and news.
- **Offseason**: Choose a training focus (1–2 attributes grow toward their ceiling), pick a lifestyle, handle free agency if your contract expires.
- **Retirement**: Legacy score, Hall of Fame verdict, auto-generated career obituary.

---

## Where the tuning constants live

| File | What it controls |
|---|---|
| `src/data/constants.js` | `CREATION_POINTS`, `ATTR_MIN/MAX`, `AGING_CURVE`, `DECLINE_PRIORITY`, position weights, salary cap, rookie scale |
| `src/engine/seasonEngine.js` | `ROLE_BASE_PPG/REB/AST`, `ROLE_FLOOR/CEIL_PPG`, role-determination thresholds, award thresholds |
| `src/data/archetypes.js` | Archetype starting attributes, growth boosts, bonus/penalty attrs |
| `src/data/events.js` | Event pool, event weights, choice consequences |
| `src/engine/legacyEngine.js` | Legacy score point values, Hall of Fame verdict thresholds |

### Key constants to tweak

**Tune how many All-Stars / All-NBA players the pool produces:**
```js
// src/engine/seasonEngine.js → determineAwards()
// Awards are now rank-based — change the rank bucket sizes (e.g. top 24 → top 28 for All-Star)
if (allStarRank >= 0 && allStarRank < 24) awards.push('All-Star');
```

**Player scoring ceiling:**
```js
// src/engine/seasonEngine.js → simGameLine()
const ROLE_CEIL_PPG = { franchise: 42, star: 32, ... };
```

**How fast players decline:**
```js
// src/data/constants.js
export const AGING_CURVE = { ..., 35: -1.4, 36: -1.8, ... };
```

**Salary cap:**
```js
// src/data/constants.js
export const SALARY_CAP = 140_000_000;
```

---

## Save system

- **3 save slots** — click **Save** in the top nav at any time to overwrite slot 0, or use the Main Menu to pick a slot.
- **Export / Import** — download your save as JSON, reload it on any browser.
- The active game is also auto-persisted to `localStorage` (`hoops-career-mode-v1`) so a page refresh never loses progress.

---

## Tech stack

React 18 · Vite · Tailwind CSS · Zustand (with Immer + persist) · plain JavaScript

---

## Licensing note

Team names, city names, and arena names are real NBA properties used here for a personal project. If you ever publish this publicly, replace real NBA team names with fictional ones or obtain a licence.
