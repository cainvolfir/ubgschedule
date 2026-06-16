import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

interface RootLayoutProps {
  currentStep?: number;
}

export function RootLayout({ currentStep }: RootLayoutProps) {
  return (
    <div className="min-h-dvh bg-background text-foreground relative overflow-hidden">
      {/* Decorative background orbs */}
      <div className="fixed top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" aria-hidden="true" />
      <div className="fixed bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-secondary/5 blur-[120px] pointer-events-none" aria-hidden="true" />

      <Navbar currentStep={currentStep} />
      <main className="relative z-10 px-0" id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
