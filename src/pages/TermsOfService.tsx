import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground pb-20">
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">O</div>
            <span className="text-lg font-semibold tracking-tight">OpsBridge US</span>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div>
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <FileText className="h-6 w-6" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Terms of Service</h1>
          <p className="text-muted-foreground mb-12 italic">Last updated: March 19, 2026</p>

          <div className="prose prose-zinc max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using the OpsBridge US platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Platform Role</h2>
              <p className="text-muted-foreground leading-relaxed">
                OpsBridge US acts as a marketplace connecting international clients with US business owners. We facilitate the matching, scoping, and document exchange process but are not a party to the independent contracts formed between clients and providers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. User Responsibilities</h2>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Clients:</strong> Responsible for providing accurate project requirements and timely payments.</li>
                <li><strong>Providers:</strong> Responsible for maintaining valid US business credentials and delivering services as agreed.</li>
                <li><strong>Verification:</strong> All US providers must undergo our manual vetting process before being listed.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Compliance and Regulatory</h2>
              <p className="text-muted-foreground leading-relaxed">
                Users are solely responsible for ensuring their operational projects comply with all applicable local, state, and federal laws in the United States and their home jurisdictions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                OpsBridge US shall not be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with the use of the platform or the services provided by independent business owners.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law principles.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
