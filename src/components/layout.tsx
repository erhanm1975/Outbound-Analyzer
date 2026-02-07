import { type ReactNode } from 'react';

// Simplified Layout: Just a shell for the Sidebar and Main Content
interface LayoutProps {
    children: ReactNode;
    sidebar: ReactNode;
}

export function Layout({ children, sidebar }: LayoutProps) {
    return (
        <div className="flex h-screen bg-[#111418] text-slate-200 overflow-hidden font-body transition-colors duration-200">
            {/* Sidebar (Passed as Prop) */}
            {sidebar}

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#111418] relative">
                {children}
            </main>
        </div>
    );
}
