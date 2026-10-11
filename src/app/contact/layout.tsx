import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Contact the TambayanSLU Team', description: 'Find ways to contact the TambayanSLU team about support, reports and community feedback.', alternates: { canonical: '/contact' }, openGraph: { title: 'Contact TambayanSLU', description: 'Reach the team about support and community feedback.', url: '/contact' } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
