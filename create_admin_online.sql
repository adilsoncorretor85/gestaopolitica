-- Script para criar usuário admin no Supabase ONLINE
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. Inserir usuário na tabela auth.users (via Supabase Auth)
-- NOTA: Esta parte deve ser feita via Supabase Dashboard > Authentication > Users
-- ou via API, pois não podemos inserir diretamente na tabela auth.users

-- 2. Inserir perfil na tabela profiles
INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001', -- UUID do usuário (substitua pelo ID real)
    'Administrador',
    'tonezi@gmail.com',
    'ADMIN',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = NOW();

-- 3. Inserir perfil de líder (se necessário)
INSERT INTO public.leader_profiles (
    id,
    full_name,
    email,
    city,
    state,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001', -- Mesmo UUID do usuário
    'Administrador',
    'tonezi@gmail.com',
    'Joinville',
    'SC',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    updated_at = NOW();

-- 4. Inserir na tabela app_admins (se existir)
INSERT INTO public.app_admins (
    id,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001', -- Mesmo UUID do usuário
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

