import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

export function RootLayout() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Navbar />
      <main>
        <Outlet />
      </main>
      <ThemeSwitcher />
    </div>
  );
}
