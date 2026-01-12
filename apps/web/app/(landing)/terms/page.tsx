import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | AppName",
  description: "Terms of Service for AppName",
};

export default function TermsPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-16">
      <h1 className="mb-8 font-bold text-4xl">Terms of Service</h1>
      <div className="prose dark:prose-invert max-w-none">
        <p className="mb-6 text-lg text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="mb-4 font-semibold text-2xl">1. Agreement to Terms</h2>
          <p>
            By accessing our website, you agree to be bound by these Terms of
            Service and to comply with all applicable laws and regulations. If
            you do not agree with these terms, you are prohibited from using or
            accessing this site.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 font-semibold text-2xl">2. Use License</h2>
          <p>
            Permission is granted to temporarily download one copy of the
            materials (information or software) on AppName's website for
            personal, non-commercial transitory viewing only. This is the grant
            of a license, not a transfer of title, and under this license you
            may not:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>modify or copy the materials;</li>
            <li>
              use the materials for any commercial purpose, or for any public
              display (commercial or non-commercial);
            </li>
            <li>
              attempt to decompile or reverse engineer any software contained on
              AppName's website;
            </li>
            <li>
              remove any copyright or other proprietary notations from the
              materials; or
            </li>
            <li>
              transfer the materials to another person or "mirror" the materials
              on any other server.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 font-semibold text-2xl">3. Disclaimer</h2>
          <p>
            The materials on AppName's website are provided on an 'as is' basis.
            AppName makes no warranties, expressed or implied, and hereby
            disclaims and negates all other warranties including, without
            limitation, implied warranties or conditions of merchantability,
            fitness for a particular purpose, or non-infringement of
            intellectual property or other violation of rights.
          </p>
        </section>
      </div>
    </main>
  );
}
