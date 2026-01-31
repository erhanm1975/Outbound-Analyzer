import { useState, useCallback, useRef, useEffect } from 'react';
import type { ShiftRecord } from '../types';

import { type IngestionSummary } from '../types';

interface WorkerResult {
    type: 'SUCCESS' | 'ERROR';
    data?: ShiftRecord[];
    summary?: IngestionSummary;
    message?: string;
}

import FileProcessingWorker from '../workers/file-processing.worker?worker&inline';

export function useFileIngestion() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [data, setData] = useState<ShiftRecord[]>([]);
    const [summary, setSummary] = useState<IngestionSummary | null>(null);
    const [error, setError] = useState<string | null>(null);

    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        // Initialize worker (Inlined)
        workerRef.current = new FileProcessingWorker();

        workerRef.current.onmessage = (e: MessageEvent<WorkerResult>) => {
            const result = e.data;
            if (result.type === 'SUCCESS' && result.data) {
                setData(result.data);
                setSummary(result.summary || null);
                setError(null);
            } else if (result.type === 'ERROR') {
                setError(result.message || 'Unknown worker error');
            }
            setIsProcessing(false);
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const processFiles = useCallback((files: File[]) => {
        if (!workerRef.current) return;

        setIsProcessing(true);
        setError(null);
        setSummary(null);
        setData([]);

        // Send files to worker
        workerRef.current.postMessage(files);
    }, []);

    return { processFiles, isProcessing, data, summary, error };
}
