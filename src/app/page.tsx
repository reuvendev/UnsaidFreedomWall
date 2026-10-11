import type { Metadata } from 'next';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: { url: 'https://www.tambayanslu.com', type: 'website' },
};

export default function HomePage() {
  return <HomeClient />;
}
