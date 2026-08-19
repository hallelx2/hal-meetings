import Link from 'next/link';
import { HalWordmark } from '@/components/shared/HalWordmark';
import { SessionActions } from '@/module/cockpit/components/SessionActions';

export function CockpitView(props: {
  email: string;
  name: string | null;
  googleConnected: boolean;
}) {
  return (
    <main className="min-h-svh bg-canvas-white text-ink">
      <header className="px-5 lg:px-8 h-[68px] flex items-center justify-between brutal-border-2 border-t-0 border-l-0 border-r-0">
        <Link href="/" aria-label="Hal home">
          <HalWordmark size="sm" />
        </Link>
        <span className="text-[13px] font-bold uppercase tracking-adora text-ink/55">
          {props.email}
        </span>
      </header>
      <section className="mx-auto max-w-[640px] px-5 py-16 flex flex-col gap-6">
        <p className="text-[12px] font-bold uppercase tracking-adora text-ink/50">Cockpit</p>
        <h1 className="text-[40px] leading-[0.95]">
          {props.name ? `Hi, ${props.name}` : 'You are signed in'}
        </h1>
        <p className="text-[16px] text-ink/75 leading-relaxed">
          {props.googleConnected
            ? 'Google Calendar is connected. Tokens are stored encrypted and are not sent to this page.'
            : 'Google Calendar is not connected. Sign in with Google again to grant Calendar read access.'}
        </p>
        <SessionActions googleConnected={props.googleConnected} />
      </section>
    </main>
  );
}
