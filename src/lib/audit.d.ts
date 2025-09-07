export interface AuditLogData {
    tableName: string;
    recordId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    actorId: string;
    details?: any;
}
export declare function logAudit(data: AuditLogData): Promise<void>;
