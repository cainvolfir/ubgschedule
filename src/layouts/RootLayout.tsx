import { Navbar } from '../components/Navbar';

export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
