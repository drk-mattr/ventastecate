import Link from 'next/link'

export const runtime = 'edge'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', fontWeight: 'bold', color: '#666' }}>404</h1>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '1rem 0' }}>Página no encontrada</h2>
        <p style={{ color: '#888', marginBottom: '2rem' }}>
          La página que buscas no existe o ha sido movida.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#000',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '0.5rem'
          }}
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}