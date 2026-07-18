import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CleaAgentProvider, useCleaAgent } from '@/lib/clea-agent-context';

// The provider issues a GET on mount to restore history — mock fetch so
// tests don't hit a real server, and so we can assert both surfaces see
// the same messages after a mocked round-trip.
beforeEach(() => {
  window.localStorage.clear();
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => [] })) as any;
});

function SurfaceA() {
  const { messages } = useCleaAgent();
  return <p data-testid="surface-a-count">{messages.length}</p>;
}

function SurfaceB() {
  const { messages } = useCleaAgent();
  return <p data-testid="surface-b-count">{messages.length}</p>;
}

describe('CleaAgentProvider / useCleaAgent', () => {
  it('seeds a welcome message when loaded history is empty', async () => {
    render(
      <CleaAgentProvider>
        <SurfaceA />
      </CleaAgentProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('surface-a-count')).toHaveTextContent('1');
    });
  });

  it('two consumers under one provider share the same messages array', async () => {
    render(
      <CleaAgentProvider>
        <SurfaceA />
        <SurfaceB />
      </CleaAgentProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('surface-a-count')).toHaveTextContent('1');
      expect(screen.getByTestId('surface-b-count')).toHaveTextContent('1');
    });
  });

  it('persists a chat id to localStorage on first mount', async () => {
    render(
      <CleaAgentProvider>
        <SurfaceA />
      </CleaAgentProvider>
    );
    await waitFor(() => {
      expect(window.localStorage.getItem('clea-chat-id')).toBeTruthy();
    });
  });

  it('toggleMic flips a shared micActive flag', async () => {
    function MicConsumer() {
      const { micActive, toggleMic } = useCleaAgent();
      return (
        <div>
          <p data-testid="mic-state">{String(micActive)}</p>
          <button onClick={toggleMic}>toggle mic</button>
        </div>
      );
    }
    render(
      <CleaAgentProvider>
        <MicConsumer />
      </CleaAgentProvider>
    );
    expect(screen.getByTestId('mic-state')).toHaveTextContent('false');
    fireEvent.click(screen.getByText('toggle mic'));
    expect(screen.getByTestId('mic-state')).toHaveTextContent('true');
  });
});
