import { headers } from 'next/headers'
import { Header } from '@/components/layout/header'
import { getLang } from '@/lib/i18n'
import { getBrand } from '@/lib/brand'

export default async function TermsPage() {
  const headersList = await headers()
  const userCountry = headersList.get('cf-ipcountry') ?? null
  const hostname = headersList.get('host') ?? ''
  const lang = getLang(userCountry)
  const { name: brandName } = getBrand(hostname)

  if (lang === 'tl') return <TermsTL brand={brandName} />
  if (lang === 'en') return <TermsEN brand={brandName} />
  if (lang === 'id') return <TermsID brand={brandName} />
  return <TermsES brand={brandName} />
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
          <p className="text-xs text-gray-400">{contactLabel}: <a href="mailto:soporte@ventastecate.com" className="underline hover:text-gray-600">soporte@ventastecate.com</a></p>
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

function TermsES({ brand }: { brand: string }) {
  return (
    <Layout title="Términos de Servicio" brand={brand} updatedLabel="Última actualización" updatedDate="3 de marzo de 2026" contactLabel="Contacto">
      <Section title="Aceptación">
        <p>Al usar {brand} aceptas estos términos. Si no estás de acuerdo, deja de usar el servicio.</p>
      </Section>
      <Section title="El Servicio">
        <p>{brand} es un marketplace local que conecta compradores y vendedores. No somos parte de ninguna transacción y no garantizamos la calidad, legalidad ni exactitud de los anuncios.</p>
      </Section>
      <Section title="Tu Cuenta">
        <p>Debes tener al menos 18 años. Proporciona información veraz al registrarte y mantén tu contraseña segura. Notifícanos de inmediato ante cualquier acceso no autorizado.</p>
      </Section>
      <Section title="Anuncios">
        <p>Solo publica artículos que te pertenezcan o que tengas autorización de vender. Queda prohibido publicar contenido ilegal, peligroso, ofensivo o engañoso. Nos reservamos el derecho de eliminar cualquier anuncio sin aviso previo.</p>
      </Section>
      <Section title="Conducta">
        <p>Está prohibido acosar a otros usuarios, publicar spam o intentar acceder a cuentas ajenas. El incumplimiento puede resultar en la suspensión de tu cuenta.</p>
      </Section>
      <Section title="Limitación de Responsabilidad">
        <p>El servicio se proporciona &quot;tal cual&quot;. No nos hacemos responsables por pérdidas derivadas del uso del servicio o de transacciones entre usuarios.</p>
      </Section>
      <Section title="Cambios">
        <p>Podemos actualizar estos términos en cualquier momento. El uso continuado del servicio implica aceptación de los términos vigentes.</p>
      </Section>
    </Layout>
  )
}

function TermsTL({ brand }: { brand: string }) {
  return (
    <Layout title="Mga Tuntunin ng Serbisyo" brand={brand} updatedLabel="Huling na-update" updatedDate="Marso 3, 2026" contactLabel="Makipag-ugnayan">
      <Section title="Pagtanggap">
        <p>Sa paggamit ng {brand}, sumasang-ayon ka sa mga tuntuning ito. Kung hindi ka sumasang-ayon, tumigil sa paggamit ng serbisyo.</p>
      </Section>
      <Section title="Ang Serbisyo">
        <p>Ang {brand} ay isang lokal na marketplace na nagkokonekta sa mga mamimili at nagbebenta. Hindi kami bahagi ng anumang transaksyon at hindi namin ginagarantiyahan ang kalidad o legalidad ng mga listing.</p>
      </Section>
      <Section title="Ang Iyong Account">
        <p>Kailangan mong 18 taong gulang pataas. Magbigay ng totoong impormasyon at panatilihing ligtas ang iyong password. Abisuhan kami agad ng anumang hindi awtorisadong access.</p>
      </Section>
      <Section title="Mga Listing">
        <p>Mag-post lamang ng mga bagay na sa iyo o may pahintulot kang ibenta. Ipinagbabawal ang ilegal, mapanganib, nakakasakit, o mapanlinlang na nilalaman. Maaari naming tanggalin ang anumang listing nang walang paunang abiso.</p>
      </Section>
      <Section title="Pag-uugali">
        <p>Ipinagbabawal ang pag-harass sa ibang gumagamit, pag-spam, o pagtatangkang ma-access ang ibang account. Ang paglabag ay maaaring magresulta sa pagsuspindi ng account.</p>
      </Section>
      <Section title="Limitasyon ng Pananagutan">
        <p>Ibinibigay ang serbisyo &quot;as is&quot;. Hindi kami responsable sa mga pagkalugi mula sa paggamit ng serbisyo o transaksyon sa pagitan ng mga gumagamit.</p>
      </Section>
      <Section title="Mga Pagbabago">
        <p>Maaari naming i-update ang mga tuntuning ito anumang oras. Ang patuloy na paggamit ng serbisyo ay nangangahulugang tinatanggap mo ang mga kasalukuyang tuntunin.</p>
      </Section>
    </Layout>
  )
}

function TermsEN({ brand }: { brand: string }) {
  return (
    <Layout title="Terms of Service" brand={brand} updatedLabel="Last updated" updatedDate="March 3, 2026" contactLabel="Contact">
      <Section title="Acceptance">
        <p>By using {brand} you agree to these terms. If you disagree, stop using the service.</p>
      </Section>
      <Section title="The Service">
        <p>{brand} is a local marketplace connecting buyers and sellers. We are not party to any transaction and do not guarantee the quality, legality, or accuracy of any listing.</p>
      </Section>
      <Section title="Your Account">
        <p>You must be at least 18 years old. Provide accurate information when registering and keep your password secure. Notify us immediately of any unauthorized access.</p>
      </Section>
      <Section title="Listings">
        <p>Only post items you own or have authorization to sell. Illegal, dangerous, offensive, or misleading content is prohibited. We reserve the right to remove any listing without prior notice.</p>
      </Section>
      <Section title="Conduct">
        <p>Harassing other users, spamming, or attempting to access other accounts is prohibited. Violations may result in account suspension.</p>
      </Section>
      <Section title="Limitation of Liability">
        <p>The service is provided &quot;as is&quot;. We are not liable for losses arising from use of the service or transactions between users.</p>
      </Section>
      <Section title="Changes">
        <p>We may update these terms at any time. Continued use of the service constitutes acceptance of the current terms.</p>
      </Section>
    </Layout>
  )
}

function TermsID({ brand }: { brand: string }) {
  return (
    <Layout title="Syarat Layanan" brand={brand} updatedLabel="Terakhir diperbarui" updatedDate="3 Maret 2026" contactLabel="Kontak">
      <Section title="Penerimaan">
        <p>Dengan menggunakan {brand}, kamu menyetujui syarat-syarat ini. Jika tidak setuju, hentikan penggunaan layanan.</p>
      </Section>
      <Section title="Layanan">
        <p>{brand} adalah marketplace lokal yang menghubungkan pembeli dan penjual. Kami bukan pihak dalam transaksi apapun dan tidak menjamin kualitas atau legalitas iklan.</p>
      </Section>
      <Section title="Akunmu">
        <p>Kamu harus berusia minimal 18 tahun. Berikan informasi yang akurat saat mendaftar dan jaga keamanan kata sandimu. Beri tahu kami segera jika ada akses tidak sah.</p>
      </Section>
      <Section title="Iklan">
        <p>Hanya pasang barang milikmu atau yang kamu berhak jual. Konten ilegal, berbahaya, ofensif, atau menyesatkan dilarang. Kami berhak menghapus iklan tanpa pemberitahuan sebelumnya.</p>
      </Section>
      <Section title="Perilaku">
        <p>Melecehkan pengguna lain, spam, atau mencoba mengakses akun lain dilarang. Pelanggaran dapat mengakibatkan penangguhan akun.</p>
      </Section>
      <Section title="Batasan Tanggung Jawab">
        <p>Layanan disediakan &quot;apa adanya&quot;. Kami tidak bertanggung jawab atas kerugian dari penggunaan layanan atau transaksi antar pengguna.</p>
      </Section>
      <Section title="Perubahan">
        <p>Kami dapat memperbarui syarat ini kapan saja. Penggunaan layanan yang berkelanjutan berarti kamu menerima syarat yang berlaku.</p>
      </Section>
    </Layout>
  )
}
