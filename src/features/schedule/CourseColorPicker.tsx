import { useState, useCallback } from 'react';
import { Palette, X } from 'lucide-react';
import { Button } from '../../components/ui/pixelact-ui/button';
import { cn } from '../../lib/utils';

const PRESET_COLORS = [
  '#3b82f6', '#0d9488', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#10b981', '#f97316', '#06b6d4', '#6366f1',
  '#84cc16', '#e11d48', '#0ea5e9', '#d946ef', '#14b8a6',
];

interface CourseColorPickerProps {
  courseName: string;
  currentColor: string | undefined;
  onSetColor: (courseName: string, color: string) => void;
}

export function CourseColorPicker({ courseName, currentColor, onSetColor }: CourseColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = useCallback(
    (color: string) => {
      onSetColor(courseName, color);
      setIsOpen(false);
    },
    [courseName, onSetColor],
  );

  const handleClear = useCallback(() => {
    onSetColor(courseName, '');
    setIsOpen(false);
  }, [courseName, onSetColor]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all hover:scale-110',
          currentColor ? 'border-transparent' : 'border-[var(--border)] text-muted-foreground hover:text-foreground',
        )}
        style={currentColor ? { backgroundColor: currentColor, borderColor: currentColor } : undefined}
        title={currentColor ? `Color: ${currentColor} — click to change` : 'Set color'}
      >
        <Palette size={10} className={currentColor ? 'text-white' : ''} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-8 z-50 w-52 rounded-xl border-2 border-[var(--border)] bg-card-solid p-3 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-foreground">Pick Color</p>
              <button onClick={() => setIsOpen(false)} className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors">
                <X size={12} />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-1.5 mb-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleSelect(color)}
                  className={cn(
                    'h-7 w-7 rounded-lg border-2 transition-all hover:scale-110',
                    currentColor === color ? 'border-white ring-2 ring-[var(--primary)] scale-110' : 'border-transparent',
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            {currentColor && (
              <button
                onClick={handleClear}
                className="w-full rounded-lg border border-[var(--border)] py-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Remove color
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* Inline color dot for table rows */
export function ColorDot({ color, onClick }: { color?: string; onClick?: () => void }) {
  if (!color) return <span className="inline-block w-2.5 h-2.5 shrink-0" />;
  return (
    <span
      className={cn('inline-block w-2.5 h-2.5 rounded-full shrink-0', onClick && 'cursor-pointer hover:scale-125 transition-transform')}
      style={{ backgroundColor: color }}
      onClick={onClick}
    />
  );
}
