import { useState, useMemo, useEffect } from 'react';
import { Layout } from './components/ui/layout';
import { FileDropzone } from './components/ui/file-dropzone';

import { ConfigPanel } from './components/config-panel';
import { Sidebar } from './components/ui/sidebar';
import { ImportSummary } from './components/import-summary';
import { AnomaliesView } from './components/views/anomalies-view';
import { ShiftDetailView } from './components/views/shift-detail-view';
import { UserPerformanceView } from './components/views/user-performance-view';
import { DynamicFlowView } from './components/views/dynamic-flow-view';

import { ShiftHealthView } from './components/views/shift-health-view';
import { ExecutiveBriefView } from './components/views/executive-brief-view';

import { AdaptationInsightsView } from './components/views/adaptation-insights-view';
import { DataHealthView } from './components/views/data-health-view';
import { DatasetDiagnosticsView } from './components/views/dataset-diagnostics-view';
import { MetricSupportView } from './components/views/metric-support-view';
import { WorkloadProfilePanel } from './components/workload-profile-panel';

import { JobDetailsView } from './components/views/job-details-view';
import { WarehouseLogicView } from './components/views/warehouse-logic-view';
import { StandardsImpactView } from './components/views/standards-impact-view';
import { JobTypeMappingModal } from './components/job-type-mapping-modal';


import { useFileIngestion } from './hooks';
import { analyzeShift, generateBenchmarkFromStandards } from './logic/analysis';
import { generateAIContext } from './logic/context-export';
import { DEFAULT_BUFFER_CONFIG, type BufferConfig, type ShiftRecord, type IngestionSummary, type AnalysisResult } from './types';
import { METRIC_TOOLTIPS } from './logic/metric-definitions';
import { Activity, Clock, Box, TrendingUp, AlertTriangle, Settings, ClipboardList } from 'lucide-react';
import { VelocityView } from './components/views/velocity-view';
import { UserGuideView } from './components/views/user-guide-view';
import { GlobalHeader } from './components/ui/global-header';
import { MappingPreviewModal } from './components/mapping-preview-modal';
import { UploadAssumptionsModal } from './components/modals/upload-assumptions-modal';
import { GOLAAuditRunner } from './components/gola/gola-audit-runner';

import { useEngineeredStandards } from './hooks/useEngineeredStandards';
import { ErrorBoundary } from './components/ui/error-boundary';
import { useGlobalSettings } from './hooks/useGlobalSettings';
import { HelpProvider } from './contexts/help-context';

function App() {
  const { processFiles, previewFiles, clearPreview, mappingPreview, reprocessLogic, isProcessing, data, taskObjects, activityObjects, summary, error, progress, lastUniqueJobTypes } = useFileIngestion();

  const {
    standards: stdStandards,
    updateStandards,
    restoreGlobalDefaults,
    pushCustomizedToGlobal,
    isSaving,
    saveStatus
  } = useEngineeredStandards();

  const {
    settings: globalConfig,
    updateGlobalSettings
  } = useGlobalSettings(DEFAULT_BUFFER_CONFIG);

  // Merge them together for the unified pipeline
  const config = useMemo(() => ({
    ...globalConfig,
    engineeredStandards: stdStandards
  }), [globalConfig, stdStandards]);

  const [showSummary, setShowSummary] = useState(false);
  const [showJobMapper, setShowJobMapper] = useState(false); // NEW

  // Trigger Modal when unique types change (file processed)
  useEffect(() => {
    if (lastUniqueJobTypes && lastUniqueJobTypes.length > 0) {
      // Option: Only show if there are unmapped types? 
      // User asked to "match them". 
      // We can show it if new file loaded.
      // Let's check against known mappings to see if we should auto-pop?
      // Or just always show it for now as a feature step? 
      // "Show a popup ... to match them".
      // Let's show it if we have types.
      if (!config.jobTypeMapping) {
        setShowJobMapper(true);
      } else {
        // If we have mapping, check if any new types are NOT in mapping
        const hasNew = lastUniqueJobTypes.some(t => !config.jobTypeMapping![t]);
        if (hasNew) setShowJobMapper(true);
      }
    }
  }, [lastUniqueJobTypes]);

  const handleJobMappingSave = (mapping: Record<string, string>) => {
    // Update config
    const newConfig = { ...config, jobTypeMapping: mapping };
    updateGlobalSettings(newConfig);
    // Reprocess
    reprocessLogic(newConfig);
  };
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'upload' | 'dictionary' | 'details' | 'anomalies' | 'data-health' | 'metrics' | 'report' | 'users' | 'flow' | 'forensic' | 'timeline' | 'gola-runner' | 'settings' | 'standards' | 'engineered-impact' | 'velocity' | 'guide'>('upload');

  // Support View Metric State
  const [detailMetric, setDetailMetric] = useState<string>('Picking UPH (Hourly Average)');

  // Auto-show summary when it arrives
  useEffect(() => {
    if (summary) {
      setShowSummary(true);
      if (currentTab === 'upload') {
        setCurrentTab('data-health');
      }
    }
  }, [summary]);

  // Logic: Identify datasets
  const filenames = useMemo(() => {
    return Array.from(new Set(data.map(d => d.filename || 'Unknown')));
  }, [data]);

  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [benchmarkFile, setBenchmarkFile] = useState<string | null>(null);

  // Auto-select first file
  useEffect(() => {
    if (!activeFile && filenames.length > 0) {
      setActiveFile(filenames[0]);
    }
    // Auto-select second file as benchmark if available and not set
    if (!benchmarkFile && filenames.length > 1) {
      setBenchmarkFile(filenames[1]);
    }
  }, [filenames, activeFile, benchmarkFile]);

  // Trigger reprocessing when smoothing tolerance changes
  useEffect(() => {
    if (data.length > 0 && config.smoothingTolerance !== undefined) {
      reprocessLogic(config);
    }
  }, [config.smoothingTolerance, data.length, reprocessLogic, config]);

  const handleExportContext = () => {
    if (!primaryAnalysis) return;
    const report = generateAIContext(
      primaryAnalysis,
      primaryFile || 'unknown',
      summary,
      secondaryAnalysis,
      secondaryFile || undefined
    );
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `context_export_${primaryFile}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* Removed unused activeShift, clientFilter is active */
  const [clientFilter, setClientFilter] = useState<string>('ALL');
  // jobType and taskType filters removed

  // Benchmark Management

  // Extract unique Filters and apply filtering
  const {
    filteredData,
    filteredBenchmarkData,
    clients
  } = useMemo(() => {
    if (data.length === 0) return {
      filteredData: [],
      filteredBenchmarkData: [],
      clients: [],
    };

    const primaryFileRecords = activeFile ? data.filter(d => d.filename === activeFile) : data;

    let benchmarkFileRecords: ShiftRecord[] = [];
    if (benchmarkFile && benchmarkFile !== '__STANDARD__' && benchmarkFile !== '__TARGET__') {
      benchmarkFileRecords = data.filter(d => d.filename === benchmarkFile);
    }

    // Extract unique filter options from FULL dataset
    const clients = Array.from(new Set(data.map(d => d.Client || 'Unknown'))).sort();

    const filterDataset = (dataset: ShiftRecord[]) => {
      return dataset.filter(d => {
        if (clientFilter !== 'ALL' && d.Client !== clientFilter) return false;
        // JobType and TaskType filters removed (always ALL)
        return true;
      });
    };

    return {
      filteredData: filterDataset(primaryFileRecords),
      filteredBenchmarkData: filterDataset(benchmarkFileRecords),
      clients
    };
  }, [data, activeFile, benchmarkFile, clientFilter]);

  const primaryFile = activeFile || filenames[0];
  const secondaryFile = (benchmarkFile && benchmarkFile !== primaryFile) ? benchmarkFile : null;
  const isBenchmark = !!secondaryFile;

  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Analysis
  const primaryAnalysis = useMemo(() => {
    setAnalysisError(null);
    if (!primaryFile) return null;
    try {
      console.time('Primary Analysis');
      const result = analyzeShift(filteredData, config);
      console.timeEnd('Primary Analysis');
      return result;
    } catch (err) {
      console.error("CRITICAL: Primary Analysis Failed", err);
      setAnalysisError((err as Error).message);
      return null;
    }
  }, [filteredData, config, primaryFile]);

  const secondaryAnalysis = useMemo(() => {
    if (!secondaryFile) return null;

    // Intercept Virtual Benchmarks
    if (secondaryFile === '__STANDARD__' && primaryAnalysis) {
      return generateBenchmarkFromStandards(primaryAnalysis, 'standard');
    }
    if (secondaryFile === '__TARGET__' && primaryAnalysis) {
      return generateBenchmarkFromStandards(primaryAnalysis, 'target');
    }

    return analyzeShift(filteredBenchmarkData, config);
  }, [filteredBenchmarkData, config, secondaryFile, primaryAnalysis]);

  // Calculate suggested buffer (median cycle time)
  const suggestedBuffer = useMemo(() => {
    if (primaryAnalysis?.jobTimingMetrics?.medianCycleTimeMin) {
      return Math.round(primaryAnalysis.jobTimingMetrics.medianCycleTimeMin);
    }
    return 0;
  }, [primaryAnalysis]);

  // Auto-populate intraJobBuffer with calculated median cycle time
  useEffect(() => {
    if (primaryAnalysis) {


      if (config.isIntraJobBufferAutoCalculated !== false) {
        if (suggestedBuffer > 0 && suggestedBuffer !== config.intraJobBuffer) {
          // Auto-populating intraJobBuffer
          updateGlobalSettings({
            ...config,
            intraJobBuffer: suggestedBuffer,
            isIntraJobBufferAutoCalculated: true
          });
        } else {
          // Skipping auto-populate
        }
      } else {
        // Auto-calculate disabled
      }
    }
  }, [suggestedBuffer, config.intraJobBuffer, config.isIntraJobBufferAutoCalculated, primaryAnalysis]);

  const activeStats = primaryAnalysis ? primaryAnalysis.stats['picking'] : null;
  const secondaryActiveStats = secondaryAnalysis ? secondaryAnalysis.stats['picking'] : null;

  // New: Pending Files for Preview
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showAssumptionsModal, setShowAssumptionsModal] = useState(false);
  const [pendingMapping, setPendingMapping] = useState<Record<string, string> | null>(null);

  // ... (rest of state)

  // View state
  const handleFiles = (files: File[]) => {
    // Phase 1: Preview
    setPendingFiles(files);
    previewFiles(files);
  };

  const handleConfirmImport = (columnMapping: Record<string, string>) => {
    if (pendingFiles.length > 0) {
      setPendingMapping(columnMapping);
      setShowAssumptionsModal(true);
    }
  };

  const handleConfirmAssumptions = (is2DLayout: boolean, isEngStds: boolean) => {
    console.log('[DEBUG] Confirm Assumptions Clicked', { pendingFilesLength: pendingFiles.length, pendingMapping });
    if (pendingFiles.length > 0 && pendingMapping) {
      console.log('[DEBUG] Condition Passed. Triggering processFiles');
      const newConfig = {
        ...config,
        columnMapping: pendingMapping,
        is2DLayoutUsed: is2DLayout,
        isEngineeredStandardsUsed: isEngStds
      };

      updateGlobalSettings(newConfig); // Store globally so charts can read it later
      processFiles(pendingFiles, newConfig);

      setPendingFiles([]); // Clear pending
      setPendingMapping(null);
      setShowAssumptionsModal(false);
    } else {
      console.error('[DEBUG] Failed Condition', { pendingFiles, pendingMapping });
    }
  };

  const handleCancelAssumptions = () => {
    setShowAssumptionsModal(false);
    setPendingMapping(null);
    clearPreview();
    setPendingFiles([]);
  };

  const handleCancelImport = () => {
    clearPreview();
    setPendingFiles([]);
  };

  const handleInjectGolaPayload = (file: File) => {
    setActiveFile(null);
    setBenchmarkFile(null);
    // Add append=true so multiple GOLA scenarios can be injected without clearing
    processFiles([file], config, true);
    setCurrentTab('forensic');
  };

  // ... (rest of effects)

  return (
    <ErrorBoundary>
      <HelpProvider>
        <Layout
          sidebar={
            <Sidebar
              currentTab={currentTab}
              onTabChange={setCurrentTab as any}
            />
          }
        >
          {/* Modal Logic */}
          <MappingPreviewModal
            isOpen={!!mappingPreview && !showAssumptionsModal}
            results={mappingPreview}
            onConfirm={handleConfirmImport}
            onCancel={handleCancelImport}
            isProcessing={isProcessing}
          />

          <UploadAssumptionsModal
            isOpen={showAssumptionsModal}
            onConfirm={handleConfirmAssumptions}
            onCancel={handleCancelAssumptions}
          />

          <div className="p-6 space-y-6 w-full h-full flex flex-col relative">
            {/* Background Blobs (Absolute Positioned) */}
            <div className="fixed top-0 left-0 w-96 h-96 bg-blue-900/20 rounded-full mix-blend-normal filter blur-[80px] opacity-40 -translate-x-1/2 -translate-y-1/2 -z-10 animate-pulse pointer-events-none"></div>
            <div className="fixed top-1/2 right-0 w-[30rem] h-[30rem] bg-purple-900/20 rounded-full mix-blend-normal filter blur-[80px] opacity-40 translate-x-1/4 -translate-y-1/2 -z-10 pointer-events-none"></div>
            <div className="fixed bottom-0 left-1/3 w-80 h-80 bg-cyan-900/20 rounded-full mix-blend-normal filter blur-[80px] opacity-40 translate-y-1/3 -z-10 pointer-events-none"></div>

            {/* Header / Error */}
            {error && (
              <div className="p-4 bg-rose-950/30 border border-rose-900/50 text-rose-400 rounded-xl flex items-center gap-2 shrink-0">
                <AlertTriangle className="w-5 h-5" />
                {error}
              </div>
            )}

            {analysisError && (
              <div className="p-4 bg-rose-950/30 border border-rose-900/50 text-rose-400 rounded-xl flex flex-col gap-2 shrink-0">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-5 h-5" />
                  Critical Analysis Error
                </div>
                <p className="text-sm text-rose-300">The dataset could not be analyzed. This is likely due to extreme data volume or format issues.</p>
                <p className="font-mono text-xs bg-black/30 p-2 rounded text-rose-200">{analysisError}</p>
              </div>
            )}

            {summary && showSummary && (
              <ImportSummary summary={summary} onClose={() => setShowSummary(false)} />
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-y-auto min-h-0">



              {/* Global Header (Only when analysis is ready) */}
              {primaryAnalysis && (
                <GlobalHeader
                  title={activeFile || "Job Analyzer"}
                  taskCount={filteredData.length}
                  secondaryTaskCount={filteredBenchmarkData.length > 0 ? filteredBenchmarkData.length : undefined}

                  allFiles={filenames}
                  activeFile={activeFile}
                  onFileChange={setActiveFile}
                  benchmarkFile={benchmarkFile}
                  onBenchmarkChange={setBenchmarkFile}

                  clients={clients}
                  selectedClient={clientFilter}
                  onClientChange={setClientFilter}
                  onClearData={() => window.location.reload()}
                  isBenchmark={isBenchmark}
                  onExportContext={handleExportContext}
                />
              )}

              {/* TAB CONTENT */}

              {/* DATA UPLOAD TAB */}
              {currentTab === 'upload' && (
                <div className="space-y-6 flex-1 flex flex-col">
                  {/* Upload component always visible at the top */}
                  <div className="max-w-xl mx-auto mt-8 shrink-0">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold text-slate-100">Shift Analysis Ingestion</h2>
                      <p className="text-slate-400 mt-2">Upload day log or multiple logs for benchmarking</p>
                    </div>
                    <FileDropzone onFilesSelected={handleFiles} isProcessing={isProcessing} />
                    {isProcessing && (
                      <div className="mt-8 max-w-sm mx-auto">
                        <div className="flex justify-between text-xs text-slate-400 mb-2 font-medium">
                          <span className="animate-pulse">Processing shift data...</span>
                          <span className="font-mono text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded-full">{progress.toLocaleString()} rows</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden w-full">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 animate-[pulse_1s_ease-in-out_infinite] w-full origin-left"></div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Health View charts REMOVED from Upload tab and moved to DataSet Diagnostics */}
                </div>
              )}

              {/* DATASET DIAGNOSTICS TAB */}
              {currentTab === 'data-health' && (
                <div className="space-y-6 flex-1 flex flex-col px-4 lg:px-8 mt-6">
                  {primaryAnalysis && data.length > 0 && summary && (
                    <div className="flex-1 space-y-8">
                      {(() => {
                        const benchmarkSummary: IngestionSummary | undefined = isBenchmark ? {
                          totalRows: filteredBenchmarkData.length,
                          validRows: filteredBenchmarkData.length,
                          errorRows: 0,
                          dateRange: null,
                          uniqueUsers: new Set(filteredBenchmarkData.map(d => d.User)).size,
                          warehouses: [],
                          clients: [],
                          errors: [],
                          warnings: [],
                          assumptions: []
                        } : undefined;

                        return (
                          <>
                            <DatasetDiagnosticsView
                              summary={summary}
                              benchmarkSummary={benchmarkSummary}
                              stats={primaryAnalysis.health}
                              benchmarkStats={secondaryAnalysis?.health}
                            />

                            <DataHealthView
                              summary={summary}
                              diagnostics={primaryAnalysis.roleDiagnostics}
                              benchmarkSummary={benchmarkSummary}
                              benchmarkDiagnostics={isBenchmark && secondaryAnalysis ? secondaryAnalysis.roleDiagnostics : undefined}
                              aiVsManualStats={primaryAnalysis.health.aiVsManualStats}
                              orderSizeDistribution={primaryAnalysis.health.orderSizeDistribution}
                              orderProfileMatrix={primaryAnalysis.health.orderProfileMatrix}
                              identicalItemOrders={primaryAnalysis.health.identicalItemOrders}
                              identicalOrders={primaryAnalysis.health.identicalOrders}
                            />

                            <ShiftHealthView analysis={primaryAnalysis} />
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}



              {/* SHARED VISUAL EMPTY STATE FOR OTHER TABS */}
              {currentTab !== 'upload' && currentTab !== 'guide' && currentTab !== 'standards' && currentTab !== 'settings' && currentTab !== 'gola-runner' && (!primaryAnalysis || data.length === 0) && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-500">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="text-xl font-medium text-slate-300">No Data Available</h3>
                  <p className="mt-2 max-w-sm mx-auto text-slate-500">
                    Please upload a shift log file in the Data Upload tab to view the {currentTab.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}.
                  </p>
                  <button
                    onClick={() => setCurrentTab('upload')}
                    className="mt-6 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm text-sm font-medium"
                  >
                    Go to Upload
                  </button>
                </div>
              )}


              {/* OTHER TABS CONTENT (Only rendered when data exists) */}
              {primaryAnalysis && (
                <>
                  {currentTab === 'report' && (
                    <div className="flex-1 overflow-y-auto">
                      <ExecutiveBriefView
                        analysis={primaryAnalysis}
                        config={config}
                      />
                    </div>
                  )}

                  {currentTab === 'metrics' && (
                    <div className="flex-1 overflow-y-auto">
                      <MetricSupportView
                        data={primaryAnalysis.records}
                        metric={detailMetric}
                        onBack={() => setCurrentTab('dashboard')}
                        benchmarkData={secondaryAnalysis?.records}
                        isBenchmark={isBenchmark}
                        stats={primaryAnalysis}
                      />
                    </div>
                  )}
                  {/* GOLA AUDIT RUNNER */}
                  {currentTab === 'gola-runner' && (
                    <div className="flex-1 overflow-y-auto">
                      <GOLAAuditRunner
                        onInjectPayload={handleInjectGolaPayload}
                        config={config.engineeredStandards}
                      />
                    </div>
                  )}

                  {currentTab === 'dictionary' && (
                    <div className="flex-1 overflow-y-auto">
                      <AdaptationInsightsView data={primaryAnalysis.records} config={config} />
                    </div>
                  )}

                  {currentTab === 'users' && (
                    <div className="flex-1">
                      <UserPerformanceView
                        data={primaryAnalysis.userPerformance}
                        rawRecords={primaryAnalysis.records}
                      />
                    </div>
                  )}

                  {/* FORENSICS TAB REPLACED BY STITCH VIEW */}

                  {currentTab === 'flow' && primaryAnalysis?.stats.picking.flowDetails && (
                    <div className="flex-1">
                      <DynamicFlowView
                        rawRecords={primaryAnalysis.records}
                        processes={{
                          picking: {
                            data: primaryAnalysis.stats.picking.flowDetails,
                            score: primaryAnalysis.stats.picking.dynamicIntervalUPH,
                            avgTaskDuration: primaryAnalysis.stats.picking.avgTaskDuration,
                          },
                          sorting: primaryAnalysis.stats.sorting?.flowDetails ? {
                            data: primaryAnalysis.stats.sorting.flowDetails,
                            score: primaryAnalysis.stats.sorting.dynamicIntervalUPH,
                            avgTaskDuration: primaryAnalysis.stats.sorting.avgTaskDuration,
                          } : undefined,
                          packing: primaryAnalysis.stats.packing?.flowDetails ? {
                            data: primaryAnalysis.stats.packing.flowDetails,
                            score: primaryAnalysis.stats.packing.dynamicIntervalUPH,
                            avgTaskDuration: primaryAnalysis.stats.packing.avgTaskDuration,
                          } : undefined,
                        }}
                      />
                    </div>
                  )}

                  {currentTab === 'details' && (
                    <div className="flex-1">
                      <ShiftDetailView data={primaryAnalysis.records} />
                    </div>
                  )}

                  {currentTab === 'anomalies' && (
                    <div className="flex-1">
                      <AnomaliesView telemetry={primaryAnalysis.telemetry} />
                    </div>
                  )}


                  {/* FORENSIC STITCH VIEW */}
                  {currentTab === 'forensic' && (
                    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-black/20">
                      <WarehouseLogicView
                        tasks={taskObjects}
                        activities={activityObjects}
                        config={config}
                      />
                    </div>
                  )}

                  {/* TIMELINE AUDIT STITCH VIEW */}
                  {currentTab === 'timeline' && (
                    <div className="flex-1 overflow-y-auto">
                      <JobDetailsView
                        data={primaryAnalysis.records}
                        config={config}
                      />
                    </div>
                  )}

                  {currentTab === 'engineered-impact' && (
                    <div className="flex-1 overflow-hidden">
                      <StandardsImpactView
                        tasks={taskObjects.filter(t => !primaryFile || t.filename === primaryFile)}
                        benchmarkTasks={secondaryFile ? taskObjects.filter(t => t.filename === secondaryFile) : []}
                        config={config.engineeredStandards}
                      />
                    </div>
                  )}

                  {currentTab === 'velocity' && (
                    <div className="flex-1 overflow-y-auto">
                      <VelocityView
                        analysis={primaryAnalysis}
                        benchmark={secondaryAnalysis || undefined}
                        isLive={false}
                        rawRecords={primaryAnalysis.records}
                      />
                    </div>
                  )}

                </>
              )}

              {/* SETTINGS & STANDARDS - Always accessible, no data import required */}
              {currentTab === 'settings' && (
                <div className="p-8 max-w-4xl mx-auto w-full">
                  <div className="bg-white dark:bg-[#111418] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6">
                    <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Settings className="w-6 h-6 text-blue-600" />
                        Global Settings
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Adjust global shift parameters, job separation buffers, and legacy configurations.
                      </p>
                    </div>
                    <ConfigPanel
                      config={config}
                      onChange={updateGlobalSettings}
                      suggestedBuffer={suggestedBuffer}
                      visibleSections={['global', 'legacy']}
                      onRestoreGlobal={restoreGlobalDefaults}
                      onPushGlobal={pushCustomizedToGlobal}
                      isSaving={isSaving}
                      saveStatus={saveStatus}
                    />
                  </div>
                </div>
              )}

              {currentTab === 'standards' && (
                <div className="p-8 max-w-4xl mx-auto w-full">
                  <div className="bg-white dark:bg-[#111418] border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6">
                    <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ClipboardList className="w-6 h-6 text-blue-600" />
                        Engineered Labor Standards
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Configure job workflow maps, engineered standards, and calculation groups.
                      </p>
                    </div>
                    <ConfigPanel
                      config={config}
                      onChange={updateStandards}
                      suggestedBuffer={suggestedBuffer}
                      visibleSections={['workflow', 'standards']}
                      onRestoreGlobal={restoreGlobalDefaults}
                      onPushGlobal={pushCustomizedToGlobal}
                      isSaving={isSaving}
                      saveStatus={saveStatus}
                    />
                  </div>
                </div>
              )}

              {currentTab === 'guide' && (
                <div className="flex-1 overflow-y-auto">
                  <UserGuideView />
                </div>
              )}

              {currentTab === 'gola-runner' && (
                <GOLAAuditRunner onInjectPayload={handleInjectGolaPayload} config={config.engineeredStandards} />
              )}

            </div>
          </div>

          {/* Job Type Mapper Modal */}
          <JobTypeMappingModal
            isOpen={showJobMapper}
            onClose={() => setShowJobMapper(false)}
            uniqueJobTypes={lastUniqueJobTypes || []}
            config={config.engineeredStandards || DEFAULT_BUFFER_CONFIG.engineeredStandards!}
            existingMapping={config.jobTypeMapping || {}}
            onSave={handleJobMappingSave}
          />

        </Layout >
      </HelpProvider>
    </ErrorBoundary >
  );
}

export default App;
