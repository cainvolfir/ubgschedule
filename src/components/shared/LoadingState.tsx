import { useRef, useEffect } from 'react';

interface LoadingStateProps {
  icon: React.ReactNode;
  title: string;
  stripeColor: string;
  log: string;
}

export default function LoadingState({ icon, title, stripeColor, log }: LoadingStateProps) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  return (
    <div className="bg-white border-2 border-black p-8 rounded-none shadow-brutal-xl flex flex-col items-center justify-center text-center gap-4">
      <div className="w-20 h-20 bg-background border-2 border-black rounded-none flex items-center justify-center">
        {icon}
      </div>
      <h3 className="font-extrabold text-xl animate-pulse">{title}</h3>
      <div className="w-full h-8 bg-white border-2 border-black p-1">
        <div className={`w-full h-full ${stripeColor} loading-stripes border-r-2 border-black`} />
      </div>
      <div ref={logRef} className="font-medium text-sm mt-2 text-left w-full h-20 overflow-y-auto bg-gray-100 border-2 border-black p-2 font-mono text-xs whitespace-pre-wrap">
        {log}
      </div>
    </div>
  );
}
