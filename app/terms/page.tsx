import { headers } from 'next/headers'
import { Header } from '@/components/layout/header'
import { getLang } from '@/lib/i18n'

export default async function TermsPage() {
  const headersList = await headers()
  const userCountry = headersList.get('cf-ipcountry') ?? null
  const lang = getLang(userCountry)

  if (lang === 'tl') return <TermsTL />
  if (lang === 'en') return <TermsEN />
  if (lang === 'id') return <TermsID />
  return <TermsES />
}

function TermsES() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Términos de Servicio</h1>
        <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
          <section><h2 className="text-xl font-semibold mb-3">1. Aceptación de los Términos</h2><p>Al acceder y utilizar Ventas Tecate, aceptas estar sujeto a estos Términos de Servicio. Si no estás de acuerdo con alguna parte de estos términos, no debes usar nuestro servicio.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">2. Descripción del Servicio</h2><p>Ventas Tecate es una plataforma de marketplace local que permite a los usuarios publicar y buscar anuncios de compra y venta de artículos en diversas localidades.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">3. Registro y Cuentas de Usuario</h2><p>Para utilizar ciertas funciones del servicio, debes registrarte y crear una cuenta. Eres responsable de mantener la confidencialidad de tu cuenta y contraseña.</p><ul className="list-disc pl-6 mt-2 space-y-1"><li>Debes proporcionar información precisa y completa al registrarte</li><li>Debes tener al menos 18 años para crear una cuenta</li><li>No puedes compartir tu cuenta con otras personas</li><li>Debes notificarnos inmediatamente de cualquier uso no autorizado de tu cuenta</li></ul></section>
          <section><h2 className="text-xl font-semibold mb-3">4. Publicación de Anuncios</h2><p>Al publicar un anuncio, aceptas que:</p><ul className="list-disc pl-6 mt-2 space-y-1"><li>Eres el propietario legítimo del artículo o tienes autorización para venderlo</li><li>La información y las imágenes del anuncio son precisas y no engañosas</li><li>No publicarás artículos ilegales, peligrosos o prohibidos</li><li>No publicarás contenido ofensivo, discriminatorio o inapropiado</li><li>Nos reservamos el derecho de eliminar cualquier anuncio sin previo aviso</li></ul></section>
          <section><h2 className="text-xl font-semibold mb-3">5. Transacciones</h2><p>Ventas Tecate es únicamente una plataforma de conexión. No somos parte de ninguna transacción entre compradores y vendedores.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">6. Prohibiciones</h2><p>Está prohibido usar el servicio para actividades ilegales, acosar a otros usuarios, publicar spam, o intentar acceder a cuentas ajenas.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">7. Limitación de Responsabilidad</h2><p>Ventas Tecate se proporciona &quot;tal cual&quot; sin garantías. No nos hacemos responsables por la calidad o legalidad de los artículos publicados.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">8. Modificaciones</h2><p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación.</p></section>
          <p className="text-sm text-gray-500 mt-8">Última actualización: 25 de febrero de 2026</p>
        </div>
      </main>
    </div>
  )
}

function TermsTL() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Mga Tuntunin ng Serbisyo</h1>
        <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
          <section><h2 className="text-xl font-semibold mb-3">1. Pagtanggap ng mga Tuntunin</h2><p>Sa pag-access at paggamit ng Ventas Tecate, sumasang-ayon kang sumunod sa Mga Tuntunin ng Serbisyo na ito. Kung hindi ka sumasang-ayon sa alinman sa mga tuntuning ito, huwag gamitin ang aming serbisyo.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">2. Paglalarawan ng Serbisyo</h2><p>Ang Ventas Tecate ay isang lokal na marketplace platform na nagbibigay-daan sa mga gumagamit na mag-post at maghanap ng mga listing para sa pagbili at pagbenta ng mga bagay sa iba&apos;t ibang lokasyon.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">3. Pagrerehistro at mga Account ng Gumagamit</h2><p>Para magamit ang ilang feature ng serbisyo, kailangan mong mag-rehistro at gumawa ng account. Ikaw ang responsable sa pagpapanatili ng kumpidensyalidad ng iyong account at password.</p><ul className="list-disc pl-6 mt-2 space-y-1"><li>Kailangan mong magbigay ng tumpak at kumpletong impormasyon sa pagrerehistro</li><li>Kailangan mong may edad 18 pataas para gumawa ng account</li><li>Hindi mo maaaring ibahagi ang iyong account sa iba</li><li>Kailangan mong abisuhan kami agad ng anumang hindi awtorisadong paggamit ng iyong account</li></ul></section>
          <section><h2 className="text-xl font-semibold mb-3">4. Pag-post ng mga Listing</h2><p>Sa pag-post ng isang listing, sumasang-ayon ka na:</p><ul className="list-disc pl-6 mt-2 space-y-1"><li>Ikaw ang lehitimong may-ari ng bagay o may pahintulot kang ibenta ito</li><li>Ang impormasyon at mga larawan sa listing ay tumpak at hindi mapanlinlang</li><li>Hindi ka mag-po-post ng ilegal, mapanganib, o ipinagbabawal na mga bagay</li><li>Hindi ka mag-po-post ng nakakasakit, may diskriminasyon, o hindi angkop na nilalaman</li><li>Inireserba namin ang karapatang tanggalin ang anumang listing nang walang paunang abiso</li></ul></section>
          <section><h2 className="text-xl font-semibold mb-3">5. Mga Transaksyon</h2><p>Ang Ventas Tecate ay isang platform lamang para sa pagkonekta ng mga tao. Hindi kami bahagi ng anumang transaksyon sa pagitan ng mga mamimili at nagbebenta.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">6. Mga Ipinagbabawal</h2><p>Ipinagbabawal ang paggamit ng serbisyo para sa ilegal na aktibidad, pag-harass ng iba, pag-spam, o pagtatangkang ma-access ang mga account ng iba.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">7. Limitasyon ng Pananagutan</h2><p>Ibinibigay ang Ventas Tecate &quot;as is&quot; nang walang anumang garantiya. Hindi kami responsable sa kalidad o legalidad ng mga bagay na naka-post.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">8. Mga Pagbabago</h2><p>Inireserba namin ang karapatang baguhin ang mga tuntuning ito sa anumang oras. Ang mga pagbabago ay magkakabisa agad pagkatapos ng publikasyon.</p></section>
          <p className="text-sm text-gray-500 mt-8">Huling na-update: Pebrero 25, 2026</p>
        </div>
      </main>
    </div>
  )
}

function TermsEN() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
          <section><h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2><p>By accessing and using Ventas Tecate, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you should not use our service.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">2. Service Description</h2><p>Ventas Tecate is a local marketplace platform that allows users to post and search listings to buy and sell items in various locations.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">3. Registration and User Accounts</h2><p>To use certain features of the service, you must register and create an account. You are responsible for maintaining the confidentiality of your account and password.</p><ul className="list-disc pl-6 mt-2 space-y-1"><li>You must provide accurate and complete information when registering</li><li>You must be at least 18 years old to create an account</li><li>You may not share your account with others</li><li>You must notify us immediately of any unauthorized use of your account</li></ul></section>
          <section><h2 className="text-xl font-semibold mb-3">4. Posting Listings</h2><p>By posting a listing, you agree that:</p><ul className="list-disc pl-6 mt-2 space-y-1"><li>You are the legitimate owner of the item or have authorization to sell it</li><li>The listing information and images are accurate and not misleading</li><li>You will not post illegal, dangerous, or prohibited items</li><li>You will not post offensive, discriminatory, or inappropriate content</li><li>We reserve the right to remove any listing without prior notice</li></ul></section>
          <section><h2 className="text-xl font-semibold mb-3">5. Transactions</h2><p>Ventas Tecate is solely a connection platform. We are not a party to any transaction between buyers and sellers.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">6. Prohibitions</h2><p>It is prohibited to use the service for illegal activities, harass other users, post spam, or attempt to access other users&apos; accounts.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2><p>Ventas Tecate is provided &quot;as is&quot; without warranties of any kind. We are not responsible for the quality or legality of posted items.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">8. Modifications</h2><p>We reserve the right to modify these terms at any time. Changes will take effect immediately upon publication.</p></section>
          <p className="text-sm text-gray-500 mt-8">Last updated: February 25, 2026</p>
        </div>
      </main>
    </div>
  )
}

function TermsID() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Syarat Layanan</h1>
        <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
          <section><h2 className="text-xl font-semibold mb-3">1. Penerimaan Ketentuan</h2><p>Dengan mengakses dan menggunakan Ventas Tecate, kamu menyetujui untuk terikat oleh Syarat Layanan ini. Jika kamu tidak setuju dengan bagian mana pun dari ketentuan ini, jangan gunakan layanan kami.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">2. Deskripsi Layanan</h2><p>Ventas Tecate adalah platform marketplace lokal yang memungkinkan pengguna untuk memasang dan mencari iklan jual beli barang di berbagai lokasi.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">3. Pendaftaran dan Akun Pengguna</h2><p>Untuk menggunakan fitur tertentu, kamu harus mendaftar dan membuat akun. Kamu bertanggung jawab menjaga kerahasiaan akun dan kata sandimu.</p><ul className="list-disc pl-6 mt-2 space-y-1"><li>Kamu harus memberikan informasi yang akurat dan lengkap saat mendaftar</li><li>Kamu harus berusia minimal 18 tahun untuk membuat akun</li><li>Kamu tidak boleh berbagi akun dengan orang lain</li><li>Kamu harus segera memberi tahu kami jika ada penggunaan akun yang tidak sah</li></ul></section>
          <section><h2 className="text-xl font-semibold mb-3">4. Pemasangan Iklan</h2><p>Dengan memasang iklan, kamu menyetujui bahwa:</p><ul className="list-disc pl-6 mt-2 space-y-1"><li>Kamu adalah pemilik sah barang tersebut atau memiliki izin untuk menjualnya</li><li>Informasi dan gambar iklan akurat dan tidak menyesatkan</li><li>Kamu tidak akan memasang barang ilegal, berbahaya, atau terlarang</li><li>Kamu tidak akan memasang konten ofensif, diskriminatif, atau tidak pantas</li><li>Kami berhak menghapus iklan kapan saja tanpa pemberitahuan sebelumnya</li></ul></section>
          <section><h2 className="text-xl font-semibold mb-3">5. Transaksi</h2><p>Ventas Tecate hanyalah platform penghubung. Kami bukan pihak dalam transaksi antara pembeli dan penjual.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">6. Larangan</h2><p>Dilarang menggunakan layanan untuk aktivitas ilegal, melecehkan pengguna lain, mengirim spam, atau mencoba mengakses akun pengguna lain.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">7. Batasan Tanggung Jawab</h2><p>Ventas Tecate disediakan &quot;apa adanya&quot; tanpa jaminan apa pun. Kami tidak bertanggung jawab atas kualitas atau legalitas barang yang diiklankan.</p></section>
          <section><h2 className="text-xl font-semibold mb-3">8. Perubahan</h2><p>Kami berhak mengubah ketentuan ini kapan saja. Perubahan akan berlaku segera setelah dipublikasikan.</p></section>
          <p className="text-sm text-gray-500 mt-8">Terakhir diperbarui: 25 Februari 2026</p>
        </div>
      </main>
    </div>
  )
}
