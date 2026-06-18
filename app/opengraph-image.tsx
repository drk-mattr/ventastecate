import { ImageResponse } from 'next/og'

export const alt = 'Ventas Tecate - Compra y vende en tu comunidad'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 120,
            height: 120,
            borderRadius: 24,
            backgroundColor: '#ffffff',
            marginBottom: 40,
          }}
        >
          <span
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: '#0a0a0a',
              letterSpacing: '-2px',
            }}
          >
            VT
          </span>
        </div>

        {/* Brand name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-2px',
            marginBottom: 16,
          }}
        >
          Ventas Tecate
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 400,
            color: '#888888',
            letterSpacing: '-0.5px',
          }}
        >
          Compra y vende en tu comunidad
        </div>
      </div>
    ),
    size
  )
}
