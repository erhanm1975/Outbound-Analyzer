import { useState, useMemo, useEffect } from 'react';
import { Layout } from './components/layout';
import { FileDropzone } from './components/file-dropzone';
import { MetricCard } from './components/metric-card';
import { ConfigPanel } from './components/config-panel';
import { ActivityMatrix } from './components/activity-matrix';
import { Sidebar } from './components/sidebar';
import { ImportSummary } from './components/import-summary';
import { AnomaliesView } from './components/anomalies-view';
import { ShiftDetailView } from './components/shift-detail-view';
import { UserPerformanceView } from './components/user-performance-view';
import { DynamicFlowView } from './components/dynamic-flow-view';

import { ShiftHealthView } from './components/shift-health-view';
import { ExecutiveReportView } from './components/executive-report-view';



import { JobBreakdownView } from './components/job-breakdown-view';
import { AdaptationInsightsView } from './components/adaptation-insights-view';
import { DataHealthView } from './components/data-health-view';
import { MetricSupportView } from './components/metric-support-view';
import { AdvancedMetricsView } from './components/advanced-metrics-view';
import { HeroMetricCard } from './components/hero-metric-card';
import { WorkloadProfilePanel } from './components/workload-profile-panel';
import { TaskFlowVisual } from './components/charts/TaskFlowVisual';
import { JobDetailsView } from './components/job-details-view';
import { WarehouseLogicView } from './components/warehouse-logic-view';
import { DashboardSection } from './components/dashboard-section';

import { useFileIngestion } from './hooks';
import { analyzeShift } from './logic/analysis';
import { generateAIContext } from './logic/context-export';
import { DEFAULT_BUFFER_CONFIG, type BufferConfig, type ShiftRecord, type IngestionSummary, type AnalysisResult } from './types';
import { METRIC_TOOLTIPS } from './logic/metric-definitions';
import { Activity, Clock, Box, TrendingUp, AlertTriangle, Settings, ClipboardList } from 'lucide-react';
import { VelocityView } from './components/velocity-view';
import { UserGuideView } from './components/user-guide-view';
import { GlobalHeader } from './components/global-header';

function App() {
  const { processFiles, reprocessLogic, isProcessing, data, taskObjects, activityObjects, summary, error, progress } = useFileIngestion();
  const [config, setConfig] = useState<BufferConfig>(DEFAULT_BUFFER_CONFIG);
  const [showSummary, setShowSummary] = useState(false);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'health' | 'jobs' | 'dictionary' | 'activity' | 'details' | 'anomalies' | 'data-health' | 'metrics' | 'report' | 'users' | 'flow' | 'forensic' | 'timeline' | 'settings' | 'standards' | 'velocity' | 'guide'>('dashboard');

  // Support View Metric State
  const [detailMetric, setDetailMetric] = useState<string>('Picking UPH (Hourly Average)');

  // Auto-show summary when it arrives
  useMemo(() => {
    if (summary) setShowSummary(true);
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
    const benchmarkFileRecords = benchmarkFile ? data.filter(d => d.filename === benchmarkFile) : [];

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
    return analyzeShift(filteredBenchmarkData, config);
  }, [filteredBenchmarkData, config, secondaryFile]);

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
      console.log('🔍 Job Timing Metrics:', primaryAnalysis.jobTimingMetrics);
      console.log('📊 Current config:', config);
      console.log('💡 Calculated median cycle time:', suggestedBuffer);

      if (config.isIntraJobBufferAutoCalculated !== false) {
        if (suggestedBuffer > 0 && suggestedBuffer !== config.intraJobBuffer) {
          console.log('✅ Auto-populating intraJobBuffer with:', suggestedBuffer);
          setConfig(prev => ({
            ...prev,
            intraJobBuffer: suggestedBuffer,
            isIntraJobBufferAutoCalculated: true
          }));
        } else {
          console.log('⚠️ Skipping auto-populate - value:', suggestedBuffer, 'current:', config.intraJobBuffer);
        }
      } else {
        console.log('🚫 Auto-calculate disabled (user override)');
      }
    }
  }, [suggestedBuffer, config.intraJobBuffer, config.isIntraJobBufferAutoCalculated, primaryAnalysis]);

  const activeStats = primaryAnalysis ? primaryAnalysis.stats['picking'] : null;
  const secondaryActiveStats = secondaryAnalysis ? secondaryAnalysis.stats['picking'] : null;

  // View state
  const handleFiles = (files: File[]) => {
    processFiles(files, config);
  };

  // Trigger reprocessing when smoothing tolerance changes
  useEffect(() => {
    if (data.length > 0 && config.smoothingTolerance !== undefined) {
      reprocessLogic(config);
    }
  }, [config.smoothingTolerance]);

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

  return (
    <Layout
      sidebar={
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab as any}
        />
      }
    >
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

          {/* DASHBOARD TAB */}
          {currentTab === 'dashboard' && (
            <>
              {(!primaryAnalysis || data.length === 0) ? (
                // Empty State for Dashboard: Ingestion
                <div className="max-w-xl mx-auto mt-20">
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
              ) : (
                // Dashboard Content
                activeStats && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

                    <div className="space-y-8">
                      {/* Tier 1: HERO METRICS (North Star) */}
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                        {/* Column 1 & 2: 2x2 Grid for UPH & Utilization */}
                        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Row 1: Picking */}
                          <HeroMetricCard
                            title="Productive UPH (Picking)"
                            value={activeStats.productiveUPH ? activeStats.productiveUPH.toFixed(2) : "0.00"}
                            icon={<Activity className="w-6 h-6" />}
                            colorClass="from-emerald-500 to-teal-600"
                            tooltip={METRIC_TOOLTIPS.PRODUCTIVE_UPH}
                            benchmarkValue={secondaryActiveStats?.productiveUPH?.toFixed(2)}
                            trend={isBenchmark && secondaryActiveStats ? {
                              value: Number(((activeStats.productiveUPH - secondaryActiveStats.productiveUPH) / secondaryActiveStats.productiveUPH * 100).toFixed(2)),
                              isPositiveGood: true
                            } : undefined}
                            onClick={() => {
                              setDetailMetric('Productive UPH');
                              setCurrentTab('metrics');
                            }}
                          />
                          <HeroMetricCard
                            title="Floor UPH (Picking)"
                            value={activeStats.floorUPH ? activeStats.floorUPH.toFixed(2) : "0.00"}
                            icon={<TrendingUp className="w-6 h-6" />}
                            colorClass="from-blue-500 to-indigo-600"
                            tooltip={METRIC_TOOLTIPS.FLOOR_UPH}
                            benchmarkValue={secondaryActiveStats?.floorUPH?.toFixed(2)}
                            trend={isBenchmark && secondaryActiveStats ? {
                              value: Number(((activeStats.floorUPH - secondaryActiveStats.floorUPH) / secondaryActiveStats.floorUPH * 100).toFixed(2)),
                              isPositiveGood: true
                            } : undefined}
                            onClick={() => {
                              setDetailMetric('Floor UPH');
                              setCurrentTab('metrics');
                            }}
                          />

                          {/* Row 2: Packing (Explicitly fetched from main analysis props) */}
                          <HeroMetricCard
                            title="Productive UPH (Packing)"
                            value={primaryAnalysis.stats.packing.productiveUPH ? primaryAnalysis.stats.packing.productiveUPH.toFixed(2) : "0.00"}
                            icon={<Activity className="w-6 h-6" />}
                            colorClass="from-fuchsia-500 to-pink-600"
                            tooltip={METRIC_TOOLTIPS.PRODUCTIVE_UPH}
                            benchmarkValue={secondaryAnalysis?.stats.packing.productiveUPH?.toFixed(2)}
                            trend={isBenchmark && secondaryAnalysis ? {
                              value: Number(((primaryAnalysis.stats.packing.productiveUPH - secondaryAnalysis.stats.packing.productiveUPH) / secondaryAnalysis.stats.packing.productiveUPH * 100).toFixed(2)),
                              isPositiveGood: true
                            } : undefined}
                            onClick={() => {
                              setDetailMetric('Packing Productive UPH');
                              setCurrentTab('metrics');
                            }}
                          />
                          <HeroMetricCard
                            title="Floor UPH (Packing)"
                            value={primaryAnalysis.stats.packing.floorUPH ? primaryAnalysis.stats.packing.floorUPH.toFixed(2) : "0.00"}
                            icon={<TrendingUp className="w-6 h-6" />}
                            colorClass="from-purple-400 to-violet-600"
                            tooltip={METRIC_TOOLTIPS.FLOOR_UPH}
                            benchmarkValue={secondaryAnalysis?.stats.packing.floorUPH?.toFixed(2)}
                            trend={isBenchmark && secondaryAnalysis ? {
                              value: Number(((primaryAnalysis.stats.packing.floorUPH - secondaryAnalysis.stats.packing.floorUPH) / secondaryAnalysis.stats.packing.floorUPH * 100).toFixed(2)),
                              isPositiveGood: true
                            } : undefined}
                            onClick={() => {
                              setDetailMetric('Packing Floor UPH');
                              setCurrentTab('metrics');
                            }}
                          />
                        </div>

                        {/* Column 3: Density Metrics */}
                        <div className="flex flex-col gap-6">
                          <HeroMetricCard
                            title="Output Density"
                            value={activeStats.outputDensity ? activeStats.outputDensity.toFixed(2) : "0.00"}
                            suffix=" Units/Stop"
                            icon={<Box className="w-6 h-6" />}
                            colorClass="from-orange-400 to-amber-500"
                            tooltip={METRIC_TOOLTIPS.OUTPUT_DENSITY}
                            benchmarkValue={secondaryActiveStats?.outputDensity?.toFixed(2)}
                            trend={isBenchmark && secondaryActiveStats ? {
                              value: Number(((activeStats.outputDensity - secondaryActiveStats.outputDensity) / secondaryActiveStats.outputDensity * 100).toFixed(2)),
                              isPositiveGood: true
                            } : undefined}
                          />
                          <HeroMetricCard
                            title="Visit Density (Loc Visits/Line)"
                            value={(activeStats.totalTasks > 0 ? (activeStats.distinctLocations / activeStats.totalTasks).toFixed(2) : '0.00')}
                            icon={<Box className="w-6 h-6" />}
                            colorClass="from-amber-500 to-yellow-500"
                            tooltip={METRIC_TOOLTIPS.VISIT_DENSITY_LINE}
                            benchmarkValue={secondaryActiveStats ? (secondaryActiveStats.totalTasks > 0 ? (secondaryActiveStats.distinctLocations / secondaryActiveStats.totalTasks).toFixed(2) : '0.00') : undefined}
                            trend={isBenchmark && secondaryActiveStats ? {
                              value: Number((
                                ((activeStats.totalTasks > 0 ? activeStats.distinctLocations / activeStats.totalTasks : 0) -
                                  (secondaryActiveStats.totalTasks > 0 ? secondaryActiveStats.distinctLocations / secondaryActiveStats.totalTasks : 0)) /
                                (secondaryActiveStats.totalTasks > 0 ? secondaryActiveStats.distinctLocations / secondaryActiveStats.totalTasks : 1) * 100
                              ).toFixed(2)),
                              isPositiveGood: false
                            } : undefined}
                          />
                        </div>
                      </div>

                      {/* Tier 2: Task Performance (Full Width) */}
                      <div className="w-full">
                        <TaskFlowVisual
                          interJobTime={(primaryAnalysis.health.avgJobTransitionMin || 0) * 60}
                          pickTime={primaryAnalysis.stats.picking.avgProcessTimeSec || 0}
                          travelTime={primaryAnalysis.stats.picking.avgTravelTimeSec || 0}
                          sortTime={primaryAnalysis.stats.sorting?.avgProcessTimeSec || 0}
                          packTime={primaryAnalysis.stats.packing?.avgProcessTimeSec || 0}
                          benchmarkInterJobTime={isBenchmark && secondaryAnalysis ? (secondaryAnalysis.health.avgJobTransitionMin || 0) * 60 : undefined}
                          benchmarkPickTime={isBenchmark && secondaryAnalysis ? secondaryAnalysis.stats.picking.avgProcessTimeSec : undefined}
                          benchmarkTravelTime={isBenchmark && secondaryAnalysis ? secondaryAnalysis.stats.picking.avgTravelTimeSec : undefined}
                          benchmarkSortTime={isBenchmark && secondaryAnalysis ? secondaryAnalysis.stats.sorting?.avgProcessTimeSec : undefined}
                          benchmarkPackTime={isBenchmark && secondaryAnalysis ? secondaryAnalysis.stats.packing?.avgProcessTimeSec : undefined}
                          onClick={() => {
                            setDetailMetric('Task Performance');
                            setCurrentTab('metrics');
                          }}
                          onForensicsClick={() => setCurrentTab('forensic')}
                          tooltips={{
                            interJob: METRIC_TOOLTIPS.FLOW_INTER_JOB,
                            pick: METRIC_TOOLTIPS.FLOW_PICKING,
                            travel: METRIC_TOOLTIPS.FLOW_TRAVEL,
                            sort: METRIC_TOOLTIPS.FLOW_SORTING,
                            pack: METRIC_TOOLTIPS.FLOW_PACKING
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Tier 2A: Workload Context (2/3 width) */}
                        <div className="xl:col-span-2 flex flex-col gap-6">
                          <WorkloadProfilePanel
                            stats={primaryAnalysis.health}
                            benchmarkStats={secondaryAnalysis?.health}
                            className="h-full"
                          />
                        </div>

                        {/* Tier 2B: Spatial Impact (1/3 width) - Now just TPH aligned */}
                        <div className="xl:col-span-1">
                          <MetricCard
                            title="TPH (Tasks Per Hour)"
                            value={activeStats.tph.toFixed(2)}
                            icon={<Clock className="w-8 h-8" />}
                            colorClass="from-slate-400 to-slate-500"
                            tooltip={METRIC_TOOLTIPS.TPH}
                            className="h-full flex flex-col justify-center"
                            benchmarkValue={secondaryActiveStats?.tph.toFixed(2)}
                            trend={isBenchmark && secondaryActiveStats ? {
                              value: Number(((activeStats.tph - secondaryActiveStats.tph) / secondaryActiveStats.tph * 100).toFixed(2)),
                              isPositiveGood: true
                            } : undefined}
                          />
                        </div>
                      </div>

                      {/* Tier 3: Advanced Diagnostics */}
                      <div className="pt-4 border-t border-slate-800">
                        <AdvancedMetricsView
                          analysis={primaryAnalysis}
                          benchmarkAnalysis={secondaryAnalysis}
                        />
                      </div>

                      {/* Tier 4: Secondary Velocity Metrics (The "Engine Room") */}
                      <DashboardSection title="Secondary Velocity Metrics (Picking)" color="bg-slate-800">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 opacity-80 hover:opacity-100 transition-opacity duration-300">
                          <MetricCard
                            title="UPH (Pure Active)"
                            value={activeStats.uphPure}
                            icon={<Activity className="w-5 h-5" />}
                            colorClass="from-slate-400 to-slate-500"
                            tooltip={METRIC_TOOLTIPS.UPH_PURE_ACTIVE}
                            benchmarkValue={secondaryActiveStats?.uphPure}
                            trend={isBenchmark && secondaryActiveStats ? {
                              value: Number(((activeStats.uphPure - secondaryActiveStats.uphPure) / secondaryActiveStats.uphPure * 100).toFixed(1)),
                              isPositiveGood: true
                            } : undefined}
                            onClick={() => {
                              setDetailMetric('Picking UPH (Pure Active)');
                              setCurrentTab('metrics');
                            }}
                          />
                          <MetricCard
                            title="UPH (Hourly Average)"
                            value={activeStats.uphHourlyFlow}
                            icon={<Activity className="w-5 h-5" />}
                            colorClass="from-slate-400 to-slate-500"
                            tooltip={METRIC_TOOLTIPS.UPH_HOURLY_AVG}
                            benchmarkValue={secondaryActiveStats?.uphHourlyFlow}
                            trend={isBenchmark && secondaryActiveStats ? {
                              value: Number(((activeStats.uphHourlyFlow - secondaryActiveStats.uphHourlyFlow) / secondaryActiveStats.uphHourlyFlow * 100).toFixed(1)),
                              isPositiveGood: true
                            } : undefined}
                            onClick={() => {
                              setDetailMetric('Picking UPH (Hourly Average)');
                              setCurrentTab('metrics');
                            }}
                          />
                          <MetricCard
                            title="Dynamic Flow UPH"
                            value={activeStats.dynamicIntervalUPH}
                            icon={<Activity className="w-5 h-5" />}
                            colorClass="from-indigo-400 to-purple-500"
                            tooltip={config?.flowCalculationMethod === 'user_daily_average'
                              ? "Grand Avg: Average of (Daily Team Averages), where Daily Team Avg is average of User Rates."
                              : METRIC_TOOLTIPS.DYNAMIC_FLOW_UPH
                            }
                            benchmarkValue={secondaryActiveStats?.dynamicIntervalUPH}
                            trend={isBenchmark && secondaryActiveStats ? {
                              value: Number(((activeStats.dynamicIntervalUPH - secondaryActiveStats.dynamicIntervalUPH) / secondaryActiveStats.dynamicIntervalUPH * 100).toFixed(1)),
                              isPositiveGood: true
                            } : undefined}
                          />
                        </div>
                      </DashboardSection>

                    </div>


                  </div>
                )
              )}
            </>
          )}

          {/* SHARED VISUAL EMPTY STATE FOR OTHER TABS */}
          {currentTab !== 'dashboard' && currentTab !== 'guide' && (!primaryAnalysis || data.length === 0) && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-500">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-xl font-medium text-slate-300">No Data Available</h3>
              <p className="mt-2 max-w-sm mx-auto text-slate-500">
                Please upload a shift log file in the Dashboard tab to view the {currentTab.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}.
              </p>
              <button
                onClick={() => setCurrentTab('dashboard')}
                className="mt-6 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm text-sm font-medium"
              >
                Go to Upload
              </button>
            </div>
          )}


          {/* OTHER TABS CONTENT (Only rendered when data exists) */}
          {primaryAnalysis && (
            <>
              {currentTab === 'health' && (
                <div className="flex-1">
                  <ShiftHealthView analysis={primaryAnalysis} />
                </div>
              )}

              {currentTab === 'report' && (
                <div className="flex-1 overflow-y-auto">
                  <ExecutiveReportView
                    analysis={primaryAnalysis}
                    benchmarkAnalysis={secondaryAnalysis}
                    benchmarkName={secondaryFile}
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

              {currentTab === 'jobs' && (
                <div className="flex-1 overflow-hidden">
                  <JobBreakdownView stats={primaryAnalysis.health.jobCodeStats} />
                </div>
              )}

              {currentTab === 'dictionary' && (
                <div className="flex-1 overflow-y-auto">
                  <AdaptationInsightsView data={primaryAnalysis.records} config={config} />
                </div>
              )}

              {currentTab === 'activity' && (
                <div className="h-[600px] overflow-hidden">
                  <ActivityMatrix
                    data={primaryAnalysis.records}
                    benchmarkData={secondaryAnalysis?.records}
                  />
                </div>
              )}

              {currentTab === 'users' && (
                <div className="flex-1">
                  <UserPerformanceView data={primaryAnalysis.userPerformance} />
                </div>
              )}

              {/* FORENSICS TAB REPLACED BY STITCH VIEW */}

              {currentTab === 'flow' && primaryAnalysis?.stats.picking.flowDetails && (
                <div className="flex-1">
                  <DynamicFlowView
                    data={primaryAnalysis.stats.picking.flowDetails}
                    processName="Picking"
                    score={primaryAnalysis.stats.picking.dynamicIntervalUPH}
                    avgTaskDuration={primaryAnalysis.stats.picking.avgTaskDuration}
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

              {currentTab === 'data-health' && summary && primaryAnalysis && (
                <div className="p-8 max-w-7xl mx-auto">
                  {(() => {
                    // Logic to construct a pseudo-summary for the benchmark file
                    // Since we don't have the original ingestion summary (raw rows, errors) for historical files,
                    // we reconstruct what we can from the active records.
                    const benchmarkSummary: IngestionSummary | undefined = isBenchmark ? {
                      totalRows: filteredBenchmarkData.length, // Approximation: We assume valid rows ~ total rows for benchmark context
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

                    console.log('🚀 Input Validation Debug:', {
                      isBenchmark,
                      primaryFile,
                      secondaryFile,
                      benchmarkFile,
                      filteredBenchmarkDataLength: filteredBenchmarkData.length,
                      benchmarkSummary,
                      hasPrimaryAnalysis: !!primaryAnalysis,
                      hasSecondaryAnalysis: !!secondaryAnalysis
                    });

                    return (
                      <DataHealthView
                        summary={summary}
                        diagnostics={primaryAnalysis.roleDiagnostics}
                        benchmarkSummary={benchmarkSummary}
                        benchmarkDiagnostics={isBenchmark && secondaryAnalysis ? secondaryAnalysis.roleDiagnostics : undefined}
                      />
                    );
                  })()}
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

              {currentTab === 'settings' && (
                <div className="p-8 max-w-4xl mx-auto w-full">
                  <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm p-6">
                    <div className="mb-6 pb-6 border-b border-border-light dark:border-border-dark">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Settings className="w-6 h-6 text-blue-600" />
                        Global Settings
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Adjust global shift parameters, job separation buffers, and legacy configurations.
                      </p>
                    </div>
                    <ConfigPanel
                      config={config}
                      onChange={setConfig}
                      suggestedBuffer={suggestedBuffer}
                      visibleSections={['global', 'legacy']}
                    />
                  </div>
                </div>
              )}

              {currentTab === 'standards' && (
                <div className="p-8 max-w-4xl mx-auto w-full">
                  <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm p-6">
                    <div className="mb-6 pb-6 border-b border-border-light dark:border-border-dark">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ClipboardList className="w-6 h-6 text-blue-600" />
                        Engineered Labor Standards
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Configure job workflow maps, engineered standards, and calculation groups.
                      </p>
                    </div>
                    <ConfigPanel
                      config={config}
                      onChange={setConfig}
                      suggestedBuffer={suggestedBuffer}
                      visibleSections={['workflow', 'standards']}
                    />
                  </div>
                </div>
              )}
              {currentTab === 'velocity' && (
                <div className="flex-1 overflow-y-auto">
                  <VelocityView
                    analysis={primaryAnalysis}
                    benchmark={secondaryAnalysis || undefined}
                    isLive={false}
                  />
                </div>
              )}

            </>
          )}

          {currentTab === 'guide' && (
            <div className="flex-1 overflow-y-auto">
              <UserGuideView />
            </div>
          )}

        </div>
      </div>
    </Layout >
  );
}

export default App;
