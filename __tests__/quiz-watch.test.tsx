import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WatchProvider, useWatch } from '@/lib/watch-context';
import { QuizContent } from '@/app/quiz/page';

jest.mock('@/components/DashboardLayout', () => ({
  __esModule: true,
  default: ({ children }: any) => children,
}));

const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams('subject=Cardiovascular&limit=2');

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

const sampleQuestions = [
  {
    id: 'q1',
    text: 'What is the most common cause of X?',
    options: [
      { text: 'Option One', isCorrect: false },
      { text: 'Option Two', isCorrect: true },
    ],
    correctAnswer: 'Option Two',
    explanation: 'Because Option Two.',
    subject: 'Cardiovascular',
    system: 'Cardiovascular',
    difficulty: 'medium',
  },
  {
    id: 'q2',
    text: 'What is the most common cause of Y?',
    options: [
      { text: 'Choice One', isCorrect: true },
      { text: 'Choice Two', isCorrect: false },
    ],
    correctAnswer: 'Choice One',
    explanation: 'Because Choice One.',
    subject: 'Cardiovascular',
    system: 'Cardiovascular',
    difficulty: 'easy',
  },
];

function ActivityReadout() {
  const { activity, toggleWatch } = useWatch();
  return (
    <div>
      <button onClick={toggleWatch}>toggle-watch</button>
      <p data-testid="watch-activity">
        {activity ? `${activity.questionNumber}/${activity.totalQuestions}:${activity.correctSoFar}` : 'none'}
      </p>
    </div>
  );
}

describe('Quiz page Watch integration', () => {
  beforeEach(() => {
    mockPush.mockClear();
    window.localStorage.clear();
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ questions: sampleQuestions }),
    }) as jest.Mock;
  });

  it('does not publish activity while Watch is off', async () => {
    render(
      <WatchProvider>
        <ActivityReadout />
        <QuizContent />
      </WatchProvider>
    );
    await screen.findByText('What is the most common cause of X?');
    expect(screen.getByTestId('watch-activity')).toHaveTextContent('none');
  });

  it('publishes the current question snapshot while Watch is on, and updates it as the quiz progresses', async () => {
    render(
      <WatchProvider>
        <ActivityReadout />
        <QuizContent />
      </WatchProvider>
    );
    fireEvent.click(screen.getByText('toggle-watch'));

    await screen.findByText('What is the most common cause of X?');
    await waitFor(() => expect(screen.getByTestId('watch-activity')).toHaveTextContent('1/2:0'));

    fireEvent.click(screen.getByText('Option Two'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit Answer' }));
    expect(screen.getByTestId('watch-activity')).toHaveTextContent('1/2:1');

    fireEvent.click(screen.getByRole('button', { name: /Next Question/ }));
    await waitFor(() => expect(screen.getByTestId('watch-activity')).toHaveTextContent('2/2:1'));
  });

  it('clears activity when Watch is turned off mid-quiz', async () => {
    render(
      <WatchProvider>
        <ActivityReadout />
        <QuizContent />
      </WatchProvider>
    );
    fireEvent.click(screen.getByText('toggle-watch'));
    await screen.findByText('What is the most common cause of X?');
    await waitFor(() => expect(screen.getByTestId('watch-activity')).not.toHaveTextContent('none'));

    fireEvent.click(screen.getByText('toggle-watch'));
    expect(screen.getByTestId('watch-activity')).toHaveTextContent('none');
  });

  it('clears activity on unmount (e.g. leaving the quiz)', async () => {
    const { unmount } = render(
      <WatchProvider>
        <ActivityReadout />
        <QuizContent />
      </WatchProvider>
    );
    fireEvent.click(screen.getByText('toggle-watch'));
    await screen.findByText('What is the most common cause of X?');
    await waitFor(() => expect(screen.getByTestId('watch-activity')).not.toHaveTextContent('none'));

    unmount();
  });
});
