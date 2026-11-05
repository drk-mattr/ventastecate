import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { AddBusinessForm } from '@/components/businesses/add-business-form'

export default function NewBusinessPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-xl">
        <Link href="/businesses" className="text-sm text-gray-500 underline">← Volver al índice</Link>
        <h1 className="text-2xl font-semibold mt-4 mb-1">Agregar un negocio</h1>
        <p className="text-sm text-gray-500 mb-6">
          No hace falta ser el dueño: cualquiera puede agregar un lugar que la comunidad conoce, con solo su nombre.
          Después, otros pueden mencionarlo en publicaciones y completar su información.
        </p>
        <AddBusinessForm />
      </main>
    </div>
  )
}
