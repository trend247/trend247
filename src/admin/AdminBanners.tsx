import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './Admin.css'
import BannerImageUpload from './components/BannerImageUpload'
import type {
    BannerInput,
    StoreBanner,
} from './types/banner'

import {
    getBanners,
    addBanner,
    updateBanner,
    toggleBannerStatus,
    deleteBanner,
} from './services/bannerService'

import {
    getActiveCategories,
    type StoreCategory,
} from './services/categoryService'

const emptyBanner: BannerInput = {
    name: '',
    title: '',
    description: '',
    image: '',
    mobileImage: '',
    link: '',
    buttonText: '',
    position: 'hero',
    categoryId: '',
    active: true,
    sortOrder: 0,
}

function AdminBanners() {
    const [banners, setBanners] = useState<StoreBanner[]>([])
    const [showForm, setShowForm] = useState(false)
    const [editingBanner, setEditingBanner] = useState<StoreBanner | null>(null)
    const [formData, setFormData] = useState<BannerInput>(emptyBanner)
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [error, setError] = useState('')
    const [categories, setCategories] = useState<StoreCategory[]>([])
    // =====================================
    // تحميل البانرات من Firestore
    // =====================================

    useEffect(() => {
        let cancelled = false

        async function loadBanners() {
            setLoading(true)
            setError('')

            try {
                const data = await getBanners()

                if (!cancelled) {
                    setBanners(data)
                }
            } catch (err) {
                console.error('Error loading banners:', err)

                if (!cancelled) {
                    setError('تعذر تحميل البانرات. تأكد من اتصالك وحاول مرة أخرى.')
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        loadBanners()

        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        let cancelled = false

        async function loadCategories() {
            try {
                const data = await getActiveCategories()

                if (!cancelled) {
                    setCategories(data)
                }
            } catch (err) {
                console.error('Error loading banner categories:', err)
            }
        }

        void loadCategories()

        return () => {
            cancelled = true
        }
    }, [])

    // =====================================
    // الإحصائيات والفلاتر
    // =====================================

    const activeCount = banners.filter((banner) => banner.active).length

    const filteredBanners = banners.filter((banner) => {
        if (filter === 'active') return banner.active
        if (filter === 'inactive') return !banner.active
        return true
    })

    // =====================================
    // فتح نموذج الإضافة
    // =====================================

    function openAddForm() {
        setEditingBanner(null)
        setFormData({ ...emptyBanner })
        setError('')
        setShowForm(true)
    }

    // =====================================
    // فتح نموذج التعديل
    // =====================================

    function openEditForm(banner: StoreBanner) {
        setEditingBanner(banner)

        setFormData({
            name: banner.name,
            title: banner.title,
            description: banner.description,
            image: banner.image,
            mobileImage: banner.mobileImage,
            link: banner.link,
            buttonText: banner.buttonText,
            position: banner.position,
            active: banner.active,
            sortOrder: banner.sortOrder ?? 0,
            categoryId: banner.categoryId ?? '',
        })

        setError('')
        setShowForm(true)
    }

    // =====================================
    // إغلاق النموذج
    // =====================================

    function closeForm() {
        if (saving) return

        setShowForm(false)
        setEditingBanner(null)
        setFormData({ ...emptyBanner })
        setError('')
    }

    // =====================================
    // إضافة أو تعديل بانر
    // =====================================

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        if (saving) return

        setSaving(true)
        setError('')

        try {
            if (editingBanner) {
                await updateBanner(editingBanner.id, formData)

                setBanners((prev) =>
                    prev.map((banner) =>
                        banner.id === editingBanner.id
                            ? { ...banner, ...formData }
                            : banner
                    )
                )
            } else {
                const nextSortOrder = banners.length > 0
                    ? Math.min(...banners.map((banner) => banner.sortOrder ?? 0)) - 1
                    : 0

                const newBannerData: BannerInput = {
                    ...formData,
                    sortOrder: nextSortOrder,
                }

                const newId = await addBanner(newBannerData)

                const newBanner: StoreBanner = {
                    ...newBannerData,
                    id: newId,
                }

                setBanners((prev) => [newBanner, ...prev])
            }

            setShowForm(false)
            setEditingBanner(null)
            setFormData({ ...emptyBanner })
        } catch (err) {
            console.error('Error saving banner:', err)
            setError('حدث خطأ أثناء حفظ البانر. حاول مرة أخرى.')
        } finally {
            setSaving(false)
        }
    }

    // =====================================
    // تفعيل وإيقاف البانر
    // =====================================

    async function toggleBanner(id: string) {
        const banner = banners.find((item) => item.id === id)
        if (!banner || actionLoading) return

        const newStatus = !banner.active

        setActionLoading(id)
        setError('')

        try {
            await toggleBannerStatus(id, newStatus)

            setBanners((prev) =>
                prev.map((item) =>
                    item.id === id
                        ? { ...item, active: newStatus }
                        : item
                )
            )
        } catch (err) {
            console.error('Error toggling banner:', err)
            setError('تعذر تغيير حالة البانر.')
        } finally {
            setActionLoading(null)
        }
    }

    // =====================================
    // حذف البانر
    // =====================================

    async function handleDelete(id: string) {
        if (actionLoading) return

        const confirmed = window.confirm('هل تريد حذف هذا البانر نهائيًا؟')
        if (!confirmed) return

        setActionLoading(id)
        setError('')

        try {
            await deleteBanner(id)

            setBanners((prev) =>
                prev.filter((banner) => banner.id !== id)
            )
        } catch (err) {
            console.error('Error deleting banner:', err)
            setError('تعذر حذف البانر. حاول مرة أخرى.')
        } finally {
            setActionLoading(null)
        }
    }

    // =====================================
    // تحديث الحقول
    // =====================================

    function updateField<K extends keyof BannerInput>(
        key: K,
        value: BannerInput[K]
    ) {
        setFormData((prev) => ({
            ...prev,
            [key]: value,
        }))
    }

    // =====================================
    // واجهة الصفحة
    // =====================================

    return (
        <div className="admin-banners" dir="rtl">

            {/* عنوان الصفحة */}
            <div className="banners-heading">
                <div>
                    <h2>إدارة البانرات</h2>
                    <p>أنشئ وأدِر البنرات الإعلانية في واجهة متجرك</p>
                </div>

                <button
                    className="banner-add-button"
                    onClick={openAddForm}
                >
                    <span>＋</span>
                    إضافة بانر
                </button>
            </div>

            {/* رسائل الأخطاء */}
            {error && !showForm && (
                <div className="admin-error-message">
                    {error}
                </div>
            )}

            {/* الإحصائيات */}
            <div className="banner-stats">

                <div className="banner-stat">
                    <div className="banner-stat-icon total">▧</div>
                    <div>
                        <span>إجمالي البنرات</span>
                        <strong>{banners.length}</strong>
                    </div>
                </div>

                <div className="banner-stat">
                    <div className="banner-stat-icon active">✓</div>
                    <div>
                        <span>بنرات نشطة</span>
                        <strong>{activeCount}</strong>
                    </div>
                </div>

                <div className="banner-stat">
                    <div className="banner-stat-icon inactive">◷</div>
                    <div>
                        <span>بنرات متوقفة</span>
                        <strong>{banners.length - activeCount}</strong>
                    </div>
                </div>

            </div>

            {/* الفلاتر */}
            <div className="banners-toolbar">
                <div className="banners-filter">

                    <button
                        className={filter === 'all' ? 'selected' : ''}
                        onClick={() => setFilter('all')}
                    >
                        الكل
                    </button>

                    <button
                        className={filter === 'active' ? 'selected' : ''}
                        onClick={() => setFilter('active')}
                    >
                        نشطة
                    </button>

                    <button
                        className={filter === 'inactive' ? 'selected' : ''}
                        onClick={() => setFilter('inactive')}
                    >
                        متوقفة
                    </button>

                </div>

                <span className="banners-results">
                    {filteredBanners.length} بنر
                </span>
            </div>

            {/* حالة التحميل */}
            {loading ? (
                <div className="banners-empty">
                    <div className="banners-empty-icon">◷</div>
                    <h3>جارٍ تحميل البانرات...</h3>
                    <p>يرجى الانتظار</p>
                </div>
            ) : filteredBanners.length === 0 ? (

                /* الحالة الفارغة */
                <div className="banners-empty">

                    <div className="banners-empty-icon">▧</div>

                    <h3>
                        {banners.length === 0
                            ? 'لا توجد بنرات حتى الآن'
                            : 'لا توجد بنرات في هذا التصنيف'}
                    </h3>

                    <p>
                        أضف أول بانر لمتجرك وابدأ بتجهيز واجهة مميزة.
                    </p>

                    {banners.length === 0 && (
                        <button
                            className="banner-add-button"
                            onClick={openAddForm}
                        >
                            ＋ إضافة أول بانر
                        </button>
                    )}

                </div>
            ) : (

                /* قائمة البانرات */
                <div className="banners-grid">
                    {filteredBanners.map((banner) => (
                        <article
                            className="banner-card"
                            key={banner.id}
                        >

                            <div className="banner-card-image">

                                {banner.image ? (
                                    <img
                                        src={banner.image}
                                        alt={banner.name}
                                    />
                                ) : (
                                    <div className="banner-image-placeholder">
                                        <span>▧</span>
                                        <small>لا توجد صورة</small>
                                    </div>
                                )}

                                <span
                                    className={`banner-status ${banner.active
                                        ? 'is-active'
                                        : 'is-inactive'
                                        }`}
                                >
                                    {banner.active ? 'نشط' : 'متوقف'}
                                </span>

                                <span className="banner-position">
                                    {banner.position === 'hero'
                                        ? 'البنر الرئيسي'
                                        : banner.position === 'secondary'
                                            ? 'البنر الفرعي'
                                            : `تصنيف: ${categories.find(
                                                category => category.id === banner.categoryId
                                            )?.name ?? 'غير محدد'
                                            }`}
                                </span>

                            </div>

                            <div className="banner-card-content">

                                <div className="banner-card-title">
                                    <h3>{banner.name || 'بنر بدون اسم'}</h3>
                                    <p>{banner.title || 'بدون عنوان'}</p>
                                </div>

                                <div className="banner-card-meta">
                                    <span>مكان العرض</span>
                                    <strong>
                                        {banner.position === 'hero'
                                            ? 'رئيسي'
                                            : banner.position === 'secondary'
                                                ? 'فرعي'
                                                : 'تصنيف'}
                                    </strong>
                                </div>

                                <div className="banner-card-actions">

                                    <button
                                        className="banner-edit-button"
                                        onClick={() => openEditForm(banner)}
                                        disabled={!!actionLoading}
                                    >
                                        ✎ تعديل
                                    </button>

                                    <button
                                        className={`banner-toggle-button ${banner.active
                                            ? 'turn-off'
                                            : 'turn-on'
                                            }`}
                                        onClick={() => toggleBanner(banner.id)}
                                        disabled={!!actionLoading}
                                    >
                                        {actionLoading === banner.id
                                            ? '...'
                                            : banner.active
                                                ? 'إيقاف'
                                                : 'تفعيل'}
                                    </button>

                                    <button
                                        className="banner-delete-button"
                                        onClick={() => handleDelete(banner.id)}
                                        disabled={!!actionLoading}
                                        title="حذف البانر"
                                    >
                                        ×
                                    </button>

                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {/* نموذج الإضافة والتعديل */}
            {showForm && (
                <div
                    className="banner-modal-overlay"
                    onClick={closeForm}
                >
                    <div
                        className="banner-modal"
                        onClick={(e) => e.stopPropagation()}
                    >

                        <div className="banner-modal-header">
                            <div>
                                <h2>
                                    {editingBanner
                                        ? 'تعديل البانر'
                                        : 'إضافة بانر جديد'}
                                </h2>
                                <p>أدخل تفاصيل البانر الذي تريد عرضه</p>
                            </div>

                            <button
                                className="banner-modal-close"
                                onClick={closeForm}
                                disabled={saving}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>

                            <div className="banner-form-grid">

                                <div className="banner-form-field full">
                                    <label>الاسم الداخلي للبانر *</label>
                                    <input
                                        value={formData.name}
                                        onChange={(e) =>
                                            updateField('name', e.target.value)
                                        }
                                        placeholder="مثال: عروض الجمعة البيضاء"
                                        required
                                    />
                                </div>

                                <div className="banner-form-field full">
                                    <label>عنوان البانر</label>
                                    <input
                                        value={formData.title}
                                        onChange={(e) =>
                                            updateField('title', e.target.value)
                                        }
                                        placeholder="عنوان يظهر على البانر"
                                    />
                                </div>

                                <div className="banner-form-field full">
                                    <label>وصف مختصر</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) =>
                                            updateField('description', e.target.value)
                                        }
                                        placeholder="اكتب وصفًا تسويقيًا..."
                                        rows={3}
                                    />
                                </div>

                                <div className="admin-banner-images-grid">
                                    <BannerImageUpload
                                        label="صورة البانر للكمبيوتر"
                                        value={formData.image}
                                        required
                                        aspectRatio={1920 / 600}
                                        outputWidth={1920}
                                        outputHeight={600}
                                        onChange={url =>
                                            setFormData(previous => ({
                                                ...previous,
                                                image: url,
                                            }))
                                        }
                                    />

                                    <BannerImageUpload
                                        label="صورة البانر للجوال (اختياري)"
                                        value={formData.mobileImage}
                                        aspectRatio={900 / 1125}
                                        outputWidth={900}
                                        outputHeight={1125}
                                        onChange={url =>
                                            setFormData(previous => ({
                                                ...previous,
                                                mobileImage: url,
                                            }))
                                        }
                                    />
                                </div>

                                {formData.image && (
                                    <div className="banner-form-field full">
                                        <label>معاينة الصورة</label>
                                        <div className="banner-form-preview">
                                            <img
                                                src={formData.image}
                                                alt="معاينة البانر"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none'
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="banner-form-field">
                                    <label>نص الزر</label>
                                    <input
                                        value={formData.buttonText}
                                        onChange={(e) =>
                                            updateField('buttonText', e.target.value)
                                        }
                                        placeholder="تسوق الآن"
                                    />
                                </div>

                                <div className="banner-form-field">
                                    <label>رابط الوجهة</label>
                                    <input
                                        value={formData.link}
                                        onChange={(e) =>
                                            updateField('link', e.target.value)
                                        }
                                        placeholder="/products أو /category/..."
                                    />
                                </div>


                                <div className="banner-form-field">
                                    <label>مكان عرض البانر</label>

                                    <select
                                        value={formData.position}
                                        onChange={(e) => {
                                            const position = e.target.value as BannerInput['position']

                                            setFormData(previous => ({
                                                ...previous,
                                                position,
                                                categoryId: position === 'category'
                                                    ? previous.categoryId
                                                    : '',
                                            }))
                                        }}
                                    >
                                        <option value="hero">البنر الرئيسي</option>
                                        <option value="secondary">البنر الفرعي</option>
                                        <option value="category">بنر داخل تصنيف</option>
                                    </select>
                                </div>

                                {formData.position === 'category' && (
                                    <div className="banner-form-field">
                                        <label>اختر التصنيف *</label>

                                        <select
                                            value={formData.categoryId}
                                            onChange={(e) =>
                                                updateField('categoryId', e.target.value)
                                            }
                                            required
                                        >
                                            <option value="">اختر التصنيف</option>

                                            {categories.map(category => (
                                                <option key={category.id} value={category.id}>
                                                    {category.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}


                                <div className="banner-form-field">
                                    <label>حالة البانر</label>
                                    <select
                                        value={formData.active ? 'active' : 'inactive'}
                                        onChange={(e) =>
                                            updateField(
                                                'active',
                                                e.target.value === 'active'
                                            )
                                        }
                                    >
                                        <option value="active">نشط</option>
                                        <option value="inactive">متوقف</option>
                                    </select>
                                </div>

                            </div>

                            {/* رسائل النموذج */}
                            {error && (
                                <div className="admin-error-message">
                                    {error}
                                </div>
                            )}

                            <div className="banner-modal-footer">

                                <button
                                    type="button"
                                    className="banner-cancel-button"
                                    onClick={closeForm}
                                    disabled={saving}
                                >
                                    إلغاء
                                </button>

                                <button
                                    type="submit"
                                    className="banner-save-button"
                                    disabled={saving}
                                >
                                    {saving
                                        ? 'جارٍ الحفظ...'
                                        : editingBanner
                                            ? 'حفظ التعديلات'
                                            : 'إضافة البانر'}
                                </button>

                            </div>

                        </form>
                    </div>
                </div>
            )}

        </div>
    )
}

export default AdminBanners