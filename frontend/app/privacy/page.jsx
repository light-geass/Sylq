export const metadata = {
  title: 'Privacy Policy | Sylq - the Gater',
  description: 'Privacy Policy for Sylq, explaining how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <div className="relative-z pt-7 pb-20 section-container">
      <div className="max-w-3xl mx-auto py-16">
        <div className="mb-12">
          <p className="text-xs font-bold tracking-widest uppercase text-secondary mb-3"
             style={{ fontFamily: 'JetBrains Mono' }}>
            Legal & Security
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-on-surface mb-4" style={{ letterSpacing: '-0.01em' }}>
            Privacy Policy
          </h1>
          <p className="text-sm text-[#45f0f4]" style={{ fontFamily: 'JetBrains Mono' }}>
            Effective Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8 md:p-12 space-y-8 text-on-surface-variant leading-relaxed">
          
          <section>
            <h2 className="text-xl font-bold text-on-surface mb-4">1. Introduction</h2>
            <p>
              Welcome to <strong>Sylq</strong> ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. 
              This Privacy Policy applies to all information collected through our website and application, related services, sales, marketing, or events.
            </p>
            <p className="mt-3">
              When you use our services, you trust us with your data. We take this responsibility seriously and utilize industry-standard 
              security practices, including Firebase Authentication and encrypted database storage, to protect your information.
            </p>
          </section>

          <div className="h-px w-full bg-outline-variant/30" />

          <section>
            <h2 className="text-xl font-bold text-on-surface mb-4">2. Information We Collect</h2>
            <h3 className="text-sm font-bold text-primary mb-2 uppercase tracking-wide">2.1 Personal Information Provided by You</h3>
            <p className="mb-4">
              We collect information that you voluntarily provide to us when you register on the platform. This includes:
            </p>
            <ul className="list-disc pl-5 space-y-2 mb-4 text-sm">
              <li><strong>Contact Data:</strong> Name, email address, and profile picture (via Google OAuth).</li>
              <li><strong>Profile Data:</strong> Target GATE branch, target year, phone number (optional), and educational background.</li>
              <li><strong>Authentication Data:</strong> OAuth tokens managed securely by Google Firebase.</li>
            </ul>

            <h3 className="text-sm font-bold text-primary mb-2 uppercase tracking-wide">2.2 Automatically Collected Information</h3>
            <p className="mb-4">
              When you interact with our platform, our systems automatically collect certain usage data to power our AI diagnostics:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li><strong>Test Performance:</strong> Answers submitted, time spent per question, accuracy metrics, and historical test scores.</li>
              <li><strong>Device & Usage Data:</strong> Browser type, operating system, and interaction patterns with our UI (to improve user experience).</li>
            </ul>
          </section>

          <div className="h-px w-full bg-outline-variant/30" />

          <section>
            <h2 className="text-xl font-bold text-on-surface mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use personal information collected via our platform for a variety of business purposes described below:</p>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <span className="text-[#86db64] mt-1">✓</span>
                <div>
                  <strong className="text-on-surface block mb-1">To power our AI Engine</strong>
                  <span className="text-sm">Your test data is processed by our proprietary AI to generate granular performance insights, personalized study plans, and adaptive chatbot responses.</span>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#86db64] mt-1">✓</span>
                <div>
                  <strong className="text-on-surface block mb-1">Account Creation and Management</strong>
                  <span className="text-sm">To facilitate account creation, login processes, and secure your session across devices.</span>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#86db64] mt-1">✓</span>
                <div>
                  <strong className="text-on-surface block mb-1">To Communicate with You</strong>
                  <span className="text-sm">To send administrative information, product updates, and personalized study alerts.</span>
                </div>
              </li>
            </ul>
          </section>

          <div className="h-px w-full bg-outline-variant/30" />

          <section>
            <h2 className="text-xl font-bold text-on-surface mb-4">4. Data Sharing and Disclosure</h2>
            <p>
              We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. 
              <strong> We do not sell your personal data to third parties.</strong>
            </p>
            <p className="mt-3">
              We may share your data with third-party vendors, service providers, and hosting partners (such as Supabase and Google Cloud) who perform services 
              for us and require access to such information to do that work.
            </p>
          </section>

          <div className="h-px w-full bg-outline-variant/30" />

          <section>
            <h2 className="text-xl font-bold text-on-surface mb-4">5. Contact Us</h2>
            <p>
              If you have questions or comments about this notice, you may email us at{' '}
              <a href="mailto:privacy@sylq.ai" className="text-secondary hover:text-[#45f0f4] transition-colors">
                privacy@sylq.ai
              </a>{' '}
              or reach out via our contact page.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
