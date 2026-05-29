import { ThemeSwitcher } from './ThemeSwitcher';

export function Navbar() {
  return (
    <nav className="border-b-2 border-black dark:border-zinc-700">
      <div className="mx-auto flex h-12 max-w-sm items-center justify-between px-3">
        <h1 className="pixel-font text-[10px] leading-none tracking-wide sm:text-xs">
          UniSchedule
        </h1>
        <ThemeSwitcher />
      </div>
    </nav>
  );
}
