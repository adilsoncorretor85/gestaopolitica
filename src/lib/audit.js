// src/lib/audit.ts
import { supabase } from "@/lib/supabaseClient";
export async function logAudit(data) {
    if (!supabase) {
        console.error('Supabase não configurado - não é possível registrar auditoria');
        return;
    }
    try {
        const { error } = await supabase
            .from('audit_logs')
            .insert({
            table_name: data.tableName,
            record_id: data.recordId,
            action: data.action,
            actor_id: data.actorId,
            details: data.details || null,
        });
        if (error) {
            console.error('Erro ao registrar auditoria:', error);
        }
    }
    catch (error) {
        console.error('Erro ao registrar auditoria:', error);
    }
}
