import { Inter } from 'next/font/google';
import Script from 'next/script';
import Navbar from '@/components/Navbar';
import TopBar from '@/components/TopBar';
import Footer from '@/components/Footer';
import BackgroundEffects from '@/components/BackgroundEffects';
import ChatbotFab_Sylq from '@/components/ChatbotFab_Sylq';
import ExamSelectModal from '@/components/ExamSelectModal';
import { AuthProvider } from '@/context/AuthContext';
import './globals.css';
import 'katex/dist/katex.min.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: "Sylq",
  description: "AI-Powered Exam Preparation Platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sylq",
  },
};

export const viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <BackgroundEffects />

          {/* Custom GATER TopBar handles the user profile/login logic internally */}
          <TopBar />

          <main className="relative-z min-h-screen pb-24 pt-24">
            {children}
          </main>

          <Footer />
          <Navbar />
          <ChatbotFab_Sylq />
          <ExamSelectModal />
        </AuthProvider>
      </body>
    </html>
  );


}


