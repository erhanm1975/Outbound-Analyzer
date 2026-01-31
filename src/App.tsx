import { useState, useMemo, useEffect } from 'react';
import { Layout } from './components/layout';
import { FileDropzone } from './components/file-dropzone';
import { MetricCard } from './components/metric-card';
import { ActivityMatrix } from './components/activity-matrix';
import { ConfigPanel } from './components/config-panel';
import { ImportSummary } from './components/import-summary';
import { AnomaliesView } from './components/anomalies-view';
import { ShiftDetailView } from './components/shift-detail-view';
import { ShiftHealthView } from './components/shift-health-view';
import { ExecutiveReportView } from './components/executive-report-view';

import { JobBreakdownView } from './components/job-breakdown-view';
import { DataHealthView } from './components/data-health-view';
import { MetricSupportView } from './components/metric-support-view';
import { useFileIngestion } from './hooks';
import { analyzeShift } from './logic/analysis';
import { generateAIContext } from './logic/context-export';
import { DEFAULT_CONFIG, type BufferConfig } from './types';
import { Activity, Clock, Box, TrendingUp, AlertTriangle } from 'lucide-react';
import { GlobalHeader } from './components/global-header';

function App() {
  const { processFiles, isProcessing, data, summary, error } = useFileIngestion();
  const [config, setConfig] = useState<BufferConfig>(DEFAULT_CONFIG);
  const [showSummary, setShowSummary] = useState(false);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'health' | 'jobs' | 'activity' | 'details' | 'anomalies' | 'data-health' | 'report' | 'metrics'>('dashboard');

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

  const [jobTypeFilter, setJobTypeFilter] = useState<string>('ALL');
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');
  const [dashboardScope, setDashboardScope] = useState<'picking' | 'packing'>('picking');

  // Extract unique Filters
  const { availableJobTypes, availableTaskTypes, availableClients } = useMemo(() => {
    // Filter source data by active file
    const targetData = activeFile ? data.filter(d => d.filename === activeFile) : data;

    const jobs = new Set<string>();
    const tasks = new Set<string>();
    const clients = new Set<string>();

    targetData.forEach(d => {
      if (d.JobType) jobs.add(d.JobType);
      if (d.TaskType) tasks.add(d.TaskType);
      if (d.Client) clients.add(d.Client);
    });

    return {
      availableJobTypes: Array.from(jobs).sort(),
      availableTaskTypes: Array.from(tasks).sort(),
      availableClients: Array.from(clients).sort()
    };
  }, [data, activeFile]);

  const primaryFile = activeFile || filenames[0];
  const secondaryFile = (benchmarkFile && benchmarkFile !== primaryFile) ? benchmarkFile : null;
  const isBenchmark = !!secondaryFile;

  // Helper to apply filters
  const filterData = (dataset: typeof data) => {
    return dataset.filter(d => {
      if (jobTypeFilter !== 'ALL' && d.JobType !== jobTypeFilter) return false;
      if (taskTypeFilter !== 'ALL' && d.TaskType !== taskTypeFilter) return false;
      if (clientFilter !== 'ALL' && d.Client !== clientFilter) return false;
      return true;
    });
  };

  // Analysis
  const primaryAnalysis = useMemo(() => {
    if (!primaryFile) return null;
    let subset = data.filter(d => d.filename === primaryFile || !d.filename);
    subset = filterData(subset);
    return analyzeShift(subset, config);
  }, [data, config, primaryFile, jobTypeFilter, taskTypeFilter, clientFilter]);

  const secondaryAnalysis = useMemo(() => {
    if (!secondaryFile) return null;
    let subset = data.filter(d => d.filename === secondaryFile);
    subset = filterData(subset); // Should we apply fitlers to benchmark? Yes usually.
    return analyzeShift(subset, config);
  }, [data, config, secondaryFile, jobTypeFilter, taskTypeFilter, clientFilter]);

  const activeStats = primaryAnalysis ? primaryAnalysis.stats[dashboardScope] : null;
  const secondaryActiveStats = secondaryAnalysis ? secondaryAnalysis.stats[dashboardScope] : null;

  // View state
  const handleFiles = (files: File[]) => {
    processFiles(files);
  };

  return (
    <Layout
      sidebar={
        <ConfigPanel config={config} onChange={setConfig} />
      }
      currentTab={currentTab}
      onTabChange={setCurrentTab}
    >
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto h-full flex flex-col relative">
        {/* Background Blobs (Absolute Positioned) */}
        <div className="fixed top-0 left-0 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-[80px] opacity-60 -translate-x-1/2 -translate-y-1/2 -z-10 animate-pulse pointer-events-none"></div>
        <div className="fixed top-1/2 right-0 w-[30rem] h-[30rem] bg-purple-300 rounded-full mix-blend-multiply filter blur-[80px] opacity-60 translate-x-1/4 -translate-y-1/2 -z-10 pointer-events-none"></div>
        <div className="fixed bottom-0 left-1/3 w-80 h-80 bg-cyan-200 rounded-full mix-blend-multiply filter blur-[80px] opacity-60 translate-y-1/3 -z-10 pointer-events-none"></div>

        {/* Header / Error */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}

        {summary && showSummary && (
          <ImportSummary summary={summary} onClose={() => setShowSummary(false)} />
        )}

        {/* Dropzone (Only if no data) */}
        {data.length === 0 && (
          <div className="max-w-xl mx-auto mt-20">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Shift Analysis Ingestion</h2>
              <p className="text-slate-500 mt-2">Upload day log or multiple logs for benchmarking</p>
            </div>
            <FileDropzone onFilesSelected={handleFiles} isProcessing={isProcessing} />
            {isProcessing && <div className="text-center mt-4 text-slate-400 text-sm animate-pulse">Processing shift data...</div>}
          </div>
        )}

        {/* Dashboard Content */}
        {data.length > 0 && primaryAnalysis && (
          <div className="flex-1 flex flex-col overflow-y-auto min-h-0">
            {/* File Context Bar */}
            {filenames.length > 0 && (
              <div className="px-4 py-3 border-b border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-20 mb-4 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">

                  {/* Active Selector */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                      Analyzed File
                    </span>
                    <div className="flex gap-2">
                      {filenames.map(fname => (
                        <button
                          key={fname}
                          onClick={() => setActiveFile(fname)}
                          className={`
                                    px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border flex items-center gap-2
                                    ${activeFile === fname
                              ? 'bg-slate-800 text-white border-slate-800 shadow-md ring-1 ring-slate-200'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                                `}
                        >
                          {fname}
                          {activeFile === fname && <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-6 w-px bg-slate-200 mx-2"></div>

                  {/* Benchmark Selector */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Vs Benchmark
                    </span>
                    <select
                      value={benchmarkFile || ''}
                      onChange={(e) => setBenchmarkFile(e.target.value || null)}
                      className="bg-white border border-slate-200 text-slate-600 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5 pl-3 pr-8 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <option value="">None (No Comparison)</option>
                      {filenames.filter(f => f !== activeFile).map(fname => (
                        <option key={fname} value={fname}>{fname}</option>
                      ))}
                    </select>
                  </div>

                </div>
              </div>
            )}

            <GlobalHeader
              title={isBenchmark ? `Benchmark: ${primaryFile} vs ${secondaryFile}` : `Shift Report: ${primaryFile}`}
              taskCount={primaryAnalysis.records.length}
              secondaryTaskCount={secondaryAnalysis?.records.length}
              clients={availableClients}
              jobTypes={availableJobTypes}
              taskTypes={availableTaskTypes}
              selectedClient={clientFilter}
              selectedJobType={jobTypeFilter}
              selectedTaskType={taskTypeFilter}
              onClientChange={setClientFilter}
              onJobTypeChange={setJobTypeFilter}
              onTaskTypeChange={setTaskTypeFilter}
              onClearData={() => window.location.reload()}
              isBenchmark={isBenchmark}
              onExportContext={() => {
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
              }}
            />

            {/* TAB CONTENT */}
            <>
              {currentTab === 'dashboard' && activeStats && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

                  {/* Process Filter Toggle */}
                  <div className="flex items-center justify-center mb-8">
                    <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
                      <button
                        onClick={() => setDashboardScope('picking')}
                        className={`px-8 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${dashboardScope === 'picking'
                          ? 'bg-white text-blue-600 shadow-sm border border-slate-100'
                          : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Picking
                      </button>
                      <button
                        onClick={() => setDashboardScope('packing')}
                        className={`px-8 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${dashboardScope === 'packing'
                          ? 'bg-white text-fuchsia-600 shadow-sm border border-slate-100'
                          : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Packing
                      </button>
                    </div>
                  </div>

                  {/* Section 1: Productivity Landscape */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`h-4 w-1 rounded-full ${dashboardScope === 'picking' ? 'bg-blue-500' : 'bg-fuchsia-500'}`}></div>
                      <h3 className="text-slate-500 font-semibold uppercase tracking-wider text-xs">Productivity Landscape ({dashboardScope})</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <MetricCard
                        title="UPH (Occupancy)"
                        value={activeStats.uph}
                        icon={<Activity className="w-5 h-5" />}
                        colorClass={dashboardScope === 'picking' ? "from-blue-500 to-indigo-600" : "from-fuchsia-500 to-pink-600"}
                        tooltip={`${dashboardScope === 'picking' ? 'Picking' : 'Packing'} UPH (Occupancy): Total Units / Total Shift Span. Includes idle time and gaps.`}
                        benchmarkValue={secondaryActiveStats?.uph}
                        trend={isBenchmark && secondaryActiveStats ? {
                          value: Number(((activeStats.uph - secondaryActiveStats.uph) / secondaryActiveStats.uph * 100).toFixed(1)),
                          isPositiveGood: true
                        } : undefined}
                        onClick={() => {
                          setDetailMetric('UPH (Occupancy)');
                          setCurrentTab('metrics');
                        }}
                      />
                      <MetricCard
                        title="UPH (Pure Active)"
                        value={activeStats.uphPure}
                        icon={<Activity className="w-5 h-5" />}
                        colorClass={dashboardScope === 'picking' ? "from-blue-400 to-cyan-500" : "from-pink-500 to-rose-500"}
                        tooltip="Productivity Ceiling: Total Units / Sum of Task Durations. Excludes ALL gaps."
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
                        colorClass={dashboardScope === 'picking' ? "from-indigo-400 to-purple-500" : "from-rose-400 to-orange-500"}
                        tooltip="Throughput Capacity: Average Volume per active hour."
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
                    </div>
                  </section>

                  {/* Section 2: Operational Velocity */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`h-4 w-1 rounded-full ${dashboardScope === 'picking' ? 'bg-purple-500' : 'bg-pink-500'}`}></div>
                      <h3 className="text-slate-500 font-semibold uppercase tracking-wider text-xs">Operational Velocity ({dashboardScope})</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <MetricCard
                        title="Total Volume"
                        value={activeStats.totalVolume.toLocaleString()}
                        subValue={`${(activeStats.totalVolume / (activeStats.totalActiveTime || 1)).toFixed(0)} avg/hr`}
                        icon={<Box className="w-5 h-5" />}
                        colorClass={dashboardScope === 'picking' ? "from-orange-400 to-amber-500" : "from-amber-500 to-yellow-500"}
                        tooltip="Output: The absolute sum of 'Quantity' for selected process."
                        benchmarkValue={secondaryActiveStats?.totalVolume.toLocaleString()}
                        trend={isBenchmark && secondaryActiveStats ? {
                          value: Number(((activeStats.totalVolume - secondaryActiveStats.totalVolume) / secondaryActiveStats.totalVolume * 100).toFixed(1)),
                          isPositiveGood: true
                        } : undefined}
                      />
                      <MetricCard
                        title="TPH (Tasks Per Hour)"
                        value={activeStats.tph}
                        icon={<Clock className="w-5 h-5" />}
                        colorClass={dashboardScope === 'picking' ? "from-purple-500 to-fuchsia-600" : "from-violet-500 to-purple-600"}
                        tooltip="Throughput: Total Tasks executed / Active Hours."
                        benchmarkValue={secondaryActiveStats?.tph}
                        trend={isBenchmark && secondaryActiveStats ? {
                          value: Number(((activeStats.tph - secondaryActiveStats.tph) / secondaryActiveStats.tph * 100).toFixed(1)),
                          isPositiveGood: true
                        } : undefined}
                      />
                      <MetricCard
                        title="Utilization"
                        value={`${activeStats.utilization}%`}
                        icon={<TrendingUp className="w-5 h-5" />}
                        colorClass={dashboardScope === 'picking' ? "from-emerald-400 to-teal-600" : "from-teal-400 to-cyan-600"}
                        tooltip="Efficiency: (Direct Task Time / Total Span) * 100."
                        benchmarkValue={secondaryActiveStats ? `${secondaryActiveStats.utilization}%` : undefined}
                        trend={isBenchmark && secondaryActiveStats ? {
                          value: Number(activeStats.utilization - secondaryActiveStats.utilization), // Percentage point diff
                          isPositiveGood: true
                        } : undefined}
                        onClick={() => {
                          setDetailMetric(`${dashboardScope === 'picking' ? 'Picking' : 'Packing'} Utilization`);
                          setCurrentTab('metrics');
                        }}
                      />
                    </div>
                  </section>

                  {/* Section 3: Spatial Impact */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`h-4 w-1 rounded-full ${dashboardScope === 'picking' ? 'bg-cyan-500' : 'bg-rose-500'}`}></div>
                      <h3 className="text-slate-500 font-semibold uppercase tracking-wider text-xs">Spatial Impact ({dashboardScope})</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <MetricCard
                        title="Distinct Locations"
                        value={activeStats.distinctLocations.toLocaleString()}
                        icon={<Activity className="w-5 h-5" />}
                        colorClass={dashboardScope === 'picking' ? "from-cyan-400 to-blue-500" : "from-orange-400 to-red-500"}
                        tooltip="Coverage: Count of unique locations visited."
                        benchmarkValue={secondaryActiveStats?.distinctLocations.toLocaleString()}
                        trend={isBenchmark && secondaryActiveStats ? {
                          value: Number(((activeStats.distinctLocations - secondaryActiveStats.distinctLocations) / secondaryActiveStats.distinctLocations * 100).toFixed(1)),
                          isPositiveGood: false // Fewer locations is generally better for efficiency
                        } : undefined}
                      />
                      <MetricCard
                        title="Locs / Unit"
                        value={activeStats.locationsPerUnit}
                        icon={<Activity className="w-5 h-5" />}
                        colorClass={dashboardScope === 'picking' ? "from-indigo-400 to-purple-500" : "from-red-400 to-rose-500"}
                        tooltip="Density: 'Distinct Locations' / 'Total Volume'."
                        benchmarkValue={secondaryActiveStats?.locationsPerUnit}
                        trend={isBenchmark && secondaryActiveStats ? {
                          value: Number(((activeStats.locationsPerUnit - secondaryActiveStats.locationsPerUnit) / secondaryActiveStats.locationsPerUnit * 100).toFixed(1)),
                          isPositiveGood: false // Lower values indicate higher density, which is better
                        } : undefined}
                      />
                    </div>
                  </section>
                </div>
              )}

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
                  />
                </div>
              )}

              {currentTab === 'jobs' && (
                <div className="flex-1 overflow-hidden">
                  <JobBreakdownView stats={primaryAnalysis.health.jobCodeStats} />
                </div>
              )}

              {currentTab === 'activity' && (
                <div className="h-[600px] overflow-hidden">
                  <ActivityMatrix data={primaryAnalysis.records} />
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

              {currentTab === 'data-health' && summary && (
                <div className="flex-1">
                  <DataHealthView
                    summary={summary}
                    diagnostics={primaryAnalysis?.roleDiagnostics} // Pass diagnostics
                  />
                </div>
              )}
            </>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default App;
