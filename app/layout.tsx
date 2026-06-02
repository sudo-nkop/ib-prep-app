import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Nav from "@/components/Nav"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "IB Prep — Built for Diploma Students",
  description:
    "Practice IB exam questions, track your progress, and build confidence across all your IB subjects.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Nav />
        <main className="min-h-screen pt-16">{children}</main>
      </body>
    </html>
  )
}
