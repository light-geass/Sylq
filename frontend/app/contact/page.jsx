export default function ContactPage() {
  return (
    <div className="relative-z pt-20 pb-20 section-container">
      <div className="max-w-2xl mx-auto py-16">
        <p className="text-xs font-bold tracking-widest uppercase text-secondary mb-3"
           style={{ fontFamily: 'JetBrains Mono' }}>
          Get in touch
        </p>
        <h1 className="text-4xl font-bold text-on-surface mb-6" style={{ letterSpacing: '-0.01em' }}>
          Contact us
        </h1>

        <div className="glass-card rounded-2xl p-10 text-center"
             style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-on-surface-variant text-lg mb-2">Content coming soon</p>
          <p className="text-sm text-outline">
            Contact form and support channels will be available here.
          </p>
          <p className="text-sm text-secondary mt-4">contact@gater.in</p>
        </div>
      </div>
    </div>
  );
}
