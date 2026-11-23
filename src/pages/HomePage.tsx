
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

import { getBanners } from '../admin/services/bannerService'

import type { StoreBanner } from '../admin/types/banner'

type HomePageProps = {
    search: string
}

function HomePage({ search }: HomePageProps) {
    const navigate = useNavigate()

    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<StoreCategory[]>([])
    const [banners, setBanners] = useState<StoreBanner[]>([])
    const [secondaryBanners, setSecondaryBanners] = useState<StoreBanner[]>([])
    const [activeBanner, setActiveBanner] = useState(0)

    const [loading, setLoading] = useState(true)
    const [loadingCategories, setLoadingCategories] = useState(true)

    const [loadError, setLoadError] = useState(false)
    const [categoriesError, setCategoriesError] = useState(false)

    // =====================================
    // تحميل المنتجات والتصنيفات
    // =====================================

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

    // =====================================
    // تحميل البانرات النشطة
    // =====================================

    useEffect(() => {
        let cancelled = false

        async function loadHomeBanners() {
            try {
                const result = await getBanners()

                if (cancelled) return

                const activeBanners = result.filter(banner => banner.active)

                const activeHeroBanners = activeBanners
                    .filter(banner => banner.position === 'hero')
                    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

                const activeSecondaryBanners = activeBanners
                    .filter(banner => banner.position === 'secondary')
                    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

                setBanners(activeHeroBanners)
                setSecondaryBanners(activeSecondaryBanners)
            } catch (error) {
                setSecondaryBanners([])
                console.error(
                    'خطأ في تحميل بانرات الصفحة الرئيسية:',
                    error
                )

                if (!cancelled) {
                    setBanners([])
                }
            }
        }

        loadHomeBanners()

        return () => {
            cancelled = true
        }
    }, [])

    // =====================================
    // مؤشر البانر الآمن
    // =====================================

    const currentBannerIndex =
        banners.length > 0
            ? activeBanner % banners.length
            : 0

    const currentBanner = banners[currentBannerIndex]

    // =====================================
    // التبديل التلقائي بين البانرات
    // =====================================

    useEffect(() => {
        if (banners.length <= 1) return

        const timer = window.setInterval(() => {
            setActiveBanner((current) => (current + 1) % banners.length)
        }, 5000)

        return () => window.clearInterval(timer)
    }, [banners.length])

    // =====================================
    // البحث في المنتجات
    // =====================================

    const query = search.trim().toLowerCase()

    const filteredProducts = products.filter((product) => {
        return (
            product.name.toLowerCase().includes(query) ||
            product.category.toLowerCase().includes(query) ||
            (product.brand?.toLowerCase().includes(query) ?? false)
        )
    })

    // =====================================
    // الانتقال إلى التصنيف
    // =====================================

    const goToCategory = (category: string) => {
        if (category === 'الكل') {
            navigate('/products')
            return
        }

        navigate(`/category/${encodeURIComponent(category)}`)
    }

    // =====================================
    // الانتقال إلى رابط البانر
    // =====================================

    const handleBannerClick = (link?: string) => {
        if (!link) {
            navigate('/products')
            return
        }

        if (/^https?:\/\//i.test(link)) {
            window.location.assign(link)
            return
        }

        navigate(link.startsWith('/') ? link : `/${link}`)
    }

    return (
        <>
            <CategoryNav
                categories={categories}
                selectedCategory="الكل"
                onSelectCategory={goToCategory}
            />

            <main>
                {/* =====================================
                    HERO BANNERS
                ===================================== */}

                {currentBanner && (
                    <section
                        className="hero-banner hero-banner-dynamic"
                        key={currentBanner.id}
                    >
                        <picture className="hero-banner-picture">
                            {currentBanner.mobileImage && (
                                <source
                                    srcSet={currentBanner.mobileImage}
                                    media="(max-width: 600px)"
                                />
                            )}

                            <img
                                className="hero-banner-image"
                                src={currentBanner.image}
                                alt={
                                    currentBanner.title ||
                                    currentBanner.name
                                }
                            />
                        </picture>

                        <div className="hero-banner-overlay" />

                        <div className="hero-banner-content">
                            <div className="hero-copy">
                                {currentBanner.name && (
                                    <span className="hero-kicker">
                                        {currentBanner.name}
                                    </span>
                                )}

                                {currentBanner.title && (
                                    <h1>{currentBanner.title}</h1>
                                )}

                                {currentBanner.description && (
                                    <p>{currentBanner.description}</p>
                                )}

                                {currentBanner.buttonText && (
                                    <button
                                        className="hero-button"
                                        onClick={() =>
                                            handleBannerClick(
                                                currentBanner.link
                                            )
                                        }
                                    >
                                        {currentBanner.buttonText}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* الأسهم */}
                        {banners.length > 1 && (
                            <div className="hero-banner-arrows">
                                <button
                                    type="button"
                                    className="hero-banner-arrow prev"
                                    aria-label="البانر السابق"
                                    onClick={() =>
                                        setActiveBanner((current) =>
                                            current === 0
                                                ? banners.length - 1
                                                : current - 1
                                        )
                                    }
                                >
                                    ‹
                                </button>

                                <button
                                    type="button"
                                    className="hero-banner-arrow next"
                                    aria-label="البانر التالي"
                                    onClick={() =>
                                        setActiveBanner(
                                            (current) =>
                                                (current + 1) % banners.length
                                        )
                                    }
                                >
                                    ›
                                </button>
                            </div>
                        )}

                        {/* نقاط التنقل */}
                        {banners.length > 1 && (
                            <div className="slider-dots hero-banner-dots">
                                {banners.map((banner, index) => (
                                    <button
                                        key={banner.id}
                                        type="button"
                                        className={
                                            index === currentBannerIndex
                                                ? 'selected'
                                                : ''
                                        }
                                        aria-label={`عرض البانر ${index + 1}`}
                                        onClick={() =>
                                            setActiveBanner(index)
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                )}


                {/* =====================================
    SECONDARY BANNERS
===================================== */}

                {secondaryBanners.length > 0 && (
                    <section className="secondary-banners-section">
                        <div className="secondary-banners-grid">
                            {secondaryBanners.map(banner => (
                                <button
                                    type="button"
                                    className="secondary-banner-card"
                                    key={banner.id}
                                    onClick={() => handleBannerClick(banner.link)}
                                >
                                    <picture>
                                        {banner.mobileImage && (
                                            <source
                                                srcSet={banner.mobileImage}
                                                media="(max-width: 600px)"
                                            />
                                        )}

                                        <img
                                            src={banner.image}
                                            alt={banner.title || banner.name}
                                            loading="lazy"
                                        />
                                    </picture>

                                    <span className="secondary-banner-overlay" />

                                    <span className="secondary-banner-content">
                                        {banner.name && (
                                            <small>{banner.name}</small>
                                        )}

                                        {banner.title && (
                                            <strong>{banner.title}</strong>
                                        )}

                                        {banner.description && (
                                            <span>{banner.description}</span>
                                        )}

                                        {banner.buttonText && (
                                            <span className="secondary-banner-button">
                                                {banner.buttonText} ←
                                            </span>
                                        )}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* =====================================
                    CATEGORIES
                ===================================== */}

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
                            <p>
                                تحقق من اتصالك بالإنترنت وحاول مرة أخرى.
                            </p>
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
                            <p>
                                يمكنك إضافة أقسام جديدة من لوحة التحكم.
                            </p>
                        </div>
                    )}
                </section>

                {/* =====================================
                    PROMOTIONAL CARDS
                ===================================== */}

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

                {/* =====================================
                    PRODUCTS
                ===================================== */}

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
                            <p>
                                تحقق من اتصالك بالإنترنت وحاول مرة أخرى.
                            </p>

                            <button
                                onClick={() => window.location.reload()}
                            >
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
