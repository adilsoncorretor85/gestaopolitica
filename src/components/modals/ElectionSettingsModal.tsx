import { useEffect, useState } from "react";
import { upsertElectionSettings, getElectionSettings, ElectionSettings } from "@/services/election";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: (s: ElectionSettings) => void;
};

export default function ElectionSettingsModal({ open, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ElectionSettings>({
    election_name: "Eleições",
    election_date: "2026-10-05",
    timezone: "America/Sao_Paulo",
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const settings = await getElectionSettings();
      if (settings) setForm(settings);
      setLoading(false);
    })();
  }, [open]);

  const save = async () => {
    setLoading(true);
    try {
      const saved = await upsertElectionSettings(form);
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
              Nome
            </label>
            <input
              value={form.election_name}
              onChange={(e) => setForm({ ...form, election_name: e.target.value })}
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
              value={form.election_date}
              onChange={(e) => setForm({ ...form, election_date: e.target.value })}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none
                         focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
              Fuso horário (IANA)
            </label>
            <input
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
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













