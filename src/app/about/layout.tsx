import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'About TambayanSLU | Independent Student Community', description: 'Learn who maintains TambayanSLU, why it exists, and how anonymous participation and moderation work.', alternates: { canonical: '/about' }, openGraph: { title: 'About TambayanSLU', description: 'Learn about TambayanSLU and the Valiance team.', url: '/about' } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
