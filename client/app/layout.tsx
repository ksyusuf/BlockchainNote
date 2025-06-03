import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Provider from './Provider';
import Header from '../components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Blockchain Notes',
  description: 'Stellar blockchain üzerinde notlarınızı güvenle saklayın',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900`}>
        <Provider>
          <Header />
          <main className="container mx-auto px-4 py-4">
            {children}
          </main>
        </Provider>
      </body>
    </html>
  );
}
