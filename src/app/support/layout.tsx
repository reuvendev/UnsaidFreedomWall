import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Support TambayanSLU', description: 'Learn how voluntary support helps keep TambayanSLU available to the student community.', alternates: { canonical: '/support' }, openGraph: { title: 'Support TambayanSLU', description: 'Learn about voluntary support for the platform.', url: '/support' } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
