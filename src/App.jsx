import React from 'react';
import { useGameStore } from './store/gameStore.js';
import MainMenu from './screens/MainMenu.jsx';
import CharCreation from './screens/CharCreation.jsx';
import CollegeHub from './screens/CollegeHub.jsx';
import DraftNight from './screens/DraftNight.jsx';
import SeasonDashboard from './screens/SeasonDashboard.jsx';
import OffseasonHub from './screens/OffseasonHub.jsx';
import CareerProfile from './screens/CareerProfile.jsx';
import RetirementScreen from './screens/RetirementScreen.jsx';
import EventModal from './components/EventModal.jsx';

export default function App() {
  const screen = useGameStore(s => s.screen);
  const pendingEvent = useGameStore(s => s.pendingEvent);

  const views = {
    MAIN_MENU: MainMenu,
    CHAR_CREATION: CharCreation,
    COLLEGE: CollegeHub,
    DRAFT: DraftNight,
    SEASON_DASHBOARD: SeasonDashboard,
    OFFSEASON: OffseasonHub,
    CAREER: CareerProfile,
    RETIREMENT: RetirementScreen,
  };

  const View = views[screen] ?? MainMenu;

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <View />
      {pendingEvent && <EventModal />}
    </div>
  );
}
