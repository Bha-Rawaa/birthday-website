import type { Metadata } from 'next'
import { Fredoka, Nunito } from 'next/font/google'
import './globals.css'

const fredoka = Fredoka({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-fredoka',
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Raouta's Birthday 🦁",
  description: "Celebrating Raouta's Leo season birthday! Join the celebration 🎉",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="font-body bg-day-cream overflow-x-hidden">
        {children}
      </body>
    </html>
  )
}
