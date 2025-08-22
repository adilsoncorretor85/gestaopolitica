// supabase/functions/leader_actions/index.ts
// Deno deploy target (Edge Function)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = {
  action: "list_pending" | "resend_invite" | "revoke_invite";
  email?: string;
  full_name?: string;
  appUrl?: string; // opcional: origem para o redirect do e-mail
};

function getOrigin(req: Request, body: Body): string {
  const headerOrigin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const refererOrigin = referer
    ? referer.split("/").slice(0, 3).join("/")
    : undefined;

  // preferir appUrl recebido do app; senão origin; senão origem do referer; senão localhost
  return (
    body.appUrl ||
    headerOrigin ||
    refererOrigin ||
    "http://localhost:5173"
  );
}

async function requireAdmin(req: Request) {
  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) throw new Response("Unauthorized", { status: 401 });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supa = createClient(url, anon);
  const admin = createClient(url, service);

  const { data: authData, error: authErr } = await supa.auth.getUser(jwt);
  if (authErr || !authData.user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!profile || profile.role !== "ADMIN") {
    throw new Response("ADMIN only", { status: 403 });
  }

  return { supa, admin, userId: authData.user.id };
}

Deno.serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const body = (await req.json()) as Body;
    const { admin } = await requireAdmin(req);
    const origin = getOrigin(req, body);
    const redirectTo = `${origin}/convite`; // Redireciona para página de convite

    switch (body.action) {
      case "list_pending": {
        // Lista convites ainda não aceitos (ajuste conforme seu schema)
        const { data, error } = await admin
          .from("invite_tokens")
          .select("id, email, full_name, role, created_at, expires_at, accepted_at")
          .is("accepted_at", null)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return Response.json({ ok: true, rows: data }, { headers: corsHeaders });
      }

      case "resend_invite": {
        if (!body.email) {
          return new Response("Missing email", { status: 400, headers: corsHeaders });
        }

        let sent = false;
        let actionLink: string | null = null;

        // 1) Tentar usar o fluxo oficial de convite
        const r1 = await admin.auth.admin.inviteUserByEmail(body.email, {
          redirectTo,
          // metadata opcional:
          data: body.full_name ? { full_name: body.full_name } : undefined,
        });

        if (r1.error) {
          // Se o usuário já existe, o Supabase retorna 422/email_exists.
          // Nesse caso geramos um link de "invite" (ou fallback "recovery")
          // e devolvemos o link para o admin copiar/colar.
          if ((r1.error as any)?.code === "email_exists") {
            // Tentar gerar link de "invite"
            const { data: linkData, error: linkErr } =
              await admin.auth.admin.generateLink({
                type: "invite",
                email: body.email,
                options: { redirectTo },
              });

            if (linkErr) {
              // Fallback: gerar link de "recovery" (reset de senha)
              const { data: recData, error: recErr } =
                await admin.auth.admin.generateLink({
                  type: "recovery",
                  email: body.email,
                  options: { redirectTo },
                });

              if (recErr) throw recErr;
              actionLink = recData?.action_link ?? null;
            } else {
              actionLink = linkData?.action_link ?? null;
            }
          } else {
            throw r1.error;
          }
        } else {
          sent = true;
        }

        // (Opcional) Revalidar/estender o token local (invite_tokens) por +7 dias
        const expires = new Date();
        expires.setDate(expires.getDate() + 7);
        await admin
          .from("invite_tokens")
          .update({ expires_at: expires.toISOString() })
          .eq("email", body.email);

        return Response.json(
          {
            ok: true,
            message: sent ? "Invite e-mail sent" : "Invite created; link returned",
            sent,
            link: actionLink, // pode ser null; no seu front, se vier null mostre só "reenviado"
          },
          { headers: corsHeaders }
        );
      }

      case "revoke_invite": {
        if (!body.email) {
          return new Response("Missing email", { status: 400, headers: corsHeaders });
        }

        // Apaga tokens e marca o líder como INACTIVE
        await admin.from("invite_tokens").delete().eq("email", body.email);
        await admin
          .from("leader_profiles")
          .update({ status: "INACTIVE" })
          .eq("email", body.email);

        return Response.json(
          { ok: true, message: "Invite revoked" },
          { headers: corsHeaders }
        );
      }

      default:
        return new Response(`Unknown action: ${String(body.action)}`, {
          status: 400,
          headers: corsHeaders,
        });
    }
  } catch (err: any) {
    // Erro estruturado (Response) já lançado acima
    if (err instanceof Response) return err;

    console.error("leader_actions error:", err);
    return Response.json(
      { ok: false, error: err?.message ?? "Internal error" },
      { status: 500, headers: corsHeaders }
    );
  }
});