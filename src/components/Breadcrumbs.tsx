import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from '@/lib/iconImports';

interface BreadcrumbItem {
  label: string;
  path?: string;
  current?: boolean;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  const location = useLocation();

  // Gerar breadcrumbs automaticamente baseado na rota
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Início', path: '/', current: pathSegments.length === 0 }
    ];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;
      
      // Mapear segmentos para labels amigáveis
      const labelMap: Record<string, string> = {
        'dashboard': 'Dashboard',
        'pessoas': 'Pessoas',
        'lideres': 'Líderes',
        'admin': 'Administração',
        'tags': 'Tags',
        'projecao': 'Projeção',
        'mapa': 'Mapa',
        'login': 'Login',
        'reset-password': 'Redefinir Senha',
        'conta-bloqueada': 'Conta Bloqueada',
        'convite': 'Convite',
        'complete-profile': 'Completar Perfil',
      };

      breadcrumbs.push({
        label: labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
        path: isLast ? undefined : currentPath,
        current: isLast
      });
    });

    return breadcrumbs;
  };

  const breadcrumbItems = items || generateBreadcrumbs();

  return (
    <nav 
      className={`flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-1">
        {breadcrumbItems.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 mx-1 text-gray-400" aria-hidden="true" />
            )}
            
            {item.path && !item.current ? (
              <Link
                to={item.path}
                className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                aria-label={`Ir para ${item.label}`}
              >
                {index === 0 && <Home className="h-4 w-4 mr-1" aria-hidden="true" />}
                {item.label}
              </Link>
            ) : (
              <span 
                className={item.current ? 'text-gray-900 dark:text-white font-medium' : ''}
                aria-current={item.current ? 'page' : undefined}
              >
                {index === 0 && <Home className="h-4 w-4 mr-1" aria-hidden="true" />}
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
