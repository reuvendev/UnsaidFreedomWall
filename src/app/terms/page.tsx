import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | TambayanSLU",
  description:
    "Read the Terms of Service for TambayanSLU, including anonymous participation, community content, moderation, privacy, and platform use.",
  alternates: {
    canonical: "https://www.tambayanslu.com/terms",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const sections = [
  { id: "eligibility", label: "Eligibility" },
  { id: "using-tambayan", label: "Using TambayanSLU" },
  { id: "anonymous-participation", label: "Anonymous participation" },
  { id: "user-content", label: "User-generated content" },
  { id: "moderation", label: "Content moderation" },
  { id: "anonymous-chat", label: "Anonymous chat" },
  { id: "reporting", label: "Reporting and safety" },
  { id: "privacy", label: "Privacy and data protection" },
  { id: "intellectual-property", label: "Intellectual property" },
  { id: "third-party", label: "Third-party services" },
  { id: "availability", label: "Service availability" },
  { id: "payments", label: "Donations and paid features" },
  { id: "disclaimers", label: "Disclaimers and limitations" },
  { id: "changes", label: "Changes to these Terms" },
  { id: "law", label: "Applicable law" },
  { id: "contact", label: "Contact us" },
  { id: "independence", label: "Independent platform" },
] as const;

const sectionStyle = "scroll-mt-24 border-t border-zinc-200 pt-7 dark:border-zinc-800";
const bodyStyle = "mt-3 space-y-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300 sm:text-[15px]";
const headingStyle = "text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-xl";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
            TambayanSLU / Legal
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-sm leading-7 text-zinc-600 dark:text-zinc-300 sm:text-base">
            These Terms explain what you can expect from TambayanSLU and what we
            expect from everyone who uses the platform. Please read them alongside
            our <Link href="/guidelines" className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100">Community Guidelines</Link> and{" "}
            <Link href="/privacy" className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100">Privacy Policy</Link>.
          </p>
          <p className="mt-5 text-xs text-zinc-500 dark:text-zinc-400">
            Last updated: October 12, 2026
          </p>
        </header>

        <div className="mt-12 grid items-start gap-10 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-14">
          <nav
            aria-label="Terms of Service contents"
            className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/40 lg:sticky lg:top-24"
          >
            <h2 className="text-sm font-semibold">On this page</h2>
            <ol className="mt-3 grid gap-2 text-xs leading-5 text-zinc-600 dark:text-zinc-400 sm:grid-cols-2 lg:grid-cols-1">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="transition-colors hover:text-zinc-950 hover:underline dark:hover:text-white"
                  >
                    {index + 1}. {section.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="min-w-0 max-w-3xl space-y-9">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm leading-7 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300 sm:p-6">
              <p>
                Welcome to TambayanSLU (also referred to as “Tambayan,” “we,” “us,”
                or “our”). TambayanSLU is an independently developed online
                community where people can submit anonymous posts, participate in
                discussions, chat with others, and explore community content.
              </p>
              <p className="mt-3">
                By accessing or using TambayanSLU, you agree to these Terms and our{" "}
                <Link href="/guidelines" className="underline underline-offset-4">Community Guidelines</Link>.
                If you do not agree, please do not use the service.
              </p>
            </div>

            <section id="eligibility" className={sectionStyle}>
              <h2 className={headingStyle}>1. Eligibility</h2>
              <div className={bodyStyle}>
                <p>You must be at least 18 years old to use TambayanSLU. By using the platform, you confirm that you meet this requirement.</p>
                <p>TambayanSLU is primarily intended for the Louisian community but is not an official service of Saint Louis University. You are responsible for complying with applicable laws when using the platform.</p>
              </div>
            </section>

            <section id="using-tambayan" className={sectionStyle}>
              <h2 className={headingStyle}>2. Using TambayanSLU</h2>
              <div className={bodyStyle}>
                <p>TambayanSLU offers features such as the Freedom Wall, anonymous chat, articles, and other community activities. Please use them responsibly and respect other users.</p>
                <p>Do not use the service to harass or threaten anyone, spread private information without permission, impersonate others, commit fraud, interfere with the website’s security or availability, or violate applicable laws.</p>
                <p>More detailed rules are available in our <Link href="/guidelines" className="underline underline-offset-4">Community Guidelines</Link>.</p>
              </div>
            </section>

            <section id="anonymous-participation" className={sectionStyle}>
              <h2 className={headingStyle}>3. Anonymous participation</h2>
              <div className={bodyStyle}>
                <p>TambayanSLU lets users participate without publicly displaying their real names. Posts may appear under automatically generated anonymous aliases.</p>
                <p>However, anonymity is not a guarantee that someone cannot identify you. Information you share yourself, technical information processed by the platform, or information available elsewhere may reveal your identity.</p>
                <p>Please avoid sharing sensitive details about yourself or other people. You remain responsible for what you submit or say, even when participating anonymously.</p>
              </div>
            </section>

            <section id="user-content" className={sectionStyle}>
              <h2 className={headingStyle}>4. User-generated content</h2>
              <div className={bodyStyle}>
                <p>You are responsible for posts, replies, images, and other content that you submit. Only share material you have the right to use. Do not post confidential information, another person’s private details, or copyrighted material without appropriate permission.</p>
                <p>You retain any ownership rights you have in your original content. When you submit content intended for public display, you grant TambayanSLU a non-exclusive, royalty-free license to host, store, reproduce, and display it as reasonably necessary to operate the platform. This does not transfer ownership of your content to TambayanSLU.</p>
                <p>Submitting content does not guarantee publication or continued availability. Content may be rejected or removed under these Terms and our Community Guidelines.</p>
              </div>
            </section>

            <section id="moderation" className={sectionStyle}>
              <h2 className={headingStyle}>5. Content moderation</h2>
              <div className={bodyStyle}>
                <p>We use moderation and reporting tools to help maintain a safer community. We may review, reject, restrict, or remove content if we reasonably believe it violates these Terms, our Community Guidelines, applicable law, or creates a safety risk.</p>
                <p>We may also restrict access to features when necessary to address abuse or protect the community. Moderation decisions depend on the information and context available to us, and not every report will result in removal.</p>
                <p>Although we make reasonable efforts to moderate content, we cannot promise that every harmful submission will be detected or removed immediately. For questions about a moderation decision, use our <Link href="/contact" className="underline underline-offset-4">Contact page</Link> or other available appeals process.</p>
              </div>
            </section>

            <section id="anonymous-chat" className={sectionStyle}>
              <h2 className={headingStyle}>6. Anonymous chat</h2>
              <div className={bodyStyle}>
                <p>Anonymous Chat allows people to communicate without displaying their public identities. You are responsible for your messages and how you treat the person on the other side of the conversation.</p>
                <p>Do not use chat for harassment, threats, scams, exploitation, impersonation, or attempts to obtain private information. Avoid sharing passwords, school credentials, home addresses, financial details, or other sensitive information.</p>
                <p>Other participants may copy, record, or disclose information you choose to share. We cannot control what another participant does outside the platform.</p>
                <p>For information about data handling and any applicable privacy or retention practices, please read our <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link>. These Terms do not make additional guarantees about encryption, message deletion, or access.</p>
              </div>
            </section>

            <section id="reporting" className={sectionStyle}>
              <h2 className={headingStyle}>7. Reporting and safety</h2>
              <div className={bodyStyle}>
                <p>If you encounter content that may violate our rules, you can use the reporting options available on the website. Provide accurate, relevant details to help our team review the concern.</p>
                <p>Reports do not automatically lead to removal, and reporting tools must not be used to harass other people or knowingly make false accusations.</p>
                <p>TambayanSLU is not an emergency response service and does not replace university support offices, professional counseling, legal assistance, or law enforcement. For immediate danger or emergencies, contact the appropriate local emergency services or authorities.</p>
              </div>
            </section>

            <section id="privacy" className={sectionStyle}>
              <h2 className={headingStyle}>8. Privacy and data protection</h2>
              <div className={bodyStyle}>
                <p>Our <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link> explains the information we process, why it is processed, the services used to operate TambayanSLU, and how to raise privacy concerns.</p>
                <p>These Terms do not replace the Privacy Policy or limit rights you may have under applicable data protection laws.</p>
              </div>
            </section>

            <section id="intellectual-property" className={sectionStyle}>
              <h2 className={headingStyle}>9. Intellectual property</h2>
              <div className={bodyStyle}>
                <p>TambayanSLU’s original design, code, branding, and other original platform materials may be protected by intellectual property laws.</p>
                <p>Do not copy, impersonate, or commercially exploit protected platform materials without permission, except as permitted by law. Respect other people’s rights when sharing content on the website.</p>
              </div>
            </section>

            <section id="third-party" className={sectionStyle}>
              <h2 className={headingStyle}>10. Third-party services and links</h2>
              <div className={bodyStyle}>
                <p>TambayanSLU may rely on third-party services for hosting, data storage, media delivery, analytics, or other features. The website may also contain links or embedded content from other websites.</p>
                <p>Independent third parties may have their own terms and privacy policies. We do not control their content, availability, or practices.</p>
              </div>
            </section>

            <section id="availability" className={sectionStyle}>
              <h2 className={headingStyle}>11. Service availability and changes</h2>
              <div className={bodyStyle}>
                <p>TambayanSLU is an independently maintained platform. Features may occasionally be interrupted because of maintenance, technical problems, security concerns, or other operational needs.</p>
                <p>We may update, modify, temporarily disable, or discontinue features when reasonably necessary. We do not guarantee uninterrupted access to every part of the service.</p>
              </div>
            </section>

            <section id="payments" className={sectionStyle}>
              <h2 className={headingStyle}>12. Donations and optional paid features</h2>
              <div className={bodyStyle}>
                <p>TambayanSLU may offer voluntary ways to support the project or optional paid services, such as promotional placements, where available.</p>
                <p>Any applicable prices and important payment conditions should be disclosed before payment. Donations or paid services do not give anyone permission to violate these Terms or our Community Guidelines.</p>
                <p>Any additional terms provided for a specific paid service apply to that transaction, subject to applicable law.</p>
              </div>
            </section>

            <section id="disclaimers" className={sectionStyle}>
              <h2 className={headingStyle}>13. Disclaimers and limitations</h2>
              <div className={bodyStyle}>
                <p>Posts, replies, and conversations represent the views of their respective contributors, not necessarily those of TambayanSLU or its developers. User submissions should not automatically be treated as verified facts, professional advice, or official university statements.</p>
                <p>The service is provided on an as-available basis. While we make reasonable efforts to maintain security, reliability, and moderation, we cannot promise that every feature will always be error-free or uninterrupted.</p>
                <p>Any limitation of responsibility or liability applies only to the extent allowed by law. Nothing in these Terms excludes rights or legal remedies that cannot lawfully be excluded.</p>
              </div>
            </section>

            <section id="changes" className={sectionStyle}>
              <h2 className={headingStyle}>14. Changes to these Terms</h2>
              <div className={bodyStyle}>
                <p>We may update these Terms when the platform, its features, community practices, or legal requirements change. We will update the revision date and provide appropriate notice of material changes where required.</p>
                <p>Continued use of the platform after updated Terms take effect may constitute acceptance where permitted by applicable law.</p>
              </div>
            </section>

            <section id="law" className={sectionStyle}>
              <h2 className={headingStyle}>15. Applicable law</h2>
              <div className={bodyStyle}>
                <p>These Terms are intended to operate in accordance with applicable laws of the Republic of the Philippines. Nothing here limits mandatory rights or protections available to users under applicable law.</p>
              </div>
            </section>

            <section id="contact" className={sectionStyle}>
              <h2 className={headingStyle}>16. Contact us</h2>
              <div className={bodyStyle}>
                <p>For questions about these Terms, moderation decisions, content removal, or privacy and safety concerns, you can contact us at <a href="mailto:unsaideselyu@gmail.com" className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100">unsaideselyu@gmail.com</a>.</p>
                <p>You can also visit our <Link href="/contact" className="underline underline-offset-4">Contact page</Link>.</p>
              </div>
            </section>

            <section id="independence" className={sectionStyle}>
              <h2 className={headingStyle}>17. Independent platform disclaimer</h2>
              <div className={bodyStyle}>
                <p>TambayanSLU is independently developed and maintained by a student-led team. It is not affiliated with, associated with, authorized by, endorsed by, or officially connected with Saint Louis University, its administration, or any university office.</p>
                <p>References to SLU and the Louisian community are for community identification and context only.</p>
              </div>
            </section>

            <div className="border-t border-zinc-200 pt-7 dark:border-zinc-800">
              <h2 className="text-sm font-semibold">Other policies</h2>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                <Link href="/guidelines" className="underline underline-offset-4 hover:text-zinc-900 dark:hover:text-white">Community Guidelines</Link>
                <Link href="/privacy" className="underline underline-offset-4 hover:text-zinc-900 dark:hover:text-white">Privacy Policy</Link>
                <Link href="/contact" className="underline underline-offset-4 hover:text-zinc-900 dark:hover:text-white">Contact</Link>
              </div>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
