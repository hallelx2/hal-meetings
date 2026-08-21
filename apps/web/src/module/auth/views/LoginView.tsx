import Link from 'next/link';
import { HalWordmark } from '@/components/shared/HalWordmark';
import { GoogleSignInButton } from '@/module/auth/components/GoogleSignInButton';

export function LoginView({ next }: { next: string }) {
  return (
    <main className="min-h-svh bg-canvas-white text-ink flex flex-col">
      <header className="px-5 lg:px-8 h-[68px] flex items-center brutal-border-2 border-t-0 border-l-0 border-r-0">
        <Link href="/" aria-label="Hal home">
          <HalWordmark size="sm" />
        </Link>
      </header>
      <section className="flex-1 flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-[440px] brutal-border-2 p-8 flex flex-col gap-6">
          <p className="text-[12px] font-bold uppercase tracking-adora text-ink/50">Sign in</p>
          <h1 className="text-[36px] leading-[0.95]">Sign in to Hal</h1>
          <p className="text-[16px] text-ink/75 leading-relaxed">
            Google tells Hal your name and email — nothing else. Calendar access is a separate
            step you take later, from inside the app, and Hal never requests Gmail.
          </p>
          <GoogleSignInButton next={next} />
          <p className="text-[13px] text-ink/55">
            By continuing you agree to the{' '}
            <Link href="/privacy" className="underline underline-offset-2">
              privacy notice
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
