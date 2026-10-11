import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Privacy Policy | TambayanSLU', description: 'Learn how TambayanSLU handles anonymous identifiers, content, chat reports and third-party services.', alternates: { canonical: '/privacy' }, openGraph: { title: 'Privacy Policy | TambayanSLU', description: 'How TambayanSLU handles privacy and data.', url: '/privacy' } };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
