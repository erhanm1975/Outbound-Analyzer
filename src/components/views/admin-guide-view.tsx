import React, { useState } from 'react';
import { Download, Activity, Clock, Box, ShieldAlert, Settings, Zap, GitMerge, CheckCircle, Database, LayoutDashboard, Target, Beaker, Share2, HelpCircle, FileText, Server } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { QuadrantCard } from '../guide/quadrant-card';
import { cn } from '../../lib/utils';

const TOC_SECTIONS = [
    { id: 'sec-1', title: '1. Introduction & Overview', icon: ShieldAlert },
    { id: 'sec-2', title: '2. System Configuration', icon: Settings },
    { id: 'sec-3', title: '3. Data Ingestion', icon: Database },
    { id: 'sec-4', title: '4. Analytical Dashboards', icon: LayoutDashboard },
    { id: 'sec-5', title: '5. Standards Impact', icon: Target },
    { id: 'sec-6', title: '6. GOLA Audit Scenarios', icon: Beaker },
    { id: 'sec-7', title: '7. Troubleshooting & FAQs', icon: HelpCircle },
];

export function AdminGuideView() {
    const [isExporting, setIsExporting] = useState(false);
    const [activeSection, setActiveSection] = useState('sec-1');

    const handleDownloadPdf = async () => {
        setIsExporting(true);
        try {
            const element = document.getElementById('manual-content');
            if (!element) return;

            // Wait slightly for any UI to settle
            await new Promise(resolve => setTimeout(resolve, 100));

            const canvas = await html2canvas(element, {
                scale: 2, // High DPI for text clarity
                backgroundColor: '#020617', // Match design system (slate-950)
                useCORS: true,
                logging: false, // turn off logging to console
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            });

            const imgData = canvas.toDataURL('image/png');
            let pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            // For a single long scrolling document, we'll embed the whole scaled image.
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.max(pdfHeight, pdf.internal.pageSize.getHeight()));
            pdf.save('Admin_Manual_Job_Analyzer.pdf');
        } catch (error) {
            console.error('Failed to export PDF:', error);
            alert('Failed to generate PDF. Check console for details.');
        } finally {
            setIsExporting(false);
        }
    };

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveSection(id);
        }
    };

    return (
        <div className="h-full bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col relative overflow-hidden">

            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 xl:px-8 xl:py-6 shrink-0 z-20 flex justify-between items-center shadow-sm">
                <div className="max-w-7xl">
                    <h1 className="text-2xl xl:text-3xl font-bold tracking-tight mb-1 xl:mb-2">Technical Admin Manual</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-xs xl:text-sm">Documentation of system logic, formulas, and configurations compliant with ADDS v1.0.</p>
                </div>
                <div>
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isExporting ? <Activity className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        <span className="text-sm font-medium hidden sm:inline">{isExporting ? 'Generating PDF...' : 'Export to PDF'}</span>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* TOC Sidebar */}
                <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hidden md:flex flex-col p-4 overflow-y-auto shrink-0 z-10 custom-scrollbar">
                    <h4 className="font-semibold text-slate-300 mb-4 px-2 uppercase tracking-wider text-xs">Table of Contents</h4>
                    <nav className="space-y-1">
                        {TOC_SECTIONS.map(sec => (
                            <button
                                key={sec.id}
                                onClick={() => scrollToSection(sec.id)}
                                className={cn(
                                    "flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm rounded-lg transition-all",
                                    activeSection === sec.id
                                        ? "bg-blue-500/10 text-blue-400 font-medium"
                                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                                )}
                            >
                                <sec.icon className={cn("w-4 h-4", activeSection === sec.id ? "text-blue-400" : "text-slate-500")} />
                                <span className="truncate">{sec.title}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Main Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth relative" id="scroll-container">
                    <div id="manual-content" className="max-w-4xl mx-auto space-y-20 bg-[#0B1120] text-slate-100 p-8 rounded-xl ring-1 ring-slate-800/50 shadow-xl">

                        {/* SECTION 1: Introduction */}
                        <section id="sec-1" className="scroll-mt-8 space-y-6">
                            <div className="border-b border-slate-800 pb-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <ShieldAlert className="w-6 h-6 text-blue-500" />
                                    <h2 className="text-2xl font-semibold">1. Introduction & Overview</h2>
                                </div>
                            </div>

                            <div className="prose prose-invert max-w-none text-slate-300">
                                <p>
                                    Welcome to the <strong>Technical Admin Manual</strong> based on the Antigravity Dashboard Documentation Standard (ADDS) v1.0.
                                    This guide is part of our Dual-Manual Strategy:
                                </p>
                                <ul>
                                    <li><strong>The Admin Guide (Here):</strong> Focuses on algorithmic integrity, backend configuration parameters, formula derivations, and deep-dive troubleshooting.</li>
                                    <li><strong>The User Guide:</strong> Focuses on daily operational workflows, shift handoffs, and interactive UI navigation.</li>
                                </ul>

                                <h3 className="text-xl font-bold text-blue-400 border-b border-slate-700/50 pb-2 mt-8 mb-4">1.1 Purpose of the Application</h3>
                                <p>
                                    The Job Analyzer (Forensic OS) is designed to ingest raw warehouse telemetry (task scans, job assignments, workflow events) and deterministically reconstruct the temporal realities of a shift.
                                    By applying a rigorous heuristic engine, the system filters out noise, travel time, and operational friction to reveal true "Productive" output versus "Floor" output.
                                </p>

                                <h3 className="text-xl font-bold text-blue-400 border-b border-slate-700/50 pb-2 mt-8 mb-4">1.2 Key Concepts & Terminology</h3>
                                <ul>
                                    <li><strong>Process Flow:</strong> The high-level physical path of a warehouse function (e.g., OUTBOUND, INBOUND).</li>
                                    <li><strong>TaskObject:</strong> A normalized, deterministic single row of work (e.g., a pick or a stowed item) representing strictly Start, Finish, Duration, and Volume.</li>
                                    <li><strong>Adaptation Matrix:</strong> The system's logical layer that maps raw inputs into actionable intelligence regarding how work was distributed across the floor.</li>
                                </ul>

                                <h4 className="mt-8 mb-3 text-lg font-semibold text-emerald-400">1.2.1 Job Flows (Picking Strategies)</h4>
                                <ul className="space-y-2 text-sm">
                                    <li><strong>SIBP (Single Item Batch Pick):</strong> Picking single-item orders in a batch for downstream sortation.</li>
                                    <li><strong>MICP (Multi-Item Cluster Pick):</strong> Picking multiple items for multiple orders directly into a clustered cart/trolley (e.g., a put-to-light cart).</li>
                                    <li><strong>SICP (Single Item Cluster Pick):</strong> Picking single items across multiple distinct orders into a clustered setup.</li>
                                    <li><strong>IIBP (Identical Item Batch Pick):</strong> Picking a large batch of the exact same SKU (high density, high velocity).</li>
                                    <li><strong>IOBP (Identical Order Batch Pick):</strong> Picking identical multi-item orders simultaneously.</li>
                                    <li><strong>OBPP (Order Based Pick Pack):</strong> Traditional, discrete order-by-order picking and immediate packing.</li>
                                    <li><strong>Put-Wall:</strong> High-density wave sortation method where operators put picked items into specific downstream compartments designated for a single user/order.</li>
                                </ul>

                                <h4 className="mt-8 mb-3 text-lg font-semibold text-emerald-400">1.2.2 Engineered Standards vs. Actual Performance</h4>
                                <p className="mb-2">
                                    <strong>Engineered Standards:</strong> The theoretical baseline time allowances assigned to granular micro-tasks (e.g., 1.5 seconds to scan an item, 0.8 seconds to walk one meter, 12 seconds to set up a trolley). These can be customized to your specific facility.
                                </p>
                                <p>
                                    <strong>Actual Performance:</strong> The real-world time calculated based on the elapsed duration between physical scanner transactions. The system compares Actual vs. Standard to generate an overall <em>Efficiency Score</em>.
                                </p>

                                <h3 className="text-xl font-bold text-blue-400 border-b border-slate-700/50 pb-2 mt-8 mb-4">1.3 Navigation Overview</h3>
                                <p className="mb-4">
                                    The application's interface is structured around a primary left-hand sidebar, organized into functional administrative areas:
                                </p>
                                <ul className="space-y-3">
                                    <li>
                                        <strong className="text-blue-300">Dashboards:</strong> Your starting point for high-level summaries. Includes the <strong>Executive Report</strong> for overall health, <strong>Shift Health</strong> for chronological performance tracking, and <strong>Data Health</strong> for validating the quality of your uploaded scan data.
                                    </li>
                                    <li>
                                        <strong className="text-blue-300">Analysis & Deep Dives:</strong> Granular diagnostic views. Use the <strong>Dynamic Flow</strong> to visualize task state transitions, <strong>Job Details</strong> to drill down into specific pick job IDs, and <strong>Velocity</strong> to track Units Per Hour (UPH) and Lines Per Hour (LPH) against theoretical limits.
                                    </li>
                                    <li>
                                        <strong className="text-blue-300">GOLA Benchmarks:</strong> A dedicated workspace (GOLA Audit Runner) for executing and reviewing standard operational audits.
                                    </li>
                                    <li>
                                        <strong className="text-blue-300">Configuration (Settings):</strong> The administrative core. This is where you adjust Global Shift Settings (breaks, hours), define Warehouse Logic Variables (walking speeds, cart capacities), and fine-tune Job Standards across all the specific job flows.
                                    </li>
                                </ul>
                            </div>
                        </section>

                        {/* SECTION 2: Configuration */}
                        <section id="sec-2" className="scroll-mt-8 space-y-6">
                            <div className="border-b border-slate-800 pb-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <Settings className="w-6 h-6 text-slate-400" />
                                    <h2 className="text-2xl font-semibold">2. System Configuration & Settings</h2>
                                </div>
                            </div>

                            <div className="prose prose-invert max-w-none text-slate-300 mb-8">
                                <p>
                                    Administrative settings control the macro-level behavior of the calculation engine. Minor adjustments to these variables can wildly swing the resulting UPH computations.
                                    <strong>Always modify these with caution.</strong>
                                </p>

                                <h3 className="text-xl font-bold text-blue-400 border-b border-slate-700/50 pb-2 mt-8 mb-4">2.1 Global Shift Settings</h3>
                                <p>
                                    Configure shift times, breaks, and shift logic via the <strong>GlobalShiftSettings</strong> module.
                                </p>
                            </div>

                            <QuadrantCard
                                title="Global Buffer Parameters"
                                icon={Settings}
                                colorClasses={{ bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' }}
                                concept={
                                    <p>
                                        The calculation engine relies on specific thresholds to delineate "Active Work" from "Breaks" or "Anomalies". Without these buffers, any pause in scanning would unfairly penalize Productive UPH or artificially extend task durations.
                                    </p>
                                }
                                math={{
                                    formula: "If (Scan[n].Start - Scan[n-1].Finish) > BreakThreshold, then Gap = Break",
                                    variables: [
                                        { name: "Break Threshold (300s)", description: "Default 5 minutes. Any gap larger than this resets the active time counter. Can be overridden in UI." },
                                        { name: "Smoothing Tolerance (2s)", description: "Accounts for duplicate scans or network latency overlaps." },
                                        { name: "Travel Ratio (0.70)", description: "When standards aren't used, estimates that 70% of a task's elapsed time is Travel, 30% is Process." }
                                    ]
                                }}
                                visualReference={
                                    <div className="w-full text-xs font-mono bg-[#0B1120] border border-slate-700 rounded-xl p-4 space-y-2">
                                        <div className="flex justify-between items-center text-slate-400">
                                            <span>breakThresholdSec</span>
                                            <span className="text-emerald-400">300</span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-400">
                                            <span>smoothingToleranceSec</span>
                                            <span className="text-emerald-400">2</span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-400">
                                            <span>pickingTravelRatio</span>
                                            <span className="text-emerald-400">0.70</span>
                                        </div>
                                    </div>
                                }
                                usageAndImpact={
                                    <ul className="list-disc pl-4 space-y-2">
                                        <li><strong>Customization:</strong> Modifying `breakThreshold` allows sites with longer travel paths (e.g. Non-Sort) to prevent travel time from being flagged as a break.</li>
                                    </ul>
                                }
                            />

                            <div className="prose prose-invert max-w-none text-slate-300 mt-8">
                                <h3 className="text-xl font-bold text-blue-400 border-b border-slate-700/50 pb-2 mt-8 mb-4">2.2 Job Flow Settings</h3>
                                <p>
                                    Use the <strong>JobFlowSettings</strong> module to activate or deactivate specific outbound job flows (e.g., turning off <em>Put-Wall</em> if your facility only uses discrete picking).
                                </p>
                                <p>
                                    If your WMS sends job codes that the analyzer doesn't recognize out of the box, use the <strong>job-type-mapping-modal</strong> to map unmapped job types to their corresponding analytic flows.
                                </p>

                                <h3 className="text-xl font-bold text-blue-400 border-b border-slate-700/50 pb-2 mt-8 mb-4">2.3 Managing Engineered Standards</h3>
                                <p>
                                    The <strong>EngineeredStandardsSettings</strong> module provides an overview of <em>Global</em> versus <em>Customized</em> Engineered Standards.
                                    Admins can define default times (in seconds) that tasks should theoretically take.
                                </p>
                                <p>
                                    You can adjust specific task durations (e.g., Walk Time, Scan Time, Put Time) across the following breakdown tabs:
                                </p>
                                <ul className="space-y-1">
                                    <li><strong>IIBP (Identical Item Batch Pick)</strong> Breakdown</li>
                                    <li><strong>SIBP (Single Item Batch Pick)</strong> Breakdown</li>
                                    <li><strong>IOBP (Identical Order Batch Pick)</strong> Breakdown</li>
                                    <li><strong>MICP (Multi-Item Cluster Pick)</strong> Breakdown</li>
                                    <li><strong>SICP (Single Item Cluster Pick)</strong> Breakdown</li>
                                    <li><strong>OBPP (Order Based Pick Pack)</strong> Breakdown</li>
                                    <li><strong>Put Wall</strong> Breakdown</li>
                                </ul>

                                <h3 className="text-xl font-bold text-blue-400 border-b border-slate-700/50 pb-2 mt-8 mb-4">2.4 Warehouse Logic Variables</h3>
                                <p>
                                    Use the <strong>warehouse-logic-view</strong> to tune facility-specific parameters that dictate the heuristic engine's physics. This includes tuning walking velocity (meters per second), trolley setup times, and downstream sorting parameters.
                                    Key parameters defined in the global engine include:
                                </p>
                                <ul className="space-y-2 mt-4 ml-2">
                                    <li>
                                        <strong>Walking Velocity (Travel Proxy):</strong> Tuned via the <em>"Travel to Location"</em> micro-activity (e.g., 40s default). Affects how much time is geometrically allocated to moving between pick faces.
                                    </li>
                                    <li>
                                        <strong>Trolley Setup Times:</strong> Tuned via <em>"Job Initialization"</em> and <em>"Cart Setup"</em> activities (e.g., 100s default). Defines the fixed overhead required before the first item can be picked.
                                    </li>
                                    <li>
                                        <strong>Downstream Sorting Parameters:</strong> Tuned via the <em>Sorting Duration</em> tables (e.g., <em>"Scan Item"</em> vs <em>"Scan Tote"</em>). Used specifically in 2-stage sortation flows like Put-Wall.
                                    </li>
                                </ul>
                            </div>
                        </section>

                        {/* SECTION 3: Data Ingestion */}
                        <section id="sec-3" className="scroll-mt-8 space-y-6">
                            <div className="border-b border-slate-800 pb-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <Database className="w-6 h-6 text-emerald-500" />
                                    <h2 className="text-2xl font-semibold">3. Data Ingestion & Validation</h2>
                                </div>
                            </div>

                            <div className="prose prose-invert max-w-none text-slate-300 mb-8">
                                <p>
                                    The integrity of the Job Analyzer relies entirely upon strict Data Validation protocols at the time of file upload.
                                    The system accepts raw `CSV` or `Excel` files and processes them via Web Workers to prevent UI blocking.
                                </p>

                                <h3 className="text-xl font-bold text-blue-400 border-b border-slate-700/50 pb-2 mt-8 mb-4">3.1 Uploading Data</h3>
                                <p>
                                    Use the main upload portal to drag and drop raw shift telemetry. The system currently supports roughly ~50,000 to ~80,000 rows gracefully on a standard browser thread. For extremely large volumes (exceeding 110,000 rows), we recommend utilizing the <strong>Memory-Optimized JSON Ingestion</strong> script (<code>scan_hardcoded.js</code>) rather than standard browser uploads to avoid "Maximum call stack size exceeded" errors.
                                </p>

                                <h3 className="text-xl font-bold text-blue-400 border-b border-slate-700/50 pb-2 mt-8 mb-4">3.2 The Import Summary</h3>
                                <p>
                                    During upload, you will be presented with an <strong>Import Summary Mapping</strong>. The system automatically attempts to map your raw file columns to its required schema. Every mapped row must successfully resolve fundamental data points to be processed:
                                </p>
                                <ul>
                                    <li><strong>Target Timestamp:</strong> Used for absolute temporal ordering.</li>
                                    <li><strong>User ID:</strong> For grouping TaskObjects properly to calculate utilization.</li>
                                    <li><strong>Job/Task Types:</strong> Used to map to engineered standards.</li>
                                </ul>

                                <h3 className="text-xl font-bold text-blue-400 border-b border-slate-700/50 pb-2 mt-8 mb-4">3.3 Data Health & Anomaly Detection</h3>
                                <p>
                                    Rows lacking fundamental pieces of data (e.g., negative durations, missing timestamps) fall into the <code>Anomalies</code> bucket. Large percentages of anomalies (&gt; 2%) usually indicate a structural change to the upstream database schema or a corrupt CSV export. Admins should investigate the <strong>Data Health View</strong> immediately if anomaly alerts fire to diagnose mapping failures before analyzing the active shift.
                                </p>
                            </div>
                        </section>

                        {/* SECTION 4 */}
                        <section id="sec-4" className="scroll-mt-8 space-y-6">
                            <div className="border-b border-slate-800 pb-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <LayoutDashboard className="w-6 h-6 text-indigo-400" />
                                    <h2 className="text-2xl font-semibold">4. Analytical Dashboards & Reporting</h2>
                                </div>
                            </div>

                            <div className="prose prose-invert max-w-none text-slate-300">
                                <p>
                                    This section explains the logical underpinnings and mathematical aggregations powering the diverse array of shift-analysis views.
                                </p>

                                <h3 className="text-xl font-bold text-blue-400 border-b border-slate-700/50 pb-2 mt-8 mb-4">4.1 The Executive Report View</h3>
                                <ul className="space-y-3 mt-4 ml-2">
                                    <li>
                                        <strong>Reading High-Level Metrics (Hero Metric Cards):</strong> These prominent display cards condense the entire shift into aggregate totals (e.g., Total Units, Active Hours, overall UPH/TPH). They provide an immediate, weighted snapshot of shift health without requiring the admin to filter by specific job flows.
                                    </li>
                                    <li>
                                        <strong>Volume vs. Workforce Utilization Charts:</strong> By slicing the shift timeline into discrete 15- or 30-minute buckets via the <code>bucketRecords</code> function, this graph visually plots output (volume) directly against active headcount. This makes it instantly obvious when the operation decoupled—for instance, if 50 workers were active but throughput inexplicably collapsed at 2:00 PM.
                                    </li>
                                </ul>

                                <h3 className="text-xl font-bold text-blue-400 border-b border-slate-700/50 pb-2 mt-8 mb-4">4.2 Shift Health & Details View</h3>
                                <ul className="space-y-3 mt-4 ml-2">
                                    <li>
                                        <strong>Analyzing Shift-Over-Shift Performance (shift-health-view):</strong> This view acts as a comparison engine. By loading a benchmark file (or theoretical standard), the system cross-references task duration averages and calculates the Delta in Efficiency Score. Green indicates beating the benchmark; red flags regressions.
                                    </li>
                                    <li>
                                        <strong>Deep-Dive into Intra-Shift Bottlenecks (shift-detail-view):</strong> When the Executive Report flags an issue, this view allows the admin to drill down into the microscopic timeline of a specific `Job_ID` or user, isolating the exact friction points driving negative efficiency.
                                    </li>
                                </ul>

                                <h3 className="text-xl font-bold text-blue-400 border-b border-slate-700/50 pb-2 mt-8 mb-4">4.3 Velocity & Dynamic Flow Views</h3>
                                <ul className="space-y-3 mt-4 ml-2">
                                    <li>
                                        <strong>Interpreting the Velocity View (UPH vs. LPH):</strong> This view differentiates between Volume-based efficiency (Units Per Hour) and Transaction-based efficiency (Lines Per Hour). An admin must understand this distinction: high UPH with low LPH implies the worker picked massive quantities of identical items (bulk picking), while high LPH means the worker is moving rapidly between locations (high travel velocity).
                                    </li>
                                    <li>
                                        <strong>Visualizing State Transitions (Dynamic Flow View):</strong> This connects to the <code>Task Flow Visualizer</code>, plotting scanning events on a timeline to identify hidden friction. It distinguishes "Active Processing Time" from "Idle Time", revealing if a worker is slow because they are walking too far between locations, or because they are paused at the cart scanning items.
                                    </li>
                                </ul>

                                <h3 className="text-xl font-bold text-blue-400 border-b border-slate-700/50 pb-2 mt-8 mb-4">4.4 Job Details View</h3>
                                <ul className="space-y-3 mt-4 ml-2">
                                    <li>
                                        <strong>Drilling Down into Specific Job IDs (job-details-view):</strong> This view isolates the dataset to a single <code>Job_ID</code>. The engine calculates the timeline perfectly from <code>Start_Time(First_Task)</code> to <code>Finish_Time(Last_Task)</code>, intentionally excluding macro shift breaks from its internal Friction Calculation to show pure job execution time.
                                    </li>
                                    <li>
                                        <strong>Order Profile and Wave Volume Charts:</strong> Inside the <code>job-detail-panel</code>, these charts reverse-engineer the complexity of the job. They show if a picker was slowed down by high-quantity single lines (Volume) or high-complexity multi-line orders (Profile), providing context to the raw duration.
                                    </li>
                                </ul>

                                <h3 className="text-xl font-bold text-blue-400 border-b border-slate-700/50 pb-2 mt-8 mb-4">4.5 User Performance View</h3>
                                <ul className="space-y-3 mt-4 ml-2">
                                    <li>
                                        <strong>Benchmarking Individual Performance:</strong> This view runs the deterministic <em>User Profile Materialization</em> script. Rather than evaluating shifts as a whole, it isolates metrics grouped by Picker/Packer and benchmarks them directly against the Engineered Standards.
                                    </li>
                                    <li>
                                        <strong>Auditing Breaks and Time Off Task:</strong> Important for union or HR auditing, this relies entirely on the logged timestamps in the WMS. Any missed scans or idle periods artificially inflate an individual's "Break Time" calculation by exactly the global <code>BreakThreshold</code> (default 300s).
                                    </li>
                                </ul>
                            </div>
                        </section>

                        {/* SECTION 5 */}
                        <section id="sec-5" className="scroll-mt-8 space-y-8">
                            <div className="border-b border-slate-800 pb-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <Target className="w-6 h-6 text-fuchsia-400" />
                                    <h2 className="text-2xl font-semibold">5. Standards Impact & Adaptation Insights</h2>
                                </div>
                            </div>

                            <p className="text-slate-300">
                                The engine not only measures actual performance but runs simulations against theoretical optimums.
                            </p>

                            <h3 className="text-xl font-bold text-fuchsia-400 border-b border-slate-700/50 pb-2 mt-8 mb-4">5.1 Standards Detail & Impact Views</h3>
                            <ul className="space-y-3 mt-4 ml-2 text-slate-300">
                                <li>
                                    <strong>Quantifying Variable Changes (standards-impact-view):</strong> This view calculates the financial and operational reality of tweaking a master standard. If you change "Walking Time" from 2s to 4s, the engine re-calculates the theoretical max output of every single historic task in the timeline. It reveals how that minor 2s change impacts the overall Shift Efficiency Score, telling you exactly how many fewer hours the workforce "should" have worked under the new rules.
                                </li>
                                <li>
                                    <strong>Cost Avoidance & Accuracy Validation:</strong> Helps administrators instantly identify if a reported poor performance string is due to an incorrect theoretical standard (i.e. the standard was impossible to hit) or actual workforce inefficiency on the floor.
                                </li>
                            </ul>

                            <QuadrantCard
                                title="Efficiency Score & Standards Impact"
                                icon={Target}
                                colorClasses={{ bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/20' }}
                                concept={
                                    <p>
                                        The Standards Detail & Impact Views calculate the financial and operational reality of changing a standard. If you change "Walking Time" from 2s to 4s, the engine re-calculates the theoretical max output of the entire shift to tell you how many fewer hours the workforce "should" have worked.
                                    </p>
                                }
                                math={{
                                    formula: "Actual Production vs. Allowed Production",
                                    variables: [
                                        { name: "Total Standard Hours (TSH)", description: "Sum(Items * Standard_Time) / 3600" },
                                        { name: "Efficiency (%)", description: "(TSH / Pure Active Time) * 100" }
                                    ]
                                }}
                                visualReference={
                                    <div className="w-full text-xs font-mono bg-[#0B1120] border border-slate-700 rounded-xl p-4 space-y-2">
                                        <div className="flex justify-between items-center text-slate-400">
                                            <span>Current Standard</span>
                                            <span className="text-red-400">82%</span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-400">
                                            <span>Simulated (+2s travel)</span>
                                            <span className="text-emerald-400">95%</span>
                                        </div>
                                    </div>
                                }
                                usageAndImpact={
                                    <ul className="list-disc pl-4 space-y-2">
                                        <li><strong>Cost Avoidance:</strong> Identifies if poor performance is due to incorrect theoretical standards or actual workforce inefficiency.</li>
                                    </ul>
                                }
                            />

                            <h3 className="text-xl font-bold text-fuchsia-400 border-b border-slate-700/50 pb-2 mt-8 mb-4">5.2 Adaptation Insights</h3>
                            <ul className="space-y-3 mt-4 ml-2 text-slate-300">
                                <li>
                                    <strong>Identifying Behavioral Deviations (adaptation-insights-view):</strong> This view leverages the Heuristic Classifier to reveal <em>what type of work</em> was actually done on the floor, ignoring what the upstream WMS flagged it as. It mathematically categorizes jobs by physical footprint (e.g. seeing a "Single Pick" job suddenly have 40 dense items, triggering a mismatch alert).
                                </li>
                                <li>
                                    <strong>Advanced Metrics & Process Bottlenecks (advanced-metrics-view):</strong> This breaks down workflow constraints beyond simple speed. By analyzing task density and sequencing logic, the engine flags systemic layout problems—for instance, if Pickers are chronically zig-zagging rather than flowing linearly, signaling a slotting failure rather than a labor failure.
                                </li>
                            </ul>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                <div className="p-4 rounded border border-slate-800 bg-slate-900/50">
                                    <h4 className="font-semibold text-blue-400 mb-2">PUT_TO_WALL Profiles</h4>
                                    <p className="text-sm text-slate-400">Triggered if the Job has dense clustering of items bound for identical downstream sorting bins. Extremely high Output Density expected.</p>
                                </div>
                                <div className="p-4 rounded border border-slate-800 bg-slate-900/50">
                                    <h4 className="font-semibold text-emerald-400 mb-2">IDENTICAL_ORDERS Profiles</h4>
                                    <p className="text-sm text-slate-400">Triggered if &gt; 90% of the discrete picks in the job belong to a single order grouping logic block.</p>
                                </div>
                                <div className="p-4 rounded border border-slate-800 bg-slate-900/50">
                                    <h4 className="font-semibold text-orange-400 mb-2">MIXED_SINGLES Profiles</h4>
                                    <p className="text-sm text-slate-400">Triggered if the Output Density falls toward 1.0 (Low Volume / Many Tasks). Extremely high Travel Friction expected.</p>
                                </div>
                                <div className="p-4 rounded border border-slate-800 bg-slate-900/50">
                                    <h4 className="font-semibold text-red-400 mb-2">COMPLEX / MULTI-ITEM</h4>
                                    <p className="text-sm text-slate-400">The default categorizations if the heuristic engine fails to find a high-weight pattern match.</p>
                                </div>
                            </div>
                        </section>

                        {/* SECTION 6 */}
                        <section id="sec-6" className="scroll-mt-8 space-y-6">
                            <div className="border-b border-slate-800 pb-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <Beaker className="w-6 h-6 text-amber-500" />
                                    <h2 className="text-2xl font-semibold">6. GOLA Audit Scenarios & Benchmarking</h2>
                                </div>
                            </div>

                            <div className="prose prose-invert max-w-none text-slate-300">
                                <h3 className="text-xl font-bold text-amber-500 border-b border-slate-700/50 pb-2 mt-4 mb-4">6.1 Introduction to GOLA Auditing</h3>
                                <p className="mb-4">
                                    The <strong>Global Operational Lab Audit (GOLA)</strong> is a critical deterministic verification framework built directly into the Job Analyzer. It allows administrators to inject mathematically pure, synthetic shifts into the calculation engine to prove that the core logic (Standards calculation, Friction analysis, Theory of Constraints) is functioning perfectly without the noise of real-world human error.
                                </p>
                                <ul className="space-y-3 mt-4 ml-2">
                                    <li><strong>Why It Matters:</strong> Before presenting poor performance data to a client or team, a GOLA audit mathematically proves that the negative variance is due to floor Execution, not a bug in the analyzer's Engine.</li>
                                </ul>

                                <h3 className="text-xl font-bold text-amber-500 border-b border-slate-700/50 pb-2 mt-8 mb-4">6.2 Running an Audit</h3>
                                <ul className="space-y-3 mt-4 ml-2">
                                    <li>
                                        <strong>Using the GOLA Audit Runner (gola-audit-runner):</strong> Accessible from the primary navigation sidebar, this dedicated testing environment suspends active session data and prepares the engine for synthetic injection.
                                    </li>
                                    <li>
                                        <strong>Selecting Audit Scenarios (from gola-audit-scenarios.json):</strong> Administrators choose from pre-compiled JSON test suites. These files include specific, engineered tests like <em>"P01 - Shift Launch Compliance"</em> or <em>"P04 - Multi-Line Order Flow"</em>. Clicking `Run Simulation` hydrates the UI instantly as if a perfect 8-hour shift had just completed.
                                    </li>
                                </ul>

                                <h3 className="text-xl font-bold text-amber-500 border-b border-slate-700/50 pb-2 mt-8 mb-4">6.3 Interpreting Audit Results</h3>
                                <ul className="space-y-3 mt-4 ml-2">
                                    <li>
                                        <strong>Reviewing the Task Duration Audit Table:</strong> Once the simulation runs, the admin inspects the Audit Table to verify that simulated macro-breaks correctly breached the <code>BreakThreshold</code> config and were successfully stripped from the `Productive Duration` calculations.
                                    </li>
                                    <li>
                                        <strong>Using the Audit Details Panel:</strong> Administrators open this panel to find deviations. Every GOLA scenario dictates an "Expected Value" (e.g., Target UPH = 450). If the engine calculates 448 UPH, the deviation flags a Regression in the codebase that must be fixed before operational use.
                                    </li>
                                </ul>
                            </div>
                        </section>

                        {/* SECTION 7 */}
                        <section id="sec-7" className="scroll-mt-8 space-y-6">
                            <div className="border-b border-slate-800 pb-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <HelpCircle className="w-6 h-6 text-rose-500" />
                                    <h2 className="text-2xl font-semibold">7. Troubleshooting & FAQs</h2>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-[#111418] border border-slate-800 rounded-lg">
                                    <h4 className="font-medium text-slate-200 mb-2">Q: How do I fix Common Mapping Errors (Unmapped Job Flows)?</h4>
                                    <p className="text-sm text-slate-400">
                                        Often, WMS exports contain slightly varied string literals (e.g., `STOW_AMAZON` vs `STOW`). When the engine encounters an unknown string, those rows are immediately dumped to `Anomalies` in the Data Health view. To fix this, use the <code>JobTypeMappingModal</code> during data upload to forcibly alias these unknown strings into the master 1-7 taxonomy buckets.
                                    </p>
                                </div>

                                <div className="p-4 bg-[#111418] border border-slate-800 rounded-lg">
                                    <h4 className="font-medium text-slate-200 mb-2">Q: What does it mean if my "Efficiency Score" exceeds 100% or falls below 20%?</h4>
                                    <p className="text-sm text-slate-400">
                                        <strong>&gt; 100% Efficiency:</strong> Usually indicates a Job Profile mis-mapping. If a worker is performing highly-dense "Bin Sorting" but the WMS string mapped them to "Pallet Picking" (which has much slower allowed task times), the engine will interpret their speed as mathematically impossible.
                                        <br /><br />
                                        <strong>&lt; 20% Efficiency:</strong> Almost always indicates a Temporal failure. A worker likely clocked back in from lunch (triggering the `BreakThreshold` logic to resume) but then stood around or was moved to an un-tracked indirect role for 4 hours without scanning.
                                    </p>
                                </div>

                                <div className="p-4 bg-[#111418] border border-slate-800 rounded-lg">
                                    <h4 className="font-medium text-slate-200 mb-2">Q: Can I reset customized standards back to global defaults?</h4>
                                    <p className="text-sm text-slate-400">
                                        Yes. If experiments with the `standards-impact-view` have severely warped the calculation baseline, navigate to <strong>Admin -&gt; Engineered Standards</strong> and click "Restore Baseline". This executes the <code>restoreGlobalDefaults()</code> hook, completely wiping local configurations and pulling a fresh copy of <code>master-engineered-standards.json</code> from the core logic layer.
                                    </p>
                                </div>

                                <div className="p-4 bg-[#111418] border border-slate-800 rounded-lg">
                                    <h4 className="font-medium text-rose-400 mb-2">Emergency: Port 4000 is blocked (EADDRINUSE)</h4>
                                    <p className="text-sm text-slate-400">
                                        If running locally and Vite crashes with "Port 4000 is already in use", run: <code>lsof -i :4000 | grep LISTEN | awk '&#123;print $2&#125;' | xargs kill -9</code> to manually destroy the zombie Node process.
                                    </p>
                                </div>
                            </div>
                        </section>

                    </div>

                    <div className="mt-8 text-center text-sm text-slate-500 max-w-4xl mx-auto flex justify-between pb-8">
                        <span>Generated by Antigravity OS</span>
                        <span>Confidential & Internal Parsing Logic</span>
                    </div>
                </div>
            </div >
        </div >
    );
}
