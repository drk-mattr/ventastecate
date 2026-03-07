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
    locationPlaceholder: string
    minPrice: string
    maxPrice: string
    keywords: string
  }
  hero: {
    tagline: string
    taglineBase: string
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
    emailAlreadyRegistered: string
    // signup
    createAccount: string
    joinTagline: string
    displayName: string
    confirmPassword: string
    passwordHint: string
    passwordMismatch: string
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
    orContinueWith: string
    continueWithGoogle: string
  }
  footer: {
    allRightsReserved: string
    termsOfService: string
    privacyPolicy: string
  }
  forms: {
    // Page titles
    createNewListing: string
    editListing: string
    myListings: string
    editProfile: string
    createStoreTitle: string
    storeTypeTitle: string
    // Sub-titles / descriptions
    publishingAs: string
    fillProductInfo: string
    modifyInfo: string
    whatWillYouSell: string
    updatePersonalInfo: string
    // Step wizard
    step1: string
    step2: string
    // Listing type selector
    listingTypeLabel: string
    typeProductLabel: string
    typeProductDesc: string
    typeServiceLabel: string
    typeServiceDesc: string
    typeEventLabel: string
    typeEventDesc: string
    typeNewsLabel: string
    typeNewsDesc: string
    // Title field
    titleLabel: string
    headlineLabel: string
    titlePlaceholderProduct: string
    titlePlaceholderService: string
    titlePlaceholderEvent: string
    titlePlaceholderNews: string
    noImageTip: string
    // Description field
    descriptionLabel: string
    reportBodyLabel: string
    descriptionPlaceholder: string
    reportPlaceholder: string
    // Category field
    categoryLabel: string
    selectCategoryPlaceholder: string
    // Price field
    priceLabel: string
    priceConsultCheckbox: string
    consultPricePlaceholder: string
    // Location
    neighborhoodLabel: string
    neighborhoodPlaceholder: string
    // Images
    imagesLabel: string
    imagesOptional: string
    imagesNewsTip: string
    maxImagesError: string
    // Status (edit)
    statusLabel: string
    statusActive: string
    statusSold: string
    currentImages: string
    noImages: string
    addImages: string
    // Profile
    profilePhoto: string
    changePhoto: string
    usernameLabel: string
    usernameCannotChange: string
    displayNameLabel: string
    bioLabel: string
    bioPlaceholder: string
    profileUpdated: string
    // Store creation
    storeLogo: string
    uploadLogo: string
    storeNameLabel: string
    storeNamePlaceholder: string
    storeUrlLabel: string
    storeSlugHint: string
    storeDescLabel: string
    storeDescPlaceholder: string
    storeLocationLabel: string
    storeLocationPlaceholder: string
    storeTypeGeneralLabel: string
    storeTypeGeneralDesc: string
    storeTypeRealEstateLabel: string
    storeTypeRealEstateDesc: string
    storeTypeAutomotiveLabel: string
    storeTypeAutomotiveDesc: string
    storeDetails: string
    // My listings tabs
    createNewListingBtn: string
    createFirstListingBtn: string
    activeTab: string
    soldTab: string
    inactiveTab: string
    noActiveListings: string
    noSoldListings: string
    noInactiveListings: string
    // Location picker
    cityAndState: string
    detecting: string
    locationDetected: string
    getMyLocation: string
    geoNotSupported: string
    locationDetectFail: string
    locationPermissionDenied: string
    cityLabel: string
    cityFormPlaceholder: string
    stateLabel: string
    statePlaceholder: string
    // Buttons
    continue: string
    back: string
    cancel: string
    publishListing: string
    saveChanges: string
    createStoreBtn: string
    // Status messages
    creating: string
    saving: string
    loadingListing: string
    // Report page
    reportTitle: string
    reportDesc: string
    reportTypeBug: string
    reportTypeSuggestion: string
    reportTypeOther: string
    reportTypeLabel: string
    reportDescLabel: string
    reportDescPlaceholder: string
    reportEmailLabel: string
    reportSubmitting: string
    reportSubmit: string
    reportThankYou: string
    reportReceived: string
    reportSendAnother: string
    // Messages page
    messagesTitle: string
    conversationsTitle: string
    noConversations: string
    selectConversation: string
    messagePlaceholder: string
    sendMessage: string
    loadingMessages: string
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
    placeholder: 'Buscar productos, servicios...',
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
    locationPlaceholder: 'Ciudad, barrio, región...',
    minPrice: 'Mínimo',
    maxPrice: 'Máximo',
    keywords: 'Palabras clave...',
  },
  hero: {
    tagline: 'Descubre, Conecta e Intercambia en',
    taglineBase: 'Descubre, Conecta e Intercambia',
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
    { value: 'Noticias Locales', label: 'Noticias Locales' },
    { value: 'Objetos Perdidos', label: 'Objetos Perdidos' },
    { value: 'Seguridad Pública', label: 'Seguridad Pública' },
    { value: 'Anuncios Comunitarios', label: 'Anuncios Comunitarios' },
    { value: 'Otros', label: 'Otros' },
    { value: 'Plomería', label: 'Plomería' },
    { value: 'Electricidad', label: 'Electricidad' },
    { value: 'Albañilería', label: 'Albañilería' },
    { value: 'Pintura', label: 'Pintura' },
    { value: 'Belleza y Uñas', label: 'Belleza y Uñas' },
    { value: 'Reparaciones', label: 'Reparaciones' },
    { value: 'Limpieza', label: 'Limpieza' },
    { value: 'Jardinería', label: 'Jardinería' },
    { value: 'Clases y Tutorías', label: 'Clases y Tutorías' },
    { value: 'Fletes y Mudanzas', label: 'Fletes y Mudanzas' },
    { value: 'Otros Servicios', label: 'Otros Servicios' },
    { value: 'Empleos', label: 'Empleos' },
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
    seeAll: 'Ver todo el mundo',
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
    emailAlreadyRegistered: 'Este correo ya tiene una cuenta registrada. ¿Olvidaste tu contraseña?',
    createAccount: 'Crear Cuenta',
    joinTagline: 'Únete a Ventas Tecate',
    displayName: 'Nombre',
    confirmPassword: 'Confirmar Contraseña',
    passwordHint: 'Mínimo 8 caracteres',
    passwordMismatch: 'Las contraseñas no coinciden',
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
    orContinueWith: 'O continúa con',
    continueWithGoogle: 'Continuar con Google',
  },
  footer: {
    allRightsReserved: 'Todos los derechos reservados.',
    termsOfService: 'Términos de Servicio',
    privacyPolicy: 'Política de Privacidad',
  },
  forms: {
    createNewListing: 'Crear Nuevo Anuncio',
    editListing: 'Editar Anuncio',
    myListings: 'Mis Anuncios',
    editProfile: 'Editar Perfil',
    createStoreTitle: 'Crear Tienda',
    storeTypeTitle: 'Tipo de Tienda',
    publishingAs: 'Publicando como',
    fillProductInfo: 'Completa la información de tu producto',
    modifyInfo: 'Modifica la información de tu publicación',
    whatWillYouSell: '¿Qué tipo de productos venderás?',
    updatePersonalInfo: 'Actualiza tu información personal',
    step1: '1. Tipo de tienda',
    step2: '2. Detalles',
    listingTypeLabel: 'Tipo de publicación',
    typeProductLabel: 'Producto',
    typeProductDesc: 'Vende un artículo',
    typeServiceLabel: 'Servicio',
    typeServiceDesc: 'Ofrece un servicio',
    typeEventLabel: 'Evento',
    typeEventDesc: 'Publica un evento',
    typeNewsLabel: 'Noticias',
    typeNewsDesc: 'Noticias o avisos',
    titleLabel: 'Título *',
    headlineLabel: 'Titular / Título *',
    titlePlaceholderProduct: 'Ej: iPhone 13 Pro Max',
    titlePlaceholderService: 'Ej: Se pintan Casas',
    titlePlaceholderEvent: 'Ej: Gran Bazar Navideño',
    titlePlaceholderNews: 'Ej: Se busca perro perdido en el centro',
    noImageTip: 'Si no agregas imágenes, el título se mostrará como portada de tu anuncio',
    descriptionLabel: 'Descripción *',
    reportBodyLabel: 'Cuerpo del reporte / aviso *',
    descriptionPlaceholder: 'Describe tu producto...',
    reportPlaceholder: 'Describe lo que ocurrió con todos los detalles relevantes...',
    categoryLabel: 'Categoría *',
    selectCategoryPlaceholder: 'Selecciona una categoría',
    priceLabel: 'Precio (MXN)',
    priceConsultCheckbox: 'Precio a consultar',
    consultPricePlaceholder: 'A consultar',
    neighborhoodLabel: 'Colonia / Barrio',
    neighborhoodPlaceholder: 'Ej: Centro, La Rumorosa, Col. Libertad',
    imagesLabel: 'Imágenes (Máximo 5)',
    imagesOptional: '— Opcional',
    imagesNewsTip: '— Agrega fotos del evento si las tienes',
    maxImagesError: 'Máximo 5 imágenes permitidas',
    statusLabel: 'Estado',
    statusActive: 'Activo',
    statusSold: 'Vendido',
    currentImages: 'Imágenes actuales',
    noImages: 'Sin imágenes',
    addImages: 'Agregar imágenes',
    profilePhoto: 'Foto de Perfil',
    changePhoto: 'Cambiar foto',
    usernameLabel: 'Nombre de Usuario',
    usernameCannotChange: 'El nombre de usuario no se puede cambiar',
    displayNameLabel: 'Nombre para Mostrar *',
    bioLabel: 'Biografía',
    bioPlaceholder: 'Cuéntanos sobre ti...',
    profileUpdated: '¡Perfil actualizado exitosamente! Redirigiendo...',
    storeLogo: 'Logo de la Tienda',
    uploadLogo: 'Subir logo',
    storeNameLabel: 'Nombre de la Tienda *',
    storeNamePlaceholder: 'Ej: Tienda Lupita',
    storeUrlLabel: 'URL de la Tienda *',
    storeSlugHint: 'Solo letras minúsculas, números y guiones. Mínimo 3 caracteres.',
    storeDescLabel: 'Descripción',
    storeDescPlaceholder: 'Describe tu tienda...',
    storeLocationLabel: 'Ubicación',
    storeLocationPlaceholder: 'Ej: Centro de Tecate',
    storeTypeGeneralLabel: 'General',
    storeTypeGeneralDesc: 'Vende todo tipo de productos: ropa, electrónica, muebles, etc.',
    storeTypeRealEstateLabel: 'Inmuebles',
    storeTypeRealEstateDesc: 'Venta y renta de casas, departamentos, terrenos y locales.',
    storeTypeAutomotiveLabel: 'Automotriz',
    storeTypeAutomotiveDesc: 'Venta de autos, camionetas y vehículos.',
    storeDetails: 'Completa los detalles de tu tienda',
    createNewListingBtn: 'Crear Nuevo Anuncio',
    createFirstListingBtn: 'Crear tu primer anuncio',
    activeTab: 'Activos',
    soldTab: 'Vendidos',
    inactiveTab: 'Inactivos',
    noActiveListings: 'No tienes anuncios activos',
    noSoldListings: 'No tienes anuncios vendidos',
    noInactiveListings: 'No tienes anuncios inactivos',
    cityAndState: 'Ciudad y Estado',
    detecting: 'Detectando...',
    locationDetected: 'Ubicación detectada',
    getMyLocation: 'Obtener mi ubicación',
    geoNotSupported: 'Tu navegador no soporta geolocalización',
    locationDetectFail: 'No se pudo detectar tu ubicación',
    locationPermissionDenied: 'Activa el permiso de ubicación en tu navegador',
    cityLabel: 'Ciudad',
    cityFormPlaceholder: 'Ej: Tecate',
    stateLabel: 'Estado / Provincia / Región',
    statePlaceholder: 'Ej: Baja California',
    continue: 'Continuar',
    back: 'Atrás',
    cancel: 'Cancelar',
    publishListing: 'Publicar Anuncio',
    saveChanges: 'Guardar Cambios',
    createStoreBtn: 'Crear Tienda',
    creating: 'Creando...',
    saving: 'Guardando...',
    loadingListing: 'Cargando anuncio...',
    reportTitle: 'Contacto y Reportes',
    reportDesc: '¿Encontraste un problema o tienes una sugerencia? Cuéntanos.',
    reportTypeBug: 'Reportar un problema',
    reportTypeSuggestion: 'Sugerencia',
    reportTypeOther: 'Otro',
    reportTypeLabel: 'Tipo',
    reportDescLabel: 'Descripción *',
    reportDescPlaceholder: 'Describe el problema o tu sugerencia...',
    reportEmailLabel: 'Email para seguimiento (opcional)',
    reportSubmitting: 'Enviando...',
    reportSubmit: 'Enviar Reporte',
    reportThankYou: '¡Gracias por tu reporte!',
    reportReceived: 'Hemos recibido tu mensaje y lo revisaremos pronto.',
    reportSendAnother: 'Enviar otro reporte',
    messagesTitle: 'Mensajes',
    conversationsTitle: 'Conversaciones',
    noConversations: 'No tienes conversaciones',
    selectConversation: 'Selecciona una conversación para comenzar',
    messagePlaceholder: 'Escribe un mensaje...',
    sendMessage: 'Enviar',
    loadingMessages: 'Cargando mensajes...',
  },
}

const tl: Translations = {
  lang: 'tl',
  nav: {
    home: 'Home',
    myListings: 'My Listings',
    messages: 'Messages',
    publish: 'Mag-post',
    login: 'Log In',
    register: 'Sign Up',
    logout: 'Log Out',
    settings: 'Settings',
    myProfile: 'My Profile',
    reportProblem: 'I-report ang problema',
    storeMode: 'Store mode',
    publishAs: 'Post as myself',
    createStore: '+ Gumawa ng Store',
  },
  search: {
    placeholder: 'Maghanap ng produkto, serbisyo...',
    filters: 'Filters',
    applyFilters: 'I-apply ang Filters',
    clear: 'I-clear',
    clearAll: 'I-clear lahat',
    category: 'Kategorya',
    allCategories: 'Lahat ng Kategorya',
    location: 'Lokasyon',
    allLocations: 'Lahat ng Lokasyon',
    nearMe: 'Malapit sa akin',
    useMyLocation: 'Gamitin ang aking lokasyon',
    price: 'Presyo (PHP)',
    state: 'Province / Region',
    city: 'City',
    sortBy: 'Sort by',
    newest: 'Pinaka-bago',
    priceLowHigh: 'Presyo: mababa hanggang mataas',
    priceHighLow: 'Presyo: mataas hanggang mababa',
    stateRegionPlaceholder: 'e.g. Baja California',
    cityPlaceholder: 'e.g. Tecate, Jakarta, Manila',
    locationPlaceholder: 'City, lugar, region...',
    minPrice: 'Min',
    maxPrice: 'Max',
    keywords: 'Keywords...',
  },
  hero: {
    tagline: 'Discover, Connect at Mag-sell sa',
    taglineBase: 'Discover, Connect at Mag-sell',
    searchPlaceholder: 'Ano ang hinahanap mo?',
    search: 'Search',
  },
  categories: [
    { value: 'Electrónica', label: 'Electronics' },
    { value: 'Muebles', label: 'Furniture' },
    { value: 'Vehículos', label: 'Sasakyan' },
    { value: 'Ropa', label: 'Damit' },
    { value: 'Deportes', label: 'Sports' },
    { value: 'Hogar', label: 'Home & Garden' },
    { value: 'Juguetes', label: 'Laruan' },
    { value: 'Libros', label: 'Books' },
    { value: 'Mascotas', label: 'Pets' },
    { value: 'Servicios', label: 'Services' },
    { value: 'Eventos', label: 'Events' },
    { value: 'Noticias Locales', label: 'Local News' },
    { value: 'Objetos Perdidos', label: 'Lost & Found' },
    { value: 'Seguridad Pública', label: 'Public Safety' },
    { value: 'Anuncios Comunitarios', label: 'Community' },
    { value: 'Otros', label: 'Iba pa' },
    { value: 'Plomería', label: 'Plumbing' },
    { value: 'Electricidad', label: 'Electrical' },
    { value: 'Albañilería', label: 'Construction' },
    { value: 'Pintura', label: 'Painting' },
    { value: 'Belleza y Uñas', label: 'Beauty & Nails' },
    { value: 'Reparaciones', label: 'Repairs' },
    { value: 'Limpieza', label: 'Cleaning' },
    { value: 'Jardinería', label: 'Gardening' },
    { value: 'Clases y Tutorías', label: 'Classes & Tutoring' },
    { value: 'Fletes y Mudanzas', label: 'Lipat-bahay' },
    { value: 'Otros Servicios', label: 'Other Services' },
    { value: 'Empleos', label: 'Jobs' },
  ],
  listings: {
    recent: 'Mga Bagong Listing',
    worldwide: 'Listings sa Buong Mundo',
    noListings: 'Wala pang listings.',
    noListingsInRegion: 'Wala pang listings sa iyong lugar.',
    seeWorldwide: 'Tingnan ang listings sa buong mundo →',
    postListing: 'Mag-post ng listing',
    results: 'results',
    result: 'result',
    noResults: 'Walang nakitang results',
    searchWorldwide: 'Maghanap sa buong mundo →',
    onlyIn: 'Sa',
    seeAll: 'See the whole world',
    in: 'sa',
  },
  auth: {
    loginTitle: 'Log In',
    loginWelcome: 'Welcome sa Ventas Tecate',
    forgotPassword: 'Nakalimutan ang password?',
    loggingIn: 'Naglo-log in...',
    noAccount: 'Wala kang account?',
    signUpLink: 'Sign up',
    emailNotConfirmed: 'I-confirm muna ang email mo bago mag-log in. I-check ang inbox mo.',
    emailAlreadyRegistered: 'May account na ang email na \'to. Nakalimutan ang password?',
    createAccount: 'Gumawa ng Account',
    joinTagline: 'Sumali sa Ventas Tecate',
    displayName: 'Pangalan',
    confirmPassword: 'Confirm Password',
    passwordHint: 'Minimum 8 characters',
    passwordMismatch: 'Hindi magkatugma ang mga password',
    iAccept: 'Agree ako sa',
    termsOfService: 'Terms of Service',
    and: 'at',
    privacyPolicy: 'Privacy Policy',
    creating: 'Ginagawa ang account...',
    checkEmail: 'I-check ang email mo!',
    accountCreated: 'Account created na!',
    checkEmailHint: 'I-check ang email mo at i-click ang confirmation link para ma-activate ang account mo.',
    spamHint: 'Baka medyo matagal. I-check din ang spam folder kung wala sa inbox.',
    alreadyHaveAccount: 'May account ka na?',
    signInLink: 'Log in',
    recoverPassword: 'Reset Password',
    recoverDescription: 'Ilagay ang email mo at magpapadala kami ng reset link.',
    emailSent: 'Naipadala na ang email!',
    emailSentDescription: 'I-check ang inbox mo sa {email} at sundan ang link para ma-reset ang password mo.',
    backToLogin: 'Bumalik sa Log In',
    sending: 'Nagpapadala...',
    sendLink: 'Send Link',
    email: 'Email',
    password: 'Password',
    loading: 'Loading...',
    orContinueWith: 'O mag-continue sa',
    continueWithGoogle: 'Continue with Google',
  },
  footer: {
    allRightsReserved: 'All rights reserved.',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
  },
  forms: {
    createNewListing: 'Gumawa ng Bagong Listing',
    editListing: 'I-edit ang Listing',
    myListings: 'My Listings',
    editProfile: 'I-edit ang Profile',
    createStoreTitle: 'Gumawa ng Store',
    storeTypeTitle: 'Type ng Store',
    publishingAs: 'Nagpo-post bilang',
    fillProductInfo: 'Kumpletuhin ang details ng iyong produkto',
    modifyInfo: 'I-edit ang details ng iyong post',
    whatWillYouSell: 'Anong uri ng listing ang gusto mong i-post?',
    updatePersonalInfo: 'I-update ang iyong personal info',
    step1: '1. Type ng store',
    step2: '2. Details',
    listingTypeLabel: 'Type ng post',
    typeProductLabel: 'Produkto',
    typeProductDesc: 'Magbenta ng isang bagay',
    typeServiceLabel: 'Serbisyo',
    typeServiceDesc: 'Mag-offer ng serbisyo',
    typeEventLabel: 'Event',
    typeEventDesc: 'Mag-post ng event',
    typeNewsLabel: 'Balita',
    typeNewsDesc: 'Balita o announcement',
    titleLabel: 'Title *',
    headlineLabel: 'Headline / Title *',
    titlePlaceholderProduct: 'e.g. iPhone 13 Pro Max',
    titlePlaceholderService: 'e.g. Nagpipinta ng Bahay',
    titlePlaceholderEvent: 'e.g. Pasko Bazaar',
    titlePlaceholderNews: 'e.g. Nawawalang aso sa sentro',
    noImageTip: 'Kung walang larawan, ang title ang gagamitin bilang cover ng iyong listing',
    descriptionLabel: 'Description *',
    reportBodyLabel: 'Details ng ulat / abiso *',
    descriptionPlaceholder: 'I-describe ang iyong produkto...',
    reportPlaceholder: 'I-describe ang nangyari kasama ang lahat ng importanteng details...',
    categoryLabel: 'Kategorya *',
    selectCategoryPlaceholder: 'Pumili ng kategorya',
    priceLabel: 'Presyo (PHP)',
    priceConsultCheckbox: 'Presyo sa usapan',
    consultPricePlaceholder: 'Sa usapan',
    neighborhoodLabel: 'Barangay / Lugar',
    neighborhoodPlaceholder: 'e.g. Sentro, Poblacion',
    imagesLabel: 'Mga Larawan (Max 5)',
    imagesOptional: '— Optional',
    imagesNewsTip: '— Magdagdag ng larawan kung mayroon ka',
    maxImagesError: 'Maximum 5 larawan lang',
    statusLabel: 'Status',
    statusActive: 'Active',
    statusSold: 'Nabenta',
    currentImages: 'Mga current na larawan',
    noImages: 'Walang larawan',
    addImages: 'Magdagdag ng larawan',
    profilePhoto: 'Profile Photo',
    changePhoto: 'Palitan ang larawan',
    usernameLabel: 'Username',
    usernameCannotChange: 'Hindi na mababago ang username',
    displayNameLabel: 'Display Name *',
    bioLabel: 'Bio',
    bioPlaceholder: 'Ikuwento mo ang tungkol sa iyo...',
    profileUpdated: 'Na-update na ang profile! Nire-redirect...',
    storeLogo: 'Store Logo',
    uploadLogo: 'Mag-upload ng logo',
    storeNameLabel: 'Pangalan ng Store *',
    storeNamePlaceholder: 'e.g. Tindahan ni Juan',
    storeUrlLabel: 'Store URL *',
    storeSlugHint: 'Lowercase letters, numbers, at dash lang. Minimum 3 characters.',
    storeDescLabel: 'Description',
    storeDescPlaceholder: 'I-describe ang iyong store...',
    storeLocationLabel: 'Lokasyon',
    storeLocationPlaceholder: 'e.g. Sentro ng Tecate',
    storeTypeGeneralLabel: 'General',
    storeTypeGeneralDesc: 'Magbenta ng lahat ng uri ng produkto: damit, electronics, furniture, atbp.',
    storeTypeRealEstateLabel: 'Real Estate',
    storeTypeRealEstateDesc: 'Pagbebenta at paupahan ng mga bahay, apartment, lupa, at commercial space.',
    storeTypeAutomotiveLabel: 'Sasakyan',
    storeTypeAutomotiveDesc: 'Pagbebenta ng mga kotse, trak, at sasakyan.',
    storeDetails: 'Kumpletuhin ang details ng iyong store',
    createNewListingBtn: 'Gumawa ng Bagong Listing',
    createFirstListingBtn: 'Gumawa ng unang listing mo',
    activeTab: 'Active',
    soldTab: 'Nabenta',
    inactiveTab: 'Inactive',
    noActiveListings: 'Wala kang active na listings',
    noSoldListings: 'Wala kang nabentang listings',
    noInactiveListings: 'Wala kang inactive na listings',
    cityAndState: 'City at Province',
    detecting: 'Dine-detect...',
    locationDetected: 'Na-detect ang location',
    getMyLocation: 'Kunin ang aking location',
    geoNotSupported: 'Hindi supported ang geolocation sa browser mo',
    locationDetectFail: 'Hindi ma-detect ang location mo',
    locationPermissionDenied: 'I-enable ang location permission sa browser mo',
    cityLabel: 'City',
    cityFormPlaceholder: 'e.g. Manila',
    stateLabel: 'Province / Region',
    statePlaceholder: 'e.g. Metro Manila',
    continue: 'Continue',
    back: 'Bumalik',
    cancel: 'Cancel',
    publishListing: 'I-post ang Listing',
    saveChanges: 'I-save ang Changes',
    createStoreBtn: 'Gumawa ng Store',
    creating: 'Ginagawa...',
    saving: 'Sine-save...',
    loadingListing: 'Loading listing...',
    reportTitle: 'Contact & Mag-report',
    reportDesc: 'May nakitang problema o may suggestion ka? Sabihin mo sa amin.',
    reportTypeBug: 'Mag-report ng bug',
    reportTypeSuggestion: 'Suggestion',
    reportTypeOther: 'Iba pa',
    reportTypeLabel: 'Type',
    reportDescLabel: 'Description *',
    reportDescPlaceholder: 'I-describe ang problema o suggestion mo...',
    reportEmailLabel: 'Email para sa follow-up (optional)',
    reportSubmitting: 'Nagpapadala...',
    reportSubmit: 'Ipadala',
    reportThankYou: 'Salamat sa iyong report!',
    reportReceived: 'Natanggap na namin! We\'ll get back to you as soon as possible.',
    reportSendAnother: 'Mag-send ng isa pa',
    messagesTitle: 'Messages',
    conversationsTitle: 'Conversations',
    noConversations: 'Wala kang conversations',
    selectConversation: 'Pumili ng conversation para magsimula',
    messagePlaceholder: 'Mag-type ng mensahe...',
    sendMessage: 'Send',
    loadingMessages: 'Loading messages...',
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
    placeholder: 'Search products, services...',
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
    price: 'Price (USD)',
    state: 'State / Region',
    city: 'City',
    sortBy: 'Sort by',
    newest: 'Newest',
    priceLowHigh: 'Price: low to high',
    priceHighLow: 'Price: high to low',
    stateRegionPlaceholder: 'e.g. Baja California',
    cityPlaceholder: 'e.g. Tecate, San Diego, Tijuana',
    locationPlaceholder: 'City, neighborhood, region...',
    minPrice: 'Min',
    maxPrice: 'Max',
    keywords: 'Keywords...',
  },
  hero: {
    tagline: 'Discover, Connect & Exchange in',
    taglineBase: 'Discover, Connect & Exchange',
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
    { value: 'Noticias Locales', label: 'Local News' },
    { value: 'Objetos Perdidos', label: 'Lost & Found' },
    { value: 'Seguridad Pública', label: 'Public Safety' },
    { value: 'Anuncios Comunitarios', label: 'Community Announcements' },
    { value: 'Otros', label: 'Other' },
    { value: 'Plomería', label: 'Plumbing' },
    { value: 'Electricidad', label: 'Electrical' },
    { value: 'Albañilería', label: 'Construction' },
    { value: 'Pintura', label: 'Painting' },
    { value: 'Belleza y Uñas', label: 'Beauty & Nails' },
    { value: 'Reparaciones', label: 'Repairs' },
    { value: 'Limpieza', label: 'Cleaning' },
    { value: 'Jardinería', label: 'Gardening' },
    { value: 'Clases y Tutorías', label: 'Classes & Tutoring' },
    { value: 'Fletes y Mudanzas', label: 'Moving Services' },
    { value: 'Otros Servicios', label: 'Other Services' },
    { value: 'Empleos', label: 'Jobs' },
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
    seeAll: 'See worldwide',
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
    emailAlreadyRegistered: 'An account with this email already exists. Forgot your password?',
    createAccount: 'Create Account',
    joinTagline: 'Join Ventas Tecate',
    displayName: 'Name',
    confirmPassword: 'Confirm Password',
    passwordHint: 'Minimum 8 characters',
    passwordMismatch: 'Passwords do not match',
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
    orContinueWith: 'Or continue with',
    continueWithGoogle: 'Continue with Google',
  },
  footer: {
    allRightsReserved: 'All rights reserved.',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
  },
  forms: {
    createNewListing: 'Create New Listing',
    editListing: 'Edit Listing',
    myListings: 'My Listings',
    editProfile: 'Edit Profile',
    createStoreTitle: 'Create Store',
    storeTypeTitle: 'Store Type',
    publishingAs: 'Publishing as',
    fillProductInfo: 'Fill in your product details',
    modifyInfo: 'Update your listing information',
    whatWillYouSell: 'What type of products will you sell?',
    updatePersonalInfo: 'Update your personal information',
    step1: '1. Store type',
    step2: '2. Details',
    listingTypeLabel: 'Listing type',
    typeProductLabel: 'Product',
    typeProductDesc: 'Sell an item',
    typeServiceLabel: 'Service',
    typeServiceDesc: 'Offer a service',
    typeEventLabel: 'Event',
    typeEventDesc: 'Post an event',
    typeNewsLabel: 'News',
    typeNewsDesc: 'News or announcements',
    titleLabel: 'Title *',
    headlineLabel: 'Headline / Title *',
    titlePlaceholderProduct: 'e.g. iPhone 13 Pro Max',
    titlePlaceholderService: 'e.g. House Painting Services',
    titlePlaceholderEvent: 'e.g. Christmas Bazaar',
    titlePlaceholderNews: 'e.g. Lost dog near downtown',
    noImageTip: 'If no images are added, the title will be used as your listing cover',
    descriptionLabel: 'Description *',
    reportBodyLabel: 'Report / announcement body *',
    descriptionPlaceholder: 'Describe your product...',
    reportPlaceholder: 'Describe what happened with all relevant details...',
    categoryLabel: 'Category *',
    selectCategoryPlaceholder: 'Select a category',
    priceLabel: 'Price (USD)',
    priceConsultCheckbox: 'Price on request',
    consultPricePlaceholder: 'On request',
    neighborhoodLabel: 'Neighborhood / Area',
    neighborhoodPlaceholder: 'e.g. Downtown, Eastside',
    imagesLabel: 'Images (Max 5)',
    imagesOptional: '— Optional',
    imagesNewsTip: '— Add event photos if you have them',
    maxImagesError: 'Maximum 5 images allowed',
    statusLabel: 'Status',
    statusActive: 'Active',
    statusSold: 'Sold',
    currentImages: 'Current images',
    noImages: 'No images',
    addImages: 'Add images',
    profilePhoto: 'Profile Photo',
    changePhoto: 'Change photo',
    usernameLabel: 'Username',
    usernameCannotChange: 'Username cannot be changed',
    displayNameLabel: 'Display Name *',
    bioLabel: 'Bio',
    bioPlaceholder: 'Tell us about yourself...',
    profileUpdated: 'Profile updated successfully! Redirecting...',
    storeLogo: 'Store Logo',
    uploadLogo: 'Upload logo',
    storeNameLabel: 'Store Name *',
    storeNamePlaceholder: "e.g. Lupita's Store",
    storeUrlLabel: 'Store URL *',
    storeSlugHint: 'Lowercase letters, numbers, and dashes only. Minimum 3 characters.',
    storeDescLabel: 'Description',
    storeDescPlaceholder: 'Describe your store...',
    storeLocationLabel: 'Location',
    storeLocationPlaceholder: 'e.g. Downtown Tecate',
    storeTypeGeneralLabel: 'General',
    storeTypeGeneralDesc: 'Sell all types of products: clothing, electronics, furniture, etc.',
    storeTypeRealEstateLabel: 'Real Estate',
    storeTypeRealEstateDesc: 'Sale and rental of houses, apartments, land, and commercial spaces.',
    storeTypeAutomotiveLabel: 'Automotive',
    storeTypeAutomotiveDesc: 'Sale of cars, trucks, and vehicles.',
    storeDetails: 'Complete your store details',
    createNewListingBtn: 'Create New Listing',
    createFirstListingBtn: 'Create your first listing',
    activeTab: 'Active',
    soldTab: 'Sold',
    inactiveTab: 'Inactive',
    noActiveListings: 'You have no active listings',
    noSoldListings: 'You have no sold listings',
    noInactiveListings: 'You have no inactive listings',
    cityAndState: 'City & State',
    detecting: 'Detecting...',
    locationDetected: 'Location detected',
    getMyLocation: 'Get my location',
    geoNotSupported: 'Your browser does not support geolocation',
    locationDetectFail: 'Could not detect your location',
    locationPermissionDenied: 'Enable location permission in your browser',
    cityLabel: 'City',
    cityFormPlaceholder: 'e.g. Tecate',
    stateLabel: 'State / Province / Region',
    statePlaceholder: 'e.g. Baja California',
    continue: 'Continue',
    back: 'Back',
    cancel: 'Cancel',
    publishListing: 'Publish Listing',
    saveChanges: 'Save Changes',
    createStoreBtn: 'Create Store',
    creating: 'Creating...',
    saving: 'Saving...',
    loadingListing: 'Loading listing...',
    reportTitle: 'Contact & Reports',
    reportDesc: 'Found a problem or have a suggestion? Let us know.',
    reportTypeBug: 'Report a problem',
    reportTypeSuggestion: 'Suggestion',
    reportTypeOther: 'Other',
    reportTypeLabel: 'Type',
    reportDescLabel: 'Description *',
    reportDescPlaceholder: 'Describe the problem or your suggestion...',
    reportEmailLabel: 'Email for follow-up (optional)',
    reportSubmitting: 'Sending...',
    reportSubmit: 'Send Report',
    reportThankYou: 'Thank you for your report!',
    reportReceived: 'We have received your message and will review it soon.',
    reportSendAnother: 'Send another report',
    messagesTitle: 'Messages',
    conversationsTitle: 'Conversations',
    noConversations: 'You have no conversations',
    selectConversation: 'Select a conversation to start',
    messagePlaceholder: 'Write a message...',
    sendMessage: 'Send',
    loadingMessages: 'Loading messages...',
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
    placeholder: 'Cari produk, jasa...',
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
    price: 'Harga (IDR)',
    state: 'Provinsi / Wilayah',
    city: 'Kota',
    sortBy: 'Urutkan',
    newest: 'Terbaru',
    priceLowHigh: 'Harga: rendah ke tinggi',
    priceHighLow: 'Harga: tinggi ke rendah',
    stateRegionPlaceholder: 'Cth: Baja California',
    cityPlaceholder: 'Cth: Tecate, Jakarta, Surabaya',
    locationPlaceholder: 'Kota, kelurahan, wilayah...',
    minPrice: 'Minimum',
    maxPrice: 'Maksimum',
    keywords: 'Kata kunci...',
  },
  hero: {
    tagline: 'Temukan, Terhubung & Berbagi di',
    taglineBase: 'Temukan, Terhubung & Berbagi',
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
    { value: 'Noticias Locales', label: 'Berita Lokal' },
    { value: 'Objetos Perdidos', label: 'Barang Hilang' },
    { value: 'Seguridad Pública', label: 'Keamanan Publik' },
    { value: 'Anuncios Comunitarios', label: 'Pengumuman Komunitas' },
    { value: 'Otros', label: 'Lainnya' },
    { value: 'Plomería', label: 'Plumbing' },
    { value: 'Electricidad', label: 'Listrik' },
    { value: 'Albañilería', label: 'Konstruksi' },
    { value: 'Pintura', label: 'Cat' },
    { value: 'Belleza y Uñas', label: 'Kecantikan' },
    { value: 'Reparaciones', label: 'Perbaikan' },
    { value: 'Limpieza', label: 'Kebersihan' },
    { value: 'Jardinería', label: 'Berkebun' },
    { value: 'Clases y Tutorías', label: 'Kursus & Tutoring' },
    { value: 'Fletes y Mudanzas', label: 'Jasa Pindahan' },
    { value: 'Otros Servicios', label: 'Jasa Lainnya' },
    { value: 'Empleos', label: 'Pekerjaan' },
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
    seeAll: 'Lihat seluruh dunia',
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
    emailAlreadyRegistered: 'Email ini sudah terdaftar. Lupa kata sandi?',
    createAccount: 'Buat Akun',
    joinTagline: 'Bergabung dengan Ventas Tecate',
    displayName: 'Nama',
    confirmPassword: 'Konfirmasi Kata Sandi',
    passwordHint: 'Minimal 8 karakter',
    passwordMismatch: 'Kata sandi tidak cocok',
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
    orContinueWith: 'Atau lanjutkan dengan',
    continueWithGoogle: 'Lanjutkan dengan Google',
  },
  footer: {
    allRightsReserved: 'Hak cipta dilindungi.',
    termsOfService: 'Syarat Layanan',
    privacyPolicy: 'Kebijakan Privasi',
  },
  forms: {
    createNewListing: 'Buat Iklan Baru',
    editListing: 'Edit Iklan',
    myListings: 'Iklan Saya',
    editProfile: 'Edit Profil',
    createStoreTitle: 'Buat Toko',
    storeTypeTitle: 'Jenis Toko',
    publishingAs: 'Memposting sebagai',
    fillProductInfo: 'Lengkapi informasi produk kamu',
    modifyInfo: 'Ubah informasi iklan kamu',
    whatWillYouSell: 'Jenis produk apa yang akan kamu jual?',
    updatePersonalInfo: 'Perbarui informasi pribadi kamu',
    step1: '1. Jenis toko',
    step2: '2. Detail',
    listingTypeLabel: 'Jenis iklan',
    typeProductLabel: 'Produk',
    typeProductDesc: 'Jual sebuah barang',
    typeServiceLabel: 'Jasa',
    typeServiceDesc: 'Tawarkan jasa',
    typeEventLabel: 'Acara',
    typeEventDesc: 'Pasang iklan acara',
    typeNewsLabel: 'Berita',
    typeNewsDesc: 'Berita atau pengumuman',
    titleLabel: 'Judul *',
    headlineLabel: 'Judul Berita *',
    titlePlaceholderProduct: 'Cth: iPhone 13 Pro Max',
    titlePlaceholderService: 'Cth: Jasa Cat Rumah',
    titlePlaceholderEvent: 'Cth: Bazar Natal',
    titlePlaceholderNews: 'Cth: Anjing hilang di pusat kota',
    noImageTip: 'Jika tidak ada gambar, judul akan ditampilkan sebagai sampul iklan kamu',
    descriptionLabel: 'Deskripsi *',
    reportBodyLabel: 'Isi laporan / pengumuman *',
    descriptionPlaceholder: 'Deskripsikan produk kamu...',
    reportPlaceholder: 'Ceritakan apa yang terjadi dengan semua detail yang relevan...',
    categoryLabel: 'Kategori *',
    selectCategoryPlaceholder: 'Pilih kategori',
    priceLabel: 'Harga (IDR)',
    priceConsultCheckbox: 'Harga nego',
    consultPricePlaceholder: 'Nego',
    neighborhoodLabel: 'Kelurahan / Kawasan',
    neighborhoodPlaceholder: 'Cth: Pusat Kota, Kec. Gambir',
    imagesLabel: 'Gambar (Maksimal 5)',
    imagesOptional: '— Opsional',
    imagesNewsTip: '— Tambahkan foto acara jika ada',
    maxImagesError: 'Maksimal 5 gambar diizinkan',
    statusLabel: 'Status',
    statusActive: 'Aktif',
    statusSold: 'Terjual',
    currentImages: 'Gambar saat ini',
    noImages: 'Tidak ada gambar',
    addImages: 'Tambah gambar',
    profilePhoto: 'Foto Profil',
    changePhoto: 'Ganti foto',
    usernameLabel: 'Nama Pengguna',
    usernameCannotChange: 'Nama pengguna tidak bisa diubah',
    displayNameLabel: 'Nama Tampilan *',
    bioLabel: 'Bio',
    bioPlaceholder: 'Ceritakan tentang diri kamu...',
    profileUpdated: 'Profil berhasil diperbarui! Mengalihkan...',
    storeLogo: 'Logo Toko',
    uploadLogo: 'Unggah logo',
    storeNameLabel: 'Nama Toko *',
    storeNamePlaceholder: 'Cth: Toko Lupita',
    storeUrlLabel: 'URL Toko *',
    storeSlugHint: 'Hanya huruf kecil, angka, dan tanda hubung. Minimal 3 karakter.',
    storeDescLabel: 'Deskripsi',
    storeDescPlaceholder: 'Ceritakan tentang toko kamu...',
    storeLocationLabel: 'Lokasi',
    storeLocationPlaceholder: 'Cth: Pusat Kota Tecate',
    storeTypeGeneralLabel: 'Umum',
    storeTypeGeneralDesc: 'Jual semua jenis produk: pakaian, elektronik, furnitur, dll.',
    storeTypeRealEstateLabel: 'Properti',
    storeTypeRealEstateDesc: 'Jual dan sewa rumah, apartemen, tanah, dan ruang komersial.',
    storeTypeAutomotiveLabel: 'Otomotif',
    storeTypeAutomotiveDesc: 'Jual mobil, truk, dan kendaraan.',
    storeDetails: 'Lengkapi detail toko kamu',
    createNewListingBtn: 'Buat Iklan Baru',
    createFirstListingBtn: 'Buat iklan pertama kamu',
    activeTab: 'Aktif',
    soldTab: 'Terjual',
    inactiveTab: 'Tidak Aktif',
    noActiveListings: 'Kamu tidak punya iklan aktif',
    noSoldListings: 'Kamu tidak punya iklan terjual',
    noInactiveListings: 'Kamu tidak punya iklan tidak aktif',
    cityAndState: 'Kota & Provinsi',
    detecting: 'Mendeteksi...',
    locationDetected: 'Lokasi terdeteksi',
    getMyLocation: 'Dapatkan lokasi saya',
    geoNotSupported: 'Browser kamu tidak mendukung geolokasi',
    locationDetectFail: 'Tidak bisa mendeteksi lokasi kamu',
    locationPermissionDenied: 'Aktifkan izin lokasi di browser kamu',
    cityLabel: 'Kota',
    cityFormPlaceholder: 'Cth: Jakarta',
    stateLabel: 'Provinsi / Wilayah',
    statePlaceholder: 'Cth: DKI Jakarta',
    continue: 'Lanjutkan',
    back: 'Kembali',
    cancel: 'Batal',
    publishListing: 'Pasang Iklan',
    saveChanges: 'Simpan Perubahan',
    createStoreBtn: 'Buat Toko',
    creating: 'Membuat...',
    saving: 'Menyimpan...',
    loadingListing: 'Memuat iklan...',
    reportTitle: 'Kontak & Laporan',
    reportDesc: 'Menemukan masalah atau punya saran? Beritahu kami.',
    reportTypeBug: 'Laporkan masalah',
    reportTypeSuggestion: 'Saran',
    reportTypeOther: 'Lainnya',
    reportTypeLabel: 'Jenis',
    reportDescLabel: 'Deskripsi *',
    reportDescPlaceholder: 'Ceritakan masalah atau saran kamu...',
    reportEmailLabel: 'Email untuk tindak lanjut (opsional)',
    reportSubmitting: 'Mengirim...',
    reportSubmit: 'Kirim Laporan',
    reportThankYou: 'Terima kasih atas laporan kamu!',
    reportReceived: 'Kami telah menerima pesanmu dan akan segera meninjaunya.',
    reportSendAnother: 'Kirim laporan lain',
    messagesTitle: 'Pesan',
    conversationsTitle: 'Percakapan',
    noConversations: 'Kamu tidak punya percakapan',
    selectConversation: 'Pilih percakapan untuk memulai',
    messagePlaceholder: 'Tulis pesan...',
    sendMessage: 'Kirim',
    loadingMessages: 'Memuat pesan...',
  },
}

export const translations: Record<Lang, Translations> = { es, tl, en, id }

export function getTranslations(countryCode: string | null): Translations {
  return translations[getLang(countryCode)]
}
