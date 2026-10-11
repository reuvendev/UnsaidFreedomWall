import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Credits | TambayanSLU', description: 'Meet the independent student-led team maintaining TambayanSLU.', alternates: { canonical: '/credits' }, openGraph: { title: 'Credits | TambayanSLU', description: 'Meet the independent team behind TambayanSLU.', url: '/credits' } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
