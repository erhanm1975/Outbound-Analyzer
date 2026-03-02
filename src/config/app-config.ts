/**
 * Core Application Configuration
 * Contains thresholds, targets, and systemic limits that can potentially
 * be overridden by user settings or environment variables in the future.
 */
export const APP_CONFIG = {
    thresholds: {
        /** Maximum allowable duration (in minutes) for a gap between tasks before it's considered anomalous or split */
        MAX_REASONABLE_GAP_MIN: 480, // 8 hours

        /** Minimum utilization percentage to be considered 'healthy' in reporting */
        REPORT_UTIL_MIN: 70,

        /** Maximum utilization percentage before a worker is considered 'over-utilized' */
        REPORT_UTIL_MAX: 95,

        /** Minimum change in UPH required to be flagged as a 'significant' change in text reports */
        SIGNIFICANT_UPH_DELTA: 10,

        /** Minimum utilization score required for a worker to not be flagged as critical in dashboards */
        UTILIZATION_CRITICAL: 50,

        /** Utilization score required for a worker to be flagged as healthy/elite */
        UTILIZATION_HEALTHY: 85,
    },
    benchmarks: {
        /** Multiplier applied to base time to calculate 'Target' expectations (e.g. 20% faster) */
        TARGET_MULTIPLIER: 0.8,

        /** Multiplier applied to base time to calculate 'Standard' expectations (e.g. 10% faster) */
        STANDARD_MULTIPLIER: 0.9,
    },
    limits: {
        /** Maximum number of warnings to collect per processing type to prevent memory bloat */
        MAX_WARNINGS_PER_TYPE: 50,

        /** Maximum number of errors to collect per processing type before aborting or truncating */
        MAX_ERRORS_PER_TYPE: 10,

        /** Maximum number of iterations for complex while-loop logic to prevent infinite hangs */
        MAX_ITERATIONS: 50,
    }
};
