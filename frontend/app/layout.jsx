import { Inter } from 'next/font/google';
import Script from 'next/script';
import Navbar from '@/components/Navbar';
import TopBar from '@/components/TopBar';
import Footer from '@/components/Footer';
import BackgroundEffects from '@/components/BackgroundEffects';
import ChatbotFab_Sylq from '@/components/ChatbotFab_Sylq';
import { AuthProvider } from '@/context/AuthContext';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Sylq - AI-Powered GATE Exam Prep',
  description: 'The ultimate AI-powered platform to conquer the GATE exam. Personalized study plans, adaptive tests, and expert insights.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <BackgroundEffects />
          
          {/* Custom GATER TopBar handles the user profile/login logic internally */}
          <TopBar />

          <main className="relative-z min-h-screen pb-24 pt-20">
            {children}
          </main>

          <Footer />
          <Navbar />
          <ChatbotFab_Sylq />
        </AuthProvider>
      </body>
    </html>
  );
}


