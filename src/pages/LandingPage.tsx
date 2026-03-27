import { ArrowRight, ShieldCheck, Globe, Zap, Building2, Briefcase, CheckCircle2, UserPlus, Search, Rocket, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 selection:bg-zinc-900 selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-bottom border-zinc-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-900 text-white font-bold">O</div>
            <span className="text-xl font-semibold tracking-tight">OpsBridge US</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">How it Works</a>
            <Link to="/auth">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Now Onboarding Elite US Operational Partners
            </div>
            <h1 className="text-6xl font-extrabold tracking-tighter sm:text-8xl lg:text-9xl leading-[0.85] uppercase">
              The Gateway for <br />
              <span className="italic font-serif text-zinc-400 normal-case font-light">US Business</span> <br />
              Leaders.
            </h1>
            <p className="mt-8 text-xl text-zinc-600 leading-relaxed max-w-2xl">
              OpsBridge US connects seasoned American operational experts with high-value international expansion projects. We handle the vetting, you handle the growth.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link to="/auth">
                <Button size="lg" className="h-14 px-8 text-lg gap-2 rounded-full">
                  Apply as Provider <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-4 px-4">
                <div className="flex -space-x-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-10 w-10 rounded-full border-2 border-white bg-zinc-200 overflow-hidden">
                      <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
                <div className="text-sm font-medium text-zinc-500">
                  Joined by 200+ US experts
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background Accent */}
        <div className="absolute top-0 right-0 -z-10 h-full w-1/2 bg-gradient-to-l from-zinc-100/50 to-transparent pointer-events-none" />
      </section>

      {/* Trust Section */}
      <section className="border-y border-zinc-200 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4">Trusted by Global Entities</h2>
            <div className="flex flex-wrap justify-center gap-12 opacity-40 grayscale">
              {['Manufacturing', 'Logistics', 'Compliance', 'Supply Chain', 'Legal'].map(name => (
                <span key={name} className="text-2xl font-bold italic font-serif">{name}</span>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="text-4xl font-bold text-zinc-900">$1.2B+</div>
              <p className="text-zinc-500 font-medium">In total project volume managed through our platform partners.</p>
            </div>
            <div className="space-y-4">
              <div className="text-4xl font-bold text-zinc-900">100%</div>
              <p className="text-zinc-500 font-medium">Compliance success rate for international entities entering the US market.</p>
            </div>
            <div className="space-y-4">
              <div className="text-4xl font-bold text-zinc-900">48h</div>
              <p className="text-zinc-500 font-medium">Average time to match verified providers with high-priority admin-pushed projects.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Provider Benefits */}
      <section id="features" className="py-24 lg:py-32 bg-zinc-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-20 max-w-2xl">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">Why Partner with OpsBridge?</h2>
            <p className="mt-4 text-lg text-zinc-400">
              We provide the infrastructure. You provide the expertise.
            </p>
          </div>
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Admin-Pushed Projects',
                desc: 'No bidding wars. Projects are vetted by our internal team and pushed directly to qualified providers.',
                icon: Zap,
              },
              {
                title: 'Secure Documents',
                desc: 'Securely manage and exchange sensitive documents like EINs, Nexus filings, and Articles of Incorporation.',
                icon: ShieldCheck,
              },
              {
                title: 'Automated SOWs',
                desc: 'Our platform transforms client needs into structured Statements of Work, saving you hours of administrative work.',
                icon: Briefcase,
              },
              {
                title: 'Global Payments',
                desc: 'Receive payments in USD via our secure escrow layer. No international wire transfer headaches.',
                icon: Globe,
              },
              {
                title: 'Direct Admin Support',
                desc: 'Our platform admins act as project managers, ensuring smooth communication and clear milestones.',
                icon: Building2,
              },
              {
                title: 'Verified Status',
                desc: 'Gain a "Verified US Provider" badge that signals trust to international enterprise leaders.',
                icon: ShieldCheck,
              },
            ].map((feature, i) => (
              <div key={i} className="group">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white transition-transform group-hover:scale-110 border border-white/10">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="mt-3 text-zinc-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 lg:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">How it Works</h2>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              A streamlined path from application to project execution.
            </p>
          </div>

          <div className="relative">
            {/* Connection Line */}
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-zinc-100 -translate-y-1/2 hidden lg:block" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative">
              {[
                {
                  step: '01',
                  title: 'Apply & Vet',
                  desc: 'Submit your operational credentials. Our team reviews your US business history and expertise.',
                  icon: UserPlus,
                },
                {
                  step: '02',
                  title: 'Get Matched',
                  desc: 'Admins push high-value international projects directly to your dashboard based on your profile.',
                  icon: Search,
                },
                {
                  step: '03',
                  title: 'Execute & Manage',
                  desc: 'Use our secure workspace for document exchange, SOW generation, and milestone tracking.',
                  icon: Rocket,
                },
                {
                  step: '04',
                  title: 'Secure Payment',
                  desc: 'Receive automated USD payments via our secure escrow system upon milestone completion.',
                  icon: CreditCard,
                },
              ].map((item, i) => (
                <div key={i} className="relative bg-white p-8 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white font-bold text-xl">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Step {item.step}</div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-zinc-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mb-8">
                What our <span className="italic font-serif text-zinc-400">partners</span> say.
              </h2>
              <div className="space-y-8">
                {[
                  {
                    quote: "OpsBridge has completely transformed how we handle international expansion projects. The admin-pushed model means we focus on execution, not sales.",
                    author: "Sarah Jenkins",
                    role: "Operational Lead at Nexus US",
                    image: "https://picsum.photos/seed/sarah/100/100"
                  },
                  {
                    quote: "Managing documents here is a game-changer. Securely exchanging EINs and Articles of Incorporation has never been easier or more professional.",
                    author: "Michael Chen",
                    role: "Founder of Chen Compliance",
                    image: "https://picsum.photos/seed/michael/100/100"
                  }
                ].map((testimonial, i) => (
                  <div key={i} className="p-8 rounded-2xl bg-zinc-50 border border-zinc-100">
                    <p className="text-xl text-zinc-700 italic mb-6">"{testimonial.quote}"</p>
                    <div className="flex items-center gap-4">
                      <img src={testimonial.image} alt={testimonial.author} className="h-12 w-12 rounded-full grayscale" referrerPolicy="no-referrer" />
                      <div>
                        <div className="font-bold text-zinc-900">{testimonial.author}</div>
                        <div className="text-sm text-zinc-500">{testimonial.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative aspect-square rounded-3xl overflow-hidden grayscale">
              <img 
                src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000" 
                alt="Modern Office" 
                className="object-cover w-full h-full"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-zinc-900/20 mix-blend-multiply" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-zinc-50 border-y border-zinc-200">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-4xl font-bold tracking-tight sm:text-6xl mb-8">
            Ready to scale your <span className="italic font-serif text-zinc-400">operational impact?</span>
          </h2>
          <p className="text-xl text-zinc-600 mb-10 max-w-2xl mx-auto">
            Join the elite network of US operational partners bridging the gap for global business expansion.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="h-16 px-10 text-xl gap-2 rounded-full w-full sm:w-auto">
                Apply Now <ArrowRight className="h-6 w-6" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="h-16 px-10 text-xl rounded-full w-full sm:w-auto">
                View Open Projects
              </Button>
            </Link>
          </div>
          <div className="mt-12 flex items-center justify-center gap-8 text-zinc-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium">Verified Status</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium">Secure Payments</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium">Admin Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-white text-xs font-bold">O</div>
              <span className="text-lg font-semibold tracking-tight">OpsBridge US</span>
            </div>
            <p className="text-sm text-zinc-500">© 2026 OpsBridge US. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/privacy" className="text-sm text-zinc-500 hover:text-zinc-900">Privacy</Link>
              <Link to="/terms" className="text-sm text-zinc-500 hover:text-zinc-900">Terms</Link>
              <a href="mailto:support@opsbridge.us" className="text-sm text-zinc-500 hover:text-zinc-900">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
