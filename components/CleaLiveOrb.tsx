export default function CleaLiveOrb() {
  return (
    <div className="clea-orb-shell" data-testid="clea-live-orb" aria-hidden="true">
      <div className="clea-orb-ripple" />
      <div className="clea-orb-core">
        <div className="clea-orb-current clea-orb-current--one" />
        <div className="clea-orb-current clea-orb-current--two" />
        <div className="clea-orb-light" />
        <div className="clea-orb-highlight" />
      </div>
    </div>
  );
}
