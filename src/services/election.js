import { supabase } from "@/lib/supabaseClient";
const fromTable = () => supabase?.from("election_settings");
export async function getElectionSettings() {
    const { data, error } = await fromTable()
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
    if (error) {
        console.warn("[election] getElectionSettings error:", error);
        return null;
    }
    return data;
}
export async function upsertElectionSettings(payload) {
    const { data, error } = await fromTable().upsert(payload).select().maybeSingle();
    if (error)
        throw error;
    return data;
}
/** Helper: diferença de dias entre hoje e a data da eleição (>=0) */
export function daysUntil(dateISO) {
    const today = new Date();
    const target = new Date(dateISO + "T00:00:00");
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
}
/** Helper: formata contagem regressiva em anos, meses e dias */
export function formatCountdown(dateISO) {
    const today = new Date();
    const target = new Date(dateISO + "T00:00:00");
    // Se a data já passou
    if (target <= today) {
        return { text: "Hoje é o dia!", days: 0 };
    }
    // Calcular diferença
    let years = target.getFullYear() - today.getFullYear();
    let months = target.getMonth() - today.getMonth();
    let days = target.getDate() - today.getDate();
    // Ajustar se os dias são negativos
    if (days < 0) {
        months--;
        const lastMonth = new Date(target.getFullYear(), target.getMonth(), 0);
        days += lastMonth.getDate();
    }
    // Ajustar se os meses são negativos
    if (months < 0) {
        years--;
        months += 12;
    }
    // Construir texto baseado no que temos
    const parts = [];
    if (years > 0) {
        parts.push(`${years} ${years === 1 ? 'ano' : 'anos'}`);
    }
    if (months > 0) {
        parts.push(`${months} ${months === 1 ? 'mês' : 'meses'}`);
    }
    if (days > 0) {
        parts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);
    }
    // Se não há nada, é hoje
    if (parts.length === 0) {
        return { text: "Hoje é o dia!", days: 0 };
    }
    return {
        text: parts.join(', '),
        days: Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    };
}
