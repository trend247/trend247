
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import {
    getAdminProducts,
} from './services/productService'

import {
    getAdminCategories,
} from './services/categoryService'

import type { Product } from '../context/store-context'
import type { StoreCategory } from './services/categoryService'

type DashboardData = {
    products: Product[]
    categories: StoreCategory[]
}

function formatNumber(value: number): string {
    return new Intl.NumberFormat('ar-SA').format(value)
}

function AdminDashboard() {
    const [data, setData] = useState<DashboardData>({
        products: [],
        categories: [],
    })

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // =====================================
    // جلب بيانات المتجر من Firebase
    // =====================================

    useEffect(() => {
        let isMounted = true

        async function loadDashboardData() {
            try {
                setLoading(true)
                setError('')

                const [products, categories] = await Promise.all([
                    getAdminProducts(),
                    getAdminCategories(),
                ])

                if (!isMounted) return

                setData({
                    products,
                    categories,
                })
            } catch (err) {
                console.error('Dashboard data error:', err)

                if (isMounted) {
                    setError(
                        'تعذر تحميل بيانات لوحة التحكم. تحقق من اتصال Firebase وصلاحيات القراءة.'
                    )
                }
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        loadDashboardData()

        return () => {
            isMounted = false
        }
    }, [])

    // =====================================
    // حساب الإحصائيات الحقيقية
    // =====================================

    const totalProducts = data.products.length

    const publishedProducts = data.products.filter(
        product => product.isPublished === true
    ).length

    const unpublishedProducts = totalProducts - publishedProducts

    const totalCategories = data.categories.length

    const activeCategories = data.categories.filter(
        category => category.isActive
    ).length

    const hiddenCategories = totalCategories - activeCategories

    // =====================================
    // بطاقات الإحصائيات
    // =====================================

    const stats = [
        {
            title: 'إجمالي المنتجات',
            value: formatNumber(totalProducts),
            note: `${formatNumber(publishedProducts)} منشور · ${formatNumber(unpublishedProducts)} غير منشور`,
            icon: '📦',
            className: 'products',
        },
        {
            title: 'المنتجات المنشورة',
            value: formatNumber(publishedProducts),
            note: 'المنتجات المتاحة للنشر في المتجر',
            icon: '🛍',
            className: 'orders',
        },
        {
            title: 'إجمالي التصنيفات',
            value: formatNumber(totalCategories),
            note: `${formatNumber(activeCategories)} نشط · ${formatNumber(hiddenCategories)} مخفي`,
            icon: '◈',
            className: 'customers',
        },
        {
            title: 'التصنيفات النشطة',
            value: formatNumber(activeCategories),
            note: 'التصنيفات الظاهرة في المتجر',
            icon: '🗂',
            className: 'sales',
        },
    ]

    return (
        <div className="admin-dashboard">

            {/* الترحيب */}
            <section className="dashboard-welcome">
                <div>
                    <span className="dashboard-eyebrow">
                        مركز إدارة TREND247
                    </span>

                    <h1>مرحبًا بك في لوحة التحكم 👋</h1>

                    <p>
                        تابع متجرك، وأدر منتجاتك وطلباتك،
                        وتحكم في كل تفاصيل تجربة عملائك من مكان واحد.
                    </p>

                    <Link
                        to="/admin/products"
                        className="dashboard-main-button"
                    >
                        إدارة المنتجات
                        <span>←</span>
                    </Link>
                </div>

                <div className="dashboard-welcome-art">
                    <div className="dashboard-art-circle">
                        <span>🚀</span>
                    </div>

                    <div className="dashboard-art-star">✦</div>
                </div>
            </section>

            {/* الإحصائيات */}
            <section className="dashboard-section">

                <div className="dashboard-section-heading">
                    <div>
                        <h2>نظرة عامة</h2>
                        <p>إحصائيات المنتجات والتصنيفات</p>
                    </div>

                    <span className="dashboard-period">
                        {loading ? 'جارٍ تحميل البيانات...' : 'البيانات الحالية'}
                    </span>
                </div>

                {error && (
                    <div className="dashboard-error" role="alert">
                        {error}
                    </div>
                )}

                <div className="dashboard-stats">
                    {stats.map((stat) => (
                        <article
                            className="dashboard-stat-card"
                            key={stat.title}
                        >
                            <div
                                className={`dashboard-stat-icon ${stat.className}`}
                            >
                                {stat.icon}
                            </div>

                            <div className="dashboard-stat-info">
                                <span>{stat.title}</span>

                                <strong>
                                    {loading ? '...' : stat.value}
                                </strong>

                                <small>
                                    {loading ? 'جارٍ جلب البيانات' : stat.note}
                                </small>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            {/* محتوى الصفحة */}
            <section className="dashboard-main-grid">

                <article className="dashboard-panel dashboard-chart-panel">
                    <div className="dashboard-panel-heading">
                        <div>
                            <h2>تحليل المبيعات</h2>
                            <p>متابعة أداء المبيعات خلال الفترة</p>
                        </div>

                        <span className="dashboard-panel-icon">↗</span>
                    </div>

                    <div className="dashboard-empty-chart">
                        <div className="dashboard-chart-symbol">▥</div>

                        <strong>سيظهر تحليل المبيعات هنا</strong>

                        <p>
                            سيتم ربط هذا القسم بنظام الطلبات
                            بعد إنشائه، وحساب المبيعات من الطلبات الفعلية.
                        </p>
                    </div>
                </article>

                <article className="dashboard-panel dashboard-quick-panel">
                    <div className="dashboard-panel-heading">
                        <div>
                            <h2>اختصارات سريعة</h2>
                            <p>الوصول إلى المهام المهمة</p>
                        </div>
                    </div>

                    <div className="dashboard-quick-links">
                        <Link to="/admin/products">
                            <span>📦</span>

                            <div>
                                <strong>المنتجات</strong>
                                <small>إدارة وإضافة المنتجات</small>
                            </div>

                            <b>←</b>
                        </Link>

                        <Link to="/admin/categories">
                            <span>◈</span>

                            <div>
                                <strong>التصنيفات</strong>
                                <small>تنظيم أقسام المتجر</small>
                            </div>

                            <b>←</b>
                        </Link>

                        <Link to="/admin/orders">
                            <span>🛍</span>

                            <div>
                                <strong>الطلبات</strong>
                                <small>متابعة طلبات العملاء</small>
                            </div>

                            <b>←</b>
                        </Link>

                        <Link to="/admin/banners">
                            <span>🖼</span>

                            <div>
                                <strong>البانرات</strong>
                                <small>إدارة إعلانات المتجر</small>
                            </div>

                            <b>←</b>
                        </Link>
                    </div>
                </article>

            </section>

            {/* أحدث الطلبات */}
            <section className="dashboard-panel dashboard-recent-panel">

                <div className="dashboard-panel-heading">
                    <div>
                        <h2>أحدث الطلبات</h2>
                        <p>آخر الطلبات الواردة إلى متجرك</p>
                    </div>

                    <Link to="/admin/orders">
                        عرض جميع الطلبات ←
                    </Link>
                </div>

                <div className="dashboard-empty-state">
                    <span>🛍</span>

                    <strong>نظام الطلبات لم يتم إنشاؤه بعد</strong>

                    <p>
                        بعد إنشاء نظام الطلبات وربطه بقاعدة البيانات،
                        ستظهر أحدث طلبات العملاء هنا.
                    </p>
                </div>

            </section>

        </div>
    )
}

export default AdminDashboard
