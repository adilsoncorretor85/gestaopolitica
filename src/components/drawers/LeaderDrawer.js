import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { X, Mail, Phone, MapPin, Crown, Edit3, Calendar, Target, ExternalLink } from 'lucide-react';
import { getLeaderDetail, updateLeaderProfile } from '@/services/leader';
import LeaderLeadershipModal from '@/components/modals/LeaderLeadershipModal';
import { useNavigate } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
export default function LeaderDrawer({ open, leaderId, onClose, onEdited }) {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const [loading, setLoading] = useState(false);
    const [leader, setLeader] = useState(null);
    const [showLeadership, setShowLeadership] = useState(false);
    const [savingNote, setSavingNote] = useState(false);
    const [noteDraft, setNoteDraft] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [toast, setToast] = useState(null);
    useEffect(() => {
        if (!open || !leaderId) {
            setLeader(null);
            return;
        }
        (async () => {
            setLoading(true);
            try {
                const data = await getLeaderDetail(leaderId);
                setLeader(data);
            }
            catch (error) {
                console.error('Erro ao carregar líder:', error);
                setToast({ message: 'Erro ao carregar dados do líder', type: 'error' });
            }
            finally {
                setLoading(false);
            }
        })();
    }, [open, leaderId]);
    // Fechar drawer com ESC
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        if (open) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [open, onClose]);
    if (!open)
        return null;
    async function toggleStatus() {
        if (!leader || !isAdmin || updatingStatus)
            return;
        const next = leader.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        try {
            setUpdatingStatus(true);
            // Update otimista - atualizar estado local imediatamente
            setLeader((prev) => prev ? { ...prev, status: next } : null);
            await updateLeaderProfile(leader.id, { status: next });
            setToast({
                message: `Líder ${next === 'ACTIVE' ? 'reativado' : 'desativado'} com sucesso`,
                type: 'success'
            });
            onEdited?.();
        }
        catch (error) {
            console.error('Erro ao alterar status:', error);
            // Reverter mudança otimista
            setLeader((prev) => prev ? { ...prev, status: leader.status } : null);
            setToast({
                message: 'Erro ao alterar status do líder',
                type: 'error'
            });
        }
        finally {
            setUpdatingStatus(false);
        }
    }
    async function addNote() {
        if (!leader || !noteDraft.trim() || savingNote)
            return;
        try {
            setSavingNote(true);
            const stamp = new Date().toLocaleString('pt-BR');
            const newNotes = (leader.notes ? leader.notes + '\n\n' : '') + `[${stamp}] ${noteDraft.trim()}`;
            await updateLeaderProfile(leader.id, { notes: newNotes });
            // Atualizar estado local
            setLeader((prev) => prev ? { ...prev, notes: newNotes } : null);
            setNoteDraft('');
            setToast({ message: 'Observação adicionada com sucesso', type: 'success' });
            onEdited?.();
        }
        catch (error) {
            console.error('Erro ao adicionar observação:', error);
            setToast({ message: 'Erro ao adicionar observação', type: 'error' });
        }
        finally {
            setSavingNote(false);
        }
    }
    const getStatusColor = (status) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
            case 'INACTIVE':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
            case 'INVITED':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };
    const getStatusLabel = (status) => {
        switch (status) {
            case 'ACTIVE':
                return 'Ativo';
            case 'INACTIVE':
                return 'Inativo';
            case 'PENDING':
                return 'Pendente';
            case 'INVITED':
                return 'Convidado';
            default:
                return status || '—';
        }
    };
    const formatWhatsApp = (phone) => {
        if (!phone)
            return '';
        const digits = phone.replace(/\D/g, '');
        if (digits.length === 11) {
            return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
        }
        return phone;
    };
    const getWhatsAppLink = (phone) => {
        if (!phone)
            return '#';
        const digits = phone.replace(/\D/g, '');
        return `https://wa.me/55${digits}`;
    };
    const getGoogleMapsLink = (latitude, longitude) => {
        return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    };
    const formatLeadershipDisplay = (leadership) => {
        if (!leadership)
            return null;
        const { role_code, organization, title, extra } = leadership;
        // Mapear códigos de papel para labels amigáveis
        const roleLabels = {
            'POL_ELEITO': 'Político Eleito',
            'POL_PARTIDARIA': 'Liderança Partidária',
            'POL_PRESIDENTE_ENTIDADE': 'Presidente de Entidade',
            'ORG_EXEC': 'Empresário / Executivo',
            'ORG_ACADEMICO': 'Acadêmico / Pesquisador',
            'PUB_GESTOR': 'Gestor Público / Governante',
            'PUB_CHEFIA': 'Militar / Forças de Segurança',
            'MID_INFLUENCER': 'Influenciador Digital',
            'MID_JORNALISTA': 'Jornalista / Comunicador',
            'MID_CELEBRIDADE': 'Celebridade Pública',
            'SOC_COMUNITARIO': 'Líder Comunitário',
            'SOC_RELIGIOSO': 'Líder Religioso',
            'SOC_EDUCADOR': 'Educador / Professor',
            'SOC_CULTURAL': 'Influenciador Cultural/Artístico',
            'COM_LIDER': 'Líder Comunitário',
            'INF_MUNICIPE': 'Munícipe Engajado',
            'INF_MENTOR': 'Mentor / Coach / Conselheiro',
            'INF_PATRIARCA': 'Patriarca/Matriarca Familiar',
        };
        const roleLabel = roleLabels[role_code] || role_code;
        // Linha principal: título + organização
        let mainLine = '';
        if (title && organization) {
            mainLine = `${title} — ${organization}`;
        }
        else if (title) {
            mainLine = title;
        }
        else if (organization) {
            mainLine = organization;
        }
        // Linhas adicionais baseadas no tipo de liderança
        const additionalLines = [];
        // Para Educador/Professor
        if (role_code === 'SOC_EDUCADOR' && extra) {
            if (extra.education_level) {
                const educationLevels = {
                    'INFANTIL': 'Educação Infantil',
                    'FUNDAMENTAL': 'Ensino Fundamental',
                    'MEDIO': 'Ensino Médio',
                    'TECNICO': 'Ensino Técnico',
                    'SUPERIOR': 'Ensino Superior',
                    'POS_GRADUACAO': 'Pós-graduação / Pesquisa',
                    'CURSOS_LIVRES': 'Cursos Livres / Formação Complementar',
                };
                const levelLabel = educationLevels[extra.education_level] || extra.education_level;
                if (extra.subject_area) {
                    additionalLines.push(`${levelLabel} — ${extra.subject_area}`);
                }
                else {
                    additionalLines.push(levelLabel);
                }
            }
        }
        // Para Líder Comunitário
        if (role_code === 'COM_LIDER' && extra) {
            if (extra.community_area) {
                additionalLines.push(`Área: ${extra.community_area}`);
            }
            if (extra.reach_scope) {
                const reachScopes = {
                    'FAMILIA': 'Rua/Quadra',
                    'BAIRRO': 'Bairro',
                    'REGIAO': 'Região da cidade',
                    'CIDADE': 'Município',
                    'ONLINE': 'Online',
                };
                const reachLabel = reachScopes[extra.reach_scope] || extra.reach_scope;
                additionalLines.push(`Alcance: ${reachLabel}`);
            }
            if (extra.projects) {
                additionalLines.push(`Projetos: ${extra.projects}`);
            }
        }
        // Para Militar/Forças de Segurança
        if (role_code === 'PUB_CHEFIA' && extra) {
            if (extra.unit) {
                additionalLines.push(`Unidade: ${extra.unit}`);
            }
            if (extra.specialty) {
                additionalLines.push(`Especialidade: ${extra.specialty}`);
            }
        }
        return {
            roleLabel,
            mainLine,
            additionalLines
        };
    };
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity", onClick: onClose }), _jsx("div", { className: "fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform", children: _jsxs("div", { className: "flex flex-col h-full", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 dark:text-white", children: leader?.full_name || 'Detalhes do Líder' }), _jsx("button", { onClick: onClose, className: "p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors", children: _jsx(X, { className: "h-5 w-5" }) })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-6", children: loading ? (_jsx("div", { className: "flex items-center justify-center py-8", children: _jsx("div", { className: "text-gray-500 dark:text-gray-400", children: "Carregando..." }) })) : leader ? (_jsxs("div", { className: "space-y-6", children: [isAdmin && (_jsxs("div", { className: "flex flex-col sm:flex-row gap-3", children: [_jsxs("button", { onClick: () => navigate(`/lideres/${leader.id}`), className: "flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors", children: [_jsx(Edit3, { className: "h-4 w-4" }), _jsx("span", { children: "Editar" })] }), _jsxs("button", { onClick: () => setShowLeadership(true), className: "flex items-center justify-center space-x-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors", children: [_jsx(Crown, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: "N\u00EDvel de lideran\u00E7a" }), _jsx("span", { className: "sm:hidden", children: "Lideran\u00E7a" })] }), _jsx("button", { onClick: toggleStatus, disabled: updatingStatus, className: `flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${leader.status === 'ACTIVE'
                                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                                    : 'bg-green-600 hover:bg-green-700 text-white'}`, children: updatingStatus ? 'Alterando...' : (leader.status === 'ACTIVE' ? 'Desativar' : 'Reativar') })] })), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-gray-400 mb-1", children: "Nome" }), _jsx("p", { className: "text-gray-900 dark:text-white", children: leader.full_name })] }), leader.email && (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-gray-400 mb-1", children: "Email" }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Mail, { className: "h-4 w-4 text-gray-400" }), _jsx("span", { className: "text-gray-900 dark:text-white", children: leader.email }), _jsx("button", { onClick: () => navigator.clipboard.writeText(leader.email), className: "text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm", children: "Copiar" })] })] })), leader.phone && (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-gray-400 mb-1", children: "Telefone" }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Phone, { className: "h-4 w-4 text-gray-400" }), _jsx("span", { className: "text-gray-900 dark:text-white", children: formatWhatsApp(leader.phone) }), _jsx("a", { href: getWhatsAppLink(leader.phone), target: "_blank", rel: "noopener noreferrer", className: "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 text-sm", children: "WhatsApp" })] })] })), (leader.city || leader.state) && (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-gray-400 mb-1", children: "Localiza\u00E7\u00E3o" }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(MapPin, { className: "h-4 w-4 text-gray-400" }), _jsx("span", { className: "text-gray-900 dark:text-white", children: leader.city && leader.state
                                                                    ? `${leader.city}, ${leader.state}`
                                                                    : leader.city || leader.state || '-' }), leader.latitude && leader.longitude && (_jsx("a", { href: getGoogleMapsLink(leader.latitude, leader.longitude), target: "_blank", rel: "noopener noreferrer", className: "text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300", title: "Abrir no Google Maps", children: _jsx(ExternalLink, { className: "h-4 w-4" }) }))] })] })), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-gray-400 mb-1", children: "Status" }), _jsx("span", { className: `inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(leader.status || '')}`, children: getStatusLabel(leader.status || '') })] }), leader.goal && (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-gray-400 mb-1", children: "Meta do L\u00EDder" }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Target, { className: "h-4 w-4 text-gray-400" }), _jsxs("span", { className: "text-gray-900 dark:text-white", children: [leader.goal.toLocaleString('pt-BR'), " contatos"] })] })] })), leader.invited_at && (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-gray-400 mb-1", children: "Data do Convite" }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Calendar, { className: "h-4 w-4 text-gray-400" }), _jsx("span", { className: "text-gray-900 dark:text-white", children: new Date(leader.invited_at).toLocaleDateString('pt-BR') })] })] })), leader.accepted_at && (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-gray-400 mb-1", children: "Data de Aceita\u00E7\u00E3o" }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Calendar, { className: "h-4 w-4 text-gray-400" }), _jsx("span", { className: "text-gray-900 dark:text-white", children: new Date(leader.accepted_at).toLocaleDateString('pt-BR') })] })] }))] }), leader.leadership && (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-gray-400 mb-3", children: "N\u00EDvel de Lideran\u00E7a" }), _jsx("div", { className: "bg-gray-50 dark:bg-gray-800 rounded-lg p-4", children: (() => {
                                                    const leadershipInfo = formatLeadershipDisplay(leader.leadership);
                                                    if (!leadershipInfo)
                                                        return null;
                                                    return (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Crown, { className: "h-4 w-4 text-violet-500" }), _jsx("span", { className: "font-medium text-gray-900 dark:text-white", children: leadershipInfo.roleLabel })] }), leadershipInfo.mainLine && (_jsx("div", { className: "text-gray-700 dark:text-gray-300", children: leadershipInfo.mainLine })), leadershipInfo.additionalLines.map((line, index) => (_jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: line }, index)))] }));
                                                })() })] })), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-gray-500 dark:text-gray-400 mb-3", children: "Observa\u00E7\u00F5es" }), leader.notes ? (_jsx("div", { className: "mb-3", children: _jsx("div", { className: "bg-gray-50 dark:bg-gray-800 rounded-lg p-3", children: _jsx("p", { className: "text-gray-900 dark:text-white whitespace-pre-wrap text-sm", children: leader.notes }) }) })) : (_jsx("div", { className: "text-gray-500 dark:text-gray-400 text-sm italic mb-3", children: "Nenhuma observa\u00E7\u00E3o registrada" })), isAdmin && (_jsxs("div", { className: "flex flex-col sm:flex-row gap-2", children: [_jsx("input", { value: noteDraft, onChange: (e) => setNoteDraft(e.target.value), placeholder: "Nova observa\u00E7\u00E3o...", className: "flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent", onKeyPress: (e) => {
                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                e.preventDefault();
                                                                addNote();
                                                            }
                                                        } }), _jsx("button", { onClick: addNote, disabled: savingNote || !noteDraft.trim(), className: "px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap", children: savingNote ? 'Salvando...' : '+ Adicionar' })] }))] })] })) : (_jsx("div", { className: "flex items-center justify-center py-8", children: _jsx("div", { className: "text-gray-500 dark:text-gray-400", children: "L\u00EDder n\u00E3o encontrado" }) })) })] }) }), leaderId && leaderId !== 'undefined' && leaderId !== 'null' && (_jsx(LeaderLeadershipModal, { isOpen: showLeadership, onClose: () => setShowLeadership(false), leaderProfileId: leaderId })), toast && (_jsx("div", { className: "fixed top-4 right-4 z-50", children: _jsx("div", { className: `px-4 py-3 rounded-lg shadow-lg border transition-all duration-300 ${toast.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'}`, children: _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: "text-sm font-medium", children: toast.message }), _jsx("button", { onClick: () => setToast(null), className: "text-current hover:opacity-70 transition-opacity", children: "\u00D7" })] }) }) }))] }));
}
