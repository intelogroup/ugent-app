import { render, screen, fireEvent } from '@testing-library/react';
import { useEffect } from 'react';
import { WatchProvider, useWatch, buildQuizSnapshot, buildWatchReply, ActivitySnapshot } from '@/lib/watch-context';

function Consumer() {
  const { watchEnabled, toggleWatch, activity, setActivity } = useWatch();
  return (
    <div>
      <p data-testid="enabled">{String(watchEnabled)}</p>
      <p data-testid="activity">{activity ? `${activity.questionNumber}/${activity.totalQuestions}` : 'none'}</p>
      <button onClick={toggleWatch}>toggle</button>
      <button
        onClick={() =>
          setActivity({
            page: 'quiz',
            questionNumber: 3,
            totalQuestions: 20,
            subject: 'Cardiovascular',
            system: 'Cardiovascular',
            difficulty: 'medium',
            isAnswered: false,
            correctSoFar: 1,
            totalAnsweredSoFar: 2,
          })
        }
      >
        publish
      </button>
    </div>
  );
}

describe('WatchProvider / useWatch', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to disabled with no activity', () => {
    render(
      <WatchProvider>
        <Consumer />
      </WatchProvider>
    );
    expect(screen.getByTestId('enabled')).toHaveTextContent('false');
    expect(screen.getByTestId('activity')).toHaveTextContent('none');
  });

  it('toggles watchEnabled and persists it to localStorage', () => {
    render(
      <WatchProvider>
        <Consumer />
      </WatchProvider>
    );
    fireEvent.click(screen.getByText('toggle'));
    expect(screen.getByTestId('enabled')).toHaveTextContent('true');
    expect(window.localStorage.getItem('clea-watch-enabled')).toBe('true');
  });

  it('hydrates watchEnabled from localStorage on mount', () => {
    window.localStorage.setItem('clea-watch-enabled', 'true');
    render(
      <WatchProvider>
        <Consumer />
      </WatchProvider>
    );
    expect(screen.getByTestId('enabled')).toHaveTextContent('true');
  });

  it('shares published activity with consumers', () => {
    render(
      <WatchProvider>
        <Consumer />
      </WatchProvider>
    );
    fireEvent.click(screen.getByText('publish'));
    expect(screen.getByTestId('activity')).toHaveTextContent('3/20');
  });

  it('useWatch works without a provider (safe no-op defaults)', () => {
    render(<Consumer />);
    expect(screen.getByTestId('enabled')).toHaveTextContent('false');
    expect(screen.getByTestId('activity')).toHaveTextContent('none');
    fireEvent.click(screen.getByText('toggle'));
    expect(screen.getByTestId('enabled')).toHaveTextContent('false');
  });
});

describe('buildQuizSnapshot', () => {
  it('builds a snapshot from question fields and counters', () => {
    const snapshot = buildQuizSnapshot(
      { subject: 'Cardiovascular', system: 'Cardiovascular', difficulty: 'medium' },
      3,
      20,
      false,
      1,
      2
    );
    expect(snapshot).toEqual<ActivitySnapshot>({
      page: 'quiz',
      questionNumber: 3,
      totalQuestions: 20,
      subject: 'Cardiovascular',
      system: 'Cardiovascular',
      difficulty: 'medium',
      isAnswered: false,
      correctSoFar: 1,
      totalAnsweredSoFar: 2,
    });
  });
});

describe('buildWatchReply', () => {
  const base = 'Clea is in placeholder mode for now.';

  it('returns the base reply unchanged when there is no activity', () => {
    expect(buildWatchReply(base, null)).toBe(base);
  });

  it('appends question context when activity is present', () => {
    const activity: ActivitySnapshot = {
      page: 'quiz',
      questionNumber: 3,
      totalQuestions: 20,
      subject: 'Cardiovascular',
      system: 'Cardiovascular',
      difficulty: 'medium',
      isAnswered: false,
      correctSoFar: 1,
      totalAnsweredSoFar: 2,
    };
    const result = buildWatchReply(base, activity);
    expect(result).toContain(base);
    expect(result).toContain('question 3 of 20');
    expect(result).toContain('Cardiovascular');
  });

  it('omits the parenthetical when subject is null', () => {
    const activity: ActivitySnapshot = {
      page: 'quiz',
      questionNumber: 1,
      totalQuestions: 5,
      subject: null,
      system: null,
      difficulty: 'easy',
      isAnswered: false,
      correctSoFar: 0,
      totalAnsweredSoFar: 0,
    };
    expect(buildWatchReply(base, activity)).not.toContain('()');
  });
});
