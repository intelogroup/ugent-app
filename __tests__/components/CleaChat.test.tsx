import { fireEvent, render, screen } from '@testing-library/react';
import CleaChat from '@/components/CleaChat';

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
