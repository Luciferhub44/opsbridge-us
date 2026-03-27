import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 selection:bg-zinc-900 selection:text-white pb-20">
      <nav className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-white text-xs font-bold">O</div>
            <span className="text-lg font-semibold tracking-tight">OpsBridge US</span>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div>
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-zinc-500 mb-12 italic">Last updated: March 19, 2026</p>

          <div className="prose prose-zinc max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
              <p className="text-zinc-600 leading-relaxed">
                At OpsBridge US, we take your privacy and the security of your business data seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform to manage US operational projects.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
              <p className="text-zinc-600 leading-relaxed mb-4">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600">
                <li><strong>Account Information:</strong> Name, email address, company details, and professional credentials.</li>
                <li><strong>Compliance Data:</strong> Articles of Incorporation, Tax IDs (EIN), and other regulatory documents uploaded to the Compliance Vault.</li>
                <li><strong>Project Data:</strong> Operational needs, Statements of Work, and communication between clients and providers.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
              <p className="text-zinc-600 leading-relaxed mb-4">
                We use the collected information to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600">
                <li>Facilitate matching between international clients and US providers.</li>
                <li>Verify the identity and legitimacy of US business entities.</li>
                <li>Securely store and exchange sensitive operational documents.</li>
                <li>Improve our scoping and matching algorithms.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Data Security</h2>
              <p className="text-zinc-600 leading-relaxed">
                We implement enterprise-grade security measures, including end-to-end encryption for documents in the Compliance Vault. Access to sensitive data is strictly controlled through role-based permissions and multi-factor authentication.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Contact Us</h2>
              <p className="text-zinc-600 leading-relaxed">
                If you have any questions about this Privacy Policy, please contact our data protection officer at privacy@opsbridge.us.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
