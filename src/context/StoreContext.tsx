
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
    StoreContext,
    type CartItem,
    type Product,
    type ProductVariant,
} from './store-context'

const CART_STORAGE_KEY = 'trend247-cart'
const FAVORITES_STORAGE_KEY = 'trend247-favorites'

// إنشاء مفتاح مختلف لكل تركيبة من المنتج واللون والمقاس
function createVariantKey(
    productId: number,
    color?: ProductVariant,
    size?: ProductVariant
) {
    return `${productId}__${color?.id ?? 'default'}__${size?.id ?? 'default'}`
}

// تحديد السعر النهائي للوحدة.
// سعر المقاس له الأولوية، ثم اللون، ثم سعر المنتج الأساسي.
function getUnitPrice(
    product: Product,
    color?: ProductVariant,
    size?: ProductVariant
) {
    return size?.price ?? color?.price ?? product.price
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
    ].filter((stock): stock is number =>
        typeof stock === 'number' && Number.isFinite(stock)
    )

    return stocks.length > 0 ? Math.max(0, Math.min(...stocks)) : undefined
}

// قراءة السلة القديمة مع تجهيز الحقول الجديدة

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
                }

                const color = item.selectedColor
                const size = item.selectedSize

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
                            : getUnitPrice(item, color, size),
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

export function StoreProvider({
    children,
}: {
    children: ReactNode
}) {
    const { user, loading: authLoading } = useAuth()

    const [cartItems, setCartItems] = useState<CartItem[]>(readStoredCart)
    const [favorites, setFavorites] = useState<number[]>(readStoredFavorites)
    const [favoritesLoading, setFavoritesLoading] = useState(true)

    const loadVersion = useRef(0)
    const previousUserId = useRef<string | null>(null)

    // حفظ السلة محلياً
    useEffect(() => {
        localStorage.setItem(
            CART_STORAGE_KEY,
            JSON.stringify(cartItems)
        )
    }, [cartItems])


    // حفظ مفضلة الزائر ومنع إعادة مفضلة الحساب بعد تسجيل الخروج
    useEffect(() => {
        if (authLoading) return

        // المستخدم مسجل الدخول: لا نحفظ مفضلته محلياً
        if (user) {
            previousUserId.current = user.uid
            return
        }

        // اكتشاف تسجيل الخروج
        if (previousUserId.current !== null) {
            previousUserId.current = null

            // حذف أي نسخة محلية من مفضلة الحساب السابق
            localStorage.removeItem(FAVORITES_STORAGE_KEY)

            // إعادة تهيئة المفضلة بعد تسجيل الخروج
            setFavorites([])

            return
        }

        // حفظ مفضلة الزائر فقط
        localStorage.setItem(
            FAVORITES_STORAGE_KEY,
            JSON.stringify(favorites)
        )
    }, [favorites, user, authLoading])


    // تحميل مفضلة العميل من Firestore
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

                if (cancelled || version !== loadVersion.current) return

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

                if (cancelled || version !== loadVersion.current) return

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

    // إجمالي عدد القطع
    const cartCount = cartItems.reduce(
        (total, item) => total + item.quantity,
        0
    )

    // إجمالي قيمة السلة حسب سعر كل تركيبة
    const cartTotal = cartItems.reduce(
        (total, item) => total + item.unitPrice * item.quantity,
        0
    )

    // إضافة منتج مع اللون والمقاس والكمية
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

        const unitPrice = getUnitPrice(
            product,
            selectedColor,
            selectedSize
        )

        const availableStock = getAvailableStock(
            product,
            selectedColor,
            selectedSize
        )

        if (availableStock !== undefined && availableStock < 1) {
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
                            unitPrice,
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
                unitPrice,
            }

            return [...current, newItem]
        })
    }

    // تحديث كمية تركيبة محددة
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
                        return { ...item, quantity: 0 }
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

    // حذف تركيبة محددة من السلة
    const removeFromCart = (
        id: number,
        variantKey?: string
    ) => {
        setCartItems((current) => {
            if (variantKey) {
                return current.filter(
                    (item) =>
                        !(item.id === id && item.variantKey === variantKey)
                )
            }

            return current.filter((item) => item.id !== id)
        })
    }

    // المفضلة
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

    return (
        <StoreContext.Provider
            value={{
                cartItems,
                favorites,
                favoritesLoading,
                cartCount,
                cartTotal,
                addToCart,
                updateQuantity,
                removeFromCart,
                toggleFavorite,
            }}
        >
            {children}
        </StoreContext.Provider>
    )
}
