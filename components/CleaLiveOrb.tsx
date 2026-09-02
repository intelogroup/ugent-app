import { useCleaAgent } from '@/lib/clea-agent-context';

export default function CleaLiveOrb() {
  const { agentStatus } = useCleaAgent();

  return (
    <div
      className={`clea-orb-shell clea-orb-status--${agentStatus}`}
      data-testid="clea-live-orb"
      data-agent-status={agentStatus}
      aria-hidden="true"
    >
      <div className="clea-orb-ripple" />
      <div className="clea-orb-core">
        <div className="clea-orb-current clea-orb-current--one" />
        <div className="clea-orb-current clea-orb-current--two" />
        <div className="clea-orb-ribbon" />
        <div className="clea-orb-light" />
        <div className="clea-orb-highlight" />
      </div>
    </div>
  );
}
