import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Community Guidelines | TambayanSLU', description: 'Read the TambayanSLU community rules for safe anonymous posting, reporting and respectful conversations.', alternates: { canonical: '/guidelines' }, openGraph: { title: 'Community Guidelines | TambayanSLU', description: 'Our rules for safer anonymous participation.', url: '/guidelines' } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
