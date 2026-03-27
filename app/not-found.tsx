import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const runtime = 'edge'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-6">
        <div className="space-y-3">
          <h1 className="text-8xl font-bold text-foreground/20">404</h1>
          <h2 className="text-3xl font-bold text-foreground">Página no encontrada</h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            La página que buscas no existe o ha sido movida.
          </p>
        </div>

        <div className="space-y-3">
          <Button asChild size="lg">
            <Link href="/">Volver al inicio</Link>
          </Button>
          <div>
            <Button asChild variant="outline">
              <Link href="/search">Buscar productos</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}