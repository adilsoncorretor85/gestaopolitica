import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import PersonForm from '@/components/forms/PersonForm';
import useAuth from '@/hooks/useAuth';
import { getPerson, type PersonWithTags } from '@/services/people';
import { ArrowLeft } from 'lucide-react';

function PessoasFormContent() {
  const navigate = useNavigate();
  const params = useParams();
  const { id } = params || {};
  
  // Verificação de segurança para evitar erro de contexto
  if (!params) {
    return <div>Carregando...</div>;
  }
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pessoas');
  const { profile } = useAuth();
  
  const [person, setPerson] = useState<PersonWithTags | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadPerson();
    }
  }, [id]);

  const loadPerson = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const { data, error } = await getPerson(id);
      if (error) throw error;
      setPerson(data);
    } catch (error) {
      console.error('Erro ao carregar pessoa:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
        />
        <div className="flex">
          <Sidebar 
            isOpen={sidebarOpen} 
            onClose={() => setSidebarOpen(false)}
            activeTab="pessoas"
            setActiveTab={() => {}}
          />
          <div className="flex-1 p-6">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      <div className="flex">
        <Sidebar 
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeTab="pessoas"
          setActiveTab={() => {}}
        />
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <Link
                to="/pessoas"
                className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar para Pessoas
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {id ? 'Editar Pessoa' : 'Nova Pessoa'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {id ? 'Atualize as informações da pessoa' : 'Cadastre uma nova pessoa no sistema'}
              </p>
            </div>

            {/* Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <PersonForm 
                person={person || undefined}
                onSuccess={() => navigate('/pessoas')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PessoasFormPage() {
  return <PessoasFormContent />;
}