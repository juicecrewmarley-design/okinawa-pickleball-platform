import { ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
};

export function PageShell({ children, eyebrow, title, description }: PageShellProps) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
      <div className="mb-7">
        {eyebrow ? <p className="mb-2 text-sm font-black uppercase tracking-[0.2em] text-coral-600">{eyebrow}</p> : null}
        <h1 className="text-3xl font-black leading-tight text-ink sm:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{description}</p> : null}
      </div>
      {children}
    </main>
  );
}
