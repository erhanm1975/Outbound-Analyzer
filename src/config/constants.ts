/**
 * Static Invariants and Time Constants
 * These values are fundamental to the application's math and data ingestion,
 * and should not be changed by user configuration.
 */

export const TIME = {
    ONE_SECOND_MS: 1000,
    ONE_MINUTE_MS: 60 * 1000,
    ONE_HOUR_MS: 60 * 60 * 1000,
    ONE_DAY_MS: 24 * 60 * 60 * 1000,
    TWELVE_HOURS_MS: 12 * 60 * 60 * 1000,

    // For converting duration seconds into hours
    SECONDS_PER_HOUR: 3600,
    SECONDS_PER_MINUTE: 60,
    MINUTES_PER_HOUR: 60,
};

export const DATA_INGESTION = {
    /** Values above this in certain fields are heuristically assumed to be Excel Serial Dates */
    EXCEL_SERIAL_DATE_THRESHOLD: 20000,
};
