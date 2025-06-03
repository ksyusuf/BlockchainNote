import './globals.css'
import type { Metadata } from 'next'
import ReduxProvider from './Provider';

export const metadata: Metadata = {
  title: 'BlockchainNote',
  description: 'Blockchain üzerinde not tutma uygulaması',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body>
        <ReduxProvider>
          {children}
        </ReduxProvider>
      </body>
    </html>
  )
}
