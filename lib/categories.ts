import { ListingType } from '@/lib/types/database'

export const PRODUCT_CATEGORIES = [
  'Comida y Restaurantes',
  'Electrónica',
  'Muebles',
  'Vehículos',
  'Ropa',
  'Deportes',
  'Hogar',
  'Juguetes',
  'Libros',
  'Mascotas',
  'Otros',
]

export const SERVICE_CATEGORIES = [
  'Comida y Catering',
  'Plomería',
  'Electricidad',
  'Albañilería',
  'Pintura',
  'Belleza y Uñas',
  'Reparaciones',
  'Limpieza',
  'Jardinería',
  'Clases y Tutorías',
  'Fletes y Mudanzas',
  'Otros Servicios',
]

export const EVENT_CATEGORIES = [
  'Eventos',
  'Comida y Bebida',
  'Anuncios Comunitarios',
  'Empleos',
]

export const NEWS_CATEGORIES = [
  'Noticias',
  'Reseñas y Recomendaciones',
  'Objetos Perdidos',
  'Seguridad Pública',
  'Anuncios Comunitarios',
  'Empleos',
]

export function getCategoriesForType(type: ListingType): string[] {
  if (type === 'service') return SERVICE_CATEGORIES
  if (type === 'event') return EVENT_CATEGORIES
  if (type === 'news') return NEWS_CATEGORIES
  return PRODUCT_CATEGORIES
}
