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
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
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
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}