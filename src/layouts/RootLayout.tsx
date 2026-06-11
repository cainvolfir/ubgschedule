import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

interface RootLayoutProps {
  currentStep?: number;
}

export function RootLayout({ currentStep }: RootLayoutProps) {
  return (
    <div className="min-h-dvh bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Navbar currentStep={currentStep} />
      <main className="px-0">
        <Outlet />
      </main>
    </div>
  );
}
