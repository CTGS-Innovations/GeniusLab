import { useCallback, useEffect, useState } from 'react';
import { Boards } from './components/Boards';
import { Growth } from './components/Growth';
import { Home } from './components/Home';
import { LabView } from './components/LabView';
import { Play, type SessionSpec, type SessionSummary } from './components/Play';
import { Recap } from './components/Recap';
import { Results } from './components/Results';
import { SettingsSheet } from './components/SettingsSheet';
import { skillById } from './data';
import {
  finishSession,
  loadProgress,
  newProgress,
  recordAnswer,
  type Achievement,
} from './engine/progress';
import { useCloud } from './engine/useCloud';
import type { LabId, Question } from './types';

type Screen =
  | { name: 'home' }
  | { name: 'lab'; lab: LabId }
  | { name: 'play'; spec: SessionSpec; run: number }
  | { name: 'recap'; summary: SessionSummary; earned: Achievement[] }
  | { name: 'results'; summary: SessionSummary; earned: Achievement[] }
  | { name: 'boards' }
  | { name: 'growth' };

/** Where a finished or abandoned session sends the student back to. */
const homeFor = (spec: SessionSpec): Screen =>
  spec.type === 'practice' ? { name: 'lab', lab: skillById(spec.skill).lab } : spec.type === 'board' ? { name: 'boards' } : { name: 'home' };

export default function App() {
  const [progress, setProgress] = useState(loadProgress);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [showSettings, setShowSettings] = useState(() => !progress.settings.onboarded);
  const cloud = useCloud(progress, setProgress);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen.name]);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = progress.settings.theme;
    root.classList.toggle('reduce-motion', progress.settings.motion === 'reduced');
  }, [progress.settings.theme, progress.settings.motion]);

  const play = (spec: SessionSpec) => setScreen({ name: 'play', spec, run: Date.now() });

  const onAnswer = useCallback((q: Question, correct: boolean, timeLeft: number) => {
    setProgress((p) => recordAnswer(p, q, correct, timeLeft));
  }, []);

  const onFinish = useCallback(
    (summary: SessionSummary) => {
      const { spec, log, points, bestStreak } = summary;
      const correctTimes = log.filter((a) => a.correct).map((a) => a.seconds);
      const { progress: next, earned } = finishSession(
        progress,
        {
          at: new Date().toISOString(),
          type: spec.type,
          lab: spec.type === 'practice' ? skillById(spec.skill).lab : spec.type === 'board' ? 'all' : spec.lab,
          skill: spec.type === 'practice' ? spec.skill : null,
          correct: log.filter((a) => a.correct).length,
          total: log.length,
          points,
          bestStreak,
        },
        { fastestCorrect: correctTimes.length ? Math.min(...correctTimes) : null },
      );
      setProgress(next);
      const showRecap = next.settings.recap && log.length > 0;
      setScreen(showRecap ? { name: 'recap', summary, earned } : { name: 'results', summary, earned });
    },
    [progress],
  );

  const closeSettings = () => {
    setShowSettings(false);
    if (!progress.settings.onboarded) setProgress((p) => ({ ...p, settings: { ...p.settings, onboarded: true } }));
  };

  return (
    <>
      {renderScreen()}
      {showSettings && (
        <SettingsSheet
          welcome={!progress.settings.onboarded}
          settings={progress.settings}
          onChange={(settings) => setProgress((p) => ({ ...p, settings }))}
          progress={progress}
          onImport={setProgress}
          cloud={cloud}
          onClose={closeSettings}
        />
      )}
    </>
  );

  function renderScreen() {
    switch (screen.name) {
      case 'home':
        return (
          <Home
            progress={progress}
            onOpenLab={(lab) => setScreen({ name: 'lab', lab })}
            onLightning={(lab) => play({ type: 'lightning', lab })}
            onSwipe={(lab) => play({ type: 'swipe', lab })}
            onPrep={(lab) => play({ type: 'prep', lab })}
            onPractice={(skill) => play({ type: 'practice', skill })}
            onBoards={() => setScreen({ name: 'boards' })}
            onGrowth={() => setScreen({ name: 'growth' })}
            onSettings={() => setShowSettings(true)}
          />
        );
      case 'lab':
        return (
          <LabView
            lab={screen.lab}
            progress={progress}
            onPractice={(skill) => play({ type: 'practice', skill })}
            onBack={() => setScreen({ name: 'home' })}
          />
        );
      case 'play':
        return (
          <Play
            key={screen.run}
            spec={screen.spec}
            progress={progress}
            onAnswer={onAnswer}
            onProgress={setProgress}
            onFinish={onFinish}
            onQuit={() => setScreen(homeFor(screen.spec))}
          />
        );
      case 'recap':
        return (
          <Recap
            summary={screen.summary}
            progress={progress}
            earned={screen.earned}
            onDone={() => setScreen({ name: 'results', summary: screen.summary, earned: screen.earned })}
          />
        );
      case 'results': {
        const spec = screen.summary.spec;
        return (
          <Results
            summary={screen.summary}
            progress={progress}
            earned={screen.earned}
            onPractice={(skill) => play({ type: 'practice', skill })}
            onAgain={() => play(spec)}
            onDone={() => setScreen(homeFor(spec))}
          />
        );
      }
      case 'boards':
        return (
          <Boards
            progress={progress}
            onProgress={setProgress}
            onPlay={(board) => play({ type: 'board', board })}
            onBack={() => setScreen({ name: 'home' })}
          />
        );
      case 'growth':
        return (
          <Growth
            progress={progress}
            onBack={() => setScreen({ name: 'home' })}
            onReset={() => {
              setProgress(newProgress());
              setScreen({ name: 'home' });
            }}
          />
        );
    }
  }
}
