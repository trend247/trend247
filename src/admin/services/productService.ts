
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    updateDoc,
    where,
    setDoc,
} from 'firebase/firestore'

import { adminDb } from '../../firebase'
import type {
    Product,
    ProductVariant,
    ProductSpecification,
} from '../../context/store-context'

const PRODUCTS_COLLECTION = 'products'
const CATEGORIES_COLLECTION = 'categories'

// =====================================
// أدوات مساعدة للتحقق من البيانات
// =====================================

function mapVariants(data: unknown): ProductVariant[] {
    if (!Array.isArray(data)) return []

    return data.filter(
        (item): item is ProductVariant =>
            typeof item === 'object' &&
            item !== null &&
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            typeof item.value === 'string'
    )
}

function mapSpecifications(data: unknown): ProductSpecification[] {
    if (!Array.isArray(data)) return []

    return data.filter(
        (item): item is ProductSpecification =>
            typeof item === 'object' &&
            item !== null &&
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            typeof item.value === 'string'
    )
}

// =====================================
// تحويل وثيقة Firestore إلى منتج
// =====================================

function mapProduct(
    documentId: string,
    data: Record<string, unknown>
): Product {
    const images = Array.isArray(data.images)
        ? data.images.filter(
            (image): image is string => typeof image === 'string'
        )
        : []

    const condition =
        data.condition === 'used' || data.condition === 'refurbished'
            ? data.condition
            : 'new'

    return {
        id: typeof data.id === 'number'
            ? data.id
            : Number(documentId),

        name: typeof data.name === 'string' ? data.name : '',
        category: typeof data.category === 'string' ? data.category : '',

        price: typeof data.price === 'number' ? data.price : 0,

        oldPrice: typeof data.oldPrice === 'number'
            ? data.oldPrice
            : typeof data.price === 'number'
                ? data.price
                : 0,

        rating: typeof data.rating === 'number' ? data.rating : 0,

        discount: typeof data.discount === 'string'
            ? data.discount
            : '',

        image: typeof data.image === 'string'
            ? data.image
            : images[0] ?? '',

        description: typeof data.description === 'string'
            ? data.description
            : '',
        seoTitle: typeof data.seoTitle === 'string'
            ? data.seoTitle
            : '',

        seoSlug: typeof data.seoSlug === 'string'
            ? data.seoSlug
            : '',

        seoDescription: typeof data.seoDescription === 'string'
            ? data.seoDescription
            : '',
        images,

        stock: typeof data.stock === 'number'
            ? data.stock
            : 0,

        isPublished: data.isPublished === true,
        isFeatured: data.isFeatured === true,

        createdAt: typeof data.createdAt === 'string'
            ? data.createdAt
            : undefined,

        updatedAt: typeof data.updatedAt === 'string'
            ? data.updatedAt
            : undefined,

        sku: typeof data.sku === 'string' ? data.sku : '',
        barcode: typeof data.barcode === 'string' ? data.barcode : '',
        brand: typeof data.brand === 'string' ? data.brand : '',
        model: typeof data.model === 'string' ? data.model : '',
        condition,

        colors: mapVariants(data.colors),
        sizes: mapVariants(data.sizes),
        specifications: mapSpecifications(data.specifications),

        isNew: data.isNew === true,
        isBestSeller: data.isBestSeller === true,

        sortOrder: typeof data.sortOrder === 'number'
            ? data.sortOrder
            : 0,
    }
}

// =====================================
// جلب أسماء التصنيفات النشطة
// =====================================

async function getActiveCategoryNames(): Promise<Set<string>> {
    const categoriesQuery = query(
        collection(adminDb, CATEGORIES_COLLECTION),
        where('isActive', '==', true)
    )

    const snapshot = await getDocs(categoriesQuery)

    return new Set(
        snapshot.docs
            .map(item => item.data().name)
            .filter(
                (name): name is string =>
                    typeof name === 'string'
            )
    )
}

// =====================================
// جلب جميع المنتجات للوحة الإدارة
// =====================================

export async function getAdminProducts(): Promise<Product[]> {
    const productsRef = collection(adminDb, PRODUCTS_COLLECTION)
    const snapshot = await getDocs(productsRef)

    return snapshot.docs
        .map(item => mapProduct(item.id, item.data()))
        .sort((a, b) => b.id - a.id)
}

// =====================================
// جلب المنتجات المنشورة للمتجر
// مع استبعاد منتجات التصنيفات المخفية
// =====================================

export async function getPublishedProducts(): Promise<Product[]> {
    const productsRef = collection(adminDb, PRODUCTS_COLLECTION)

    const publishedQuery = query(
        productsRef,
        where('isPublished', '==', true)
    )

    const [productsSnapshot, activeCategories] = await Promise.all([
        getDocs(publishedQuery),
        getActiveCategoryNames(),
    ])

    return productsSnapshot.docs
        .map(item => mapProduct(item.id, item.data()))
        .filter(product => activeCategories.has(product.category))
        .sort((a, b) => b.id - a.id)
}

// =====================================
// جلب منتج واحد بواسطة رقمه
// مع التحقق من نشره ونشاط تصنيفه
// =====================================

export async function getProductById(
    id: number
): Promise<Product | null> {
    const productRef = doc(
        adminDb,
        PRODUCTS_COLLECTION,
        String(id)
    )

    const snapshot = await getDoc(productRef)

    if (!snapshot.exists()) {
        return null
    }

    const product = mapProduct(snapshot.id, snapshot.data())

    // منع عرض المنتجات غير المنشورة للزوار
    if (product.isPublished !== true) {
        return null
    }

    // التحقق من أن تصنيف المنتج نشط
    const activeCategories = await getActiveCategoryNames()

    if (!activeCategories.has(product.category)) {
        return null
    }

    return product
}

// =====================================
// إضافة منتج جديد
// =====================================

export async function addProduct(
    productData: Omit<Product, 'id'>
): Promise<Product> {
    const id = Date.now()
    const now = new Date().toISOString()

    const product: Product = {
        ...productData,
        id,

        image: productData.image || productData.images?.[0] || '',
        images: productData.images ?? [],
        description: productData.description ?? '',
        seoTitle: productData.seoTitle ?? '',
        seoSlug: productData.seoSlug ?? '',
        seoDescription: productData.seoDescription ?? '',
        stock: productData.stock ?? 0,
        isPublished: productData.isPublished ?? false,
        isFeatured: productData.isFeatured ?? false,

        sku: productData.sku ?? '',
        barcode: productData.barcode ?? '',
        brand: productData.brand ?? '',
        model: productData.model ?? '',
        condition: productData.condition ?? 'new',

        colors: productData.colors ?? [],
        sizes: productData.sizes ?? [],
        specifications: productData.specifications ?? [],

        isNew: productData.isNew ?? false,
        isBestSeller: productData.isBestSeller ?? false,
        sortOrder: productData.sortOrder ?? 0,

        createdAt: now,
        updatedAt: now,
    }

    const productRef = doc(
        adminDb,
        PRODUCTS_COLLECTION,
        String(id)
    )

    await setDoc(productRef, product)

    return product
}

// =====================================
// تنظيف البيانات من قيم undefined
// =====================================

function removeUndefined(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value
            .filter((item) => item !== undefined)
            .map((item) => removeUndefined(item))
    }

    if (value !== null && typeof value === 'object') {
        const cleaned: Record<string, unknown> = {}

        Object.entries(value).forEach(([key, item]) => {
            if (item !== undefined) {
                cleaned[key] = removeUndefined(item)
            }
        })

        return cleaned
    }

    return value
}

// =====================================
// تعديل بيانات منتج
// =====================================

export async function updateProduct(
    id: number,
    product: Partial<Omit<Product, 'id'>>
) {
    const productRef = doc(
        adminDb,
        PRODUCTS_COLLECTION,
        String(id)
    )

    const cleanProduct = removeUndefined(product)

    await updateDoc(productRef, {
        ...(cleanProduct as Record<string, unknown>),
        updatedAt: new Date().toISOString(),
    })
}

// =====================================
// تغيير حالة نشر المنتج
// =====================================

export async function setProductPublished(
    id: number,
    isPublished: boolean
): Promise<void> {
    const productRef = doc(
        adminDb,
        PRODUCTS_COLLECTION,
        String(id)
    )

    await updateDoc(productRef, {
        isPublished,
        updatedAt: new Date().toISOString(),
    })
}

// =====================================
// حذف منتج
// =====================================

export async function deleteProduct(id: number): Promise<void> {
    const productRef = doc(
        adminDb,
        PRODUCTS_COLLECTION,
        String(id)
    )

    await deleteDoc(productRef)
}
