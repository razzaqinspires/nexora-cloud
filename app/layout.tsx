import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Nexora Cloud | Razzaq Ventures', description: 'Central cloud control plane for Razzaq Ventures projects.' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="id"><body>{children}</body></html>; }
