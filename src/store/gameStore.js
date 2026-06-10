import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { ROOKIE_SCALE, VETERAN_MINIMUM } from '../data/constants.js';
import { TEAMS } from '../data/teams.js';

// Inline gaussian + clamp so the store has no circular engine dependency.
function _gaussian(mean, std) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * std;
}
function _clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

function createPlayer(data) {
  return {
    ...data,
    age: 18,
    college: null,
    collegeStats: [],
    draftPick: null,
    team: null,
    contractSalary: 0,
    contractYearsLeft: 0,
    totalEarnings: 0,
    nbaSeasons: [],
    awards: [],
    championships: 0,
    allStarSelections: 0,
    currentSeasonSimmed: false,
    careerHighs: {
      pts: 0, reb: 0, ast: 0, stl: 0, blk: 0,
      ptsAvg: 0, rebAvg: 0, astAvg: 0, stlAvg: 0, blkAvg: 0,
    },
    playerFocus: 'balanced', // 'balanced'|'scoring'|'playmaking'|'defense'|'rebounding'
    gamesPlayedThisSeason: 0,
    currentSeasonGameLog: [],
    coachTrust: 50,
    chemistry: 60,
    fanApproval: 50,
    brand: 20,
    injury: null,
    isRetired: false,
    legacy: null,
    nbaSeasonsPlayed: 0,
    careerPts: 0,
    careerReb: 0,
    careerAst: 0,
    careerGames: 0,
    careerStl: 0,
    careerBlk: 0,
    personalityRep: 50,
  };
}

export const useGameStore = create(
  persist(
    immer((set, get) => ({
      screen: 'MAIN_MENU',
      player: null,
      league: null,
      seasonResults: null,
      pendingEvent: null,
      newsItems: [],
      saves: [null, null, null],
      playoffState: null,
      currentGameEntry: null,
      tradeLog: [],
      recentGameResults: [],  // last N individual game results for box score viewing
      // Runtime team strengths — seeded from TEAMS on new-game start and drifted
      // each offseason. Older saves without this field default to TEAMS strengths.
      teamStrengths: null,

      goTo: (screen) => set(s => { s.screen = screen; }),

      startNewGame: (playerData) => set(s => {
        s.player = createPlayer(playerData);
        s.league = null;
        s.seasonResults = null;
        s.pendingEvent = null;
        s.newsItems = [];
        // Seed runtime team strengths from the TEAMS constant
        s.teamStrengths = Object.fromEntries(TEAMS.map(t => [t.id, t.strength]));
        s.screen = 'COLLEGE';
      }),

      chooseCollege: (college) => set(s => {
        s.player.college = college;
      }),

      finishCollegeSeason: (stats) => set(s => {
        s.player.collegeStats.push(stats);
        s.player.age++;
        if (stats.attrGains) {
          for (const [attr, delta] of Object.entries(stats.attrGains)) {
            const cur = s.player.attributes[attr] ?? 50;
            const pot = s.player.potential[attr] ?? 99;
            s.player.attributes[attr] = Math.min(pot, Math.round(cur + delta));
          }
        }
      }),

      setDraftResult: (pick, teamId, salary) => set(s => {
        s.player.draftPick = pick;
        s.player.team = teamId;
        s.player.contractSalary = salary;
        s.player.contractYearsLeft = pick <= 30 ? 4 : 2;
      }),

      setLeague: (league) => set(s => { s.league = league; }),

      finishSeason: (results) => set(s => {
        const ps = results.playerSeason;
        s.player.nbaSeasons.push(ps);
        s.player.nbaSeasonsPlayed++;
        s.player.currentSeasonSimmed = true;
        s.player.careerPts += ps.totals.pts;
        s.player.careerReb += ps.totals.reb;
        s.player.careerAst += ps.totals.ast;
        s.player.careerGames += ps.gamesPlayed;
        s.player.careerStl = (s.player.careerStl || 0) + ps.totals.stl;
        s.player.careerBlk = (s.player.careerBlk || 0) + ps.totals.blk;
        s.player.totalEarnings += s.player.contractSalary;
        s.player.contractYearsLeft = Math.max(0, s.player.contractYearsLeft - 1);

        const pts = ps.averages.pts;
        const roleExpected = { franchise: 24, star: 18, starter: 12, sixthman: 9, rotation: 7, bench: 5 };
        const expected = roleExpected[ps.role] ?? 10;
        const diff = pts - expected;
        s.player.coachTrust  = Math.round(Math.min(100, Math.max(0, s.player.coachTrust  + diff * 0.5 + 2)));
        s.player.fanApproval = Math.round(Math.min(100, Math.max(0, s.player.fanApproval + diff * 0.3 + (ps.awards?.length || 0) * 4)));
        s.player.brand       = Math.round(Math.min(100, Math.max(0, s.player.brand       + diff * 0.2 + (ps.awards?.length || 0) * 2)));

        if (ps.awards) {
          ps.awards.forEach(a => {
            s.player.awards.push(`${a} (${results.season}–${results.season + 1})`);
          });
          if (ps.awards.some(a => a.includes('Championship'))) s.player.championships++;
          if (ps.awards.some(a => a === 'All-Star')) s.player.allStarSelections++;
        }

        // Update career highs — single-game
        if (ps.seasonHighs) {
          const ch = s.player.careerHighs;
          ch.pts  = Math.max(ch.pts ?? 0,  ps.seasonHighs.pts ?? 0);
          ch.reb  = Math.max(ch.reb ?? 0,  ps.seasonHighs.reb ?? 0);
          ch.ast  = Math.max(ch.ast ?? 0,  ps.seasonHighs.ast ?? 0);
          ch.stl  = Math.max(ch.stl ?? 0,  ps.seasonHighs.stl ?? 0);
          ch.blk  = Math.max(ch.blk ?? 0,  ps.seasonHighs.blk ?? 0);
        }
        // Update career highs — single-season averages
        const ch = s.player.careerHighs;
        const a  = ps.averages;
        ch.ptsAvg = Math.max(ch.ptsAvg ?? 0, a.pts ?? 0);
        ch.rebAvg = Math.max(ch.rebAvg ?? 0, a.reb ?? 0);
        ch.astAvg = Math.max(ch.astAvg ?? 0, a.ast ?? 0);
        ch.stlAvg = Math.max(ch.stlAvg ?? 0, a.stl ?? 0);
        ch.blkAvg = Math.max(ch.blkAvg ?? 0, a.blk ?? 0);

        s.seasonResults = results;
        // Merge league player stats and standings into league state
        s.league = {
          ...(results.league ?? {}),
          playerStats: [
            ...((s.league?.playerStats ?? []).filter(e => e.season !== results.season)),
            { season: results.season, players: results.leaguePlayerStats ?? [] },
          ],
        };
      }),

      setPendingEvent: (ev) => set(s => { s.pendingEvent = ev; }),

      resolveEvent: (choiceIdx) => set(s => {
        if (!s.pendingEvent) return;
        const choice = s.pendingEvent.choices[choiceIdx];
        if (choice.effects) {
          const p = s.player;
          const e = choice.effects;
          if (e.coachTrust != null) p.coachTrust = Math.min(100, Math.max(0, p.coachTrust + e.coachTrust));
          if (e.chemistry != null) p.chemistry = Math.min(100, Math.max(0, p.chemistry + e.chemistry));
          if (e.brand != null) p.brand = Math.min(100, Math.max(0, p.brand + e.brand));
          if (e.fanApproval != null) p.fanApproval = Math.min(100, Math.max(0, p.fanApproval + e.fanApproval));
          if (e.personalityRep != null) p.personalityRep = Math.min(100, Math.max(0, p.personalityRep + e.personalityRep));
          if (e.attributes) {
            for (const [attr, delta] of Object.entries(e.attributes)) {
              p.attributes[attr] = Math.min(99, Math.max(25, (p.attributes[attr] ?? 50) + delta));
            }
          }
          if (e.earnings) p.totalEarnings += e.earnings;
        }
        s.pendingEvent = null;
      }),

      addNews: (item) => set(s => {
        s.newsItems.unshift({ ...item, id: Date.now() + Math.random() });
        if (s.newsItems.length > 80) s.newsItems.pop();
      }),

      applyOffseasonProgression: (newAttrs) => set(s => {
        s.player.attributes = newAttrs;
        s.player.age++;
        s.player.currentSeasonSimmed = false;

        // Drift every team's strength by a bounded random walk each offseason.
        // ±gaussian(0, 2.5), clamped 45–96, with 10% mean-reversion toward original
        // so teams don't permanently run away. Young teams (youth > 60) get a +0.5 nudge.
        const cur = s.teamStrengths ?? Object.fromEntries(TEAMS.map(t => [t.id, t.strength]));
        const next = {};
        TEAMS.forEach(t => {
          const strength = cur[t.id] ?? t.strength;
          const drift    = _gaussian(0, 2.5);
          const revert   = (t.strength - strength) * 0.10; // mild pull toward baseline
          const youthNudge = (t.youth ?? 50) > 60 ? 0.5 : 0;
          next[t.id] = _clamp(Math.round(strength + drift + revert + youthNudge), 45, 96);
        });
        s.teamStrengths = next;
      }),

      applyInjury: (injury) => set(s => {
        s.player.injury = injury;
        if (injury?.severeEffect) {
          for (const [attr, delta] of Object.entries(injury.severeEffect)) {
            s.player.attributes[attr] = Math.max(25, (s.player.attributes[attr] ?? 50) + delta);
          }
        }
      }),

      clearInjury: () => set(s => { s.player.injury = null; }),

      signContract: (teamId, salary, years) => set(s => {
        const changed = s.player.team !== teamId;
        s.player.team = teamId;
        s.player.contractSalary = salary;
        s.player.contractYearsLeft = years;
        if (changed) {
          s.player.coachTrust = 45;
          s.player.chemistry = 50;
        }
      }),

      retire: (legacy) => set(s => {
        s.player.isRetired = true;
        s.player.legacy = legacy;
        s.screen = 'RETIREMENT';
      }),

      saveToSlot: (slot, label) => set(s => {
        s.saves[slot] = {
          label: label || `Season ${s.player?.nbaSeasonsPlayed ?? 0}`,
          timestamp: Date.now(),
          playerName: s.player?.name ?? '',
          teamId: s.player?.team ?? '',
          seasonsPlayed: s.player?.nbaSeasonsPlayed ?? 0,
          snapshot: JSON.stringify({
            screen: s.screen,
            player: s.player,
            league: s.league,
            seasonResults: s.seasonResults,
            newsItems: s.newsItems,
            teamStrengths: s.teamStrengths ?? null,
          }),
        };
      }),

      loadFromSlot: (slot) => set(s => {
        const save = s.saves[slot];
        if (!save) return;
        const snap = JSON.parse(save.snapshot);
        s.screen = snap.screen;
        s.player = snap.player;
        s.league = snap.league;
        s.seasonResults = snap.seasonResults;
        s.newsItems = snap.newsItems;
        // Older saves without teamStrengths default gracefully to null (TEAMS strengths used as fallback)
        s.teamStrengths = snap.teamStrengths ?? null;
        s.pendingEvent = null;
      }),

      exportSave: () => {
        const st = get();
        return JSON.stringify({
          screen: st.screen,
          player: st.player,
          league: st.league,
          seasonResults: st.seasonResults,
          newsItems: st.newsItems,
          saves: st.saves,
          teamStrengths: st.teamStrengths ?? null,
        }, null, 2);
      },

      importSave: (json) => set(s => {
        const data = JSON.parse(json);
        s.screen = data.screen ?? 'MAIN_MENU';
        s.player = data.player ?? null;
        s.league = data.league ?? null;
        s.seasonResults = data.seasonResults ?? null;
        s.newsItems = data.newsItems ?? [];
        if (data.saves) s.saves = data.saves;
        // Older exports without teamStrengths fall back gracefully
        s.teamStrengths = data.teamStrengths ?? null;
        s.pendingEvent = null;
      }),

      setPlayerFocus: (focus) => set(s => { s.player.playerFocus = focus; }),

      addTradeToLog: (trade) => set(s => {
        if (!s.tradeLog) s.tradeLog = [];
        s.tradeLog.push({ ...trade, season: s.player?.nbaSeasonsPlayed ?? 0 });
      }),
      clearTradeLog: () => set(s => { s.tradeLog = []; }),

      addGameToLog: (gameLine) => set(s => {
        if (!s.player.currentSeasonGameLog) s.player.currentSeasonGameLog = [];
        s.player.currentSeasonGameLog.push(gameLine);
        s.player.gamesPlayedThisSeason = (s.player.gamesPlayedThisSeason ?? 0) + 1;
      }),

      addRecentGameResult: (result) => set(s => {
        if (!s.recentGameResults) s.recentGameResults = [];
        s.recentGameResults.unshift(result);
        if (s.recentGameResults.length > 10) s.recentGameResults.pop();
      }),

      clearSeasonGameLog: () => set(s => {
        s.player.currentSeasonGameLog = [];
        s.player.gamesPlayedThisSeason = 0;
        s.recentGameResults = [];
      }),

      requestTrade: () => set(s => {
        s.player.coachTrust = Math.max(0, s.player.coachTrust - 12);
        s.player.chemistry  = Math.max(0, s.player.chemistry  - 8);
        s.player.personalityRep = Math.max(0, s.player.personalityRep - 5);
      }),

      requestMoreMinutes: (granted) => set(s => {
        if (granted) {
          s.player.coachTrust = Math.min(100, s.player.coachTrust + 5);
        } else {
          s.player.coachTrust = Math.max(0, s.player.coachTrust - 3);
        }
      }),

      setPlayoffState: (ps) => set(s => { s.playoffState = ps; }),
      clearPlayoffState: () => set(s => { s.playoffState = null; }),

      resetGame: () => set(s => {
        s.screen = 'MAIN_MENU';
        s.player = null;
        s.league = null;
        s.seasonResults = null;
        s.pendingEvent = null;
        s.newsItems = [];
        s.playoffState = null;
        s.teamStrengths = null;
      }),
    })),
    {
      name: 'hoops-career-mode-v1',
      // Always boot to Main Menu regardless of where the player was when they closed the tab.
      // The active game state (player, league, etc.) is restored, but they choose to continue
      // from the Main Menu rather than being dropped mid-game unexpectedly.
      onRehydrateStorage: () => (state) => {
        if (state) state.screen = 'MAIN_MENU';
      },
    }
  )
);
