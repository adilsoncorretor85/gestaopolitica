import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  noindex?: boolean;
  nofollow?: boolean;
  canonical?: string;
}

const defaultSEO = {
  title: 'Gestão Política - Vereador Wilian Tonezi',
  description: 'Sistema de gestão política para campanha eleitoral do Vereador Wilian Tonezi - PL. Gerencie contatos, líderes, projeções e metas de campanha.',
  keywords: ['gestão política', 'campanha eleitoral', 'Vereador Wilian Tonezi', 'PL', 'Joinville', 'eleições'],
  image: '/og-image.jpg',
  url: 'https://gestaopolitica.com.br',
  type: 'website' as const,
  author: 'Vereador Wilian Tonezi',
  noindex: false,
  nofollow: false,
};

export function useSEO(seoProps: SEOProps = {}) {
  const seo = { ...defaultSEO, ...seoProps };

  useEffect(() => {
    // Atualizar título da página
    if (seo.title) {
      document.title = seo.title;
    }

    // Meta tags básicas
    updateMetaTag('description', seo.description);
    updateMetaTag('keywords', seo.keywords?.join(', '));
    updateMetaTag('author', seo.author);

    // Meta tags Open Graph
    updateMetaTag('og:title', seo.title, 'property');
    updateMetaTag('og:description', seo.description, 'property');
    updateMetaTag('og:image', seo.image, 'property');
    updateMetaTag('og:url', seo.url, 'property');
    updateMetaTag('og:type', seo.type, 'property');
    updateMetaTag('og:site_name', 'Gestão Política', 'property');

    // Meta tags Twitter
    updateMetaTag('twitter:card', 'summary_large_image', 'name');
    updateMetaTag('twitter:title', seo.title, 'name');
    updateMetaTag('twitter:description', seo.description, 'name');
    updateMetaTag('twitter:image', seo.image, 'name');

    // Meta tags para artigos
    if (seo.type === 'article') {
      updateMetaTag('article:author', seo.author, 'property');
      updateMetaTag('article:published_time', seo.publishedTime, 'property');
      updateMetaTag('article:modified_time', seo.modifiedTime, 'property');
      updateMetaTag('article:section', seo.section, 'property');
      
      if (seo.tags) {
        seo.tags.forEach(tag => {
          updateMetaTag('article:tag', tag, 'property');
        });
      }
    }

    // Meta tags de indexação
    if (seo.noindex || seo.nofollow) {
      const robots = [];
      if (seo.noindex) robots.push('noindex');
      if (seo.nofollow) robots.push('nofollow');
      updateMetaTag('robots', robots.join(', '));
    }

    // Canonical URL
    if (seo.canonical) {
      updateCanonicalLink(seo.canonical);
    }

    // Structured Data (JSON-LD)
    if (seo.type === 'website') {
      addStructuredData({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: seo.title,
        description: seo.description,
        url: seo.url,
        author: {
          '@type': 'Person',
          name: seo.author,
        },
        publisher: {
          '@type': 'Organization',
          name: 'Vereador Wilian Tonezi - PL',
          url: 'https://gestaopolitica.com.br',
        },
      });
    }

    if (seo.type === 'article') {
      addStructuredData({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: seo.title,
        description: seo.description,
        image: seo.image,
        url: seo.url,
        author: {
          '@type': 'Person',
          name: seo.author,
        },
        publisher: {
          '@type': 'Organization',
          name: 'Vereador Wilian Tonezi - PL',
          url: 'https://gestaopolitica.com.br',
        },
        datePublished: seo.publishedTime,
        dateModified: seo.modifiedTime,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': seo.url,
        },
      });
    }

  }, [seo]);

  return seo;
}

function updateMetaTag(name: string, content: string | undefined, attribute: 'name' | 'property' = 'name') {
  if (!content) return;

  let meta = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
  
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, name);
    document.head.appendChild(meta);
  }
  
  meta.setAttribute('content', content);
}

function updateCanonicalLink(url: string) {
  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  
  canonical.setAttribute('href', url);
}

function addStructuredData(data: any) {
  // Remover structured data existente
  const existingScript = document.querySelector('script[type="application/ld+json"]');
  if (existingScript) {
    existingScript.remove();
  }

  // Adicionar novo structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

// Hook específico para páginas
export function usePageSEO(pageName: string, customProps: Partial<SEOProps> = {}) {
  const pageSEO = {
    title: `${pageName} - Gestão Política`,
    description: `Acesse ${pageName.toLowerCase()} no sistema de gestão política do Vereador Wilian Tonezi.`,
    ...customProps,
  };

  return useSEO(pageSEO);
}

// Hook para SEO de formulários
export function useFormSEO(formName: string, customProps: Partial<SEOProps> = {}) {
  const formSEO = {
    title: `${formName} - Gestão Política`,
    description: `Formulário para ${formName.toLowerCase()} no sistema de gestão política.`,
    noindex: true, // Formulários não devem ser indexados
    ...customProps,
  };

  return useSEO(formSEO);
}
