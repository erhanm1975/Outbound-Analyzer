import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '../lib/utils';

interface FileDropzoneProps {
    onFilesSelected: (files: File[]) => void;
    isProcessing: boolean;
}

export function FileDropzone({ onFilesSelected, isProcessing }: FileDropzoneProps) {
    const [isDragActive, setIsDragActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        setIsDragActive(true);
    };

    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            validateAndPass(Array.from(e.dataTransfer.files));
        }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            validateAndPass(Array.from(e.target.files));
        }
    };

    const validateAndPass = (files: File[]) => {
        // Filter for xlsx/csv/xls?
        const valid = files.filter(f =>
            f.name.endsWith('.xlsx') ||
            f.name.endsWith('.xls') ||
            f.name.endsWith('.csv')
        );
        if (valid.length > 0) {
            onFilesSelected(valid);
        }
    };

    return (
        <div
            className={cn(
                "border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer text-center",
                isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50",
                isProcessing && "opacity-50 pointer-events-none"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
        >
            <input
                ref={inputRef}
                type="file"
                multiple
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleChange}
            />

            <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-100 dark:border-slate-700">
                    <Upload className={cn("w-6 h-6", isDragActive ? "text-blue-500" : "text-slate-400")} />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-700">
                        Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-slate-500">
                        Excel (.xlsx, .xls) or CSV files
                    </p>
                </div>
            </div>
        </div>
    );
}
