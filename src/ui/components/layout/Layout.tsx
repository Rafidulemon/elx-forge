import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { StatusBar } from './StatusBar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
      <StatusBar />
    </div>
  );
}