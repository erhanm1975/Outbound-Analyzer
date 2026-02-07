import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface RichTooltipProps {
    content: React.ReactNode;
    children?: React.ReactNode;
    className?: string; // Wrapper class
    trigger?: React.ReactNode; // Optional custom trigger (default: Info icon)
    style?: React.CSSProperties; // Added for dynamic styles (e.g. width)
}

export function RichTooltip({ content, children, className, trigger, style }: RichTooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            // Position above the element, centered horizontally
            // 12px gap
            setPosition({
                top: rect.top - 12,
                left: rect.left + rect.width / 2
            });
        }
    };

    const handleMouseEnter = () => {
        updatePosition();
        setIsVisible(true);
    };

    useEffect(() => {
        if (isVisible) {
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isVisible]);

    return (
        <div
            ref={triggerRef}
            className={cn("inline-flex items-center cursor-help", className)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setIsVisible(false)}
            style={style}
        >
            {/* If children provided, wrap them. If not, showing standard Info icon */}
            {children || trigger || <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors" />}

            {isVisible && createPortal(
                <div
                    className="fixed z-[9999] pointer-events-none transition-all duration-200"
                    style={{ top: position.top, left: position.left }}
                >
                    {/* Tooltip Body */}
                    <div className="relative transform -translate-x-1/2 -translate-y-full w-72 p-3 bg-slate-800/95 text-white text-xs rounded-xl shadow-xl backdrop-blur-sm border border-white/10">
                        {content}

                        {/* Arrow (Down) */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800/95"></div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
