import Link from 'next/link'

export const runtime = 'edge'

export default function NotFound() {
  return (
    <html lang="es">
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '3rem', margin: '0 0 1rem 0' }}>404</h1>
            <p style={{ margin: '0 0 2rem 0' }}>Página no encontrada</p>
            <Link
              href="/"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#000',
                color: '#fff',
                textDecoration: 'none',
                borderRadius: '0.25rem'
              }}
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </body>
    </html>
  )
}