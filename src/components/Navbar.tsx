import { useState } from 'react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { UBGMascot } from './UBGMascot';

const mascotMessages = [
  "Let's build your schedule! 🎓",
  "Upload your theory classes first!",
  "You're doing great! ⭐",
  "Almost there! 🚀",
  "UGO believes in you! 💙",
];

export function Navbar() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [showBubble, setShowBubble] = useState(false);

  const handleMascotClick = () => {
    setMsgIndex((prev) => (prev + 1) % mascotMessages.length);
    setShowBubble(true);
    setTimeout(() => setShowBubble(false), 2500);
  };

  return (
    <nav
      className="sticky top-0 z-50 border-b border-[var(--border)] bg-card/80 backdrop-blur-xl"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-14 items-center justify-between px-3 sm:h-16 sm:px-4 lg:px-8">
        {/* Left: Mascot + Title */}
        <div className="flex items-center gap-2">
          {/* Mascot with speech bubble */}
          <div className="relative">
            <button
              onClick={handleMascotClick}
              className="group relative flex items-center justify-center rounded-xl border-2 border-[var(--primary)]/30 bg-primary/5 p-1 transition-all duration-200 hover:border-[var(--primary)]/60 hover:bg-primary/10 hover:scale-105 active:scale-95 cursor-pointer"
              style={{ filter: 'drop-shadow(0 0 4px var(--primary-glow))' }}
              aria-label="UGO mascot — click for a message!"
            >
              <UBGMascot pose="idle" size={24} />
            </button>

            {/* Speech bubble */}
            {showBubble && (
              <div
                className="absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap rounded-lg border border-[var(--border)] bg-card px-3 py-1.5 shadow-lg animate-fade-in-up z-50"
                style={{ animationDuration: '0.2s' }}
              >
                <span className="pixel-font text-[7px] text-foreground leading-tight">
                  {mascotMessages[msgIndex]}
                </span>
                {/* Bubble arrow */}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-card" />
              </div>
            )}
          </div>

          {/* Title */}
          <div className="flex flex-col">
            <h1 className="pixel-font text-[10px] leading-none tracking-wide sm:text-xs font-bold text-foreground">
              UBG Schedule
            </h1>
            <span className="pixel-font text-[6px] text-[var(--primary)] leading-none mt-0.5 hidden sm:inline">
              ✨ by UGO
            </span>
          </div>
        </div>

        {/* Right: Theme switcher */}
        <ThemeSwitcher />
      </div>
    </nav>
  );
}

export default Navbar;
