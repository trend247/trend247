
import {
    collection,
    getDocs,
    query,
    where,
} from 'firebase/firestore'

import { db } from '../firebase'

import type {
    Product,
    ProductVariant,
    ProductSpecification,
} from '../context/store-context'

const PRODUCTS_COLLECTION = 'products'
const CATEGORIES_COLLECTION = 'categories'

// تحويل المتغيرات
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

// تحويل المواصفات
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

// تحويل مستند Firestore إلى منتج
function mapProduct(
    documentId: string,
    data: Record<string, unknown>
): Product {
    const images = Array.isArray(data.images)
        ? data.images.filter(
            (image): image is string =>
                typeof image === 'string'
        )
        : []

    const condition =
        data.condition === 'used' ||
            data.condition === 'refurbished'
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

        stock: typeof data.stock === 'number' ? data.stock : 0,

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

// جلب التصنيفات النشطة
async function getActiveCategoryNames(): Promise<Set<string>> {
    const categoriesQuery = query(
        collection(db, CATEGORIES_COLLECTION),
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

// جلب المنتجات المنشورة للمتجر
export async function getPublishedProducts(): Promise<Product[]> {
    const productsQuery = query(
        collection(db, PRODUCTS_COLLECTION),
        where('isPublished', '==', true)
    )

    const [productsSnapshot, activeCategories] = await Promise.all([
        getDocs(productsQuery),
        getActiveCategoryNames(),
    ])

    return productsSnapshot.docs
        .map(item => mapProduct(item.id, item.data()))
        .filter(product => activeCategories.has(product.category))
        .sort((a, b) => b.id - a.id)
}
