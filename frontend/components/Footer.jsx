import Link from 'next/link';

const FOOTER_LINKS = {
  Product: [
    { label: 'Take a Test',     href: '/test/configure' },
    { label: 'Test History',    href: '/test/history' },
    { label: 'Dashboard',       href: '/dashboard' },
    { label: 'Pricing',         href: '/pricing' },
  ],
  Company: [
    { label: 'About',           href: '/about' },
    { label: 'Contact Us',      href: '/contact' },
  ],
  Legal: [
    { label: 'Privacy Policy',  href: '/privacy' },
    { label: 'Terms of Service',href: '/terms' },
  ],
};

export default function Footer() {
  return (
    <footer
      className="relative-z mt-auto"
      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="section-container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 group">
              <img
                src="/logo.png"
                alt="Sylq Logo"
                className="h-11 w-auto object-contain transition-opacity duration-200 group-hover:opacity-80"
              />
              <span className="text-xl font-bold tracking-tight text-white group-hover:text-[#45f0f4] transition-colors">Sylq</span>
            </Link>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              India's most customizable GATE mock test platform, powered by AI analysis.
            </p>
            <p className="text-xs text-outline mt-4" style={{ fontFamily: 'JetBrains Mono' }}>
              © {new Date().getFullYear()} Sylq AI. All rights reserved.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <p className="text-xs font-bold tracking-widest uppercase text-outline mb-4"
                 style={{ fontFamily: 'JetBrains Mono' }}>
                {section}
              </p>
              <ul className="space-y-3">
                {links.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-on-surface-variant hover:text-on-surface transition-colors duration-150"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
