import { ThemeSwitcher } from './ThemeSwitcher';

export function Navbar() {
  return (
    <nav className="flex h-12 items-center justify-between border-b-2 border-black px-3 dark:border-zinc-700">
      <h1 className="pixel-font text-[10px] leading-none tracking-wide sm:text-xs">
        UniSchedule
      </h1>
      <ThemeSwitcher />
    </nav>
  );
}
