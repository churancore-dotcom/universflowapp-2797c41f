import { useEffect } from 'react';

const SITE_URL = 'https://universflow.in';

const StructuredData = () => {
  useEffect(() => {
    const existing = document.querySelectorAll('script[type="application/ld+json"]');
    existing.forEach(el => el.remove());

    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Univers Flow",
      "url": SITE_URL,
      "logo": "https://storage.googleapis.com/gpt-engineer-file-uploads/d6CK1hptEYS0iYCrQMmYcx7HukD2/uploads/1768315312999-Screenshot 2026-01-13 201134.png",
      "description": "Premium free music streaming platform  Stream unlimited songs, create playlists, download for offline listening.",
      "founder": {
        "@type": "Person",
        "name": "Universflow Team"
      },
      "sameAs": [
        "https://twitter.com/UniversFlow"
      ]
    };

    const webAppSchema = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Univers Flow",
      "url": SITE_URL,
      "description": "Stream and download unlimited music for free. Discover millions of songs, create playlists, and listen offline. The best free music streaming app.",
      "applicationCategory": "MusicApplication",
      "operatingSystem": "Web, Android, iOS",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "creator": {
        "@type": "Person",
        "name": "Universflow Team"
      },
      "featureList": [
        "Free music streaming",
        "Offline music download",
        "Playlist creation",
        "High quality audio",
        "No ads for premium",
        "Cross-platform sync",
        "Mood playlists",
        "Equalizer settings",
        "Social sharing"
      ],
      "screenshot": "https://storage.googleapis.com/gpt-engineer-file-uploads/d6CK1hptEYS0iYCrQMmYcx7HukD2/social-images/social-1768315544947-Screenshot 2026-01-13 201134.png",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "ratingCount": "15000",
        "bestRating": "5"
      }
    };

    const musicServiceSchema = {
      "@context": "https://schema.org",
      "@type": "MusicStreamingService",
      "name": "Univers Flow",
      "url": SITE_URL,
      "description": "The best free music streaming app. Listen to millions of songs, discover new artists, and download music for offline listening. ",
      "provider": {
        "@type": "Person",
        "name": "Universflow Team"
      },
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Free tier with optional premium features"
      }
    };

    const softwareAppSchema = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Univers Flow - Free Music Streaming",
      "url": SITE_URL,
      "applicationCategory": "MultimediaApplication",
      "operatingSystem": "Android, Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "ratingCount": "15000",
        "bestRating": "5"
      },
      "author": {
        "@type": "Person",
        "name": "Universflow Team"
      }
    };

    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Univers Flow",
      "url": SITE_URL,
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${SITE_URL}/search?q={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    };

    const schemas = [organizationSchema, webAppSchema, musicServiceSchema, softwareAppSchema, websiteSchema];
    
    schemas.forEach(schema => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    });

    return () => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      scripts.forEach(el => el.remove());
    };
  }, []);

  return null;
};

export default StructuredData;
