import { DM_Sans, Noto_Sans_Devanagari } from 'next/font/google';
import 'leaflet/dist/leaflet.css';
import '../src/index.css';

const bodyFont = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const hindiFont = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-devanagari',
  display: 'swap',
});

export const metadata = {
  title: 'MPOnline | Madhya Pradesh Citizen Services',
  description: 'File and track public grievances, or check eligibility for Madhya Pradesh welfare schemes.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${hindiFont.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}