import { headers } from 'next/headers'
import { Header } from '@/components/layout/header'
import { getLang } from '@/lib/i18n'
import { getBrand } from '@/lib/brand'


export default async function PrivacyPage() {
  const headersList = await headers()
  const userCountry = headersList.get('cf-ipcountry') ?? null
  const hostname = headersList.get('host') ?? ''
  const lang = getLang(userCountry)
  const { name: brandName } = getBrand(hostname)

  if (lang === 'tl') return <PrivacyTL brand={brandName} />
  if (lang === 'en') return <PrivacyEN brand={brandName} />
  if (lang === 'id') return <PrivacyID brand={brandName} />
  return <PrivacyES brand={brandName} />
}

function Layout({ title, children, brand, updatedLabel, updatedDate, contactLabel }: {
  title: string
  children: React.ReactNode
  brand: string
  updatedLabel: string
  updatedDate: string
  contactLabel: string
}) {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-2xl font-bold mb-1">{title}</h1>
        <p className="text-xs text-gray-400 mb-8">{updatedLabel}: {updatedDate}</p>
        <div className="space-y-6 text-sm text-gray-600 leading-relaxed">
          {children}
        </div>
        <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col gap-1">
          <p className="text-xs text-gray-400">{contactLabel}: <a href="mailto:info@papryka.co" className="underline hover:text-gray-600">info@papryka.co</a></p>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} {brand}</p>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1.5">{title}</h2>
      <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
    </div>
  )
}

function PrivacyES({ brand }: { brand: string }) {
  return (
    <Layout title="Política de Privacidad" brand={brand} updatedLabel="Última actualización" updatedDate="3 de marzo de 2026" contactLabel="Contacto">
      <Section title="Resumen">
        <p>En {brand} respetamos tu privacidad. Esta política explica qué datos recopilamos y cómo los usamos.</p>
      </Section>
      <Section title="Qué Recopilamos">
        <p>Correo electrónico, nombre de usuario y contraseña encriptada al registrarte. Información de tus anuncios y datos de uso general de la plataforma.</p>
      </Section>
      <Section title="Cómo lo Usamos">
        <p>Para operar tu cuenta, mostrar tus anuncios, permitir la mensajería entre usuarios, mejorar el servicio y prevenir fraude.</p>
      </Section>
      <Section title="Compartir Datos">
        <p>No vendemos tu información. Los anuncios que publicas son públicos. Compartimos datos únicamente con proveedores necesarios para operar la plataforma o cuando la ley lo exige.</p>
      </Section>
      <Section title="Seguridad">
        <p>Usamos encriptación, HTTPS y controles de acceso para proteger tus datos. Ningún sistema es infalible, pero tomamos la seguridad en serio.</p>
      </Section>
      <Section title="Tus Derechos">
        <p>Puedes acceder, corregir o solicitar la eliminación de tus datos en cualquier momento desde la configuración de tu cuenta o contactándonos.</p>
      </Section>
      <Section title="Cookies">
        <p>Usamos cookies para mantener tu sesión activa y mejorar la experiencia. Puedes desactivarlas desde la configuración de tu navegador.</p>
      </Section>
      <Section title="Menores">
        <p>El servicio no está dirigido a menores de 18 años. No recopilamos intencionalmente datos de menores.</p>
      </Section>
    </Layout>
  )
}

function PrivacyTL({ brand }: { brand: string }) {
  return (
    <Layout title="Patakaran sa Privacy" brand={brand} updatedLabel="Huling na-update" updatedDate="Marso 3, 2026" contactLabel="Makipag-ugnayan">
      <Section title="Buod">
        <p>Sa {brand}, iginagalang namin ang iyong privacy. Inilalarawan ng patakarang ito kung anong data ang aming kinokolekta at paano namin ito ginagamit.</p>
      </Section>
      <Section title="Ano ang Kinokolekta Namin">
        <p>Email, username, at naka-encrypt na password sa pagrerehistro. Impormasyon ng iyong mga listing at pangkalahatang data ng paggamit ng platform.</p>
      </Section>
      <Section title="Paano Namin Ginagamit">
        <p>Para pamahalaan ang iyong account, ipakita ang iyong mga listing, paganahin ang pagmemensahe sa pagitan ng mga gumagamit, mapabuti ang serbisyo, at maiwasan ang panloloko.</p>
      </Section>
      <Section title="Pagbabahagi ng Data">
        <p>Hindi namin ibinebenta ang iyong impormasyon. Ang mga listing na iyong ipo-post ay pampubliko. Ibinabahagi lamang namin ang data sa mga kinakailangang service provider o kung hinihingi ng batas.</p>
      </Section>
      <Section title="Seguridad">
        <p>Gumagamit kami ng encryption, HTTPS, at mga kontrol sa access para protektahan ang iyong data. Sineseryoso namin ang seguridad kahit walang sistema na perpekto.</p>
      </Section>
      <Section title="Iyong mga Karapatan">
        <p>Maaari mong i-access, itama, o hilingin ang pagtanggal ng iyong data anumang oras mula sa mga setting ng account o sa pamamagitan ng pakikipag-ugnayan sa amin.</p>
      </Section>
      <Section title="Cookies">
        <p>Gumagamit kami ng cookies para mapanatiling aktibo ang iyong session at mapabuti ang karanasan. Maaari mo itong i-disable sa mga setting ng browser.</p>
      </Section>
      <Section title="Mga Menor">
        <p>Ang serbisyo ay hindi para sa mga wala pang 18 taong gulang. Hindi namin sinasadyang kolektahin ang data ng mga menor.</p>
      </Section>
    </Layout>
  )
}

function PrivacyEN({ brand }: { brand: string }) {
  return (
    <Layout title="Privacy Policy" brand={brand} updatedLabel="Last updated" updatedDate="March 3, 2026" contactLabel="Contact">
      <Section title="Summary">
        <p>At {brand} we respect your privacy. This policy explains what data we collect and how we use it.</p>
      </Section>
      <Section title="What We Collect">
        <p>Email, username, and encrypted password when you register. Information from your listings and general platform usage data.</p>
      </Section>
      <Section title="How We Use It">
        <p>To operate your account, display your listings, enable messaging between users, improve the service, and prevent fraud.</p>
      </Section>
      <Section title="Sharing Data">
        <p>We do not sell your information. Listings you post are public. We only share data with service providers necessary to operate the platform, or when required by law.</p>
      </Section>
      <Section title="Security">
        <p>We use encryption, HTTPS, and access controls to protect your data. No system is perfect, but we take security seriously.</p>
      </Section>
      <Section title="Your Rights">
        <p>You can access, correct, or request deletion of your data at any time from your account settings or by contacting us.</p>
      </Section>
      <Section title="Cookies">
        <p>We use cookies to keep your session active and improve the experience. You can disable them in your browser settings.</p>
      </Section>
      <Section title="Minors">
        <p>The service is not directed at users under 18. We do not intentionally collect data from minors.</p>
      </Section>
    </Layout>
  )
}

function PrivacyID({ brand }: { brand: string }) {
  return (
    <Layout title="Kebijakan Privasi" brand={brand} updatedLabel="Terakhir diperbarui" updatedDate="3 Maret 2026" contactLabel="Kontak">
      <Section title="Ringkasan">
        <p>Di {brand} kami menghormati privasimu. Kebijakan ini menjelaskan data apa yang kami kumpulkan dan bagaimana kami menggunakannya.</p>
      </Section>
      <Section title="Yang Kami Kumpulkan">
        <p>Email, nama pengguna, dan kata sandi terenkripsi saat mendaftar. Informasi dari iklanmu dan data penggunaan platform secara umum.</p>
      </Section>
      <Section title="Cara Penggunaannya">
        <p>Untuk mengelola akunmu, menampilkan iklanmu, memungkinkan pesan antar pengguna, meningkatkan layanan, dan mencegah penipuan.</p>
      </Section>
      <Section title="Berbagi Data">
        <p>Kami tidak menjual informasimu. Iklan yang kamu pasang bersifat publik. Kami hanya berbagi data dengan penyedia layanan yang diperlukan atau jika diwajibkan hukum.</p>
      </Section>
      <Section title="Keamanan">
        <p>Kami menggunakan enkripsi, HTTPS, dan kontrol akses untuk melindungi datamu. Tidak ada sistem yang sempurna, tapi kami serius dalam keamanan.</p>
      </Section>
      <Section title="Hak-Hakmu">
        <p>Kamu dapat mengakses, mengoreksi, atau meminta penghapusan datamu kapan saja dari pengaturan akun atau dengan menghubungi kami.</p>
      </Section>
      <Section title="Cookie">
        <p>Kami menggunakan cookie untuk menjaga sesi tetap aktif dan meningkatkan pengalaman. Kamu bisa menonaktifkannya di pengaturan browser.</p>
      </Section>
      <Section title="Anak-Anak">
        <p>Layanan tidak ditujukan untuk pengguna di bawah 18 tahun. Kami tidak sengaja mengumpulkan data dari anak-anak.</p>
      </Section>
    </Layout>
  )
}
