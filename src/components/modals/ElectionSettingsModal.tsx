import { useEffect, useState } from "react";
import { upsertElectionCurrent, getCurrentElection, type ElectionSettings, type ElectionLevel } from "@/services/elections";
import { fetchCitiesByUF, UFS } from "@/lib/br";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: (s: ElectionSettings) => void;
};

export default function ElectionSettingsModal({ open, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState<ElectionLevel>('MUNICIPAL');
  const [uf, setUf] = useState<string>('');
  const [city, setCity] = useState<{ ibge: number; name: string } | null>(null);
  const [cities, setCities] = useState<{ ibge: number; name: string }[]>([]);
  const [name, setName] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('America/Sao_Paulo');

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const settings = await getCurrentElection(supabase);
      if (settings) {
        setLevel(settings.election_level ?? 'MUNICIPAL');
        setUf(settings.scope_state ?? '');
        setName(settings.election_name ?? '');
        setDate(settings.election_date ?? '');
        setTimezone(settings.timezone ?? 'America/Sao_Paulo');
        if (settings.scope_city && settings.scope_city_ibge) {
          setCity({ ibge: settings.scope_city_ibge, name: settings.scope_city });
        }
      }
      setLoading(false);
    })();
  }, [open]);

  useEffect(() => {
    if ((level === 'MUNICIPAL' || level === 'ESTADUAL') && uf) {
      fetchCitiesByUF(uf).then(setCities).catch(() => setCities([]));
    } else {
      setCities([]);
      setCity(null);
    }
  }, [level, uf]);

  const save = async () => {
    setLoading(true);
    try {
      const payload: Partial<ElectionSettings> = {
        election_name: name,
        election_date: date,
        election_level: level,
        scope_state: level !== 'FEDERAL' ? (uf || null) : null,
        scope_city: level === 'MUNICIPAL' ? (city?.name ?? null) : null,
        scope_city_ibge: level === 'MUNICIPAL' ? (city?.ibge ?? null) : null,
        timezone: timezone,
      };
      const saved = await upsertElectionCurrent(supabase, payload);
      onSaved?.(saved);
      onClose();
    } catch (e: any) {
      alert("Falha ao salvar configurações: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-lg dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Configurar eleição
        </h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
              Tipo de eleição
            </label>
            <div className="flex gap-4">
              {(['MUNICIPAL','ESTADUAL','FEDERAL'] as ElectionLevel[]).map(v => (
                <label key={v} className="inline-flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="level" 
                    value={v} 
                    checked={level===v} 
                    onChange={()=>setLevel(v)} 
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {v.charAt(0) + v.slice(1).toLowerCase()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
              Nome da eleição
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Eleição 2024"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none
                         focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
              Data da eleição
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none
                         focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          {(level === 'MUNICIPAL' || level === 'ESTADUAL') && (
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
                UF
              </label>
              <select 
                value={uf} 
                onChange={(e)=>setUf(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none
                           focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="">Selecione</option>
                {UFS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}

          {level === 'MUNICIPAL' && (
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
                Município
              </label>
              <select
                value={city?.name ?? ''}
                onChange={(e)=>{
                  const c = cities.find(x => x.name === e.target.value) || null;
                  setCity(c);
                }}
                disabled={!uf}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none
                           focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white disabled:opacity-50"
              >
                <option value="">Selecione</option>
                {cities.map(c => <option key={c.ibge} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
              Fuso horário (IANA)
            </label>
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="America/Sao_Paulo"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none
                         focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:text-gray-200"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={save}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}


















