import { Header } from '@/components/layout/header'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Política de Privacidad</h1>
        
        <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introducción</h2>
            <p>
              En Ventas Tecate, respetamos tu privacidad y nos comprometemos a proteger tus datos personales. 
              Esta política de privacidad describe cómo recopilamos, usamos y protegemos tu información.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Información que Recopilamos</h2>
            <p>Recopilamos los siguientes tipos de información:</p>
            
            <h3 className="text-lg font-medium mt-4 mb-2">Información de Cuenta</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Correo electrónico</li>
              <li>Nombre de usuario</li>
              <li>Nombre para mostrar</li>
              <li>Contraseña (encriptada)</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">Información de Anuncios</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Título, descripción y precio de artículos</li>
              <li>Imágenes que subes</li>
              <li>Categoría y ubicación del artículo</li>
              <li>Fecha de publicación</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">Información de Uso</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Mensajes enviados a través de la plataforma</li>
              <li>Páginas visitadas y acciones realizadas</li>
              <li>Dirección IP y tipo de navegador</li>
              <li>Fecha y hora de acceso</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Cómo Usamos tu Información</h2>
            <p>Usamos tu información para:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Crear y mantener tu cuenta</li>
              <li>Publicar y gestionar tus anuncios</li>
              <li>Facilitar la comunicación entre compradores y vendedores</li>
              <li>Enviar notificaciones sobre mensajes y actividad de cuenta</li>
              <li>Mejorar y personalizar tu experiencia</li>
              <li>Prevenir fraude y actividades maliciosas</li>
              <li>Cumplir con obligaciones legales</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Compartir Información</h2>
            <p>
              No vendemos tu información personal a terceros. Podemos compartir tu información en las 
              siguientes circunstancias:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <strong>Información Pública:</strong> Los anuncios que publicas son visibles para todos 
                los usuarios, incluyendo tu nombre de usuario y ubicación
              </li>
              <li>
                <strong>Proveedores de Servicios:</strong> Compartimos información con servicios que nos 
                ayudan a operar la plataforma (hosting, email, analytics)
              </li>
              <li>
                <strong>Cumplimiento Legal:</strong> Si es requerido por ley o para proteger nuestros 
                derechos o seguridad
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Seguridad de Datos</h2>
            <p>
              Implementamos medidas de seguridad técnicas y organizativas para proteger tu información, 
              incluyendo:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Encriptación de contraseñas</li>
              <li>Conexiones HTTPS seguras</li>
              <li>Controles de acceso a la base de datos</li>
              <li>Monitoreo regular de seguridad</li>
            </ul>
            <p className="mt-2">
              Sin embargo, ningún método de transmisión por Internet es 100% seguro, y no podemos 
              garantizar la seguridad absoluta de tu información.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Retención de Datos</h2>
            <p>
              Retenemos tu información personal mientras tu cuenta esté activa o según sea necesario 
              para proporcionar nuestros servicios. Puedes solicitar la eliminación de tu cuenta y 
              datos en cualquier momento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Tus Derechos</h2>
            <p>Tienes derecho a:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Acceder a tu información personal</li>
              <li>Corregir información inexacta</li>
              <li>Solicitar la eliminación de tu cuenta y datos</li>
              <li>Exportar tus datos</li>
              <li>Oponerte al procesamiento de tu información</li>
              <li>Retirar tu consentimiento en cualquier momento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Cookies y Tecnologías Similares</h2>
            <p>
              Utilizamos cookies y tecnologías similares para mejorar tu experiencia, mantener tu sesión 
              activa y analizar el uso de la plataforma. Puedes configurar tu navegador para rechazar 
              cookies, pero esto puede afectar algunas funcionalidades.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Privacidad de Menores</h2>
            <p>
              Nuestro servicio no está dirigido a menores de 18 años. No recopilamos intencionalmente 
              información de menores. Si descubrimos que hemos recopilado datos de un menor, los 
              eliminaremos de inmediato.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Enlaces a Otros Sitios</h2>
            <p>
              Nuestra plataforma puede contener enlaces a sitios web de terceros. No somos responsables 
              de las prácticas de privacidad de estos sitios y te recomendamos leer sus políticas de 
              privacidad.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Cambios a esta Política</h2>
            <p>
              Podemos actualizar esta política de privacidad ocasionalmente. Te notificaremos de 
              cualquier cambio significativo publicando la nueva política en esta página y actualizando 
              la fecha de &quot;última actualización&quot;.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contacto</h2>
            <p>
              Si tienes preguntas sobre esta Política de Privacidad o sobre cómo manejamos tu 
              información, puedes contactarnos a través de la plataforma.
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
