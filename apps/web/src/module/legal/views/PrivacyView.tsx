import Link from 'next/link';
import { SiteNav } from '@/components/layout/SiteNav';
import { SiteFooter } from '@/components/layout/SiteFooter';

export function PrivacyView() {
  return (
    <main className="bg-canvas-white text-ink">
      <SiteNav />
      <article className="mx-auto max-w-[720px] px-5 lg:px-8 py-16 flex flex-col gap-6">
        <p className="text-[12px] font-bold uppercase tracking-adora text-ink/50">Legal</p>
        <h1 className="text-[48px] leading-[0.95]">Privacy</h1>
        <p className="text-[17px] leading-relaxed text-ink/80">
          Hal is a disclosed meeting agent. When you sign in with Google we request identity and
          Calendar read access so we can list events that contain Meet links. We do not request
          Gmail send or modify.
        </p>
        <p className="text-[17px] leading-relaxed text-ink/80">
          OAuth access and refresh tokens are envelope-encrypted with your user data key before
          they are stored. They are never sent to the browser. You can disconnect Google at any
          time from the app; that deletes the stored token row.
        </p>
        <p className="text-[17px] leading-relaxed text-ink/80">
          Support: <a className="underline" href="mailto:founder@hallelx2.com">founder@hallelx2.com</a>
        </p>
        <Link href="/login" className="text-[14px] font-bold uppercase tracking-adora underline">
          Back to sign in
        </Link>
      </article>
      <SiteFooter />
    </main>
  );
}
