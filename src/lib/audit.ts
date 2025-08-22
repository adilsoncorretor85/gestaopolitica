import { createClient } from '@/lib/supabase/client';
import { Json } from '@/types/database';

interface AuditLogData {
  tableName: string;
  recordId?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  actorId?: string;
  details?: Record<string, any>;
}

export async function logAudit({
  tableName,
  recordId,
  action,
  actorId,
  details,
}: AuditLogData) {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        table_name: tableName,
        record_id: recordId,
        action,
        actor_id: actorId,
        details: details as Json,
      });

    if (error) {
      console.error('Erro ao registrar auditoria:', error);
    }
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error);
  }
}

export async function getAuditLogs(page = 1, pageSize = 20) {
  const supabase = createClient();
  
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('audit_logs')
    .select(`
      *,
      actor:profiles(full_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  return {
    data: data || [],
    count: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}