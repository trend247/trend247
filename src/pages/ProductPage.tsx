
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useStore } from '../context/useStore'
import type { Product } from '../context/store-context'
import { getProductById } from '../admin/services/productService'

import ProductDetails from './ProductDetails'

// إنشاء رابط صالح للمنتج
function createSeoSlug(value: string) {
    return value
        .trim()
        .toLowerCase()
        .normalize('NFC')
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

function ProductPage() {
    const { id } = useParams()
    const navigate = useNavigate()

    const { favorites, addToCart, toggleFavorite } = useStore()

    const [product, setProduct] = useState<Product | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(false)
    const [retryCount, setRetryCount] = useState(0)

    useEffect(() => {
        let cancelled = false

        async function loadProduct() {
            // استخراج رقم المنتج من الرابط القديم أو الجديد
            const numericId = /^\d+$/.test(id ?? '')
                ? id
                : id?.match(/-(\d+)$/)?.[1]

            const productId = Number(numericId)

            if (
                !id ||
                !Number.isSafeInteger(productId) ||
                productId <= 0
            ) {
                setProduct(null)
                setLoadError(false)
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                setLoadError(false)
                setProduct(null)

                const result = await getProductById(productId)

                if (cancelled) return

                if (!result || result.isPublished !== true) {
                    setProduct(null)
                    return
                }

                // إنشاء الرابط الرسمي للمنتج
                const slug = createSeoSlug(
                    result.seoSlug || result.name
                ) || 'product'

                const canonicalPath = `/product/${slug}-${result.id}`

                // تحويل الرابط القديم أو غير المطابق إلى الرابط الرسمي
                if (id !== `${slug}-${result.id}`) {
                    navigate(canonicalPath, {
                        replace: true,
                    })
                    return
                }

                setProduct(result)

            } catch (error) {
                console.error('خطأ في تحميل تفاصيل المنتج:', error)

                if (!cancelled) {
                    setLoadError(true)
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        void loadProduct()

        return () => {
            cancelled = true
        }
    }, [id, retryCount, navigate])

    if (loading) {
        return (
            <main className="product-details-page">
                <div className="empty-search">
                    <span>⏳</span>
                    <h2>جاري تحميل المنتج...</h2>
                    <p>لحظات ونجهز لك تفاصيل المنتج.</p>
                </div>
            </main>
        )
    }

    if (loadError) {
        return (
            <main className="product-details-page">
                <div className="empty-search">
                    <span>⚠️</span>
                    <h2>تعذر تحميل المنتج</h2>
                    <p>حدث خطأ أثناء الاتصال بقاعدة البيانات.</p>

                    <button
                        className="back-to-store"
                        onClick={() => setRetryCount(count => count + 1)}
                    >
                        إعادة المحاولة
                    </button>

                    <button
                        className="back-to-store"
                        onClick={() => navigate('/products')}
                    >
                        العودة إلى المتجر
                    </button>
                </div>
            </main>
        )
    }

    if (!product) {
        return (
            <main className="product-details-page">
                <h2>عذراً، المنتج غير موجود</h2>

                <p>
                    ربما تم حذف المنتج أو أن الرابط غير صحيح.
                </p>

                <button
                    className="back-to-store"
                    onClick={() => navigate('/products')}
                >
                    العودة إلى المتجر
                </button>
            </main>
        )
    }

    return (
        <ProductDetails
            product={product}
            favorites={favorites}
            onBack={() => navigate(-1)}
            onAddToCart={addToCart}
            onToggleFavorite={toggleFavorite}
        />
    )
}

export default ProductPage
