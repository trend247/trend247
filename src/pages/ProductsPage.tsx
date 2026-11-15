
import { useEffect, useMemo, useState } from 'react'
import type { Product } from '../context/store-context'
import type { StoreCategory } from '../services/categoryService'

import { Link, useNavigate } from 'react-router-dom'
import ProductGrid from '../components/ProductGrid'

import { getPublishedProducts } from '../admin/services/productService'
import { getActiveCategories } from '../services/categoryService'

type ProductsPageProps = {
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

function ProductsPage({ search }: ProductsPageProps) {
    const navigate = useNavigate()

    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<StoreCategory[]>([])

    const [loading, setLoading] = useState(true)
    const [categoriesLoading, setCategoriesLoading] = useState(true)

    const [loadError, setLoadError] = useState('')
    const [categoriesError, setCategoriesError] = useState('')

    const [sortBy, setSortBy] = useState<SortOption>('default')
    const [priceFilter, setPriceFilter] = useState<PriceFilter>('all')

    // جلب المنتجات المنشورة من Firestore
    useEffect(() => {
        let cancelled = false

        async function loadProducts() {
            try {
                setLoading(true)
                setLoadError('')

                const result = await getPublishedProducts()

                if (!cancelled) {
                    setProducts(result)
                }
            } catch (error) {
                console.error('Products loading error:', error)

                if (!cancelled) {
                    setLoadError(
                        'تعذر تحميل المنتجات. يرجى المحاولة مرة أخرى.'
                    )
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        void loadProducts()

        return () => {
            cancelled = true
        }
    }, [])

    // جلب التصنيفات النشطة من Firestore
    useEffect(() => {
        let cancelled = false

        async function loadCategories() {
            try {
                setCategoriesLoading(true)
                setCategoriesError('')

                const result = await getActiveCategories()

                if (!cancelled) {
                    setCategories(result)
                }
            } catch (error) {
                console.error('Categories loading error:', error)

                if (!cancelled) {
                    setCategoriesError(
                        'تعذر تحميل الأقسام حاليًا.'
                    )
                }
            } finally {
                if (!cancelled) {
                    setCategoriesLoading(false)
                }
            }
        }

        void loadCategories()

        return () => {
            cancelled = true
        }
    }, [])

    // البحث والتصفية والترتيب
    const filteredProducts = useMemo(() => {
        const query = search.trim().toLowerCase()

        let result = products.filter(product => {
            const matchesSearch =
                product.name.toLowerCase().includes(query) ||
                product.category.toLowerCase().includes(query) ||
                (product.brand ?? '').toLowerCase().includes(query)

            let matchesPrice = true

            if (priceFilter === 'under200') {
                matchesPrice = product.price < 200
            } else if (priceFilter === '200to500') {
                matchesPrice =
                    product.price >= 200 && product.price <= 500
            } else if (priceFilter === 'over500') {
                matchesPrice = product.price > 500
            }

            return matchesSearch && matchesPrice
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
                    const discountA = Number.parseInt(
                        a.discount || '0',
                        10
                    )

                    const discountB = Number.parseInt(
                        b.discount || '0',
                        10
                    )

                    return discountB - discountA
                })
                break
        }

        return result
    }, [products, search, sortBy, priceFilter])

    // عدد المنتجات في كل تصنيف
    const getCategoryCount = (categoryName: string) => {
        return products.filter(
            product => product.category === categoryName
        ).length
    }

    const resetFilters = () => {
        setSortBy('default')
        setPriceFilter('all')
    }

    return (
        <main className="products-page">

            {/* عنوان الصفحة */}
            <section className="catalog-intro">
                <div>
                    <span className="catalog-kicker">
                        عالم من الاختيارات
                    </span>

                    <h1>
                        اكتشف منتجات <em>TREND247</em>
                    </h1>

                    <p>
                        كل ما تبحث عنه، جمعناه لك في مكان واحد.
                    </p>
                </div>

                <div className="catalog-intro-icon">✦</div>
            </section>

            {/* التصنيفات الدائرية */}
            <section className="round-categories-section">
                <div className="catalog-section-heading">
                    <div>
                        <small>تسوق بالطريقة التي تحبها</small>
                        <h2>تصفح الأقسام</h2>
                    </div>

                    <Link
                        to="/categories"
                        className="catalog-text-link"
                    >
                        جميع الأقسام ←
                    </Link>
                </div>

                <div className="round-categories">
                    {categoriesLoading ? (
                        <div className="catalog-empty">
                            <span>⌛</span>
                            <p>جارٍ تحميل الأقسام...</p>
                        </div>
                    ) : categoriesError ? (
                        <div className="catalog-empty">
                            <span>⚠️</span>
                            <p>{categoriesError}</p>
                        </div>
                    ) : categories.length > 0 ? (
                        categories.map((category, index) => {
                            const count = getCategoryCount(category.name)

                            return (
                                <button
                                    className="round-category"
                                    key={category.id}
                                    onClick={() =>
                                        navigate(
                                            `/category/${encodeURIComponent(category.name)}`
                                        )
                                    }
                                >
                                    <div className="round-category-image">
                                        {category.image ? (
                                            <img
                                                src={category.image}
                                                alt={category.name}
                                                loading={index > 3 ? 'lazy' : 'eager'}
                                            />
                                        ) : (
                                            <div className="round-category-placeholder">
                                                {category.icon}
                                            </div>
                                        )}

                                        <span className="round-category-icon">
                                            {category.icon}
                                        </span>
                                    </div>

                                    <strong>{category.name}</strong>
                                    <small>{count} منتج</small>
                                </button>
                            )
                        })
                    ) : (
                        <div className="catalog-empty">
                            <span>📂</span>
                            <p>لا توجد أقسام نشطة حاليًا.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* المنتجات والفلاتر */}
            <section className="products-section catalog-products-section">

                <div className="catalog-section-heading catalog-products-heading">
                    <div>
                        <small>اختيارات تناسب ذوقك</small>
                        <h2>جميع المنتجات</h2>
                    </div>

                    <span className="catalog-result-count">
                        {loading
                            ? 'جارٍ التحميل...'
                            : `${filteredProducts.length} منتج`}
                    </span>
                </div>

                {/* الفلاتر */}
                <div className="catalog-toolbar">
                    <div className="catalog-filter-group">
                        <label htmlFor="price-filter">
                            السعر
                        </label>

                        <select
                            id="price-filter"
                            value={priceFilter}
                            onChange={event =>
                                setPriceFilter(
                                    event.target.value as PriceFilter
                                )
                            }
                        >
                            <option value="all">جميع الأسعار</option>
                            <option value="under200">
                                أقل من 200 ر.س
                            </option>
                            <option value="200to500">
                                من 200 إلى 500 ر.س
                            </option>
                            <option value="over500">
                                أكثر من 500 ر.س
                            </option>
                        </select>
                    </div>

                    <div className="catalog-filter-group">
                        <label htmlFor="sort-products">
                            ترتيب حسب
                        </label>

                        <select
                            id="sort-products"
                            value={sortBy}
                            onChange={event =>
                                setSortBy(
                                    event.target.value as SortOption
                                )
                            }
                        >
                            <option value="default">الأكثر صلة</option>
                            <option value="price-low">
                                السعر: الأقل أولاً
                            </option>
                            <option value="price-high">
                                السعر: الأعلى أولاً
                            </option>
                            <option value="rating">
                                الأعلى تقييماً
                            </option>
                            <option value="discount">
                                أعلى خصم
                            </option>
                        </select>
                    </div>

                    <button
                        className="catalog-reset-button"
                        onClick={resetFilters}
                    >
                        ↺ إعادة ضبط
                    </button>
                </div>

                {/* حالة التحميل */}
                {loading && (
                    <div className="catalog-empty">
                        <span>⌛</span>
                        <h3>جارٍ تحميل المنتجات</h3>
                        <p>
                            نجهز لك أحدث المنتجات من TREND247...
                        </p>
                    </div>
                )}

                {/* حالة الخطأ */}
                {!loading && loadError && (
                    <div className="catalog-empty">
                        <span>⚠️</span>
                        <h3>تعذر تحميل المنتجات</h3>
                        <p>{loadError}</p>

                        <button
                            onClick={() => window.location.reload()}
                        >
                            إعادة المحاولة
                        </button>
                    </div>
                )}

                {/* المنتجات */}
                {!loading && !loadError && filteredProducts.length > 0 && (
                    <ProductGrid
                        products={filteredProducts}
                        onSelectProduct={product =>
                            navigate(`/product/${product.id}`)
                        }
                    />
                )}

                {/* لا توجد منتجات */}
                {!loading &&
                    !loadError &&
                    filteredProducts.length === 0 && (
                        <div className="catalog-empty">
                            <span>🔎</span>

                            <h3>
                                {products.length === 0
                                    ? 'لا توجد منتجات منشورة حاليًا'
                                    : 'لم نعثر على منتجات مطابقة'}
                            </h3>

                            <p>
                                {products.length === 0
                                    ? 'عندما تنشر منتجات من لوحة الإدارة ستظهر هنا.'
                                    : 'غيّر خيارات التصفية أو جرّب عبارة بحث أخرى.'}
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

export default ProductsPage
