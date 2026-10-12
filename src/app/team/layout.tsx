import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Meet the TambayanSLU Team',
  description: 'Meet the student-led team developing, maintaining, moderating, and promoting TambayanSLU.',
  alternates: { canonical: '/team' },
  openGraph: {
    title: 'Meet the TambayanSLU Team',
    description: 'Meet the student-led team behind TambayanSLU.',
    url: '/team',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
