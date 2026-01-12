import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | AppName",
  description: "Privacy Policy for AppName",
};

export default function PrivacyPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-16">
      <h1 className="mb-8 font-bold text-4xl">Privacy Policy</h1>
      <div className="prose dark:prose-invert max-w-none">
        <p className="mb-6 text-lg text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="mb-4 font-semibold text-2xl">1. Introduction</h2>
          <p>
            Welcome to AppName. We respect your privacy and are committed to
            protecting your personal data. This privacy policy will inform you
            as to how we look after your personal data when you visit our
            website and tell you about your privacy rights and how the law
            protects you.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 font-semibold text-2xl">2. Data We Collect</h2>
          <p>
            We may collect, use, store and transfer different kinds of personal
            data about you which we have grouped together follows:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>
              Identity Data includes first name, last name, username or similar
              identifier.
            </li>
            <li>
              Contact Data includes billing address, delivery address, email
              address and telephone numbers.
            </li>
            <li>
              Technical Data includes internet protocol (IP) address, your login
              data, browser type and version.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 font-semibold text-2xl">
            3. How We Use Your Data
          </h2>
          <p>
            We will only use your personal data when the law allows us to. Most
            commonly, we will use your personal data in the following
            circumstances:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>
              Where we need to perform the contract we are about to enter into
              or have entered into with you.
            </li>
            <li>
              Where it is necessary for our legitimate interests (or those of a
              third party) and your interests and fundamental rights do not
              override those interests.
            </li>
            <li>
              Where we need to comply with a legal or regulatory obligation.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
