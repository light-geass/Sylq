export default function AboutPage() {
  return (
    <div className="relative-z pt-20 pb-20 section-container">
      <div className="max-w-2xl mx-auto py-16">
        <p className="text-xs font-bold tracking-widest uppercase text-secondary mb-3"
           style={{ fontFamily: 'JetBrains Mono' }}>
          Our story
        </p>
        <h1 className="text-4xl font-bold text-on-surface mb-6" style={{ letterSpacing: '-0.01em' }}>
          About GATER
        </h1>

        <div className="glass-card rounded-2xl p-10 text-center"
             style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-on-surface-variant text-lg mb-2">Content coming soon</p>
          <p className="text-sm text-outline">
            This page will describe the mission, team, and story behind GATER.
          </p>
        </div>
      </div>
    </div>
  );
}
