import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { ROOKIE_SCALE, VETERAN_MINIMUM } from '../data/constants.js';

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
      // Single-game bests (across all seasons)
      pts: 0, reb: 0, ast: 0, stl: 0, blk: 0,
      // Single-season averages
      ptsAvg: 0, rebAvg: 0, astAvg: 0, stlAvg: 0, blkAvg: 0,
    },
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

      goTo: (screen) => set(s => { s.screen = screen; }),

      startNewGame: (playerData) => set(s => {
        s.player = createPlayer(playerData);
        s.league = null;
        s.seasonResults = null;
        s.pendingEvent = null;
        s.newsItems = [];
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
        s.pendingEvent = null;
      }),

      resetGame: () => set(s => {
        s.screen = 'MAIN_MENU';
        s.player = null;
        s.league = null;
        s.seasonResults = null;
        s.pendingEvent = null;
        s.newsItems = [];
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
