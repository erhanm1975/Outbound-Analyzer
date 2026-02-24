import { useState, useCallback, useRef, useEffect } from 'react';
import type { ShiftRecord, TaskObject, ActivityObject, MappingPreviewResult, IngestionSummary, BufferConfig } from '../types';

interface WorkerResult {
    type: 'SUCCESS' | 'ERROR' | 'PROGRESS' | 'PREVIEW_RESULT';
    data?: ShiftRecord[] | MappingPreviewResult[];
    taskObjects?: TaskObject[];
    activityObjects?: ActivityObject[];
    summary?: IngestionSummary;
    processed?: number;
    message?: string;
    uniqueJobTypes?: string[]; // NEW
}

import FileProcessingWorker from '../workers/file-processing.worker?worker&inline';

export function useFileIngestion() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [data, setData] = useState<ShiftRecord[]>([]);
    const [taskObjects, setTaskObjects] = useState<TaskObject[]>([]);
    const [activityObjects, setActivityObjects] = useState<ActivityObject[]>([]);
    const [summary, setSummary] = useState<IngestionSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    // New: Preview State
    const [mappingPreview, setMappingPreview] = useState<MappingPreviewResult[] | null>(null);
    const [lastUniqueJobTypes, setLastUniqueJobTypes] = useState<string[]>([]); // To trigger modal

    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        // Initialize worker (Inlined)
        workerRef.current = new FileProcessingWorker();

        workerRef.current.onmessage = (e: MessageEvent<WorkerResult>) => {
            const result = e.data;
            if (result.type === 'SUCCESS' && result.data) {
                setData(result.data as ShiftRecord[]);
                setTaskObjects(result.taskObjects || []);
                setActivityObjects(result.activityObjects || []);
                setSummary(result.summary || null);
                if (result.uniqueJobTypes) {
                    setLastUniqueJobTypes(result.uniqueJobTypes);
                }
                setError(null);
                setIsProcessing(false);
            } else if (result.type === 'PROGRESS' && result.processed) {
                setProgress(result.processed);
                return; // Don't stop processing
            } else if (result.type === 'ERROR') {
                setError(result.message || 'Unknown worker error');
                setIsProcessing(false);
            } else if (result.type === 'PREVIEW_RESULT' && result.data) {
                setMappingPreview(result.data as MappingPreviewResult[]);
                setIsProcessing(false);
            }
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const processFiles = useCallback((files: File[], config?: BufferConfig, append?: boolean) => {
        if (!workerRef.current) return;

        setIsProcessing(true);
        setError(null);
        setMappingPreview(null); // Clear preview when processing starts

        if (!append) {
            setSummary(null);
            setProgress(0);
            setData([]);
            setTaskObjects([]);
            setActivityObjects([]);
        }

        // Send files to worker
        workerRef.current.postMessage({
            type: 'UPLOAD',
            append,
            files,
            config: config ? {
                smoothingTolerance: config.smoothingTolerance,
                breakThreshold: config.breakThreshold,
                travelRatio: config.travelRatio,
                engineeredStandards: config.engineeredStandards, // Pass to worker
                jobTypeMapping: config.jobTypeMapping // NEW
            } : undefined
        });
    }, []);

    const previewFiles = useCallback((files: File[]) => {
        if (!workerRef.current) return;
        setIsProcessing(true);
        setError(null);
        setMappingPreview(null);

        workerRef.current.postMessage({
            type: 'PREVIEW',
            files
        });
    }, []);

    const clearPreview = useCallback(() => {
        setMappingPreview(null);
    }, []);

    const reprocessLogic = useCallback((config: BufferConfig) => {
        if (!workerRef.current) return;
        setIsProcessing(true);
        setError(null);

        workerRef.current.postMessage({
            type: 'REPROCESS',
            config: {
                smoothingTolerance: config.smoothingTolerance,
                breakThreshold: config.breakThreshold,
                travelRatio: config.travelRatio,
                engineeredStandards: config.engineeredStandards, // NEW: Include standards in reprocess
                jobTypeMapping: config.jobTypeMapping // NEW
            }
        });
    }, []);

    return { processFiles, previewFiles, clearPreview, mappingPreview, reprocessLogic, isProcessing, data, taskObjects, activityObjects, summary, error, progress, lastUniqueJobTypes };
}
