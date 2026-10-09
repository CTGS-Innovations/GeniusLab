import { useCallback, useEffect, useState } from 'react';
import { Growth } from './components/Growth';
import { Home } from './components/Home';
import { LabView } from './components/LabView';
import { Play, type SessionSpec, type SessionSummary } from './components/Play';
import { Results } from './components/Results';
import { skillById } from './data';
import {
  finishSession,
  loadProgress,
  newProgress,
  recordAnswer,
  saveProgress,
  type Achievement,
} from './engine/progress';
import type { LabId, Question } from './types';

type Screen =
  | { name: 'home' }
  | { name: 'lab'; lab: LabId }
  | { name: 'play'; spec: SessionSpec; run: number }
  | { name: 'results'; summary: SessionSummary; earned: Achievement[] }
  | { name: 'growth' };

export default function App() {
  const [progress, setProgress] = useState(loadProgress);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  useEffect(() => saveProgress(progress), [progress]);
  useEffect(() => window.scrollTo(0, 0), [screen.name]);

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
          lab: spec.type === 'practice' ? skillById(spec.skill).lab : spec.lab,
          skill: spec.type === 'practice' ? spec.skill : null,
          correct: log.filter((a) => a.correct).length,
          total: log.length,
          points,
          bestStreak,
        },
        { fastestCorrect: correctTimes.length ? Math.min(...correctTimes) : null },
      );
      setProgress(next);
      setScreen({ name: 'results', summary, earned });
    },
    [progress],
  );

  switch (screen.name) {
    case 'home':
      return (
        <Home
          progress={progress}
          onOpenLab={(lab) => setScreen({ name: 'lab', lab })}
          onLightning={(lab) => play({ type: 'lightning', lab })}
          onGrowth={() => setScreen({ name: 'growth' })}
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
    case 'play': {
      const spec = screen.spec;
      const exit = () => setScreen(spec.type === 'practice' ? { name: 'lab', lab: skillById(spec.skill).lab } : { name: 'home' });
      return <Play key={screen.run} spec={spec} progress={progress} onAnswer={onAnswer} onFinish={onFinish} onQuit={exit} />;
    }
    case 'results': {
      const spec = screen.summary.spec;
      return (
        <Results
          summary={screen.summary}
          progress={progress}
          earned={screen.earned}
          onPractice={(skill) => play({ type: 'practice', skill })}
          onAgain={() => play(spec)}
          onDone={() => setScreen(spec.type === 'practice' ? { name: 'lab', lab: skillById(spec.skill).lab } : { name: 'home' })}
        />
      );
    }
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
