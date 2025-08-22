import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export default function UserMenu() {
  const nav = useNavigate();
  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        nav("/login", { replace: true });
      }}
      className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
      title="Sair"
    >
      Sair
    </button>
  );
}