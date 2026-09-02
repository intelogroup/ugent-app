import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import CleaChat from '@/components/CleaChat';
import { WatchProvider, useWatch, ActivitySnapshot } from '@/lib/watch-context';
import { CleaAgentProvider } from '@/lib/clea-agent-context';

// CleaChat now reads from CleaAgentProvider, which GETs history on mount and
// POSTs new messages — mock fetch so these are pure component tests, not
// integration tests against a real server.
beforeEach(() => {
  window.localStorage.clear();
  // Mock getUserMedia so useWhisperMic's mic acquisition resolves (returns a
  // fake stream) instead of throwing in jsdom where navigator.mediaDevices is
  // absent.  The hook only needs getAudioTracks()[0].label for BT detection.
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: jest.fn().mockResolvedValue({
        getAudioTracks: () => [{ label: 'mock-mic', stop: jest.fn() }],
        getTracks: () => [{ stop: jest.fn() }],
      }),
    },
    configurable: true,
  });
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!init) {
      // GET history-on-mount
      return { ok: true, json: async () => [] } as any;
    }
    // POST — return a response with no body so the component's stream
    // consumption path isn't exercised in these tests (covered separately
    // by clea-agent-context and clea-chat route tests).
    return { ok: true, body: null, json: async () => ({}) } as any;
  }) as any;
});

function renderWithProvider(children: React.ReactNode) {
  return render(<CleaAgentProvider>{children}</CleaAgentProvider>);
}

describe('CleaChat', () => {
  it('opens from its floating trigger and closes with Escape', () => {
    renderWithProvider(<CleaChat />);

    const trigger = screen.getByRole('button', { name: 'Open Clea study assistant' });
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Clea study assistant' })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Clea study assistant' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Clea study assistant' })).not.toBeInTheDocument();
  });

  it('shows the sent message immediately and clears the input', async () => {
    renderWithProvider(<CleaChat />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Clea study assistant' }));

    const input = screen.getByLabelText('Message Clea');
    fireEvent.change(input, { target: { value: 'Help me review cardiology' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Help me review cardiology')).toBeInTheDocument();
    });
    expect(input).toHaveValue('');
  });

  it('toggles the shared microphone state without requesting audio', async () => {
    renderWithProvider(<CleaChat />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Clea study assistant' }));

    const microphone = screen.getByRole('button', { name: 'Start visual microphone' });
    expect(microphone).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(microphone);
    // micModelLoading flashes true during getUserMedia acquisition, then settles
    // to false once the stream is obtained — wait for the final state.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Stop visual microphone' })).toHaveAttribute('aria-pressed', 'true');
    });
    expect(screen.getByPlaceholderText('Listening...')).toBeInTheDocument();
  });

  it('enters and exits the visual Clea Live mode', () => {
    renderWithProvider(<CleaChat />);
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
  hasSelectedAnswer: false,
  currentQuestionCorrect: null,
  correctSoFar: 1,
  totalAnsweredSoFar: 2,
  questionText: 'A 45-year-old man presents with chest pain.',
  optionTexts: ['MI', 'GERD'],
  selectedOptionText: null,
};

describe('CleaChat + Watch', () => {
  it('toggles Watch on and off from the chat header', () => {
    render(
      <WatchProvider>
        <CleaAgentProvider>
          <CleaChat />
        </CleaAgentProvider>
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
        <CleaAgentProvider>
          <ActivityInjector activity={sampleActivity} />
          <CleaChat />
        </CleaAgentProvider>
      </WatchProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open Clea study assistant' }));
    fireEvent.click(screen.getByRole('button', { name: 'Turn on Watch' }));

    expect(screen.getByText(/Watching: Q3\/20/)).toBeInTheDocument();
    expect(screen.getByText(/Cardiovascular/)).toBeInTheDocument();
  });
});
