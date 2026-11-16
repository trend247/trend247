
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

// معلومات السعر بعد احتساب العرض
export type ProductPricing = {
    originalUnitPrice: number
    unitPrice: number
    offerId?: string
    offerName?: string
    offerDiscount: number
}

export type CartItem = Product & {
    quantity: number

    selectedColor?: ProductVariant
    selectedSize?: ProductVariant

    variantKey: string

    // السعر النهائي الحالي للوحدة بعد تطبيق العرض
    unitPrice: number

    // السعر قبل تطبيق العرض
    originalUnitPrice?: number

    // بيانات العرض المطبق
    offerId?: string
    offerName?: string
    offerDiscount?: number
}

export type StoreContextType = {
    cartItems: CartItem[]
    favorites: number[]
    favoritesLoading: boolean
    cartCount: number
    cartTotal: number

    // إجمالي الأسعار قبل العروض
    cartOriginalTotal: number

    // إجمالي التوفير من عروض المنتجات
    cartOfferDiscount: number

    // حساب سعر المنتج بعد تطبيق العرض
    getProductPricing: (
        product: Product,
        selectedColor?: ProductVariant,
        selectedSize?: ProductVariant
    ) => ProductPricing

    // تحديث أسعار السلة
    refreshCartPrices: () => Promise<void>

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
