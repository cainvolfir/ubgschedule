import { Outlet } from 'react-router-dom';
import { MatrixRain } from '../components/MatrixRain';

interface RootLayoutProps {
  currentStep?: number;
  statusText?: string;
}

export function RootLayout({ currentStep, statusText }: RootLayoutProps) {
  const showWizard = currentStep !== undefined;

  return (
    <div className="min-h-dvh bg-background text-foreground relative">
      {/* Matrix rain background */}
      <MatrixRain />

      {/* Centered terminal card */}
      <div className="relative z-10 min-h-dvh flex items-center justify-center p-4">
        <div className="card">

          {/* Title bar */}
          <div className="titlebar">
            <div className="titlebar-dots">
              <div className="dot dot-red" />
              <div className="dot dot-amber" />
              <div className="dot dot-green" />
            </div>
            <div className="titlebar-title">UBG_SCHEDULE.sh — bash</div>
            <div className="titlebar-status">
              <div className="status-dot" />
              ONLINE
            </div>
          </div>

          {/* Body */}
          <div className="card-body">
            <Outlet />
          </div>

          {/* Footer */}
          {showWizard && (
            <div className="footer">
              <span>SYS.STATUS: ACTIVE</span>
              <span className="footer-uptime">
                {statusText || `step ${currentStep + 1}/3`}
              </span>
              <span>V2.0.0</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
