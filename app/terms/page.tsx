import { Header } from '@/components/layout/header'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Términos de Servicio</h1>
        
        <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Aceptación de los Términos</h2>
            <p>
              Al acceder y utilizar Ventas Tecate, aceptas estar sujeto a estos Términos de Servicio. 
              Si no estás de acuerdo con alguna parte de estos términos, no debes usar nuestro servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Descripción del Servicio</h2>
            <p>
              Ventas Tecate es una plataforma de marketplace local que permite a los usuarios publicar 
              y buscar anuncios de compra y venta de artículos en Tecate y sus alrededores.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Registro y Cuentas de Usuario</h2>
            <p>
              Para utilizar ciertas funciones del servicio, debes registrarte y crear una cuenta. 
              Eres responsable de mantener la confidencialidad de tu cuenta y contraseña, y de todas 
              las actividades que ocurran bajo tu cuenta.
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Debes proporcionar información precisa y completa al registrarte</li>
              <li>Debes tener al menos 18 años para crear una cuenta</li>
              <li>No puedes compartir tu cuenta con otras personas</li>
              <li>Debes notificarnos inmediatamente de cualquier uso no autorizado de tu cuenta</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Publicación de Anuncios</h2>
            <p>Al publicar un anuncio en Ventas Tecate, aceptas que:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Eres el propietario legítimo del artículo o tienes autorización para venderlo</li>
              <li>La información y las imágenes del anuncio son precisas y no engañosas</li>
              <li>No publicarás artículos ilegales, peligrosos o prohibidos</li>
              <li>No publicarás contenido ofensivo, discriminatorio o inapropiado</li>
              <li>Nos reservamos el derecho de eliminar cualquier anuncio sin previo aviso</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Transacciones</h2>
            <p>
              Ventas Tecate es únicamente una plataforma de conexión. No somos parte de ninguna 
              transacción entre compradores y vendedores. Los usuarios son responsables de:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Negociar los términos de la venta directamente</li>
              <li>Verificar la autenticidad y condición de los artículos</li>
              <li>Realizar pagos y entregas de forma segura</li>
              <li>Resolver cualquier disputa de manera directa</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Prohibiciones</h2>
            <p>Está prohibido:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Usar el servicio para actividades ilegales o fraudulentas</li>
              <li>Acosar, amenazar o intimidar a otros usuarios</li>
              <li>Publicar spam o contenido no relacionado</li>
              <li>Intentar acceder a cuentas de otros usuarios</li>
              <li>Usar bots o herramientas automatizadas sin autorización</li>
              <li>Copiar o redistribuir contenido de la plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Propiedad Intelectual</h2>
            <p>
              Todo el contenido de Ventas Tecate, incluyendo diseño, logotipos y código, es propiedad 
              de sus respectivos dueños y está protegido por leyes de propiedad intelectual.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Limitación de Responsabilidad</h2>
            <p>
              Ventas Tecate se proporciona &quot;tal cual&quot; sin garantías de ningún tipo. No nos hacemos 
              responsables por:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>La calidad, seguridad o legalidad de los artículos publicados</li>
              <li>La veracidad de la información en los anuncios</li>
              <li>La capacidad de los usuarios para completar transacciones</li>
              <li>Cualquier pérdida o daño derivado del uso del servicio</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Terminación</h2>
            <p>
              Nos reservamos el derecho de suspender o terminar tu cuenta en cualquier momento, 
              con o sin causa, y sin previo aviso, si determinamos que has violado estos términos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Modificaciones</h2>
            <p>
              Nos reservamos el derecho de modificar estos términos en cualquier momento. 
              Los cambios entrarán en vigor inmediatamente después de su publicación. 
              Tu uso continuo del servicio después de cualquier cambio constituye tu aceptación 
              de los nuevos términos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Ley Aplicable</h2>
            <p>
              Estos términos se rigen por las leyes de México y cualquier disputa se resolverá 
              en los tribunales competentes de Tecate, Baja California.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contacto</h2>
            <p>
              Si tienes preguntas sobre estos Términos de Servicio, puedes contactarnos a través 
              de la plataforma.
            </p>
          </section>

          <p className="text-sm text-gray-500 mt-8">
            Última actualización: 25 de febrero de 2026
          </p>
        </div>
      </main>
    </div>
  )
}
