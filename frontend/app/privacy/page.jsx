export default function PrivacyPage() {
  return (
    <div className="relative-z pt-20 pb-20 section-container">
      <div className="max-w-2xl mx-auto py-16">
        <p className="text-xs font-bold tracking-widest uppercase text-secondary mb-3"
           style={{ fontFamily: 'JetBrains Mono' }}>
          Legal
        </p>
        <h1 className="text-4xl font-bold text-on-surface mb-2" style={{ letterSpacing: '-0.01em' }}>
          Privacy Policy
        </h1>
        <p className="text-sm text-outline mb-8" style={{ fontFamily: 'JetBrains Mono' }}>
          Last updated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>

        <div className="glass-card rounded-2xl p-10 text-center"
             style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-on-surface-variant text-lg mb-2">Content coming soon</p>
          <p className="text-sm text-outline">
            Full privacy policy will be drafted before public launch.
          </p>
        </div>
      </div>
    </div>
  );
}
