import { headers } from 'next/headers'
import { Header } from '@/components/layout/header'
import { getLang } from '@/lib/i18n'

export default async function PrivacyPage() {
  const headersList = await headers()
  const userCountry = headersList.get('cf-ipcountry') ?? null
  const lang = getLang(userCountry)

  if (lang === 'tl') return <PrivacyTL />
  if (lang === 'en') return <PrivacyEN />
  if (lang === 'id') return <PrivacyID />
  return <PrivacyES />
}

function PrivacyES() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Política de Privacidad</h1>
        <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
          <section><h2 className="text-xl font-semibold mb-3">1. Introducción</h2><p>En Ventas Tecate, respetamos tu privacidad y nos comprometemos a proteger tus datos personales. Esta política describe cómo recopilamos, usamos y protegemos tu información.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">2. Información que Recopilamos</h2><p>Recopilamos: correo electrónico, nombre de usuario, nombre para mostrar y contraseña (encriptada). También recopilamos información de tus anuncios e información de uso de la plataforma.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">3. Cómo Usamos tu Información</h2><p>Usamos tu información para crear y mantener tu cuenta, publicar y gestionar tus anuncios, facilitar la comunicación entre usuarios, mejorar tu experiencia y prevenir fraude.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">4. Compartir Información</h2><p>No vendemos tu información personal a terceros. Los anuncios que publicas son visibles para todos los usuarios. Solo compartimos información con proveedores de servicios necesarios para operar la plataforma o cuando es requerido por ley.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">5. Seguridad de Datos</h2><p>Implementamos medidas de seguridad técnicas para proteger tu información, incluyendo encriptación de contraseñas, conexiones HTTPS y controles de acceso. Sin embargo, ningún método es 100% seguro.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">6. Tus Derechos</h2><p>Tienes derecho a acceder, corregir, y solicitar la eliminación de tu información personal en cualquier momento.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">7. Cookies</h2><p>Utilizamos cookies para mejorar tu experiencia y mantener tu sesión activa. Puedes configurar tu navegador para rechazar cookies.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">8. Privacidad de Menores</h2><p>Nuestro servicio no está dirigido a menores de 18 años. No recopilamos intencionalmente información de menores.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">9. Contacto</h2><p>Si tienes preguntas sobre esta Política de Privacidad, puedes contactarnos a través de la plataforma.</p></section>
          <p className="text-sm text-gray-500 mt-8">Última actualización: 25 de febrero de 2026</p>
        </div>
      </main>
    </div>
  )
}

function PrivacyTL() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Patakaran sa Privacy</h1>
        <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
          <section><h2 className="text-xl font-semibold mb-3">1. Panimula</h2><p>Sa Ventas Tecate, iginagalang namin ang iyong privacy at nakatuon kaming protektahan ang iyong personal na data. Inilalarawan ng patakarang ito kung paano namin kinukolekta, ginagamit, at pinoprotektahan ang iyong impormasyon.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">2. Impormasyong Kinukolekta Namin</h2><p>Kinukolekta namin ang: email, username, display name, at password (na-encrypt). Kinukolekta rin namin ang impormasyon ng iyong mga listing at impormasyon tungkol sa paggamit mo sa platform.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">3. Paano Namin Ginagamit ang Iyong Impormasyon</h2><p>Ginagamit namin ang iyong impormasyon para gumawa at mapanatili ang iyong account, mag-post at pamahalaan ang iyong mga listing, mapadali ang komunikasyon sa pagitan ng mga gumagamit, mapabuti ang iyong karanasan, at maiwasan ang panloloko.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">4. Pagbabahagi ng Impormasyon</h2><p>Hindi namin ibinebenta ang iyong personal na impormasyon sa mga third party. Ang mga listing na iyong ipo-post ay makikita ng lahat ng gumagamit. Ibinabahagi lamang namin ang impormasyon sa mga kinakailangang service provider o kung hinihingi ng batas.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">5. Seguridad ng Data</h2><p>Nagsasagawa kami ng mga teknikal na hakbang para protektahan ang iyong impormasyon, kabilang ang pag-encrypt ng password, HTTPS na koneksyon, at mga kontrol sa access. Gayunpaman, walang paraan na 100% ligtas.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">6. Iyong mga Karapatan</h2><p>Mayroon kang karapatang ma-access, baguhin, at hilingin ang pagtanggal ng iyong personal na impormasyon sa anumang oras.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">7. Cookies</h2><p>Gumagamit kami ng cookies para mapabuti ang iyong karanasan at mapanatiling aktibo ang iyong session. Maaari mong i-configure ang iyong browser para tanggihan ang cookies.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">8. Privacy ng mga Menor</h2><p>Ang aming serbisyo ay hindi para sa mga may edad na wala pang 18 taong gulang. Hindi namin sinasadyang kolektahin ang impormasyon ng mga menor.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">9. Makipag-ugnayan</h2><p>Kung mayroon kang mga tanong tungkol sa Patakarang ito sa Privacy, makipag-ugnayan sa amin sa pamamagitan ng platform.</p></section>
          <p className="text-sm text-gray-500 mt-8">Huling na-update: Pebrero 25, 2026</p>
        </div>
      </main>
    </div>
  )
}

function PrivacyEN() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
          <section><h2 className="text-xl font-semibold mb-3">1. Introduction</h2><p>At Ventas Tecate, we respect your privacy and are committed to protecting your personal data. This policy describes how we collect, use, and protect your information.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2><p>We collect: email, username, display name, and password (encrypted). We also collect information from your listings and platform usage data.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2><p>We use your information to create and maintain your account, post and manage your listings, facilitate communication between users, improve your experience, and prevent fraud.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">4. Sharing Information</h2><p>We do not sell your personal information to third parties. Listings you post are visible to all users. We only share information with necessary service providers or when required by law.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">5. Data Security</h2><p>We implement technical security measures to protect your information, including password encryption, HTTPS connections, and access controls. However, no method is 100% secure.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">6. Your Rights</h2><p>You have the right to access, correct, and request deletion of your personal information at any time.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">7. Cookies</h2><p>We use cookies to improve your experience and keep your session active. You can configure your browser to reject cookies.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">8. Children&apos;s Privacy</h2><p>Our service is not directed at users under 18 years of age. We do not intentionally collect information from minors.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">9. Contact</h2><p>If you have questions about this Privacy Policy, please contact us through the platform.</p></section>
          <p className="text-sm text-gray-500 mt-8">Last updated: February 25, 2026</p>
        </div>
      </main>
    </div>
  )
}

function PrivacyID() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Kebijakan Privasi</h1>
        <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
          <section><h2 className="text-xl font-semibold mb-3">1. Pendahuluan</h2><p>Di Ventas Tecate, kami menghormati privasi kamu dan berkomitmen untuk melindungi data pribadimu. Kebijakan ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasimu.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">2. Informasi yang Kami Kumpulkan</h2><p>Kami mengumpulkan: email, nama pengguna, nama tampilan, dan kata sandi (terenkripsi). Kami juga mengumpulkan informasi dari iklanmu dan data penggunaan platform.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">3. Cara Kami Menggunakan Informasimu</h2><p>Kami menggunakan informasimu untuk membuat dan memelihara akunmu, memasang dan mengelola iklanmu, memfasilitasi komunikasi antar pengguna, meningkatkan pengalamanmu, dan mencegah penipuan.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">4. Berbagi Informasi</h2><p>Kami tidak menjual informasi pribadimu kepada pihak ketiga. Iklan yang kamu pasang dapat dilihat semua pengguna. Kami hanya berbagi informasi dengan penyedia layanan yang diperlukan atau jika diwajibkan oleh hukum.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">5. Keamanan Data</h2><p>Kami menerapkan langkah-langkah keamanan teknis untuk melindungi informasimu, termasuk enkripsi kata sandi, koneksi HTTPS, dan kontrol akses. Namun, tidak ada metode yang 100% aman.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">6. Hak-Hakmu</h2><p>Kamu berhak mengakses, mengoreksi, dan meminta penghapusan informasi pribadimu kapan saja.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">7. Cookie</h2><p>Kami menggunakan cookie untuk meningkatkan pengalamanmu dan menjaga sesimu tetap aktif. Kamu bisa mengatur browser untuk menolak cookie.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">8. Privasi Anak-Anak</h2><p>Layanan kami tidak ditujukan untuk pengguna di bawah 18 tahun. Kami tidak sengaja mengumpulkan informasi dari anak-anak.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">9. Hubungi Kami</h2><p>Jika kamu memiliki pertanyaan tentang Kebijakan Privasi ini, hubungi kami melalui platform.</p></section>
          <p className="text-sm text-gray-500 mt-8">Terakhir diperbarui: 25 Februari 2026</p>
        </div>
      </main>
    </div>
  )
}
