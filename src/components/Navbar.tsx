import { ThemeSwitcher } from './ThemeSwitcher';

export function Navbar() {
  return (
    <nav className="border-b-2 border-black dark:border-zinc-700">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4 lg:px-8">
        <h1 className="pixel-font text-xs leading-none tracking-wide">
          UBG Schedule
        </h1>
        <ThemeSwitcher />
      </div>
    </nav>
  );
}
