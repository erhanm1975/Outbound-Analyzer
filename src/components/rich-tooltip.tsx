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
    const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
    const [arrowLeftPx, setArrowLeftPx] = useState<number | null>(null); // null = centered (50%)
    const triggerRef = useRef<HTMLDivElement>(null);

    const TOOLTIP_WIDTH = 288; // w-72 = 18rem = 288px
    const EDGE_PADDING = 12; // px from viewport edge

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;

            // Vertical: flip to bottom if too close to top
            const newPlacement = rect.top < 150 ? 'bottom' : 'top';
            setPlacement(newPlacement);

            // Horizontal: center on trigger, then clamp to viewport
            const triggerCenterX = rect.left + rect.width / 2;
            const halfTooltip = TOOLTIP_WIDTH / 2;

            let tooltipLeft = triggerCenterX - halfTooltip;
            let arrowOffset: number | null = null; // null = centered

            // Clamp right edge
            if (tooltipLeft + TOOLTIP_WIDTH > viewportWidth - EDGE_PADDING) {
                tooltipLeft = viewportWidth - TOOLTIP_WIDTH - EDGE_PADDING;
                arrowOffset = triggerCenterX - tooltipLeft; // arrow points at trigger
            }
            // Clamp left edge
            if (tooltipLeft < EDGE_PADDING) {
                tooltipLeft = EDGE_PADDING;
                arrowOffset = triggerCenterX - tooltipLeft;
            }

            setArrowLeftPx(arrowOffset);
            setPosition({
                top: newPlacement === 'top' ? rect.top - 12 : rect.bottom + 12,
                left: tooltipLeft
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

    // Arrow style: centered by default, or pinned to exact px when clamped
    const arrowStyle: React.CSSProperties = arrowLeftPx !== null
        ? { left: `${arrowLeftPx}px`, transform: 'translateX(-50%)' }
        : { left: '50%', transform: 'translateX(-50%)' };

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
                    className="fixed z-[99999] pointer-events-none"
                    style={{ top: position.top, left: position.left }}
                >
                    {/* Tooltip Body */}
                    <div className={cn(
                        "relative w-72 p-3 bg-slate-800/95 text-white text-xs rounded-xl shadow-xl backdrop-blur-sm border border-white/10",
                        placement === 'top' ? "-translate-y-full" : ""
                    )}>
                        {content}

                        {/* Arrow */}
                        {placement === 'top' ? (
                            <div className="absolute top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800/95" style={arrowStyle}></div>
                        ) : (
                            <div className="absolute bottom-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-slate-800/95" style={arrowStyle}></div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
