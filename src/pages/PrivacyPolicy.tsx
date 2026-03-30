import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import logoUrl from '../assets/logo.svg';

export default function PrivacyPolicy() {
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
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground mb-12 italic">Last updated: March 30, 2026</p>

          <div className="prose prose-stone max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                OpsBridge US ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our platform to manage US operational projects. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
              <div className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  We collect information that you provide directly to us when you register for an account, create or modify your profile, or communicate with us. This includes:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>Personal Identifiers:</strong> Name, email address, phone number, and professional title.</li>
                  <li><strong>Business Information:</strong> Company name, tax identification numbers (EIN), articles of incorporation, and business addresses.</li>
                  <li><strong>Compliance Documentation:</strong> Regulatory documents uploaded to our Compliance Vault for identity and legitimacy verification.</li>
                  <li><strong>Project Data:</strong> Statements of Work, operational requirements, and correspondence between clients and providers.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use the information we collect for various purposes, including to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Facilitate and optimize the matching process between international clients and US providers.</li>
                <li>Verify the legal standing and identity of US business entities.</li>
                <li>Operate, maintain, and improve our platform features and services.</li>
                <li>Process transactions and send related information, including confirmations and invoices.</li>
                <li>Send technical notices, updates, security alerts, and support messages.</li>
                <li>Monitor and analyze trends, usage, and activities in connection with our services.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Data Sharing and Disclosure</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We do not sell your personal information. We may share your information in the following situations:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Between Users:</strong> To facilitate the matching and project management process, limited information is shared between potential clients and providers.</li>
                <li><strong>Service Providers:</strong> With third-party vendors who perform services for us (e.g., payment processing, hosting, data analysis).</li>
                <li><strong>Legal Obligations:</strong> If required to do so by law or in response to valid requests by public authorities.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Data Security & Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement enterprise-grade security measures, including end-to-end encryption for documents in the Compliance Vault. We retain your information for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required or permitted by law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Your Privacy Rights</h2>
              <p className="text-muted-foreground leading-relaxed">
                Depending on your location, you may have the right to access, correct, or delete your personal data. You may also have the right to object to or restrict certain processing. To exercise these rights, please contact us at the email provided below.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions or concerns about this Privacy Policy or our data practices, please contact our Data Protection Officer at:
                <br /><br />
                <strong>Email:</strong> privacy@opsbridge.us<br />
                <strong>Address:</strong> OpsBridge US, 1209 Orange St, Wilmington, DE 19801
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
