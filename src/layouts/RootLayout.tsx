import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

export function RootLayout() {
  return (
    <div className="min-h-dvh bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Navbar />
      <main className="px-0">
        <Outlet />
      </main>
    </div>
  );
}
