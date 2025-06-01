import './globals.css'
import type { Metadata } from 'next'

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
      <body>{children}</body>
    </html>
  )
}
