export type AuditStatus = 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILURE';
export type AuditLogType = 'INFO' | 'ACTION' | 'ASSERT_PASS' | 'ASSERT_FAIL' | 'ERROR' | 'DB' | 'CALC' | 'EXECUTE' | 'DATA' | 'DEBUG' | 'PASS' | 'FAIL';

export interface AuditLog {
    id: string;
    type: AuditLogType;
    message: string;
    timestamp: string;
}

export interface AuditMission {
    id: string; // e.g. "OBPP-01"
    name: string;
    description: string;
    category: string;
    environmentId: string;
    requiresDb?: boolean;
    explanation: string;
    logic: string;
    status: AuditStatus;
    steps?: string[];
    logs?: AuditLog[];
    expectedResults?: Record<string, any>;
    testData?: any; // The payload data to test against (e.g. shift rows)
}
