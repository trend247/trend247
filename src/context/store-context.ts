
import { createContext } from 'react'

export type ProductVariant = {
    id: string
    name: string
    value: string
    price?: number
    stock?: number
    sku?: string
}

export type ProductSpecification = {
    id: string
    name: string
    value: string
}

export type Product = {
    id: number
    name: string
    category: string
    price: number
    oldPrice: number
    rating: number
    discount: string
    image: string

    description?: string
     // بيانات تحسين محركات البحث
    seoTitle?: string
    seoSlug?: string
    seoDescription?: string
    images?: string[]
    stock?: number
    isPublished?: boolean
    isFeatured?: boolean
    createdAt?: string
    updatedAt?: string

    sku?: string
    barcode?: string
    brand?: string
    model?: string
    condition?: 'new' | 'used' | 'refurbished'

    colors?: ProductVariant[]
    sizes?: ProductVariant[]
    specifications?: ProductSpecification[]

    isNew?: boolean
    isBestSeller?: boolean
    sortOrder?: number
}

export type CartItem = Product & {
    quantity: number

    // خيارات العميل عند إضافة المنتج
    selectedColor?: ProductVariant
    selectedSize?: ProductVariant

    // معرّف يميز تركيبة المنتج وخياراته
    variantKey: string

    // السعر النهائي للوحدة وقت الإضافة
    unitPrice: number
}

export type StoreContextType = {
    cartItems: CartItem[]
    favorites: number[]
    favoritesLoading: boolean
    cartCount: number
    cartTotal: number

    addToCart: (
        product: Product,
        selectedColor?: ProductVariant,
        selectedSize?: ProductVariant,
        quantity?: number
    ) => void

    updateQuantity: (
        id: number,
        change: number,
        variantKey?: string
    ) => void

    removeFromCart: (
        id: number,
        variantKey?: string
    ) => void

    toggleFavorite: (id: number) => void
}

export const StoreContext =
    createContext<StoreContextType | undefined>(undefined)
