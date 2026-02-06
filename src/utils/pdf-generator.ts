import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface JobTypeStats {
    count: number;
    volume: number;
    jobs: string[];
}

interface PhaseResult {
    answer: string;
    value: string;
    isPositive: boolean;
    explanation: string;
    score: number;
}

interface PhaseScore {
    score: number;
    results: PhaseResult[];
}

interface ScoreData {
    scores: Record<string, PhaseScore>;
    weightedScore: number;
    label: string;
    color: string;
    bg: string;
    desc: string;
}

interface JobStats {
    [key: string]: JobTypeStats;
}

const JOB_TYPE_NAMES: Record<string, string> = {
    'PUT_TO_WALL': '1. Put-to-Wall Job',
    'IDENTICAL_ITEM': '2. Identical Item Order Job',
    'MIXED_SINGLES': '3. Single Item Job',
    'IDENTICAL_ORDERS': '4. Identical Order Jobs',
    'ORDER_BASED': '5. Order Based Job',
    'MULTI_ITEM': '6. Multi-Item Order Job',
    'COMPLEX': '7. Complex Jobs',
    'UNKNOWN': 'Unknown'
};

const PHASE_NAMES: Record<string, string> = {
    'P1': 'Phase 1: Operational Hygiene & Discipline',
    'P2': 'Phase 2: Spatial Intelligence',
    'P3': 'Phase 3: 3PL Synergy (Multi-Client)',
    'P4': 'Phase 4: Engineered Standards & ML',
    'P5': 'Phase 5: Advanced Fulfillment'
};

export function generateAdaptationInsightsPDF(
    jobStats: JobStats,
    scoreData: ScoreData,
    totalJobs: number
): void {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // =====================
    // HEADER & TITLE
    // =====================
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Adaptation Insights', pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Executive Performance Report', pageWidth / 2, 28, { align: 'center' });

    yPosition = 50;

    // =====================
    // EXECUTIVE SUMMARY
    // =====================
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', 20, yPosition);
    yPosition += 10;

    // Unified Score Box
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.5);
    doc.roundedRect(20, yPosition, pageWidth - 40, 40, 3, 3, 'S');

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Unified AI Maturity Score', 25, yPosition + 10);

    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    const scoreColor = getScoreColor(scoreData.weightedScore);
    doc.setTextColor(scoreColor.r, scoreColor.g, scoreColor.b);
    doc.text(`${scoreData.weightedScore.toFixed(2)}/10`, 25, yPosition + 30);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(scoreData.label, 70, yPosition + 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const descLines = doc.splitTextToSize(scoreData.desc, pageWidth - 90);
    doc.text(descLines, 70, yPosition + 23);

    yPosition += 50;

    // =====================
    // PHASE BREAKDOWN
    // =====================
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Phase Breakdown', 20, yPosition);
    yPosition += 8;

    const phaseData = [
        ['Phase', 'Score', 'Weight', 'Status'],
        ['P1: Operational Hygiene', scoreData.scores.P1.score.toFixed(2), '40%', getStatusText(scoreData.scores.P1.score)],
        ['P2: Spatial Intelligence', scoreData.scores.P2.score.toFixed(2), '20%', getStatusText(scoreData.scores.P2.score)],
        ['P3: 3PL Synergy', scoreData.scores.P3.score.toFixed(2), '15%', getStatusText(scoreData.scores.P3.score)],
        ['P4: Engineered Standards', scoreData.scores.P4.score.toFixed(2), '10%', getStatusText(scoreData.scores.P4.score)],
        ['P5: Advanced Fulfillment', scoreData.scores.P5.score.toFixed(2), '15%', getStatusText(scoreData.scores.P5.score)]
    ];

    autoTable(doc, {
        startY: yPosition,
        head: [phaseData[0]],
        body: phaseData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 80 },
            1: { halign: 'center', cellWidth: 25 },
            2: { halign: 'center', cellWidth: 25 },
            3: { halign: 'center' }
        }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // =====================
    // JOB TYPE DISTRIBUTION
    // =====================
    if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Job Type Distribution', 20, yPosition);
    yPosition += 8;

    const jobTypeData = [
        ['Job Type', 'Count', 'Volume', '% of Total']
    ];

    Object.entries(jobStats).forEach(([typeId, stats]) => {
        if (typeId !== 'UNKNOWN' || stats.count > 0) {
            const percentage = totalJobs > 0 ? ((stats.count / totalJobs) * 100).toFixed(2) : '0.00';
            jobTypeData.push([
                JOB_TYPE_NAMES[typeId] || typeId,
                stats.count.toString(),
                stats.volume.toLocaleString(),
                `${percentage}%`
            ]);
        }
    });

    autoTable(doc, {
        startY: yPosition,
        head: [jobTypeData[0]],
        body: jobTypeData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 90 },
            1: { halign: 'center', cellWidth: 25 },
            2: { halign: 'right', cellWidth: 30 },
            3: { halign: 'center' }
        }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // =====================
    // DETAILED PHASE ANALYSIS
    // =====================
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Phase Analysis', 20, yPosition);
    yPosition += 12;

    Object.entries(scoreData.scores).forEach(([phaseId, phaseScore]) => {
        if (yPosition > pageHeight - 80) {
            doc.addPage();
            yPosition = 20;
        }

        // Phase Header
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(20, yPosition - 5, pageWidth - 40, 12, 'F');

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(PHASE_NAMES[phaseId] || phaseId, 25, yPosition + 3);

        const color = getScoreColor(phaseScore.score);
        doc.setTextColor(color.r, color.g, color.b);
        doc.text(`Score: ${phaseScore.score.toFixed(2)}/10`, pageWidth - 25, yPosition + 3, { align: 'right' });

        yPosition += 15;

        // Phase Questions
        phaseScore.results.forEach((result, idx) => {
            if (yPosition > pageHeight - 35) {
                doc.addPage();
                yPosition = 20;
            }

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(71, 85, 105);
            doc.text(`Q${idx + 1}:`, 25, yPosition);

            doc.setFont('helvetica', 'normal');
            const _questionWidth = pageWidth - 50;

            yPosition += 5;

            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(`Answer: ${result.answer} (${result.value})`, 25, yPosition);

            yPosition += 4;

            const statusColor = result.isPositive ? [16, 185, 129] : [245, 158, 11];
            doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
            doc.text(`Score: ${result.score}/10 - ${result.isPositive ? '✓' : '!'} ${result.isPositive ? 'Positive' : 'Needs Attention'}`, 25, yPosition);

            yPosition += 10;
        });

        yPosition += 5;
    });

    // =====================
    // FOOTER
    // =====================
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');

        const timestamp = new Date().toLocaleString();
        doc.text(`Generated: ${timestamp}`, 20, pageHeight - 10);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
    }

    // Save the PDF
    const filename = `adaptation-insights-report-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
}

function getScoreColor(score: number): { r: number; g: number; b: number } {
    if (score >= 7) return { r: 16, g: 185, b: 129 }; // emerald-500
    if (score >= 4) return { r: 245, g: 158, b: 11 }; // amber-500
    return { r: 239, g: 68, b: 68 }; // red-500
}

function getStatusText(score: number): string {
    if (score >= 7) return '✓ Strong';
    if (score >= 4) return '! Developing';
    return '✗ Needs Work';
}
