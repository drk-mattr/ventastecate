import { ImageResponse } from 'next/og'


export const alt = 'Papryka - Buy and sell in your community'
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
              fontSize: 56,
              fontWeight: 800,
              color: '#0a0a0a',
              letterSpacing: '-2px',
            }}
          >
            P
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
          Papryka
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
          Buy and sell in your community
        </div>
      </div>
    ),
    size
  )
}
