import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { IconGrid, IconSettings, IconTerminal } from '../ui/icons';
import { APP_NAME, APP_VERSION } from '@shared/constants';

interface NavItem {
  to: string;
  label: string;
  icon: (props: { width?: number; height?: number }) => ReactNode;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Projects', icon: (p) => <IconGrid {...p} />, end: true },
  { to: '/console', label: 'Console', icon: (p) => <IconTerminal {...p} /> },
  { to: '/settings', label: 'Settings', icon: (p) => <IconSettings {...p} /> },
];

function Sidebar() {
  return (
    <aside className="flex flex-col border-r border-line bg-panel">
      <div className="flex h-[52px] items-center gap-2 border-b border-line px-3">
        <img src="/icons/logo.png" alt="ELX Forge" className="h-7 w-7 shrink-0 object-contain" />
        <div className="leading-tight">
          <p className="text-[12px] font-semibold">{APP_NAME}</p>
          <p className="text-[10px] text-ink-dim">v{APP_VERSION}</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded px-2.5 py-2 text-[13px] transition-colors',
                isActive ? 'bg-hover text-ink' : 'text-ink-dim hover:bg-hover/60 hover:text-ink',
              )
            }
          >
            {item.icon({ width: 16, height: 16 })}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;