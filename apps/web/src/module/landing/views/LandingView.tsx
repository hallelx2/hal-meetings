import { SiteNav } from '@/components/layout/SiteNav';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { LandingHero } from '@/module/landing/components/LandingHero';
import { LandingAnatomy } from '@/module/landing/components/LandingAnatomy';
import { LandingManifesto } from '@/module/landing/components/LandingManifesto';
import { LandingComparison } from '@/module/landing/components/LandingComparison';
import { LandingFeatures } from '@/module/landing/components/LandingFeatures';
import { LandingFourQuestions } from '@/module/landing/components/LandingFourQuestions';
import { LandingPrivacy } from '@/module/landing/components/LandingPrivacy';
import { LandingSelfHost } from '@/module/landing/components/LandingSelfHost';
import { LandingRoadmap } from '@/module/landing/components/LandingRoadmap';
import { LandingFaq } from '@/module/landing/components/LandingFaq';
import { LandingWaitlist } from '@/module/landing/components/LandingWaitlist';

export function LandingView() {
  return (
    <main className="bg-canvas-white text-ink overflow-x-hidden">
      <SiteNav />
      <LandingHero />
      <LandingAnatomy />
      <LandingManifesto />
      <LandingComparison />
      <LandingFeatures />
      <LandingFourQuestions />
      <LandingPrivacy />
      <LandingSelfHost />
      <LandingRoadmap />
      <LandingFaq />
      <LandingWaitlist />
      <SiteFooter />
    </main>
  );
}
