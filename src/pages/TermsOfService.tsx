import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import logoUrl from '../assets/logo.svg';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground pb-20">
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt="Logo" className="h-6 w-6" />
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
          <p className="text-muted-foreground mb-12 italic">Last updated: March 30, 2026</p>

          <div className="prose prose-stone max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using the OpsBridge US platform, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                OpsBridge US provides a marketplace platform that connects international clients with US-based business operations providers. We facilitate discovery, compliance verification, and project scoping. OpsBridge US is a facilitator and is not a party to any agreements created between users.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. User Eligibility and Accounts</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>To use our services, you must:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Be at least 18 years of age and have the legal capacity to enter into a binding contract.</li>
                  <li>Provide accurate, current, and complete information during registration.</li>
                  <li>Maintain the security of your password and accept all risks of unauthorized access to your account.</li>
                  <li>Notify us immediately if you discover or suspect any security breaches related to the platform.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. User Responsibilities</h2>
              <div className="space-y-4 text-muted-foreground">
                <p><strong>For Clients:</strong> You are responsible for providing clear project requirements, conducting your own due diligence on providers, and ensuring timely payments for services rendered.</p>
                <p><strong>For Providers:</strong> You must maintain valid US business credentials, provide services in a professional manner, and comply with all applicable US labor and business laws.</p>
                <p><strong>Compliance:</strong> All users must comply with US export control laws and international trade regulations.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                The platform and its original content, features, and functionality are owned by OpsBridge US and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. Users retain ownership of the data they upload, but grant OpsBridge US a license to use it solely for providing the service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Confidentiality</h2>
              <p className="text-muted-foreground leading-relaxed">
                Users may gain access to confidential information of other users through the platform. You agree to maintain the confidentiality of such information and not disclose it to any third party without express written consent.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                In no event shall OpsBridge US, nor its directors, employees, or partners, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, or other intangible losses, resulting from your access to or use of the platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Governing Law & Dispute Resolution</h2>
              <p className="text-muted-foreground leading-relaxed">
                These terms shall be governed by the laws of the State of Delaware. Any dispute arising out of or relating to these terms shall be settled by binding arbitration in Wilmington, Delaware, in accordance with the commercial arbitration rules of the American Arbitration Association.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify or replace these terms at any time. We will provide at least 30 days' notice prior to any new terms taking effect. By continuing to access or use our service after those revisions become effective, you agree to be bound by the revised terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">10. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                Questions about the Terms of Service should be sent to us at legal@opsbridge.us.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
