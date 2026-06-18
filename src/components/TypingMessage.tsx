import { useState, useEffect, useCallback } from 'react';
import { UBGMascot } from './UBGMascot';

interface TypingMessageProps {
  messages: string[];
  typingSpeed?: number;
  pauseDuration?: number;
}

/**
 * Terminal-style typing message with blinking cursor.
 * All text is left-aligned, monospaced, terminal-colored.
 */
export function TypingMessage({
  messages,
  typingSpeed = 40,
  pauseDuration = 4000,
}: TypingMessageProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  const currentMessage = messages[msgIndex] || '';

  useEffect(() => {
    if (isPaused) return;

    if (displayed.length < currentMessage.length) {
      const timeout = setTimeout(() => {
        setDisplayed(currentMessage.slice(0, displayed.length + 1));
      }, typingSpeed);
      return () => clearTimeout(timeout);
    } else {
      setIsPaused(true);
      const timeout = setTimeout(() => {
        setIsPaused(false);
        setDisplayed('');
        setMsgIndex((prev) => (prev + 1) % messages.length);
      }, pauseDuration);
      return () => clearTimeout(timeout);
    }
  }, [displayed, isPaused, currentMessage, messages, typingSpeed, pauseDuration]);

  const handleClick = useCallback(() => {
    setDisplayed('');
    setMsgIndex((prev) => (prev + 1) % messages.length);
    setIsPaused(false);
  }, [messages.length]);

  if (messages.length === 0) return null;

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 text-left cursor-pointer group w-full"
      aria-label={`UGO says: ${currentMessage}`}
    >
      <UBGMascot pose="idle" size={18} />
      <span className="flex items-center gap-0 font-mono text-xs">
        <span className="text-[var(--blue)]">❯</span>
        <span className="text-[var(--text-muted)] ml-1">{displayed}</span>
        <span className="inline-block w-[6px] h-[12px] bg-[var(--blue)] animate-cursor-blink ml-0.5" />
      </span>
    </button>
  );
}
