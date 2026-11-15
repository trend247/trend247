
import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './Admin.css'

import {
    addCategory,
    deleteCategory,
    getAdminCategories,
    toggleCategoryStatus,
    updateCategory,
} from './services/categoryService'

import type { StoreCategory } from './services/categoryService'

const emptyForm = {
    name: '',
    icon: '📦',
    image: '',
    description: '',
    isActive: true,
    sortOrder: 1,
}

function AdminCategories() {
    const [categories, setCategories] = useState<StoreCategory[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState(emptyForm)
    const [showForm, setShowForm] = useState(false)

    // حالة رفع صورة التصنيف
    const [uploadingImage, setUploadingImage] = useState(false)
    const [uploadProgress, setUploadProgress] = useState('')

    // منع تكرار الضغط على إجراءات التصنيفات
    const [processingIds, setProcessingIds] = useState<string[]>([])

    // =====================================
    // تحميل التصنيفات عند فتح الصفحة فقط
    // =====================================

    useEffect(() => {
        let cancelled = false

        async function loadInitialCategories() {
            setLoading(true)
            setError('')

            try {
                const data = await getAdminCategories()

                if (!cancelled) {
                    setCategories(data)
                }
            } catch (err) {
                console.error('Load categories error:', err)

                if (!cancelled) {
                    setError(
                        'تعذر تحميل التصنيفات. تحقق من اتصالك وصلاحيات المدير.'
                    )
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        void loadInitialCategories()

        return () => {
            cancelled = true
        }
    }, [])

    // =====================================
    // أدوات مساعدة
    // =====================================

    function sortCategories(items: StoreCategory[]) {
        return [...items].sort(
            (a, b) => a.sortOrder - b.sortOrder
        )
    }

    function startProcessing(id: string) {
        setProcessingIds((current) =>
            current.includes(id) ? current : [...current, id]
        )
    }

    function stopProcessing(id: string) {
        setProcessingIds((current) =>
            current.filter((item) => item !== id)
        )
    }

    // =====================================
    // رفع صورة التصنيف إلى Cloudinary
    // =====================================

    async function handleUploadCategoryImage(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const input = event.currentTarget
        const file = input.files?.[0]

        // السماح باختيار الصورة نفسها مرة أخرى
        input.value = ''

        if (!file) return

        if (!file.type.startsWith('image/')) {
            setError('يرجى اختيار ملف صورة صالح.')
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            setError('حجم الصورة يجب ألا يتجاوز 10 ميجابايت.')
            return
        }

        setUploadingImage(true)
        setError('')
        setSuccess('')
        setUploadProgress('جارٍ رفع صورة التصنيف...')

        try {
            const formData = new FormData()

            formData.append('file', file)
            formData.append('upload_preset', 'trend247')

            const response = await fetch(
                'https://api.cloudinary.com/v1_1/nwqt8c1a/image/upload',
                {
                    method: 'POST',
                    body: formData,
                }
            )

            const result = await response.json()

            if (!response.ok || !result.secure_url) {
                throw new Error(
                    result.error?.message ||
                    'تعذر رفع الصورة إلى Cloudinary.'
                )
            }

            setForm((current) => ({
                ...current,
                image: result.secure_url,
            }))

            setUploadProgress('تم رفع الصورة بنجاح.')

        } catch (err) {
            console.error('Category image upload error:', err)

            setError(
                err instanceof Error
                    ? err.message
                    : 'حدث خطأ أثناء رفع صورة التصنيف.'
            )

            setUploadProgress('')
        } finally {
            setUploadingImage(false)
        }
    }

    // =====================================
    // فتح نافذة إضافة تصنيف
    // =====================================

    function handleNewCategory() {
        setEditingId(null)

        setForm({
            ...emptyForm,
            sortOrder: categories.length + 1,
        })

        setError('')
        setSuccess('')
        setUploadProgress('')
        setShowForm(true)
    }

    // =====================================
    // فتح نافذة تعديل تصنيف
    // =====================================

    function handleEdit(category: StoreCategory) {
        setEditingId(category.id)

        setForm({
            name: category.name,
            icon: category.icon,
            image: category.image,
            description: category.description,
            isActive: category.isActive,
            sortOrder: category.sortOrder,
        })

        setError('')
        setSuccess('')
        setUploadProgress('')
        setShowForm(true)
    }

    // =====================================
    // إغلاق النافذة
    // =====================================

    function handleCloseForm() {
        if (saving || uploadingImage) return

        setShowForm(false)
        setEditingId(null)
        setError('')
        setUploadProgress('')
    }

    // =====================================
    // حفظ التصنيف دون إعادة تحميل القائمة
    // =====================================

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        if (uploadingImage) {
            setError('يرجى الانتظار حتى يكتمل رفع صورة التصنيف.')
            return
        }

        if (!form.name.trim()) {
            setError('يرجى إدخال اسم التصنيف.')
            return
        }

        setSaving(true)
        setError('')
        setSuccess('')

        try {
            const categoryData = {
                ...form,
                name: form.name.trim(),
                icon: form.icon.trim() || '📦',
                image: form.image.trim(),
                description: form.description.trim(),
                sortOrder: Math.max(1, Number(form.sortOrder) || 1),
            }

            if (editingId) {
                const currentCategory = categories.find(
                    (item) => item.id === editingId
                )

                await updateCategory(editingId, categoryData)

                // تحديث التصنيف محليًا بعد نجاح Firestore
                if (currentCategory) {
                    const updatedCategory: StoreCategory = {
                        ...currentCategory,
                        ...categoryData,
                        updatedAt: new Date().toISOString(),
                    }

                    setCategories((current) =>
                        sortCategories(
                            current.map((item) =>
                                item.id === editingId
                                    ? updatedCategory
                                    : item
                            )
                        )
                    )
                }

                setSuccess('تم تحديث التصنيف بنجاح.')
            } else {
                const newId = await addCategory(categoryData)

                const now = new Date().toISOString()

                const newCategory: StoreCategory = {
                    ...categoryData,
                    id: newId,
                    createdAt: now,
                    updatedAt: now,
                }

                setCategories((current) =>
                    sortCategories([...current, newCategory])
                )

                setSuccess('تمت إضافة التصنيف بنجاح.')
            }

            setShowForm(false)
            setEditingId(null)
            setForm(emptyForm)
            setUploadProgress('')

        } catch (err) {
            console.error('Save category error:', err)

            setError(
                err instanceof Error
                    ? err.message
                    : 'تعذر حفظ التصنيف.'
            )
        } finally {
            setSaving(false)
        }
    }

    // =====================================
    // إظهار وإخفاء تصنيف
    // =====================================

    async function handleToggle(category: StoreCategory) {
        if (processingIds.includes(category.id)) return

        setError('')
        setSuccess('')
        startProcessing(category.id)

        try {
            const newStatus = !category.isActive

            await toggleCategoryStatus(category.id, newStatus)

            setCategories((current) =>
                current.map((item) =>
                    item.id === category.id
                        ? { ...item, isActive: newStatus }
                        : item
                )
            )

            setSuccess(
                newStatus
                    ? 'تم إظهار التصنيف بنجاح.'
                    : 'تم إخفاء التصنيف بنجاح.'
            )
        } catch (err) {
            console.error('Toggle category error:', err)
            setError('تعذر تغيير حالة التصنيف.')
        } finally {
            stopProcessing(category.id)
        }
    }

    // =====================================
    // حذف تصنيف
    // =====================================

    async function handleDelete(category: StoreCategory) {
        if (processingIds.includes(category.id)) return

        const confirmed = window.confirm(
            `هل أنت متأكد من حذف تصنيف "${category.name}"؟`
        )

        if (!confirmed) return

        setError('')
        setSuccess('')
        startProcessing(category.id)

        try {
            await deleteCategory(category.id)

            setCategories((current) =>
                current.filter((item) => item.id !== category.id)
            )

            setSuccess('تم حذف التصنيف بنجاح.')
        } catch (err) {
            console.error('Delete category error:', err)

            setError(
                err instanceof Error
                    ? err.message
                    : 'تعذر حذف التصنيف.'
            )
        } finally {
            stopProcessing(category.id)
        }
    }

    // =====================================
    // واجهة التصنيفات
    // =====================================

    return (
        <div className="admin-categories">

            <div className="admin-categories-header">
                <div>
                    <h2>التصنيفات</h2>
                    <p>إدارة وتنظيم أقسام متجر TREND247</p>
                </div>

                <button
                    type="button"
                    className="admin-category-add-btn"
                    onClick={handleNewCategory}
                >
                    + إضافة تصنيف
                </button>
            </div>

            <div className="admin-category-stats">
                <div>
                    <span>إجمالي التصنيفات</span>
                    <strong>{categories.length}</strong>
                </div>

                <div>
                    <span>التصنيفات النشطة</span>
                    <strong>
                        {categories.filter((item) => item.isActive).length}
                    </strong>
                </div>

                <div>
                    <span>التصنيفات المخفية</span>
                    <strong>
                        {categories.filter((item) => !item.isActive).length}
                    </strong>
                </div>
            </div>

            {error && !showForm && (
                <div className="admin-category-message error">
                    {error}
                </div>
            )}

            {success && (
                <div className="admin-category-message success">
                    {success}
                </div>
            )}

            {/* =====================================
                النافذة المنبثقة للإضافة والتعديل
            ===================================== */}

            {showForm && (
                <div
                    className="admin-category-modal-overlay"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            handleCloseForm()
                        }
                    }}
                >
                    <form
                        className="admin-category-form admin-category-modal"
                        onSubmit={handleSubmit}
                    >
                        {/* رأس النافذة */}
                        <div className="admin-category-modal-header">
                            <div>
                                <span className="admin-category-modal-label">
                                    {editingId ? 'تعديل التصنيف' : 'تصنيف جديد'}
                                </span>

                                <h3>
                                    {editingId
                                        ? 'تعديل بيانات التصنيف'
                                        : 'إضافة تصنيف جديد'}
                                </h3>

                                <p>
                                    أدخل بيانات التصنيف وصورته لإظهاره في متجرك.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="admin-category-modal-close"
                                onClick={handleCloseForm}
                                disabled={saving || uploadingImage}
                                aria-label="إغلاق النافذة"
                            >
                                ×
                            </button>
                        </div>

                        {/* رسائل الأخطاء داخل النافذة */}
                        {error && (
                            <div className="admin-category-message error">
                                {error}
                            </div>
                        )}

                        <div className="admin-category-form-grid">

                            <label>
                                اسم التصنيف
                                <input
                                    value={form.name}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            name: e.target.value,
                                        })
                                    }
                                    placeholder="مثال: الإلكترونيات"
                                    required
                                />
                            </label>

                            <label>
                                الأيقونة
                                <input
                                    value={form.icon}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            icon: e.target.value,
                                        })
                                    }
                                    placeholder="🎧"
                                />
                            </label>

                            {/* رفع صورة التصنيف */}
                            <div className="full admin-category-image-upload">

                                <label>
                                    رفع صورة التصنيف من جهازك

                                    <input
                                        type="file"
                                        accept="image/*"
                                        disabled={uploadingImage || saving}
                                        onChange={handleUploadCategoryImage}
                                    />
                                </label>

                                {uploadingImage && (
                                    <div className="admin-category-message">
                                        {uploadProgress}
                                    </div>
                                )}

                                {!uploadingImage && uploadProgress && (
                                    <div className="admin-category-message success">
                                        {uploadProgress}
                                    </div>
                                )}

                                <label>
                                    أو أدخل رابط الصورة يدويًا

                                    <input
                                        type="url"
                                        value={form.image}
                                        disabled={uploadingImage || saving}
                                        onChange={(e) => {
                                            setForm({
                                                ...form,
                                                image: e.target.value,
                                            })
                                            setUploadProgress('')
                                        }}
                                        placeholder="https://example.com/image.jpg"
                                    />
                                </label>

                            </div>

                            <label className="full">
                                وصف التصنيف
                                <textarea
                                    value={form.description}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            description: e.target.value,
                                        })
                                    }
                                    placeholder="وصف مختصر للتصنيف..."
                                    rows={3}
                                />
                            </label>

                            <label>
                                ترتيب الظهور
                                <input
                                    type="number"
                                    min="1"
                                    value={form.sortOrder}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            sortOrder: Number(e.target.value),
                                        })
                                    }
                                />
                            </label>

                            <label className="admin-category-checkbox">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            isActive: e.target.checked,
                                        })
                                    }
                                />
                                تصنيف نشط وظاهر للزوار
                            </label>

                        </div>

                        {/* معاينة صورة التصنيف */}
                        {form.image && (
                            <div className="admin-category-preview">
                                <img
                                    src={form.image}
                                    alt="معاينة التصنيف"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                    }}
                                />
                            </div>
                        )}

                        {/* أزرار النافذة */}
                        <div className="admin-category-form-actions">
                            <button
                                type="submit"
                                disabled={saving || uploadingImage}
                            >
                                {uploadingImage
                                    ? 'جارٍ رفع الصورة...'
                                    : saving
                                        ? 'جارٍ الحفظ...'
                                        : editingId
                                            ? 'حفظ التعديلات'
                                            : 'إضافة التصنيف'}
                            </button>

                            <button
                                type="button"
                                onClick={handleCloseForm}
                                disabled={saving || uploadingImage}
                            >
                                إلغاء
                            </button>
                        </div>

                    </form>
                </div>
            )}

            {/* =====================================
                جدول التصنيفات
            ===================================== */}

            {loading ? (
                <div className="admin-category-loading">
                    جارٍ تحميل التصنيفات...
                </div>
            ) : categories.length === 0 ? (
                <div className="admin-category-empty">
                    لا توجد تصنيفات حتى الآن.
                </div>
            ) : (
                <div className="admin-category-table-wrapper">
                    <table className="admin-category-table">
                        <thead>
                            <tr>
                                <th>التصنيف</th>
                                <th>الترتيب</th>
                                <th>الحالة</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>

                        <tbody>
                            {categories.map((category) => (
                                <tr key={category.id}>
                                    <td>
                                        <div className="admin-category-info">
                                            {category.image ? (
                                                <img
                                                    src={category.image}
                                                    alt={category.name}
                                                />
                                            ) : (
                                                <span className="admin-category-icon">
                                                    {category.icon}
                                                </span>
                                            )}

                                            <div>
                                                <strong>{category.name}</strong>
                                                <small>{category.icon}</small>
                                            </div>
                                        </div>
                                    </td>

                                    <td>{category.sortOrder}</td>

                                    <td>
                                        <span
                                            className={
                                                category.isActive
                                                    ? 'admin-category-status active'
                                                    : 'admin-category-status inactive'
                                            }
                                        >
                                            {category.isActive ? 'نشط' : 'مخفي'}
                                        </span>
                                    </td>

                                    <td>
                                        <div className="admin-category-actions">
                                            <button
                                                type="button"
                                                onClick={() => handleEdit(category)}
                                            >
                                                تعديل
                                            </button>

                                            <button
                                                type="button"
                                                disabled={processingIds.includes(category.id)}
                                                onClick={() => void handleToggle(category)}
                                            >
                                                {processingIds.includes(category.id)
                                                    ? 'جارٍ التنفيذ...'
                                                    : category.isActive
                                                        ? 'إخفاء'
                                                        : 'إظهار'}
                                            </button>

                                            <button
                                                type="button"
                                                className="delete"
                                                disabled={processingIds.includes(category.id)}
                                                onClick={() => void handleDelete(category)}
                                            >
                                                {processingIds.includes(category.id)
                                                    ? 'جارٍ التنفيذ...'
                                                    : 'حذف'}
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
    )
}

export default AdminCategories
