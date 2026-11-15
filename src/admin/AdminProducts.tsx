
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { Product } from '../context/store-context'

import {
    deleteProduct,
    getAdminProducts,
    setProductPublished,
} from './services/productService'

function AdminProducts() {
    const navigate = useNavigate()

    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('الكل')
    const [statusFilter, setStatusFilter] = useState('الكل')
    const [busyId, setBusyId] = useState<number | null>(null)

    // تحميل المنتجات من Firestore
    async function loadProducts() {
        try {
            setError('')
            setLoading(true)

            const result = await getAdminProducts()
            setProducts(result)
        } catch (err) {
            console.error('تعذر تحميل المنتجات:', err)
            setError('تعذر تحميل المنتجات. تأكد من اتصالك بالإنترنت وصلاحيات المدير.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        let cancelled = false

        async function fetchInitialProducts() {
            try {
                const result = await getAdminProducts()

                if (!cancelled) {
                    setProducts(result)
                }
            } catch (err) {
                console.error('تعذر تحميل المنتجات:', err)

                if (!cancelled) {
                    setError(
                        'تعذر تحميل المنتجات. تأكد من اتصالك بالإنترنت وصلاحيات المدير.'
                    )
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        void fetchInitialProducts()

        return () => {
            cancelled = true
        }
    }, [])

    // استخراج التصنيفات الموجودة في المنتجات
    const categories = useMemo(() => {
        return [
            'الكل',
            ...Array.from(
                new Set(products.map((product) => product.category).filter(Boolean))
            ),
        ]
    }, [products])

    // البحث والتصفية
    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const matchesSearch =
                product.name.toLowerCase().includes(search.toLowerCase()) ||
                String(product.id).includes(search)

            const matchesCategory =
                categoryFilter === 'الكل' ||
                product.category === categoryFilter

            const matchesStatus =
                statusFilter === 'الكل' ||
                (statusFilter === 'منشور' && product.isPublished === true) ||
                (statusFilter === 'مسودة' && product.isPublished !== true)

            return matchesSearch && matchesCategory && matchesStatus
        })
    }, [products, search, categoryFilter, statusFilter])

    // إظهار المنتج أو إخفاؤه
    async function handleTogglePublish(product: Product) {
        try {
            setBusyId(product.id)

            await setProductPublished(
                product.id,
                product.isPublished !== true
            )

            setProducts((current) =>
                current.map((item) =>
                    item.id === product.id
                        ? { ...item, isPublished: !product.isPublished }
                        : item
                )
            )
        } catch (err) {
            console.error('تعذر تغيير حالة المنتج:', err)
            alert('تعذر تغيير حالة نشر المنتج.')
        } finally {
            setBusyId(null)
        }
    }

    // حذف المنتج
    async function handleDelete(product: Product) {
        const confirmed = window.confirm(
            `هل أنت متأكد من حذف المنتج "${product.name}"؟ لا يمكن التراجع عن هذه العملية.`
        )

        if (!confirmed) return

        try {
            setBusyId(product.id)

            await deleteProduct(product.id)

            setProducts((current) =>
                current.filter((item) => item.id !== product.id)
            )
        } catch (err) {
            console.error('تعذر حذف المنتج:', err)
            alert('تعذر حذف المنتج. حاول مرة أخرى.')
        } finally {
            setBusyId(null)
        }
    }

    const publishedCount = products.filter(
        (product) => product.isPublished === true
    ).length

    const draftCount = products.length - publishedCount

    return (
        <div className="admin-products-page" dir="rtl">

            {/* عنوان الصفحة */}
            <div className="admin-products-heading">
                <div>
                    <h1>إدارة المنتجات</h1>
                    <p>تحكم في منتجات متجرك وأسعارها ومخزونها وحالة عرضها</p>
                </div>

                <button
                    className="admin-add-product-btn"
                    onClick={() => navigate('/admin/products/add')}
                >
                    <span>＋</span>
                    إضافة منتج جديد
                </button>
            </div>

            {/* الإحصائيات */}
            <div className="admin-products-stats">

                <div className="admin-product-stat">
                    <div className="admin-product-stat-icon">▣</div>
                    <div>
                        <span>إجمالي المنتجات</span>
                        <strong>{products.length}</strong>
                    </div>
                </div>

                <div className="admin-product-stat">
                    <div className="admin-product-stat-icon published">✓</div>
                    <div>
                        <span>المنتجات المنشورة</span>
                        <strong>{publishedCount}</strong>
                    </div>
                </div>

                <div className="admin-product-stat">
                    <div className="admin-product-stat-icon drafts">◷</div>
                    <div>
                        <span>المسودات والمخفية</span>
                        <strong>{draftCount}</strong>
                    </div>
                </div>

            </div>

            {/* أدوات البحث والتصفية */}
            <div className="admin-products-toolbar">

                <div className="admin-products-search">
                    <span>⌕</span>
                    <input
                        type="search"
                        placeholder="ابحث عن اسم المنتج أو رقمه..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>

                <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    aria-label="تصفية حسب التصنيف"
                >
                    {categories.map((category) => (
                        <option key={category} value={category}>
                            {category === 'الكل' ? 'كل التصنيفات' : category}
                        </option>
                    ))}
                </select>

                <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    aria-label="تصفية حسب حالة النشر"
                >
                    <option value="الكل">كل الحالات</option>
                    <option value="منشور">المنشورة</option>
                    <option value="مسودة">المخفية والمسودات</option>
                </select>

                <button
                    className="admin-products-refresh"
                    onClick={() => void loadProducts()}
                    disabled={loading}
                    title="تحديث المنتجات"
                >
                    ↻ تحديث
                </button>

            </div>

            {/* جدول المنتجات */}
            <div className="admin-products-table-card">

                <div className="admin-products-table-heading">
                    <div>
                        <h3>قائمة المنتجات</h3>
                        <span>
                            عرض {filteredProducts.length} من أصل {products.length} منتج
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="admin-products-state">
                        <div className="admin-products-spinner" />
                        <p>جارٍ تحميل المنتجات...</p>
                    </div>
                ) : error ? (
                    <div className="admin-products-state error">
                        <span>!</span>
                        <p>{error}</p>
                        <button onClick={() => void loadProducts()}>
                            إعادة المحاولة
                        </button>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="admin-products-state">
                        <span className="admin-products-empty-icon">▣</span>
                        <h3>
                            {products.length === 0
                                ? 'لا توجد منتجات حتى الآن'
                                : 'لم يتم العثور على منتجات'}
                        </h3>
                        <p>
                            {products.length === 0
                                ? 'ابدأ بإضافة أول منتج إلى متجرك.'
                                : 'جرّب تغيير كلمات البحث أو خيارات التصفية.'}
                        </p>
                    </div>
                ) : (
                    <div className="admin-products-table-wrapper">
                        <table className="admin-products-table">
                            <thead>
                                <tr>
                                    <th>المنتج</th>
                                    <th>رقم المنتج</th>
                                    <th>التصنيف</th>
                                    <th>السعر</th>
                                    <th>المخزون</th>
                                    <th>الحالة</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredProducts.map((product) => (
                                    <tr key={product.id}>
                                        <td>
                                            <div className="admin-product-info">
                                                {product.image ? (
                                                    <img
                                                        src={product.image}
                                                        alt={product.name}
                                                    />
                                                ) : (
                                                    <div className="admin-product-no-image">
                                                        ▣
                                                    </div>
                                                )}

                                                <div>
                                                    <strong>{product.name}</strong>
                                                    <small>
                                                        {product.isFeatured
                                                            ? '★ منتج مميز'
                                                            : 'منتج عادي'}
                                                    </small>
                                                </div>
                                            </div>
                                        </td>

                                        <td>#{product.id}</td>

                                        <td>{product.category || 'غير محدد'}</td>

                                        <td>
                                            <div className="admin-product-price">
                                                <strong>
                                                    {product.price.toLocaleString('ar-SA')} ر.س
                                                </strong>

                                                {product.oldPrice > product.price && (
                                                    <del>
                                                        {product.oldPrice.toLocaleString('ar-SA')}
                                                    </del>
                                                )}
                                            </div>
                                        </td>

                                        <td>
                                            {product.stock ?? 0}
                                        </td>

                                        <td>
                                            <span
                                                className={`admin-product-status ${product.isPublished
                                                    ? 'is-published'
                                                    : 'is-draft'
                                                    }`}
                                            >
                                                {product.isPublished
                                                    ? 'منشور'
                                                    : 'مخفي'}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="admin-product-actions">

                                                <button
                                                    className="admin-product-action publish"
                                                    onClick={() => void handleTogglePublish(product)}
                                                    disabled={busyId === product.id}
                                                    title={
                                                        product.isPublished
                                                            ? 'إخفاء المنتج'
                                                            : 'نشر المنتج'
                                                    }
                                                >
                                                    {product.isPublished ? 'إخفاء' : 'نشر'}
                                                </button>

                                                <button
                                                    className="admin-product-action edit"
                                                    onClick={() => navigate(
                                                        `/admin/products/edit/${product.id}`
                                                    )}
                                                    title="تعديل المنتج"
                                                >
                                                    تعديل
                                                </button>

                                                <button
                                                    className="admin-product-action delete"
                                                    onClick={() => void handleDelete(product)}
                                                    disabled={busyId === product.id}
                                                    title="حذف المنتج"
                                                >
                                                    حذف
                                                </button>

                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

            </div>
        </div>
    )
}

export default AdminProducts
