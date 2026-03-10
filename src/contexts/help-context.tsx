import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HelpContextType {
    isOpen: boolean;
    content: ReactNode | null;
    openHelp: (content: ReactNode) => void;
    closeHelp: () => void;
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

export function HelpProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [content, setContent] = useState<ReactNode | null>(null);

    const openHelp = (newContent: ReactNode) => {
        setContent(newContent);
        setIsOpen(true);
    };

    const closeHelp = () => {
        setIsOpen(false);
        setTimeout(() => setContent(null), 300); // Wait for animation
    };

    return (
        <HelpContext.Provider value={{ isOpen, content, openHelp, closeHelp }}>
            {children}
            <HelpDrawer />
        </HelpContext.Provider>
    );
}

export function useHelp() {
    const context = useContext(HelpContext);
    if (context === undefined) {
        throw new Error('useHelp must be used within a HelpProvider');
    }
    return context;
}

function HelpDrawer() {
    const { isOpen, content, closeHelp } = useHelp();

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
                    onClick={closeHelp}
                />
            )}

            {/* Slide-out Panel */}
            <div
                className={`fixed top-0 right-0 h-full w-full md:w-[600px] lg:w-[800px] bg-slate-950 border-l border-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                            <span className="material-symbols-outlined">menu_book</span>
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">User Guide Reference</h2>
                    </div>
                    <button
                        onClick={closeHelp}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    {content}
                </div>
            </div>
        </>
    );
}
