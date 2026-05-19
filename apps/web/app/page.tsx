import { Nav } from '../components/nav';
import { Hero } from '../components/hero';
import { HowItWorks } from '../components/how-it-works';
import { Features } from '../components/features';
import { Platforms } from '../components/platforms';
import { SelfHost } from '../components/self-host';
import { Privacy } from '../components/privacy';
import { Faq } from '../components/faq';
import { Waitlist } from '../components/waitlist';
import { Footer } from '../components/footer';

export default function Page() {
  return (
    <main className="min-h-screen bg-canvas-white text-slate-text overflow-x-hidden">
      <Nav />
      <Hero />
      <Platforms />
      <HowItWorks />
      <Features />
      <SelfHost />
      <Privacy />
      <Faq />
      <Waitlist />
      <Footer />
    </main>
  );
}
