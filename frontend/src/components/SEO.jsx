import { Helmet } from 'react-helmet-async';

const defaultMeta = {
  title: 'DreamerZ_Beta - AI Learning for Teens',
  description: 'Learn AI responsibly! DreamerZ_Beta teaches Indian teenagers (12-16) prompt engineering, AI tools, and critical thinking skills.',
  image: '/og-image.png',
  url: 'https://dreamerz.beta',
  type: 'website'
};

export const SEO = ({ 
  title, 
  description, 
  image,
  url,
  type = 'website',
  noIndex = false
}) => {
  const seo = {
    title: title ? `${title} | DreamerZ_Beta` : defaultMeta.title,
    description: description || defaultMeta.description,
    image: image || defaultMeta.image,
    url: url || defaultMeta.url,
    type: type || defaultMeta.type
  };

  return (
    <Helmet>
      {/* Basic Meta */}
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      
      {/* OpenGraph */}
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:image" content={seo.image} />
      <meta property="og:url" content={seo.url} />
      <meta property="og:type" content={seo.type} />
      <meta property="og:site_name" content="DreamerZ_Beta" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={seo.image} />
      
      {/* Additional Meta */}
      <meta name="theme-color" content="#6366f1" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <link rel="canonical" href={seo.url} />
    </Helmet>
  );
};

export default SEO;
