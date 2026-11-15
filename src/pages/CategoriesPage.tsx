
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

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

function CategoriesPage() {
    const navigate = useNavigate()

    const [categories, setCategories] = useState<StoreCategory[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(false)

    useEffect(() => {
        let cancelled = false

        async function loadData() {
            setLoading(true)
            setLoadError(false)

            try {
                const [categoryResult, productResult] = await Promise.all([
                    getActiveCategories(),
                    getPublishedProducts(),
                ])

                if (!cancelled) {
                    setCategories(categoryResult)
                    setProducts(productResult)
                }
            } catch (error) {
                console.error('تعذر تحميل بيانات التصنيفات:', error)

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

    return (
        <main className="categories-page">
            <section className="category-section">
                <div className="section-heading">
                    <div>
                        <small>اختر ما يناسب اهتماماتك</small>
                        <h2>جميع أقسام المتجر</h2>
                    </div>

                    <span className="products-count">
                        {categories.length} أقسام
                    </span>
                </div>

                {loading ? (
                    <div className="catalog-empty">
                        <h3>جارٍ تحميل الأقسام...</h3>
                        <p>نجهز لك أحدث المنتجات.</p>
                    </div>
                ) : loadError ? (
                    <div className="catalog-empty">
                        <h3>تعذر تحميل الأقسام</h3>
                        <p>
                            يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً.
                        </p>

                        <button
                            onClick={() => window.location.reload()}
                        >
                            إعادة المحاولة
                        </button>
                    </div>
                ) : categories.length === 0 ? (
                    <div className="catalog-empty">
                        <h3>لا توجد أقسام متاحة حاليًا</h3>
                        <p>سيتم عرض الأقسام هنا عند تفعيلها من لوحة التحكم.</p>
                    </div>
                ) : (
                    <div className="category-grid">
                        {categories.map(category => {
                            const productCount = products.filter(
                                product => product.category === category.name
                            ).length

                            return (
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

                                    <small>{productCount} منتج</small>
                                </button>
                            )
                        })}
                    </div>
                )}
            </section>
        </main>
    )
}

export default CategoriesPage
