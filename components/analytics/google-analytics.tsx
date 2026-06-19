import Script from 'next/script'

// GA4 Measurement ID. Override with NEXT_PUBLIC_GA_ID in the environment;
// falls back to the ventastecate.com property so analytics work with zero config.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-1MMMDDB5VL'

export function GoogleAnalytics() {
  if (!GA_ID) return null
  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `,
        }}
      />
    </>
  )
}
