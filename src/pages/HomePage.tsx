
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import CategoryNav from '../components/CategoryNav'
import ProductGrid from '../components/ProductGrid'

import type { Product } from '../context/store-context'

import {
    getActiveCategories,
    type StoreCategory,
} from '../admin/services/categoryService'

import { getPublishedProducts } from '../admin/services/productService'

type HomePageProps = {
    search: string
}

function HomePage({ search }: HomePageProps) {
    const navigate = useNavigate()

    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<StoreCategory[]>([])

    const [loading, setLoading] = useState(true)
    const [loadingCategories, setLoadingCategories] = useState(true)

    const [loadError, setLoadError] = useState(false)
    const [categoriesError, setCategoriesError] = useState(false)

    // تحميل المنتجات والتصنيفات من Firebase
    useEffect(() => {
        let cancelled = false

        async function loadHomeData() {
            setLoading(true)
            setLoadingCategories(true)
            setLoadError(false)
            setCategoriesError(false)

            const [productsResult, categoriesResult] =
                await Promise.allSettled([
                    getPublishedProducts(),
                    getActiveCategories(),
                ])

            if (cancelled) return

            if (productsResult.status === 'fulfilled') {
                setProducts(productsResult.value)
            } else {
                console.error(
                    'خطأ في تحميل منتجات الصفحة الرئيسية:',
                    productsResult.reason
                )
                setLoadError(true)
            }

            if (categoriesResult.status === 'fulfilled') {
                setCategories(categoriesResult.value)
            } else {
                console.error(
                    'خطأ في تحميل تصنيفات الصفحة الرئيسية:',
                    categoriesResult.reason
                )
                setCategoriesError(true)
            }

            setLoading(false)
            setLoadingCategories(false)
        }

        loadHomeData()

        return () => {
            cancelled = true
        }
    }, [])

    // البحث في المنتجات
    const query = search.trim().toLowerCase()

    const filteredProducts = products.filter((product) => {
        return (
            product.name.toLowerCase().includes(query) ||
            product.category.toLowerCase().includes(query) ||
            (product.brand?.toLowerCase().includes(query) ?? false)
        )
    })

    // الانتقال إلى التصنيف
    const goToCategory = (category: string) => {
        if (category === 'الكل') {
            navigate('/products')
            return
        }

        navigate(`/category/${encodeURIComponent(category)}`)
    }

    return (
        <>
            <CategoryNav
                categories={categories}
                selectedCategory="الكل"
                onSelectCategory={goToCategory}
            />

            <main>
                <section className="hero-banner">
                    <div className="hero-copy">
                        <span className="hero-kicker">اكتشف عالم الترند</span>

                        <h1>
                            كل ما هو ترند
                            <br />
                            <em>في مكان واحد</em>
                        </h1>

                        <p>
                            منتجات مختارة، عروض مميزة وتجربة تسوق مختلفة.
                        </p>

                        <button
                            className="hero-button"
                            onClick={() => navigate('/products')}
                        >
                            تسوق الآن ←
                        </button>
                    </div>

                    <div className="hero-art">
                        <div className="hero-circle">247</div>
                        <span className="hero-product">🎧</span>
                        <span className="hero-discount">
                            خصم حتى<strong>70%</strong>
                        </span>
                    </div>
                </section>

                <div className="slider-dots">
                    <span className="selected" />
                    <span />
                    <span />
                    <span />
                </div>

                <section className="category-section" id="categories">
                    <div className="section-heading">
                        <div>
                            <small>تسوق حسب اهتمامك</small>
                            <h2>أقسام المتجر</h2>
                        </div>

                        <button onClick={() => navigate('/categories')}>
                            عرض جميع الأقسام ←
                        </button>
                    </div>

                    {loadingCategories ? (
                        <div className="empty-search">
                            <span>⏳</span>
                            <h3>جاري تحميل الأقسام...</h3>
                        </div>
                    ) : categoriesError ? (
                        <div className="empty-search">
                            <span>⚠️</span>
                            <h3>تعذر تحميل الأقسام</h3>
                            <p>تحقق من اتصالك بالإنترنت وحاول مرة أخرى.</p>
                        </div>
                    ) : categories.length > 0 ? (
                        <div className="category-grid">
                            {categories.map((category) => (
                                <button
                                    className="category-card"
                                    key={category.id}
                                    onClick={() =>
                                        navigate(
                                            `/category/${encodeURIComponent(category.name)}`
                                        )
                                    }
                                >
                                    <span>{category.icon}</span>
                                    <strong>{category.name}</strong>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-search">
                            <span>📦</span>
                            <h3>لا توجد أقسام نشطة حالياً</h3>
                            <p>يمكنك إضافة أقسام جديدة من لوحة التحكم.</p>
                        </div>
                    )}
                </section>

                <section className="promo-grid">
                    <div className="promo-card shipping">
                        <span>🚚</span>
                        <div>
                            <strong>شحن سريع</strong>
                            <small>لتجربة تسوق أسهل</small>
                        </div>
                        <b>←</b>
                    </div>

                    <div className="promo-card exclusive">
                        <span>🎁</span>
                        <div>
                            <strong>عروض حصرية</strong>
                            <small>لفترة محدودة</small>
                        </div>
                        <b>←</b>
                    </div>
                </section>

                <section className="products-section" id="products">
                    <div className="section-heading">
                        <div>
                            <small>اختيارات مميزة لك</small>
                            <h2>🔥 الأكثر مبيعاً</h2>
                        </div>

                        <button onClick={() => navigate('/products')}>
                            عرض جميع المنتجات ←
                        </button>
                    </div>

                    {loading ? (
                        <div className="empty-search">
                            <span>⏳</span>
                            <h3>جاري تحميل المنتجات...</h3>
                            <p>نجهز لك أحدث منتجات ترند247.</p>
                        </div>
                    ) : loadError ? (
                        <div className="empty-search">
                            <span>⚠️</span>
                            <h3>تعذر تحميل المنتجات</h3>
                            <p>تحقق من اتصالك بالإنترنت وحاول مرة أخرى.</p>

                            <button onClick={() => window.location.reload()}>
                                إعادة المحاولة
                            </button>
                        </div>
                    ) : filteredProducts.length > 0 ? (
                        <ProductGrid
                            products={filteredProducts}
                            onSelectProduct={(product) =>
                                navigate(`/product/${product.id}`)
                            }
                        />
                    ) : (
                        <div className="empty-search">
                            <span>🔎</span>
                            <h3>
                                {query
                                    ? 'لم نعثر على منتجات مطابقة'
                                    : 'لا توجد منتجات منشورة حالياً'}
                            </h3>
                            <p>
                                {query
                                    ? 'جرّب البحث بكلمات أخرى.'
                                    : 'ستظهر المنتجات هنا بمجرد إضافتها ونشرها من لوحة التحكم.'}
                            </p>
                        </div>
                    )}
                </section>
            </main>
        </>
    )
}

export default HomePage
