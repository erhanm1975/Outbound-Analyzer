import { useState, useCallback, useRef, useEffect } from 'react';
import type { ShiftRecord, TaskObject, ActivityObject } from '../types';

import { type IngestionSummary } from '../types';

interface WorkerResult {
    type: 'SUCCESS' | 'ERROR' | 'PROGRESS';
    data?: ShiftRecord[];
    taskObjects?: TaskObject[]; // New
    activityObjects?: ActivityObject[]; // New
    summary?: IngestionSummary;
    processed?: number;
    message?: string;
}

import FileProcessingWorker from '../workers/file-processing.worker?worker&inline';

export function useFileIngestion() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [data, setData] = useState<ShiftRecord[]>([]);
    const [taskObjects, setTaskObjects] = useState<TaskObject[]>([]); // New
    const [activityObjects, setActivityObjects] = useState<ActivityObject[]>([]); // New
    const [summary, setSummary] = useState<IngestionSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        // Initialize worker (Inlined)
        workerRef.current = new FileProcessingWorker();

        workerRef.current.onmessage = (e: MessageEvent<WorkerResult>) => {
            const result = e.data;
            if (result.type === 'SUCCESS' && result.data) {
                setData(result.data);
                setTaskObjects(result.taskObjects || []); // New
                setActivityObjects(result.activityObjects || []); // New
                setSummary(result.summary || null);
                setError(null);
                setIsProcessing(false);
            } else if (result.type === 'PROGRESS' && result.processed) {
                setProgress(result.processed);
                return; // Don't stop processing
            } else if (result.type === 'ERROR') {
                setError(result.message || 'Unknown worker error');
                setIsProcessing(false);
            }
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const processFiles = useCallback((files: File[], config?: BufferConfig) => {
        if (!workerRef.current) return;

        setIsProcessing(true);
        setError(null);
        setSummary(null);
        setProgress(0);
        setData([]);
        setTaskObjects([]);
        setActivityObjects([]);

        // Send files to worker
        workerRef.current.postMessage({
            type: 'UPLOAD',
            files,
            config: config ? {
                smoothingTolerance: config.smoothingTolerance,
                breakThreshold: config.breakThreshold,
                travelRatio: config.travelRatio
            } : undefined
        });
    }, []);

    const reprocessLogic = useCallback((config: BufferConfig) => {
        if (!workerRef.current) return;
        // Don't clear data, just show processing
        setIsProcessing(true);
        setError(null);

        workerRef.current.postMessage({
            type: 'REPROCESS',
            config: {
                smoothingTolerance: config.smoothingTolerance,
                breakThreshold: config.breakThreshold,
                travelRatio: config.travelRatio
            }
        });
    }, []);

    return { processFiles, reprocessLogic, isProcessing, data, taskObjects, activityObjects, summary, error, progress };
}
