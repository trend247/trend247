
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import ProductGrid from '../components/ProductGrid'
import type { Product } from '../context/store-context'

import {
    getPublishedProducts,
} from '../admin/services/productService'

import {
    getActiveCategories,
} from '../admin/services/categoryService'

import type {
    StoreCategory,
} from '../admin/services/categoryService'

import {
    getBanners,
} from '../admin/services/bannerService'

import type {
    StoreBanner,
} from '../admin/types/banner'

type CategoryProductsPageProps = {
    search: string
}

type SortOption =
    | 'default'
    | 'price-low'
    | 'price-high'
    | 'rating'
    | 'discount'

type PriceFilter =
    | 'all'
    | 'under200'
    | '200to500'
    | 'over500'

function CategoryProductsPage({
    search,
}: CategoryProductsPageProps) {
    const navigate = useNavigate()
    const { id } = useParams()

    const [sortBy, setSortBy] = useState<SortOption>('default')
    const [priceFilter, setPriceFilter] = useState<PriceFilter>('all')

    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<StoreCategory[]>([])
    const [banners, setBanners] = useState<StoreBanner[]>([])

    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(false)

    const category = categories.find(item => item.name === id)

    // =====================================
    // تحميل بيانات الصفحة
    // =====================================

    useEffect(() => {
        let cancelled = false

        async function loadData() {
            setLoading(true)
            setLoadError(false)

            try {
                const [
                    categoryResult,
                    productResult,
                    bannerResult,
                ] = await Promise.all([
                    getActiveCategories(),
                    getPublishedProducts(),
                    getBanners(),
                ])

                if (!cancelled) {
                    setCategories(categoryResult)
                    setProducts(productResult)
                    setBanners(bannerResult)
                }
            } catch (error) {
                console.error('تعذر تحميل بيانات التصنيف:', error)

                if (!cancelled) {
                    setLoadError(true)
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        void loadData()

        return () => {
            cancelled = true
        }
    }, [])

    // =====================================
    // بنرات التصنيف
    // =====================================

    const categoryBanners = useMemo(() => {
        if (!category) return []

        return banners
            .filter(banner =>
                banner.active &&
                banner.position === 'category' &&
                banner.categoryId === category.id
            )
            .sort(
                (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
            )
    }, [banners, category])

    // =====================================
    // منتجات التصنيف
    // =====================================

    const categoryProducts = useMemo(() => {
        if (!category) return []

        const searchQuery = search.trim().toLowerCase()

        let result = products.filter(product => {
            const matchesCategory = product.category === category.name

            const matchesSearch =
                product.name.toLowerCase().includes(searchQuery) ||
                product.category.toLowerCase().includes(searchQuery)

            let matchesPrice = true

            if (priceFilter === 'under200') {
                matchesPrice = product.price < 200
            } else if (priceFilter === '200to500') {
                matchesPrice =
                    product.price >= 200 &&
                    product.price <= 500
            } else if (priceFilter === 'over500') {
                matchesPrice = product.price > 500
            }

            return matchesCategory && matchesSearch && matchesPrice
        })

        result = [...result]

        switch (sortBy) {
            case 'price-low':
                result.sort((a, b) => a.price - b.price)
                break

            case 'price-high':
                result.sort((a, b) => b.price - a.price)
                break

            case 'rating':
                result.sort((a, b) => b.rating - a.rating)
                break

            case 'discount':
                result.sort((a, b) => {
                    const discountA = Number.parseInt(a.discount || '0', 10)
                    const discountB = Number.parseInt(b.discount || '0', 10)

                    return discountB - discountA
                })
                break
        }

        return result
    }, [products, category, search, sortBy, priceFilter])

    // =====================================
    // إعادة ضبط الفلاتر
    // =====================================

    const resetFilters = () => {
        setSortBy('default')
        setPriceFilter('all')
    }

    // =====================================
    // فتح رابط البانر
    // =====================================

    const handleBannerClick = (link: string) => {
        if (!link) return

        if (/^https?:\/\//i.test(link)) {
            window.location.assign(link)
            return
        }

        navigate(link.startsWith('/') ? link : `/${link}`)
    }

    // =====================================
    // حالات التحميل والأخطاء
    // =====================================

    if (loading) {
        return (
            <main className="product-details-page">
                <div className="catalog-empty">
                    <h3>جارٍ تحميل التصنيف...</h3>
                    <p>نجهز لك المنتجات والأقسام.</p>
                </div>
            </main>
        )
    }

    if (loadError) {
        return (
            <main className="product-details-page">
                <div className="catalog-empty">
                    <h3>تعذر تحميل التصنيف</h3>
                    <p>تحقق من اتصالك بالإنترنت وحاول مرة أخرى.</p>

                    <button onClick={() => window.location.reload()}>
                        إعادة المحاولة
                    </button>
                </div>
            </main>
        )
    }

    if (!category) {
        return (
            <main className="product-details-page">
                <h2>عذراً، هذا القسم غير موجود أو غير نشط</h2>

                <button
                    className="back-to-store"
                    onClick={() => navigate('/categories')}
                >
                    عرض جميع الأقسام
                </button>
            </main>
        )
    }

    // =====================================
    // عدد منتجات التصنيف
    // =====================================

    const categoryCount = products.filter(
        product => product.category === category.name
    ).length

    // =====================================
    // واجهة الصفحة
    // =====================================

    return (
        <main className="category-products-page">

            {/* مسار التنقل */}

            <nav className="breadcrumb" aria-label="مسار التنقل">
                <Link to="/">الرئيسية</Link>
                <span>‹</span>
                <Link to="/products">المنتجات</Link>
                <span>‹</span>
                <Link to="/categories">الأقسام</Link>
                <span>‹</span>
                <strong>{category.name}</strong>
            </nav>

            {/* واجهة التصنيف الرئيسية */}

            <section
                className="category-hero"
                style={{
                    backgroundImage: `linear-gradient(90deg, rgba(20,20,20,.88), rgba(20,20,20,.30)), url("${category.image}")`,
                }}
            >
                <div className="category-hero-content">
                    <span className="category-hero-icon">
                        {category.icon}
                    </span>

                    <div>
                        <small>اكتشف مجموعتنا المختارة</small>

                        <h1>{category.name}</h1>

                        <p>
                            {category.description ||
                                `تسوق منتجات ${category.name} واكتشف اختياراتنا المميزة.`}
                        </p>

                        <span className="category-hero-count">
                            {categoryCount} منتج في هذا القسم
                        </span>
                    </div>
                </div>
            </section>

            {/* =====================================
                CATEGORY BANNERS
            ===================================== */}

            {categoryBanners.length > 0 && (
                <section className="category-banners-section">
                    {categoryBanners.map(banner => (
                        <button
                            type="button"
                            className="category-banner-card"
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

                            <span className="category-banner-overlay" />

                            <span className="category-banner-content">
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
                                    <span className="category-banner-button">
                                        {banner.buttonText} ←
                                    </span>
                                )}
                            </span>
                        </button>
                    ))}
                </section>
            )}

            {/* =====================================
                أقسام أخرى
            ===================================== */}

            <section className="category-switcher">
                <div className="catalog-section-heading">
                    <div>
                        <small>اكتشف المزيد</small>
                        <h2>أقسام أخرى</h2>
                    </div>

                    <Link to="/categories" className="catalog-text-link">
                        كل الأقسام ←
                    </Link>
                </div>

                <div className="category-switcher-list">
                    {categories
                        .filter(item => item.id !== category.id)
                        .map(item => (
                            <button
                                key={item.id}
                                className="category-switcher-item"
                                onClick={() =>
                                    navigate(
                                        `/category/${encodeURIComponent(item.name)}`
                                    )
                                }
                            >
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    loading="lazy"
                                />

                                <span>
                                    {item.icon} {item.name}
                                </span>
                            </button>
                        ))}
                </div>
            </section>

            {/* =====================================
                المنتجات والفلاتر
            ===================================== */}

            <section className="products-section catalog-products-section">
                <div className="catalog-section-heading catalog-products-heading">
                    <div>
                        <small>اختياراتنا لك</small>
                        <h2>منتجات {category.name}</h2>
                    </div>

                    <span className="catalog-result-count">
                        {categoryProducts.length} منتج
                    </span>
                </div>

                {/* الفلاتر */}

                <div className="catalog-toolbar">
                    <div className="catalog-filter-group">
                        <label htmlFor="category-price-filter">
                            السعر
                        </label>

                        <select
                            id="category-price-filter"
                            value={priceFilter}
                            onChange={event =>
                                setPriceFilter(event.target.value as PriceFilter)
                            }
                        >
                            <option value="all">جميع الأسعار</option>
                            <option value="under200">أقل من 200 ر.س</option>
                            <option value="200to500">من 200 إلى 500 ر.س</option>
                            <option value="over500">أكثر من 500 ر.س</option>
                        </select>
                    </div>

                    <div className="catalog-filter-group">
                        <label htmlFor="category-sort">
                            ترتيب حسب
                        </label>

                        <select
                            id="category-sort"
                            value={sortBy}
                            onChange={event =>
                                setSortBy(event.target.value as SortOption)
                            }
                        >
                            <option value="default">الأكثر صلة</option>
                            <option value="price-low">السعر: الأقل أولاً</option>
                            <option value="price-high">السعر: الأعلى أولاً</option>
                            <option value="rating">الأعلى تقييماً</option>
                            <option value="discount">أعلى خصم</option>
                        </select>
                    </div>

                    <button
                        className="catalog-reset-button"
                        onClick={resetFilters}
                    >
                        ↺ إعادة ضبط
                    </button>
                </div>

                {/* عرض المنتجات */}

                {categoryProducts.length > 0 ? (
                    <ProductGrid
                        products={categoryProducts}
                        onSelectProduct={product =>
                            navigate(`/product/${product.id}`)
                        }
                    />
                ) : (
                    <div className="catalog-empty">
                        <span>{category.icon}</span>

                        <h3>لا توجد منتجات مطابقة</h3>

                        <p>
                            لا توجد منتجات منشورة في هذا القسم
                            أو أن الفلاتر الحالية لا تعرض نتائج.
                        </p>

                        <button onClick={resetFilters}>
                            إعادة ضبط الفلاتر
                        </button>
                    </div>
                )}
            </section>
        </main>
    )
}

export default CategoryProductsPage
