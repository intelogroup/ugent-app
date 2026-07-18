import { fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import CleaChat from '@/components/CleaChat';
import { WatchProvider, useWatch, ActivitySnapshot } from '@/lib/watch-context';

describe('CleaChat', () => {
  it('opens from its floating trigger and closes with Escape', () => {
    render(<CleaChat />);

    const trigger = screen.getByRole('button', { name: 'Open Clea study assistant' });
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Clea study assistant' })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Clea study assistant' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Clea study assistant' })).not.toBeInTheDocument();
  });

  it('adds a message and a placeholder reply', () => {
    render(<CleaChat />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Clea study assistant' }));

    const input = screen.getByLabelText('Message Clea');
    fireEvent.change(input, { target: { value: 'Help me review cardiology' } });
    fireEvent.submit(input.closest('form')!);

    expect(screen.getByText('Help me review cardiology')).toBeInTheDocument();
    expect(screen.getByText(/placeholder mode/i)).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('toggles the visual microphone state without requesting audio', () => {
    render(<CleaChat />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Clea study assistant' }));

    const microphone = screen.getByRole('button', { name: 'Start visual microphone' });
    expect(microphone).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(microphone);
    expect(screen.getByRole('button', { name: 'Stop visual microphone' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByPlaceholderText('Listening...')).toBeInTheDocument();
  });

  it('enters and exits the visual Clea Live mode', () => {
    render(<CleaChat />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Clea study assistant' }));

    fireEvent.click(screen.getByRole('button', { name: 'Start Clea Live' }));
    expect(screen.getByRole('dialog', { name: 'Clea Live mode' })).toBeInTheDocument();
    const orb = screen.getByTestId('clea-live-orb');
    expect(orb).toBeInTheDocument();
    expect(orb.querySelectorAll('.clea-orb-current')).toHaveLength(2);
    expect(orb.querySelector('.clea-orb-current--one')).toBeInTheDocument();
    expect(orb.querySelector('.clea-orb-current--two')).toBeInTheDocument();
    expect(orb.querySelector('.clea-orb-ribbon')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Clea Live mode' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Clea study assistant' })).toBeInTheDocument();
  });
});

function ActivityInjector({ activity }: { activity: ActivitySnapshot }) {
  const { setActivity } = useWatch();
  useEffect(() => setActivity(activity), [activity, setActivity]);
  return null;
}

const sampleActivity: ActivitySnapshot = {
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

describe('CleaChat + Watch', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('toggles Watch on and off from the chat header', () => {
    render(
      <WatchProvider>
        <CleaChat />
      </WatchProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open Clea study assistant' }));

    const watchToggle = screen.getByRole('button', { name: 'Turn on Watch' });
    expect(watchToggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(watchToggle);
    expect(screen.getByRole('button', { name: 'Turn off Watch' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows a Watching label when activity is published', () => {
    render(
      <WatchProvider>
        <ActivityInjector activity={sampleActivity} />
        <CleaChat />
      </WatchProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open Clea study assistant' }));
    fireEvent.click(screen.getByRole('button', { name: 'Turn on Watch' }));

    expect(screen.getByText(/Watching: Q3\/20/)).toBeInTheDocument();
    expect(screen.getByText(/Cardiovascular/)).toBeInTheDocument();
  });

  it('contextualizes the placeholder reply when watching', () => {
    render(
      <WatchProvider>
        <ActivityInjector activity={sampleActivity} />
        <CleaChat />
      </WatchProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open Clea study assistant' }));
    fireEvent.click(screen.getByRole('button', { name: 'Turn on Watch' }));

    const input = screen.getByLabelText('Message Clea');
    fireEvent.change(input, { target: { value: 'What should I focus on?' } });
    fireEvent.submit(input.closest('form')!);

    expect(screen.getByText(/question 3 of 20/)).toBeInTheDocument();
  });
});
