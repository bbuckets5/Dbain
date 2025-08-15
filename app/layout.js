// app/layout.js

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './style.css';
import { Poppins } from 'next/font/google';
import { Providers } from './providers'; // Import the new providers file

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '600', '700'],
  variable: '--font-poppins',
});

export const metadata = {
  title: "Click eTickets - Tickets One Click Away",
  description: "Your one-stop shop for all events and tickets.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={poppins.variable}>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
      </head>
      <body>
        <Providers> {/* Use the new Providers component to wrap everything */}
          <div className="container">
            <Header />
            <main className="main-content">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}