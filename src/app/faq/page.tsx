import type { Metadata } from 'next';
import FAQClient from './FAQClient';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | TambayanSLU',
  description: 'Answers about anonymous posting, moderation, privacy and using TambayanSLU.',
  alternates: { canonical: '/faq' },
  openGraph: { title: 'Frequently Asked Questions | TambayanSLU', description: 'Answers about anonymous posting, moderation and privacy.', url: '/faq' },
};

export default function FAQPage() {
  return <FAQClient />;
}
