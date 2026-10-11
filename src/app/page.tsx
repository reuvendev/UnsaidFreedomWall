import type { Metadata } from 'next';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: { url: 'https://tambayanslu.com', type: 'website' },
};

export default function HomePage() {
  return <HomeClient />;
}
