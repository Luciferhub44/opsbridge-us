import { ArrowRight, ShieldCheck, Globe, Zap, Building2, Briefcase, CheckCircle2, UserPlus, Search, Rocket, CreditCard, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Marquee } from '@/components/ui/marquee';

import brightway from '@/assets/partners/brightway.png';
import freightnet from '@/assets/partners/freightnet.png';
import innotek from '@/assets/partners/Innotek.png';
import mansfield from '@/assets/partners/Mansfield.png';
import nansteel from '@/assets/partners/Nansteel.png';
import tenral from '@/assets/partners/TenRal.png';
import wkCargo from '@/assets/partners/wk_cargo.svg';
import logoUrl from '@/assets/logo.svg';

export default function LandingPage() {
  const partners = [
    { name: 'Brightway', logo: brightway },
    { name: 'FreightNet', logo: freightnet },
    { name: 'InnoTek', logo: innotek },
    { name: 'Mansfield', logo: mansfield },
    { name: 'Nansteel', logo: nansteel },
    { name: 'TenRal', logo: tenral },
    { name: 'WK Cargo', logo: wkCargo },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="OpsBridge Logo" className="h-8 w-8" />
            <span className="text-xl font-bold tracking-tight text-foreground">OpsBridge US</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">Platform Features</a>
            <a href="#how-it-works" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
            <div className="flex items-center gap-4 border-l border-border pl-8">
              <Link to="/auth">
                <Button variant="ghost" className="font-semibold">Log in</Button>
              </Link>
              <Link to="/auth">
                <Button className="font-semibold shadow-sm rounded-full px-6">Partner With Us</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold text-primary shadow-sm uppercase tracking-widest">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              Accepting Elite US Operational Partners
            </div>
            <h1 className="text-5xl font-black tracking-tight sm:text-7xl lg:text-8xl leading-[1.1] text-foreground mb-6">
              The Premier Gateway for <br />
              <span className="text-primary relative inline-block">
                US Business Leaders.
                <div className="absolute -bottom-2 left-0 w-full h-3 bg-primary/20 -z-10 rounded-full blur-sm"></div>
              </span>
            </h1>
            <p className="mt-6 text-xl text-muted-foreground leading-relaxed max-w-2xl font-medium">
              OpsBridge securely connects verified American operational experts with fully-funded international expansion projects. We manage the vetting, compliance, and payments—you manage the execution.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link to="/auth">
                <Button size="lg" className="h-14 px-8 text-lg gap-2 rounded-full shadow-lg hover:shadow-xl transition-all">
                  Apply to Network <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-4 px-4 sm:ml-4">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-10 w-10 rounded-full border-2 border-background bg-muted overflow-hidden shadow-sm">
                      <img src={`https://picsum.photos/seed/corporate${i}/100/100`} alt="Partner" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
                <div className="text-sm font-bold text-muted-foreground">
                  Joined by 200+ <br/> US Agencies
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background Corporate Accent */}
        <div className="absolute top-0 right-0 -z-10 h-full w-full lg:w-1/2 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
      </section>

      {/* Trust Section */}
      <section className="border-y border-border bg-muted/20 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground mb-8">Trusted by Global Enterprise Entities</h2>
            <div className="flex w-full items-center justify-center overflow-hidden">
              <Marquee pauseOnHover className="[--duration:40s] flex items-center justify-center opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                {partners.map((partner) => (
                  <div key={partner.name} className="mx-12 flex h-14 w-36 items-center justify-center">
                    <img
                      src={partner.logo}
                      alt={partner.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ))}
              </Marquee>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 mt-20">
            <div className="space-y-3 border-l-2 border-primary pl-6">
              <div className="text-4xl font-black text-foreground">$1.2B+</div>
              <p className="text-muted-foreground font-semibold text-sm leading-relaxed">In total cross-border project volume managed through our platform partners.</p>
            </div>
            <div className="space-y-3 border-l-2 border-primary pl-6">
              <div className="text-4xl font-black text-foreground">100%</div>
              <p className="text-muted-foreground font-semibold text-sm leading-relaxed">Compliance success rate for international entities entering the US market securely.</p>
            </div>
            <div className="space-y-3 border-l-2 border-primary pl-6">
              <div className="text-4xl font-black text-foreground">48h</div>
              <p className="text-muted-foreground font-semibold text-sm leading-relaxed">Average time to match verified providers with high-priority enterprise projects.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Provider Benefits */}
      <section id="features" className="py-24 lg:py-32 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 max-w-3xl">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Enterprise Infrastructure</h2>
            <h3 className="text-3xl font-black tracking-tight sm:text-5xl text-foreground">Why Partner with OpsBridge?</h3>
            <p className="mt-4 text-lg text-muted-foreground font-medium leading-relaxed">
              We provide the secure infrastructure, legal frameworks, and guaranteed payment systems. You provide the operational expertise.
            </p>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Exclusive Project Flow',
                desc: 'No bidding wars. High-value projects are vetted by our internal team and routed directly to qualified providers.',
                icon: Zap,
              },
              {
                title: 'Secure Document Vault',
                desc: 'Safely exchange sensitive documents like EINs, Nexus filings, and Contracts with AES-256 military-grade encryption.',
                icon: ShieldCheck,
              },
              {
                title: 'Automated Agreements',
                desc: 'Our platform instantly generates mutually binding NDAs and MOUs, saving you hours of legal administrative work.',
                icon: Briefcase,
              },
              {
                title: 'Guaranteed Payments',
                desc: 'Client funds are secured upfront via American Express. Receive automated USD payouts upon milestone completion.',
                icon: CreditCard,
              },
              {
                title: 'Dedicated Admin Support',
                desc: 'Our platform administrators act as operational facilitators, ensuring smooth communication and clear deliverables.',
                icon: Building2,
              },
              {
                title: 'Verified Status',
                desc: 'Achieve a "Verified US Provider" badge that signals immediate trust to international enterprise leaders.',
                icon: CheckCircle2,
              },
            ].map((feature, i) => (
              <div key={i} className="group p-8 rounded-2xl bg-card border border-border hover:shadow-lg hover:border-primary/30 transition-all duration-300 flex flex-col h-full">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  <feature.icon className="h-7 w-7" />
                </div>
                <h4 className="text-xl font-bold text-foreground mb-3">{feature.title}</h4>
                <p className="text-muted-foreground leading-relaxed font-medium text-sm flex-1">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 lg:py-32 bg-muted/10 border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Operational Flow</h2>
            <h3 className="text-3xl font-black tracking-tight sm:text-5xl mb-4 text-foreground">A Streamlined Pipeline</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
              From application to execution, our platform handles the friction so you can focus on delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {[
              {
                step: '01',
                title: 'Apply & Verify',
                desc: 'Submit your business credentials for our fast, secure 1-3 day compliance review.',
                icon: UserPlus,
              },
              {
                step: '02',
                title: 'Review Scopes',
                desc: 'Access detailed, rich-text Statements of Work from funded international clients.',
                icon: Search,
              },
              {
                step: '03',
                title: 'Sign & Execute',
                desc: 'Automatically sign NDAs/MOUs, manage task milestones, and communicate in real-time.',
                icon: Rocket,
              },
              {
                step: '04',
                title: 'Get Paid',
                desc: 'Receive reliable, 1-5 day payouts directly to your corporate account upon completion.',
                icon: Globe,
              },
            ].map((item, i) => (
              <div key={i} className="relative bg-background p-8 rounded-2xl border border-border shadow-sm flex flex-col">
                <div className="mb-6 flex items-center justify-between">
                   <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
                     <item.icon className="h-6 w-6" />
                   </div>
                   <div className="text-4xl font-black text-muted/50">{item.step}</div>
                </div>
                <h4 className="text-xl font-bold mb-3 text-foreground">{item.title}</h4>
                <p className="text-muted-foreground leading-relaxed text-sm font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-32 bg-card relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 pattern-grid-lg opacity-50" />
        <div className="mx-auto max-w-4xl px-4 text-center relative z-10">
          <h2 className="text-4xl font-black tracking-tight sm:text-6xl mb-6 text-foreground">
            Ready to scale your <br/> B2B operational revenue?
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
            Join the elite network of US operational partners bridging the gap for global business expansion.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="h-14 px-10 text-lg font-bold gap-2 rounded-full shadow-lg hover:shadow-xl transition-all w-full sm:w-auto">
                Join the Network <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="h-14 px-10 text-lg font-bold rounded-full w-full sm:w-auto bg-background">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt="OpsBridge Logo" className="h-6 w-6 grayscale opacity-80" />
              <span className="text-lg font-bold tracking-tight text-foreground">OpsBridge US</span>
            </div>
            <p className="text-sm text-muted-foreground font-medium">© 2026 OpsBridge Platform. All rights reserved.</p>
            <div className="flex gap-8">
              <Link to="/privacy" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
