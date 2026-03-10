import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface QuadrantCardProps {
    title: string;
    icon: LucideIcon;
    colorClasses: {
        bg: string;
        text: string;
        border?: string;
    };
    concept: React.ReactNode;
    math: {
        formula: string;
        variables: { name: string; description: string }[];
        additionalMath?: React.ReactNode;
    };
    visualReference: React.ReactNode;
    usageAndImpact: React.ReactNode;
}

export function QuadrantCard({
    title,
    icon: Icon,
    colorClasses,
    concept,
    math,
    visualReference,
    usageAndImpact
}: QuadrantCardProps) {
    return (
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 break-inside-avoid">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 ${colorClasses.bg} rounded-lg`}>
                    <Icon className={`w-5 h-5 ${colorClasses.text}`} />
                </div>
                <h4 className="text-lg font-bold text-white">{title}</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Quadrants 1 & 2: Concept and Math */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <strong className="block text-indigo-400 text-xs uppercase tracking-wider mb-2">The Concept</strong>
                        <div className="text-sm text-gray-300 space-y-2">
                            {concept}
                        </div>
                    </div>
                    <div>
                        <strong className="block text-indigo-400 text-xs uppercase tracking-wider mb-2">The Math</strong>
                        <code className={`block bg-black/30 p-2 rounded text-xs font-mono mb-2 ${colorClasses.text}`}>
                            {math.formula}
                        </code>
                        {math.variables && math.variables.length > 0 && (
                            <ul className="text-xs text-gray-500 space-y-1 mt-2">
                                {math.variables.map((v, i) => (
                                    <li key={i}>• <span className="text-gray-300">{v.name}:</span> {v.description}</li>
                                ))}
                            </ul>
                        )}
                        {math.additionalMath && (
                            <div className="mt-3">
                                {math.additionalMath}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quadrant 3: Visual Reference (CSS Mockup) */}
                <div className="bg-slate-950 p-4 rounded border border-slate-800 flex flex-col justify-center items-center shadow-lg relative min-h-[160px]">
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4 w-full text-center block">Dashboard Visual</span>
                    <div className="w-full flex-1 flex items-center justify-center">
                        {visualReference}
                    </div>
                </div>

                {/* Quadrant 4: Usage & Impact */}
                <div className={`md:col-span-3 mt-2 p-4 ${colorClasses.bg.replace('/10', '/5')} ${colorClasses.border || 'border border-slate-800'} rounded-lg`}>
                    <strong className={`block ${colorClasses.text} text-xs uppercase tracking-wider mb-2`}>Usage & Impact</strong>
                    <div className="text-xs text-gray-400 space-y-1 leading-relaxed">
                        {usageAndImpact}
                    </div>
                </div>
            </div>
        </div>
    );
}
