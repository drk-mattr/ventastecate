/**
 * B3 — category suggestion from the title (client-side only, no AI).
 *
 * A plain keyword map: Spanish words people actually type in a title,
 * each pointing at a real category. The caller passes the category list
 * its own Select offers (the posting form keeps its own lists — see
 * app/listings/new/page.tsx), and only a category present in that list
 * can ever be suggested, so the suggestion can never set a value the
 * form doesn't offer.
 *
 * Suggestion only, never forced: the form shows it as a tappable chip
 * and the user can ignore it or pick any other category.
 */

// Ordered by tiebreak priority within a type's list: when a title
// matches keywords in two categories, the earlier entry wins.
const KEYWORD_MAP: Array<{ category: string; keywords: string[] }> = [
  {
    category: 'Vehículos',
    keywords: ['carro', 'auto', 'camioneta', 'moto', 'motocicleta', 'pickup', 'camion', 'vocho', 'tsuru', 'sedan', 'hatchback', 'suv', 'cuatrimoto', 'remolque', 'trailer', 'llanta', 'rin', 'rines', 'motor', 'transmision'],
  },
  {
    category: 'Electrónica',
    keywords: ['iphone', 'celular', 'telefono', 'laptop', 'computadora', 'pc', 'tablet', 'ipad', 'televisor', 'tv', 'pantalla', 'bocina', 'audifonos', 'consola', 'playstation', 'xbox', 'nintendo', 'camara', 'smartwatch', 'reloj inteligente', 'drone', 'impresora', 'teclado', 'mouse', 'monitor'],
  },
  {
    category: 'Muebles',
    keywords: ['mesa', 'silla', 'cama', 'sofa', 'sillon', 'mueble', 'escritorio', 'ropero', 'comoda', 'librero', 'alacena', 'colchon', 'cabecera', 'banco', 'taburete', 'closet', 'vitrina', 'cuna', 'buro'],
  },
  {
    category: 'Ropa',
    keywords: ['camisa', 'pantalon', 'vestido', 'zapatos', 'tenis', 'chamarra', 'sudadera', 'blusa', 'falda', 'gorra', 'sombrero', 'jeans', 'playera', 'traje', 'botas', 'sandalias', 'ropa'],
  },
  {
    category: 'Deportes',
    keywords: ['bicicleta', 'bici', 'balon', 'pelota', 'pesas', 'gimnasio', 'patineta', 'raqueta', 'casco', 'guantes de box', 'kayak', 'cana de pescar'],
  },
  {
    category: 'Hogar',
    keywords: ['refrigerador', 'refri', 'estufa', 'lavadora', 'secadora', 'microondas', 'licuadora', 'aspiradora', 'lampara', 'cortina', 'alfombra', 'espejo', 'plancha', 'ventilador', 'aire acondicionado', 'horno', 'cafetera'],
  },
  {
    category: 'Juguetes',
    keywords: ['juguete', 'muneca', 'lego', 'carrito', 'peluche', 'rompecabezas', 'videojuego', 'triciclo'],
  },
  {
    category: 'Libros',
    keywords: ['libro', 'novela', 'biblia', 'enciclopedia', 'diccionario', 'manual', 'revista', 'comic'],
  },
  {
    category: 'Mascotas',
    keywords: ['perro', 'gato', 'cachorro', 'gatito', 'perrito', 'mascota', 'jaula', 'pecera', 'ave', 'loro', 'conejo', 'hamster', 'acuario', 'croquetas', 'alimento para perro', 'alimento para gato'],
  },
  {
    category: 'Comida',
    keywords: ['taco', 'tacos', 'birria', 'tamal', 'tamales', 'pizza', 'hamburguesa', 'sushi', 'torta', 'menudo', 'pozole', 'cafe', 'churro', 'pan', 'dulce', 'pastel', 'postre', 'comida', 'lonche', 'burrito', 'elote', 'mariscos', 'ceviche', 'barbacoa', 'carnitas'],
  },
  {
    category: 'Casas en Renta',
    keywords: ['casa en renta', 'renta de casa', 'departamento en renta', 'cuarto en renta', 'se renta'],
  },
  {
    category: 'Casas en Venta',
    keywords: ['casa en venta', 'se vende casa', 'departamento en venta', 'casa nueva'],
  },
  {
    category: 'Terrenos',
    keywords: ['terreno', 'lote', 'predio', 'hectarea'],
  },
  {
    category: 'Comida y Catering',
    keywords: ['catering', 'banquete', 'taquiza', 'buffet', 'mesa de dulces', 'comida para eventos'],
  },
  {
    category: 'Plomería',
    keywords: ['plomero', 'plomeria', 'fuga', 'tuberia', 'drenaje', 'llave de paso', 'tinaco', 'boiler', 'inodoro', 'regadera'],
  },
  {
    category: 'Electricidad',
    keywords: ['electricista', 'electricidad', 'cable', 'enchufe', 'foco', 'instalacion electrica', 'breaker', 'apagador', 'tablero electrico'],
  },
  {
    category: 'Albañilería',
    keywords: ['albanil', 'albanileria', 'construccion', 'muro', 'pared', 'cemento', 'losa', 'remodelacion', 'tablaroca', 'piso', 'azulejo'],
  },
  {
    category: 'Pintura',
    keywords: ['pintor', 'pintura', 'pintar', 'impermeabilizante', 'brocha', 'rodillo'],
  },
  {
    category: 'Belleza y Uñas',
    keywords: ['unas', 'manicure', 'pedicure', 'maquillaje', 'peinado', 'peluqueria', 'barberia', 'corte de cabello', 'depilacion', 'pestanas', 'salon de belleza', 'barbero'],
  },
  {
    category: 'Reparaciones',
    keywords: ['reparacion', 'reparar', 'tecnico', 'servicio tecnico', 'arreglo'],
  },
  {
    category: 'Limpieza',
    keywords: ['limpieza', 'limpiar', 'lavanderia', 'planchado', 'empleada domestica', 'aseo', 'fumigacion'],
  },
  {
    category: 'Jardinería',
    keywords: ['jardinero', 'jardineria', 'jardin', 'pasto', 'poda', 'arbol', 'plantas', 'riego'],
  },
  {
    category: 'Clases y Tutorías',
    keywords: ['clases', 'tutoria', 'tutorias', 'ingles', 'matematicas', 'piano', 'guitarra', 'regularizacion', 'curso', 'clases de manejo'],
  },
  {
    category: 'Fletes y Mudanzas',
    keywords: ['flete', 'mudanza', 'mudanzas', 'acarreo', 'carga'],
  },
  {
    category: 'Comida y Bebida',
    keywords: ['taco', 'tacos', 'birria', 'tamales', 'pizza', 'comida', 'bebida', 'cerveza', 'degustacion', 'cata', 'cerveza artesanal', 'festival gastronomico', 'feria de comida', 'food truck', 'vino'],
  },
  {
    category: 'Eventos',
    keywords: ['concierto', 'fiesta', 'bazar', 'torneo', 'partido', 'carrera', 'maraton', 'clase abierta', 'exposicion', 'festival', 'feria', 'celebracion', 'posada', 'quinceanera', 'boda', 'bautizo', 'graduacion', 'reunion', 'convivio', 'rifa', 'bingo', 'loteria', 'obra de teatro', 'cine', 'show', 'espectaculo', 'rodada', 'caravana'],
  },
  {
    category: 'Objetos Perdidos',
    keywords: ['perdido', 'perdida', 'extraviado', 'encontrado', 'cartera', 'llaves', 'celular perdido'],
  },
  {
    category: 'Anuncios Comunitarios',
    keywords: ['aviso', 'anuncio', 'convocatoria', 'junta', 'colecta', 'donacion', 'campana', 'alerta', 'se busca'],
  },
  {
    category: 'Empleos',
    keywords: ['empleo', 'trabajo', 'vacante', 'se solicita', 'contratacion', 'chofer', 'cocinero', 'mesero', 'guardia', 'vendedor', 'cajero'],
  },
  {
    category: 'Noticias',
    keywords: ['noticia', 'accidente', 'incendio', 'lluvia', 'sismo', 'temblor', 'cierre', 'corte', 'obras', 'inauguracion', 'comunicado', 'ayuntamiento', 'alcalde', 'inundacion', 'apagon', 'corte de agua', 'corte de luz'],
  },
  {
    category: 'Reseñas y Recomendaciones',
    keywords: ['resena', 'recomendacion', 'recomiendo', 'opinion', 'review', 'experiencia'],
  },
  {
    category: 'Seguridad Pública',
    keywords: ['seguridad', 'robo', 'asalto', 'balacera', 'policia', 'patrulla', 'denuncia', 'delincuencia', 'desaparecido', 'secuestro'],
  },
]

/** Lowercase, strip accents, collapse whitespace — 'TACOS al pastor' → 'tacos al pastor'. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Suggest a category from the title, or null when nothing matches.
 * Whole-word matching only, so 'pan' matches 'pan dulce' but not
 * 'panadería'. Scores by distinct matched keywords; ties break by
 * map order (more specific categories first). Only categories in
 * `candidates` can be returned.
 */
export function suggestCategory(title: string, candidates: string[]): string | null {
  const haystack = normalize(title)
  if (haystack.length < 3) return null
  let best: string | null = null
  let bestScore = 0
  for (const entry of KEYWORD_MAP) {
    if (!candidates.includes(entry.category)) continue
    let score = 0
    for (const keyword of entry.keywords) {
      const re = new RegExp(`\\b${escapeRegExp(keyword)}\\b`)
      if (re.test(haystack)) score += 1
    }
    if (score > bestScore) {
      bestScore = score
      best = entry.category
    }
  }
  return best
}
