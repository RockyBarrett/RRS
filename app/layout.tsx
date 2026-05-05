import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Revenue Return Specialists | Payroll Savings Strategy',
  description:
    'Revenue Return Specialists helps employers evaluate payroll-based savings strategies designed to increase employee take-home pay, reduce employer payroll tax costs, and support trusted referral partners.',
  icons: {
    icon: '/rrsfavicon.png',
    shortcut: '/rrsfavicon.png',
    apple: '/rrsfavicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
