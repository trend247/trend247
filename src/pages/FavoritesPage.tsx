
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useStore } from '../context/useStore'
import { useAuth } from '../context/useAuth'
import { getPublishedProducts } from '../services/productService'

import type { Product } from '../context/store-context'

import ProductGrid from '../components/ProductGrid'

function FavoritesPage() {
    const navigate = useNavigate()

    const { user, loading: authLoading } = useAuth()
    const { favorites, favoritesLoading } = useStore()

    const [products, setProducts] = useState<Product[]>([])
    const [productsLoading, setProductsLoading] = useState(true)
    const [productsError, setProductsError] = useState(false)

    // جلب المنتجات المنشورة من Firestore
    useEffect(() => {
        let active = true

        async function loadProducts() {
            try {
                setProductsLoading(true)
                setProductsError(false)

                const result = await getPublishedProducts()

                if (!active) return

                setProducts(result)
            } catch (error) {
                console.error('Load favorite products error:', error)

                if (!active) return

                setProductsError(true)
            } finally {
                if (active) {
                    setProductsLoading(false)
                }
            }
        }

        loadProducts()

        return () => {
            active = false
        }
    }, [])

    // استخراج المنتجات الموجودة في قائمة المفضلة فقط
    const favoriteProducts = useMemo(
        () => products.filter(
            product => favorites.includes(product.id)
        ),
        [products, favorites]
    )

    // حالة التحميل
    if (authLoading || favoritesLoading || productsLoading) {
        return (
            <main className="favorites-page">
                <div className="favorites-loading">
                    <span className="favorites-loading-heart">♡</span>
                    <h2>نجهّز مفضلتك...</h2>
                    <p>لحظات ونُظهر لك المنتجات التي أحببتها.</p>
                </div>
            </main>
        )
    }

    return (
        <main className="favorites-page">
            <div className="favorites-hero">
                <div className="favorites-hero-copy">
                    <span className="favorites-eyebrow">
                        اختياراتك المميزة
                    </span>

                    <h1>
                        قائمة <em>المفضلة</em>
                    </h1>

                    <p>
                        كل المنتجات التي أعجبتك، محفوظة في مكان واحد.
                    </p>

                    <div className="favorites-hero-meta">
                        <span className="favorites-heart-icon">♥</span>
                        <strong>{favoriteProducts.length}</strong>
                        <span>منتج محفوظ</span>
                    </div>
                </div>

                <div className="favorites-hero-art" aria-hidden="true">
                    <span>♥</span>
                    <i>♡</i>
                    <b>247</b>
                </div>
            </div>

            <nav
                className="favorites-breadcrumb"
                aria-label="مسار التنقل"
            >
                <Link to="/">الرئيسية</Link>
                <span>‹</span>
                <span>المفضلة</span>
            </nav>

            <section className="favorites-content">
                <div className="favorites-section-heading">
                    <div>
                        <small>منتجات اخترتها بنفسك</small>
                        <h2>منتجاتك المحفوظة</h2>
                    </div>

                    <span>{favoriteProducts.length} منتج</span>
                </div>

                {!user && (
                    <div className="favorites-account-note">
                        <span>☁</span>

                        <div>
                            <strong>
                                احفظ مفضلتك على جميع أجهزتك
                            </strong>

                            <p>
                                سجّل الدخول لربط المنتجات بحسابك
                                ومزامنتها بين أجهزتك.
                            </p>
                        </div>

                        <button
                            onClick={() => navigate('/login', {
                                state: { from: '/favorites' },
                            })}
                        >
                            تسجيل الدخول
                        </button>
                    </div>
                )}

                {productsError ? (
                    <div className="favorites-empty">
                        <div className="favorites-empty-icon">!</div>

                        <h3>تعذر تحميل المنتجات</h3>

                        <p>
                            حدثت مشكلة أثناء جلب المنتجات.
                            تحقق من اتصالك بالإنترنت وحاول مجددًا.
                        </p>

                        <button
                            onClick={() => window.location.reload()}
                        >
                            إعادة المحاولة
                            <span>↻</span>
                        </button>
                    </div>
                ) : favoriteProducts.length > 0 ? (
                    <ProductGrid
                        products={favoriteProducts}
                        onSelectProduct={(product) =>
                            navigate(`/product/${product.id}`)
                        }
                    />
                ) : (
                    <div className="favorites-empty">
                        <div className="favorites-empty-icon">♡</div>

                        <h3>قائمة المفضلة فارغة</h3>

                        <p>
                            أضف المنتجات التي تعجبك إلى المفضلة،
                            وستجدها هنا دائمًا.
                        </p>

                        <button
                            onClick={() => navigate('/products')}
                        >
                            اكتشف المنتجات
                            <span>←</span>
                        </button>
                    </div>
                )}
            </section>
        </main>
    )
}

export default FavoritesPage
