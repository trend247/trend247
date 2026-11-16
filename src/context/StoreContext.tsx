
import { useEffect, useRef, useState, type ReactNode } from 'react'

import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    setDoc,
} from 'firebase/firestore'

import { db } from '../firebase'
import { useAuth } from './useAuth'

import {
    getActiveOffers,
    type StoreOffer,
} from '../services/offerService'

import {
    StoreContext,
    type CartItem,
    type Product,
    type ProductVariant,
    
} from './store-context'

const CART_STORAGE_KEY = 'trend247-cart'
const FAVORITES_STORAGE_KEY = 'trend247-favorites'

// =====================================
// أدوات مساعدة
// =====================================

// إنشاء مفتاح مختلف لكل تركيبة من المنتج واللون والمقاس
function createVariantKey(
    productId: number,
    color?: ProductVariant,
    size?: ProductVariant
): string {
    return `${productId}__${color?.id ?? 'default'}__${size?.id ?? 'default'}`
}

// تحديد السعر الأساسي للوحدة
// المقاس له الأولوية، ثم اللون، ثم المنتج
function getBaseUnitPrice(
    product: Product,
    color?: ProductVariant,
    size?: ProductVariant
): number {
    return size?.price ?? color?.price ?? product.price
}

// تقريب السعر إلى منزلتين عشريتين
function roundPrice(price: number): number {
    return Math.round((price + Number.EPSILON) * 100) / 100
}

// حساب سعر المنتج بعد تطبيق أفضل عرض متاح
function calculateProductPricing(
    productId: number,
    basePrice: number,
    offers: StoreOffer[]
) {
    let bestPrice = basePrice
    let bestOffer: StoreOffer | undefined

    const applicableOffers = offers.filter(
        (offer) =>
            offer.isActive &&
            offer.productIds.includes(productId)
    )

    for (const offer of applicableOffers) {
        const discount = Math.min(
            offer.discountType === 'percentage'
                ? basePrice * (offer.discountValue / 100)
                : offer.discountValue,
            basePrice
        )

        const discountedPrice = roundPrice(
            Math.max(0, basePrice - discount)
        )

        if (discountedPrice < bestPrice) {
            bestPrice = discountedPrice
            bestOffer = offer
        }
    }

    return {
        originalUnitPrice: roundPrice(basePrice),
        unitPrice: roundPrice(bestPrice),
        offerId: bestOffer?.id,
        offerName: bestOffer?.name,
        offerDiscount: roundPrice(basePrice - bestPrice),
    }
}

// تحديد الحد الأقصى للمخزون المتاح للتركيبة المختارة
function getAvailableStock(
    product: Product,
    color?: ProductVariant,
    size?: ProductVariant
): number | undefined {
    const stocks = [
        product.stock,
        color?.stock,
        size?.stock,
    ].filter(
        (stock): stock is number =>
            typeof stock === 'number' &&
            Number.isFinite(stock)
    )

    return stocks.length > 0
        ? Math.max(0, Math.min(...stocks))
        : undefined
}

// =====================================
// قراءة البيانات المحلية
// =====================================

function readStoredCart(): CartItem[] {
    try {
        const saved = localStorage.getItem(CART_STORAGE_KEY)
        const parsed: unknown = saved ? JSON.parse(saved) : []

        if (!Array.isArray(parsed)) return []

        return parsed
            .filter(
                (item): item is Product & {
                    quantity: number
                } =>
                    item !== null &&
                    typeof item === 'object' &&
                    Number.isInteger(item.id) &&
                    typeof item.quantity === 'number'
            )
            .map((rawItem) => {
                const item = rawItem as Product & {
                    quantity: number
                    selectedColor?: ProductVariant
                    selectedSize?: ProductVariant
                    variantKey?: string
                    unitPrice?: number
                    originalUnitPrice?: number
                    offerId?: string
                    offerName?: string
                    offerDiscount?: number
                }

                const color = item.selectedColor
                const size = item.selectedSize

                const basePrice = getBaseUnitPrice(
                    item,
                    color,
                    size
                )

                return {
                    ...item,
                    selectedColor: color,
                    selectedSize: size,
                    variantKey:
                        item.variantKey ??
                        createVariantKey(item.id, color, size),
                    unitPrice:
                        typeof item.unitPrice === 'number'
                            ? item.unitPrice
                            : basePrice,
                    originalUnitPrice:
                        typeof item.originalUnitPrice === 'number'
                            ? item.originalUnitPrice
                            : basePrice,
                    offerId: item.offerId,
                    offerName: item.offerName,
                    offerDiscount: item.offerDiscount ?? 0,
                }
            })
    } catch {
        return []
    }
}

function readStoredFavorites(): number[] {
    try {
        const saved = localStorage.getItem(FAVORITES_STORAGE_KEY)
        const parsed: unknown = saved ? JSON.parse(saved) : []

        return Array.isArray(parsed)
            ? parsed.filter(
                (id): id is number => Number.isInteger(id)
            )
            : []
    } catch {
        return []
    }
}

// =====================================
// Store Provider
// =====================================

export function StoreProvider({
    children,
}: {
    children: ReactNode
}) {
    const { user, loading: authLoading } = useAuth()

    const [cartItems, setCartItems] = useState<CartItem[]>(readStoredCart)
    const [favorites, setFavorites] = useState<number[]>(readStoredFavorites)
    const [favoritesLoading, setFavoritesLoading] = useState(true)

    const [activeOffers, setActiveOffers] = useState<StoreOffer[]>([])

    const loadVersion = useRef(0)
    const previousUserId = useRef<string | null>(null)

    // =====================================
    // تحميل العروض السارية
    // =====================================

    useEffect(() => {
        let cancelled = false

        async function loadOffers() {
            try {
                const offers = await getActiveOffers()

                if (!cancelled) {
                    setActiveOffers(offers)
                }
            } catch (error) {
                console.error(
                    'تعذر تحميل عروض المتجر:',
                    error
                )
            }
        }

        void loadOffers()

        return () => {
            cancelled = true
        }
    }, [])

    // =====================================
    // حساب أسعار السلة حسب العروض
    // =====================================

    function applyOffersToCart(
        items: CartItem[],
        offers: StoreOffer[]
    ): CartItem[] {
        return items.map((item) => {
            const basePrice = getBaseUnitPrice(
                item,
                item.selectedColor,
                item.selectedSize
            )

            const pricing = calculateProductPricing(
                item.id,
                basePrice,
                offers
            )

            return {
                ...item,
                ...pricing,
            }
        })
    }

    // الأسعار المعروضة دائماً محسوبة حسب العروض الحالية
    const pricedCartItems = applyOffersToCart(
        cartItems,
        activeOffers
    )

    // =====================================
    // تحديث العروض والأسعار
    // =====================================

    async function refreshCartPrices(): Promise<void> {
        try {
            const offers = await getActiveOffers()
            setActiveOffers(offers)
        } catch (error) {
            console.error(
                'تعذر تحديث أسعار السلة:',
                error
            )

            throw error
        }
    }

    // =====================================
    // حفظ السلة محلياً
    // =====================================

    useEffect(() => {
        localStorage.setItem(
            CART_STORAGE_KEY,
            JSON.stringify(cartItems)
        )
    }, [cartItems])

    // =====================================
    // حفظ مفضلة الزائر
    // =====================================

    useEffect(() => {
        if (authLoading) return

        if (user) {
            previousUserId.current = user.uid
            return
        }

        if (previousUserId.current !== null) {
            previousUserId.current = null

            localStorage.removeItem(FAVORITES_STORAGE_KEY)
            setFavorites([])

            return
        }

        localStorage.setItem(
            FAVORITES_STORAGE_KEY,
            JSON.stringify(favorites)
        )
    }, [favorites, user, authLoading])

    // =====================================
    // تحميل مفضلة العميل من Firestore
    // =====================================

    useEffect(() => {
        if (authLoading) return

        const version = ++loadVersion.current
        let cancelled = false

        async function loadFavorites() {
            setFavoritesLoading(true)

            if (!user) {
                setFavorites(readStoredFavorites())
                setFavoritesLoading(false)
                return
            }

            try {
                const favoritesRef = collection(
                    db,
                    'users',
                    user.uid,
                    'favorites'
                )

                const snapshot = await getDocs(favoritesRef)

                if (cancelled || version !== loadVersion.current) {
                    return
                }

                const cloudIds = snapshot.docs
                    .map((favoriteDoc) => Number(favoriteDoc.id))
                    .filter((id) => Number.isInteger(id))

                const guestIds = readStoredFavorites()

                const mergedIds = Array.from(
                    new Set([...cloudIds, ...guestIds])
                )

                const guestOnlyIds = mergedIds.filter(
                    (id) => !cloudIds.includes(id)
                )

                await Promise.all(
                    guestOnlyIds.map((id) =>
                        setDoc(
                            doc(
                                db,
                                'users',
                                user.uid,
                                'favorites',
                                String(id)
                            ),
                            {
                                productId: id,
                                addedAt: new Date().toISOString(),
                            }
                        )
                    )
                )

                if (cancelled || version !== loadVersion.current) {
                    return
                }

                localStorage.removeItem(FAVORITES_STORAGE_KEY)
                setFavorites(mergedIds)
            } catch (error) {
                console.error(
                    'تعذر تحميل المفضلة من Firestore:',
                    error
                )

                if (!cancelled && version === loadVersion.current) {
                    setFavorites(readStoredFavorites())
                }
            } finally {
                if (!cancelled && version === loadVersion.current) {
                    setFavoritesLoading(false)
                }
            }
        }

        void loadFavorites()

        return () => {
            cancelled = true
        }
    }, [user, authLoading])

    // =====================================
    // إجماليات السلة
    // =====================================

    const cartCount = pricedCartItems.reduce(
        (total, item) => total + item.quantity,
        0
    )

    // الإجمالي بعد خصم العروض
    const cartTotal = roundPrice(
        pricedCartItems.reduce(
            (total, item) =>
                total + item.unitPrice * item.quantity,
            0
        )
    )

    // الإجمالي قبل خصم العروض
    const cartOriginalTotal = roundPrice(
        pricedCartItems.reduce(
            (total, item) =>
                total +
                (item.originalUnitPrice ?? item.unitPrice) *
                item.quantity,
            0
        )
    )

    // إجمالي التوفير الناتج عن عروض المنتجات
    const cartOfferDiscount = roundPrice(
        Math.max(0, cartOriginalTotal - cartTotal)
    )

    // =====================================
    // إضافة منتج إلى السلة
    // =====================================

    const addToCart = (
        product: Product,
        selectedColor?: ProductVariant,
        selectedSize?: ProductVariant,
        requestedQuantity = 1
    ) => {
        const quantity = Math.max(
            1,
            Math.floor(requestedQuantity)
        )

        const variantKey = createVariantKey(
            product.id,
            selectedColor,
            selectedSize
        )

        const basePrice = getBaseUnitPrice(
            product,
            selectedColor,
            selectedSize
        )

        const pricing = calculateProductPricing(
            product.id,
            basePrice,
            activeOffers
        )

        const availableStock = getAvailableStock(
            product,
            selectedColor,
            selectedSize
        )

        if (
            availableStock !== undefined &&
            availableStock < 1
        ) {
            return
        }

        setCartItems((current) => {
            const existing = current.find(
                (item) => item.variantKey === variantKey
            )

            const currentQuantity = existing?.quantity ?? 0
            const nextQuantity = currentQuantity + quantity

            if (
                availableStock !== undefined &&
                nextQuantity > availableStock
            ) {
                return current
            }

            if (existing) {
                return current.map((item) =>
                    item.variantKey === variantKey
                        ? {
                            ...item,
                            quantity: nextQuantity,
                            ...pricing,
                        }
                        : item
                )
            }

            const newItem: CartItem = {
                ...product,
                quantity,
                selectedColor,
                selectedSize,
                variantKey,
                ...pricing,
            }

            return [...current, newItem]
        })
    }

    // =====================================
    // تحديث كمية المنتج
    // =====================================

    const updateQuantity = (
        id: number,
        change: number,
        variantKey?: string
    ) => {
        setCartItems((current) =>
            current
                .map((item) => {
                    const matches =
                        item.id === id &&
                        (!variantKey || item.variantKey === variantKey)

                    if (!matches) return item

                    const nextQuantity = item.quantity + change

                    if (nextQuantity <= 0) {
                        return {
                            ...item,
                            quantity: 0,
                        }
                    }

                    const availableStock = getAvailableStock(
                        item,
                        item.selectedColor,
                        item.selectedSize
                    )

                    if (
                        availableStock !== undefined &&
                        nextQuantity > availableStock
                    ) {
                        return item
                    }

                    return {
                        ...item,
                        quantity: nextQuantity,
                    }
                })
                .filter((item) => item.quantity > 0)
        )
    }

    // =====================================
    // حذف منتج من السلة
    // =====================================

    const removeFromCart = (
        id: number,
        variantKey?: string
    ) => {
        setCartItems((current) => {
            if (variantKey) {
                return current.filter(
                    (item) =>
                        !(
                            item.id === id &&
                            item.variantKey === variantKey
                        )
                )
            }

            return current.filter((item) => item.id !== id)
        })
    }

    // =====================================
    // المفضلة
    // =====================================

    const toggleFavorite = (id: number) => {
        const isFavorite = favorites.includes(id)

        setFavorites((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id]
        )

        if (user && !authLoading) {
            const favoriteRef = doc(
                db,
                'users',
                user.uid,
                'favorites',
                String(id)
            )

            const operation = isFavorite
                ? deleteDoc(favoriteRef)
                : setDoc(favoriteRef, {
                    productId: id,
                    addedAt: new Date().toISOString(),
                })

            void operation.catch((error) => {
                console.error(
                    'تعذر تحديث المفضلة في Firestore:',
                    error
                )
            })
        }
    }

    // =====================================
    // Context
    // =====================================

    return (
        <StoreContext.Provider
            value={{
                cartItems: pricedCartItems,
                favorites,
                favoritesLoading,

                cartCount,
                cartTotal,
                cartOriginalTotal,
                cartOfferDiscount,

                addToCart,
                updateQuantity,
                removeFromCart,
                toggleFavorite,

                refreshCartPrices,
            }}
        >
            {children}
        </StoreContext.Provider>
    )
}
