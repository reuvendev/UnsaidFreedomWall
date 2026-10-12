import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Meet the TambayanSLU Team', robots: { index: false, follow: true } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
