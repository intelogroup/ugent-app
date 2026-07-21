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
            hasSelectedAnswer: false,
            currentQuestionCorrect: null,
            correctSoFar: 1,
            totalAnsweredSoFar: 2,
            questionText: 'A 45-year-old man presents with chest pain.',
            optionTexts: ['MI', 'GERD'],
            selectedOptionText: null,
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
  it.each([
    { desc: 'no selection', hasSelected: false, correct: null },
    { desc: 'selected not submitted', hasSelected: true, correct: null },
    { desc: 'submitted correct', hasSelected: true, correct: true },
    { desc: 'submitted wrong', hasSelected: true, correct: false },
  ])('builds snapshot — $desc', ({ hasSelected, correct }) => {
    const snapshot = buildQuizSnapshot(
      {
        subject: 'Cardiovascular',
        system: 'Cardiovascular',
        difficulty: 'medium',
        text: 'A 45-year-old man presents with chest pain.',
        options: [{ text: 'MI' }, { text: 'GERD' }],
      },
      3,
      20,
      correct !== null,
      hasSelected,
      correct ?? null,
      1,
      2,
      hasSelected ? 0 : null
    );
    expect(snapshot).toEqual<ActivitySnapshot>({
      page: 'quiz',
      questionNumber: 3,
      totalQuestions: 20,
      subject: 'Cardiovascular',
      system: 'Cardiovascular',
      difficulty: 'medium',
      isAnswered: correct !== null,
      hasSelectedAnswer: hasSelected,
      currentQuestionCorrect: correct ?? null,
      correctSoFar: 1,
      totalAnsweredSoFar: 2,
      questionText: 'A 45-year-old man presents with chest pain.',
      optionTexts: ['MI', 'GERD'],
      selectedOptionText: hasSelected ? 'MI' : null,
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
      hasSelectedAnswer: false,
      currentQuestionCorrect: null,
      correctSoFar: 1,
      totalAnsweredSoFar: 2,
      questionText: 'A 45-year-old man presents with chest pain.',
      optionTexts: ['MI', 'GERD'],
      selectedOptionText: null,
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
      hasSelectedAnswer: false,
      currentQuestionCorrect: null,
      correctSoFar: 0,
      totalAnsweredSoFar: 0,
      questionText: 'A patient presents with fatigue.',
      optionTexts: ['A', 'B'],
      selectedOptionText: null,
    };
    expect(buildWatchReply(base, activity)).not.toContain('()');
  });
});
