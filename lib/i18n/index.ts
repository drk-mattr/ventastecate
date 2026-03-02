export type Lang = 'es' | 'tl' | 'en' | 'id'

const NORTH_AMERICA = new Set(['US', 'CA'])

export function getLang(countryCode: string | null): Lang {
  if (countryCode === 'PH') return 'tl'
  if (countryCode === 'ID') return 'id'
  if (countryCode && NORTH_AMERICA.has(countryCode)) return 'en'
  return 'es'
}

// Category items: value is always the Spanish DB key, label is localized
export type CategoryItem = { value: string; label: string }

export type Translations = {
  lang: Lang
  nav: {
    home: string
    myListings: string
    messages: string
    publish: string
    login: string
    register: string
    logout: string
    settings: string
    myProfile: string
    reportProblem: string
    storeMode: string
    publishAs: string
    createStore: string
  }
  search: {
    placeholder: string
    filters: string
    applyFilters: string
    clear: string
    clearAll: string
    category: string
    allCategories: string
    location: string
    allLocations: string
    nearMe: string
    useMyLocation: string
    price: string
    state: string
    city: string
    sortBy: string
    newest: string
    priceLowHigh: string
    priceHighLow: string
    stateRegionPlaceholder: string
    cityPlaceholder: string
    minPrice: string
    maxPrice: string
    keywords: string
  }
  hero: {
    tagline: string
    searchPlaceholder: string
    search: string
  }
  categories: CategoryItem[]
  listings: {
    recent: string
    worldwide: string
    noListings: string
    noListingsInRegion: string
    seeWorldwide: string
    postListing: string
    results: string
    result: string
    noResults: string
    searchWorldwide: string
    onlyIn: string
    seeAll: string
    in: string
  }
  auth: {
    // login
    loginTitle: string
    loginWelcome: string
    forgotPassword: string
    loggingIn: string
    noAccount: string
    signUpLink: string
    emailNotConfirmed: string
    // signup
    createAccount: string
    joinTagline: string
    username: string
    displayName: string
    passwordHint: string
    iAccept: string
    termsOfService: string
    and: string
    privacyPolicy: string
    creating: string
    checkEmail: string
    accountCreated: string
    checkEmailHint: string
    spamHint: string
    alreadyHaveAccount: string
    signInLink: string
    // forgot password
    recoverPassword: string
    recoverDescription: string
    emailSent: string
    emailSentDescription: string
    backToLogin: string
    sending: string
    sendLink: string
    // shared
    email: string
    password: string
    loading: string
  }
}

const es: Translations = {
  lang: 'es',
  nav: {
    home: 'Inicio',
    myListings: 'Mis Anuncios',
    messages: 'Mensajes',
    publish: 'Publicar',
    login: 'Iniciar Sesión',
    register: 'Registrarse',
    logout: 'Cerrar Sesión',
    settings: 'Configuración',
    myProfile: 'Mi Perfil',
    reportProblem: 'Reportar problema',
    storeMode: 'Modo tienda',
    publishAs: 'Publicar como yo',
    createStore: '+ Crear Tienda',
  },
  search: {
    placeholder: 'Buscar en Ventas Tecate...',
    filters: 'Filtros',
    applyFilters: 'Aplicar Filtros',
    clear: 'Limpiar',
    clearAll: 'Limpiar todo',
    category: 'Categoría',
    allCategories: 'Todas las categorías',
    location: 'Ubicación',
    allLocations: 'Todas las ubicaciones',
    nearMe: 'Cerca de mí',
    useMyLocation: 'Usar mi ubicación',
    price: 'Precio (MXN)',
    state: 'Estado / Región',
    city: 'Ciudad',
    sortBy: 'Ordenar por',
    newest: 'Más recientes',
    priceLowHigh: 'Precio: menor a mayor',
    priceHighLow: 'Precio: mayor a menor',
    stateRegionPlaceholder: 'Ej: Baja California',
    cityPlaceholder: 'Ej: Tecate, Jakarta, Manila',
    minPrice: 'Mínimo',
    maxPrice: 'Máximo',
    keywords: 'Palabras clave...',
  },
  hero: {
    tagline: 'Compra y Vende en',
    searchPlaceholder: '¿Qué estás buscando?',
    search: 'Buscar',
  },
  categories: [
    { value: 'Electrónica', label: 'Electrónica' },
    { value: 'Muebles', label: 'Muebles' },
    { value: 'Vehículos', label: 'Vehículos' },
    { value: 'Ropa', label: 'Ropa' },
    { value: 'Deportes', label: 'Deportes' },
    { value: 'Hogar', label: 'Hogar' },
    { value: 'Juguetes', label: 'Juguetes' },
    { value: 'Libros', label: 'Libros' },
    { value: 'Mascotas', label: 'Mascotas' },
    { value: 'Servicios', label: 'Servicios' },
    { value: 'Eventos', label: 'Eventos' },
    { value: 'Otros', label: 'Otros' },
  ],
  listings: {
    recent: 'Anuncios Recientes',
    worldwide: 'Anuncios en todo el mundo',
    noListings: 'No hay anuncios disponibles.',
    noListingsInRegion: 'No hay anuncios en tu región aún.',
    seeWorldwide: 'Ver anuncios de todo el mundo →',
    postListing: 'Publicar anuncio',
    results: 'resultados',
    result: 'resultado',
    noResults: 'No se encontraron resultados',
    searchWorldwide: 'Buscar en todo el mundo →',
    onlyIn: 'Solo en',
    seeAll: '🌎 Ver todo el mundo',
    in: 'en',
  },
  auth: {
    loginTitle: 'Iniciar Sesión',
    loginWelcome: 'Bienvenido a Ventas Tecate',
    forgotPassword: '¿Olvidaste tu contraseña?',
    loggingIn: 'Iniciando...',
    noAccount: '¿No tienes cuenta?',
    signUpLink: 'Regístrate',
    emailNotConfirmed: 'Por favor confirma tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.',
    createAccount: 'Crear Cuenta',
    joinTagline: 'Únete a Ventas Tecate',
    username: 'Nombre de Usuario',
    displayName: 'Nombre para Mostrar',
    passwordHint: 'Mínimo 6 caracteres',
    iAccept: 'Acepto los',
    termsOfService: 'Términos de Servicio',
    and: 'y la',
    privacyPolicy: 'Política de Privacidad',
    creating: 'Creando cuenta...',
    checkEmail: '¡Revisa tu correo!',
    accountCreated: '¡Cuenta creada exitosamente!',
    checkEmailHint: 'Por favor revisa tu correo electrónico y haz clic en el enlace de confirmación para activar tu cuenta.',
    spamHint: 'Puede tardar unos minutos en llegar. Revisa tu carpeta de spam si no lo ves.',
    alreadyHaveAccount: '¿Ya tienes cuenta?',
    signInLink: 'Inicia sesión',
    recoverPassword: 'Recuperar Contraseña',
    recoverDescription: 'Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña',
    emailSent: '¡Correo enviado!',
    emailSentDescription: 'Revisa tu bandeja de entrada en {email} y sigue el enlace para restablecer tu contraseña.',
    backToLogin: 'Volver a Iniciar Sesión',
    sending: 'Enviando...',
    sendLink: 'Enviar Enlace',
    email: 'Email',
    password: 'Contraseña',
    loading: 'Cargando...',
  },
}

const tl: Translations = {
  lang: 'tl',
  nav: {
    home: 'Home',
    myListings: 'Aking mga Listing',
    messages: 'Mga Mensahe',
    publish: 'Mag-post',
    login: 'Mag-login',
    register: 'Mag-sign up',
    logout: 'Mag-logout',
    settings: 'Mga Setting',
    myProfile: 'Aking Profile',
    reportProblem: 'I-report ang problema',
    storeMode: 'Store mode',
    publishAs: 'I-post bilang ako',
    createStore: '+ Gumawa ng Store',
  },
  search: {
    placeholder: 'Maghanap sa Ventas Tecate...',
    filters: 'Mga Filter',
    applyFilters: 'I-apply ang Filter',
    clear: 'I-clear',
    clearAll: 'I-clear lahat',
    category: 'Kategorya',
    allCategories: 'Lahat ng Kategorya',
    location: 'Lokasyon',
    allLocations: 'Lahat ng Lokasyon',
    nearMe: 'Malapit sa akin',
    useMyLocation: 'Gamitin ang aking lokasyon',
    price: 'Presyo (MXN)',
    state: 'Estado / Rehiyon',
    city: 'Lungsod',
    sortBy: 'I-sort ayon sa',
    newest: 'Pinaka-bago',
    priceLowHigh: 'Presyo: mababa hanggang mataas',
    priceHighLow: 'Presyo: mataas hanggang mababa',
    stateRegionPlaceholder: 'Hal: Baja California',
    cityPlaceholder: 'Hal: Tecate, Jakarta, Manila',
    minPrice: 'Minimum',
    maxPrice: 'Maximum',
    keywords: 'Mga keyword...',
  },
  hero: {
    tagline: 'Bumili at Magbenta sa',
    searchPlaceholder: 'Ano ang hinahanap mo?',
    search: 'Maghanap',
  },
  categories: [
    { value: 'Electrónica', label: 'Elektronika' },
    { value: 'Muebles', label: 'Muwebles' },
    { value: 'Vehículos', label: 'Sasakyan' },
    { value: 'Ropa', label: 'Damit' },
    { value: 'Deportes', label: 'Sports' },
    { value: 'Hogar', label: 'Bahay at Hardin' },
    { value: 'Juguetes', label: 'Laruan' },
    { value: 'Libros', label: 'Libro' },
    { value: 'Mascotas', label: 'Alagang Hayop' },
    { value: 'Servicios', label: 'Serbisyo' },
    { value: 'Eventos', label: 'Events' },
    { value: 'Otros', label: 'Iba pa' },
  ],
  listings: {
    recent: 'Mga Bagong Listing',
    worldwide: 'Mga Listing sa Buong Mundo',
    noListings: 'Walang mga listing na available.',
    noListingsInRegion: 'Wala pang mga listing sa iyong lugar.',
    seeWorldwide: 'Tingnan ang mga listing sa buong mundo →',
    postListing: 'Mag-post ng listing',
    results: 'mga resulta',
    result: 'resulta',
    noResults: 'Walang nakitang resulta',
    searchWorldwide: 'Maghanap sa buong mundo →',
    onlyIn: 'Sa',
    seeAll: '🌎 Tingnan ang buong mundo',
    in: 'sa',
  },
  auth: {
    loginTitle: 'Mag-login',
    loginWelcome: 'Maligayang pagdating sa Ventas Tecate',
    forgotPassword: 'Nakalimutan ang password?',
    loggingIn: 'Naglo-login...',
    noAccount: 'Wala kang account?',
    signUpLink: 'Mag-sign up',
    emailNotConfirmed: 'Pakikumpirma muna ang iyong email bago mag-login. Tingnan ang iyong inbox.',
    createAccount: 'Gumawa ng Account',
    joinTagline: 'Sumali sa Ventas Tecate',
    username: 'Username',
    displayName: 'Display Name',
    passwordHint: 'Minimum 6 na karakter',
    iAccept: 'Tinatanggap ko ang',
    termsOfService: 'Mga Tuntunin ng Serbisyo',
    and: 'at ang',
    privacyPolicy: 'Patakaran sa Privacy',
    creating: 'Gumagawa ng account...',
    checkEmail: 'Tingnan ang iyong email!',
    accountCreated: 'Matagumpay na nagawa ang account!',
    checkEmailHint: 'Pakitingnan ang iyong email at i-click ang confirmation link para i-activate ang iyong account.',
    spamHint: 'Maaaring tumagal ng ilang minuto. Tingnan ang iyong spam folder kung hindi mo ito makita.',
    alreadyHaveAccount: 'May account ka na?',
    signInLink: 'Mag-login',
    recoverPassword: 'I-recover ang Password',
    recoverDescription: 'Ilagay ang iyong email at magpapadala kami ng link para ma-reset ang iyong password',
    emailSent: 'Naipadala ang email!',
    emailSentDescription: 'Tingnan ang iyong inbox sa {email} at sundin ang link para ma-reset ang iyong password.',
    backToLogin: 'Bumalik sa Login',
    sending: 'Nagpapadala...',
    sendLink: 'Magpadala ng Link',
    email: 'Email',
    password: 'Password',
    loading: 'Naglo-load...',
  },
}

const en: Translations = {
  lang: 'en',
  nav: {
    home: 'Home',
    myListings: 'My Listings',
    messages: 'Messages',
    publish: 'Post',
    login: 'Log In',
    register: 'Sign Up',
    logout: 'Log Out',
    settings: 'Settings',
    myProfile: 'My Profile',
    reportProblem: 'Report a Problem',
    storeMode: 'Store mode',
    publishAs: 'Post as myself',
    createStore: '+ Create Store',
  },
  search: {
    placeholder: 'Search Ventas Tecate...',
    filters: 'Filters',
    applyFilters: 'Apply Filters',
    clear: 'Clear',
    clearAll: 'Clear all',
    category: 'Category',
    allCategories: 'All categories',
    location: 'Location',
    allLocations: 'All locations',
    nearMe: 'Near me',
    useMyLocation: 'Use my location',
    price: 'Price (MXN)',
    state: 'State / Region',
    city: 'City',
    sortBy: 'Sort by',
    newest: 'Newest',
    priceLowHigh: 'Price: low to high',
    priceHighLow: 'Price: high to low',
    stateRegionPlaceholder: 'e.g. Baja California',
    cityPlaceholder: 'e.g. Tecate, San Diego, Tijuana',
    minPrice: 'Min',
    maxPrice: 'Max',
    keywords: 'Keywords...',
  },
  hero: {
    tagline: 'Buy & Sell in',
    searchPlaceholder: 'What are you looking for?',
    search: 'Search',
  },
  categories: [
    { value: 'Electrónica', label: 'Electronics' },
    { value: 'Muebles', label: 'Furniture' },
    { value: 'Vehículos', label: 'Vehicles' },
    { value: 'Ropa', label: 'Clothing' },
    { value: 'Deportes', label: 'Sports' },
    { value: 'Hogar', label: 'Home & Garden' },
    { value: 'Juguetes', label: 'Toys' },
    { value: 'Libros', label: 'Books' },
    { value: 'Mascotas', label: 'Pets' },
    { value: 'Servicios', label: 'Services' },
    { value: 'Eventos', label: 'Events' },
    { value: 'Otros', label: 'Other' },
  ],
  listings: {
    recent: 'Recent Listings',
    worldwide: 'Listings Worldwide',
    noListings: 'No listings available.',
    noListingsInRegion: 'No listings in your region yet.',
    seeWorldwide: 'See listings worldwide →',
    postListing: 'Post a listing',
    results: 'results',
    result: 'result',
    noResults: 'No results found',
    searchWorldwide: 'Search worldwide →',
    onlyIn: 'Only in',
    seeAll: '🌎 See worldwide',
    in: 'in',
  },
  auth: {
    loginTitle: 'Log In',
    loginWelcome: 'Welcome to Ventas Tecate',
    forgotPassword: 'Forgot your password?',
    loggingIn: 'Logging in...',
    noAccount: "Don't have an account?",
    signUpLink: 'Sign up',
    emailNotConfirmed: 'Please confirm your email before logging in. Check your inbox.',
    createAccount: 'Create Account',
    joinTagline: 'Join Ventas Tecate',
    username: 'Username',
    displayName: 'Display Name',
    passwordHint: 'Minimum 6 characters',
    iAccept: 'I accept the',
    termsOfService: 'Terms of Service',
    and: 'and',
    privacyPolicy: 'Privacy Policy',
    creating: 'Creating account...',
    checkEmail: 'Check your email!',
    accountCreated: 'Account created successfully!',
    checkEmailHint: 'Please check your email and click the confirmation link to activate your account.',
    spamHint: "It may take a few minutes to arrive. Check your spam folder if you don't see it.",
    alreadyHaveAccount: 'Already have an account?',
    signInLink: 'Log in',
    recoverPassword: 'Recover Password',
    recoverDescription: 'Enter your email and we will send you a link to reset your password',
    emailSent: 'Email sent!',
    emailSentDescription: 'Check your inbox at {email} and follow the link to reset your password.',
    backToLogin: 'Back to Log In',
    sending: 'Sending...',
    sendLink: 'Send Link',
    email: 'Email',
    password: 'Password',
    loading: 'Loading...',
  },
}

const id: Translations = {
  lang: 'id',
  nav: {
    home: 'Beranda',
    myListings: 'Iklan Saya',
    messages: 'Pesan',
    publish: 'Pasang Iklan',
    login: 'Masuk',
    register: 'Daftar',
    logout: 'Keluar',
    settings: 'Pengaturan',
    myProfile: 'Profil Saya',
    reportProblem: 'Laporkan Masalah',
    storeMode: 'Mode toko',
    publishAs: 'Pasang sebagai saya',
    createStore: '+ Buat Toko',
  },
  search: {
    placeholder: 'Cari di Ventas Tecate...',
    filters: 'Filter',
    applyFilters: 'Terapkan Filter',
    clear: 'Hapus',
    clearAll: 'Hapus semua',
    category: 'Kategori',
    allCategories: 'Semua kategori',
    location: 'Lokasi',
    allLocations: 'Semua lokasi',
    nearMe: 'Dekat saya',
    useMyLocation: 'Gunakan lokasi saya',
    price: 'Harga (MXN)',
    state: 'Provinsi / Wilayah',
    city: 'Kota',
    sortBy: 'Urutkan',
    newest: 'Terbaru',
    priceLowHigh: 'Harga: rendah ke tinggi',
    priceHighLow: 'Harga: tinggi ke rendah',
    stateRegionPlaceholder: 'Cth: Baja California',
    cityPlaceholder: 'Cth: Tecate, Jakarta, Surabaya',
    minPrice: 'Minimum',
    maxPrice: 'Maksimum',
    keywords: 'Kata kunci...',
  },
  hero: {
    tagline: 'Beli & Jual di',
    searchPlaceholder: 'Apa yang kamu cari?',
    search: 'Cari',
  },
  categories: [
    { value: 'Electrónica', label: 'Elektronik' },
    { value: 'Muebles', label: 'Furnitur' },
    { value: 'Vehículos', label: 'Kendaraan' },
    { value: 'Ropa', label: 'Pakaian' },
    { value: 'Deportes', label: 'Olahraga' },
    { value: 'Hogar', label: 'Rumah & Taman' },
    { value: 'Juguetes', label: 'Mainan' },
    { value: 'Libros', label: 'Buku' },
    { value: 'Mascotas', label: 'Hewan Peliharaan' },
    { value: 'Servicios', label: 'Jasa' },
    { value: 'Eventos', label: 'Acara' },
    { value: 'Otros', label: 'Lainnya' },
  ],
  listings: {
    recent: 'Iklan Terbaru',
    worldwide: 'Iklan Seluruh Dunia',
    noListings: 'Belum ada iklan tersedia.',
    noListingsInRegion: 'Belum ada iklan di wilayah kamu.',
    seeWorldwide: 'Lihat iklan seluruh dunia →',
    postListing: 'Pasang iklan',
    results: 'hasil',
    result: 'hasil',
    noResults: 'Tidak ada hasil yang ditemukan',
    searchWorldwide: 'Cari di seluruh dunia →',
    onlyIn: 'Hanya di',
    seeAll: '🌎 Lihat seluruh dunia',
    in: 'di',
  },
  auth: {
    loginTitle: 'Masuk',
    loginWelcome: 'Selamat datang di Ventas Tecate',
    forgotPassword: 'Lupa kata sandi?',
    loggingIn: 'Sedang masuk...',
    noAccount: 'Belum punya akun?',
    signUpLink: 'Daftar',
    emailNotConfirmed: 'Harap konfirmasi email kamu sebelum masuk. Cek kotak masuk kamu.',
    createAccount: 'Buat Akun',
    joinTagline: 'Bergabung dengan Ventas Tecate',
    username: 'Nama Pengguna',
    displayName: 'Nama Tampilan',
    passwordHint: 'Minimal 6 karakter',
    iAccept: 'Saya menyetujui',
    termsOfService: 'Syarat Layanan',
    and: 'dan',
    privacyPolicy: 'Kebijakan Privasi',
    creating: 'Membuat akun...',
    checkEmail: 'Cek email kamu!',
    accountCreated: 'Akun berhasil dibuat!',
    checkEmailHint: 'Cek email kamu dan klik tautan konfirmasi untuk mengaktifkan akun kamu.',
    spamHint: 'Mungkin perlu beberapa menit. Cek folder spam jika tidak terlihat.',
    alreadyHaveAccount: 'Sudah punya akun?',
    signInLink: 'Masuk',
    recoverPassword: 'Pulihkan Kata Sandi',
    recoverDescription: 'Masukkan email kamu dan kami akan mengirimkan tautan untuk mengatur ulang kata sandi',
    emailSent: 'Email terkirim!',
    emailSentDescription: 'Cek kotak masuk di {email} dan ikuti tautan untuk mengatur ulang kata sandi kamu.',
    backToLogin: 'Kembali ke Masuk',
    sending: 'Mengirim...',
    sendLink: 'Kirim Tautan',
    email: 'Email',
    password: 'Kata Sandi',
    loading: 'Memuat...',
  },
}

export const translations: Record<Lang, Translations> = { es, tl, en, id }

export function getTranslations(countryCode: string | null): Translations {
  return translations[getLang(countryCode)]
}
