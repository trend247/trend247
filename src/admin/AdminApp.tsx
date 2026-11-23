
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import {
    Navigate,
    useLocation,
    useNavigate,
} from 'react-router-dom'

import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    type User,
} from 'firebase/auth'

import { doc, getDoc } from 'firebase/firestore'

import {
    auth,
    adminAuth,
    adminDb,
} from '../firebase'

import AdminLayout from './components/AdminLayout'
import AdminDashboard from './AdminDashboard'
import AdminProducts from './AdminProducts'
import AdminAddProduct from './AdminAddProduct'
import AdminCategories from './AdminCategories'
import AdminOrders from './AdminOrders'
import AdminCustomers from './AdminCustomers'
import AdminOffers from './AdminOffers'
import AdminBanners from './AdminBanners'

import './Admin.css'

type AdminCheck = {
    uid: string
    allowed: boolean
}

type AdminPageInfo = {
    title: string
    description: string
}

const pageTitles: Record<string, AdminPageInfo> = {
    '/admin': {
        title: 'الرئيسية',
        description: 'نظرة عامة على أداء متجرك',
    },

    '/admin/products': {
        title: 'إدارة المنتجات',
        description: 'إضافة المنتجات وتعديلها وإدارة المخزون',
    },

    '/admin/products/add': {
        title: 'إضافة منتج جديد',
        description: 'إضافة منتج جديد إلى كتالوج TREND247',
    },

    '/admin/products/edit': {
        title: 'تعديل المنتج',
        description: 'تحديث بيانات المنتج وتفاصيله',
    },

    '/admin/categories': {
        title: 'إدارة التصنيفات',
        description: 'تنظيم أقسام ومنتجات المتجر',
    },

    '/admin/orders': {
        title: 'إدارة الطلبات',
        description: 'متابعة طلبات العملاء وإدارتها',
    },

    '/admin/customers': {
        title: 'إدارة العملاء',
        description: 'عرض حسابات العملاء ومتابعتها',
    },

    '/admin/offers': {
        title: 'العروض والخصومات',
        description: 'إدارة العروض والكوبونات',
    },

    '/admin/banners': {
        title: 'إدارة البانرات',
        description: 'التحكم في إعلانات واجهة المتجر',
    },

    '/admin/reports': {
        title: 'التقارير',
        description: 'تقارير المبيعات وأداء المتجر',
    },

    '/admin/settings': {
        title: 'إعدادات المتجر',
        description: 'إدارة إعدادات TREND247',
    },
}

function AdminApp() {
    const location = useLocation()
    const navigate = useNavigate()

    const isLoginPage = location.pathname === '/admin/login'

    // جلسة المسؤول المستقلة
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    const [adminCheck, setAdminCheck] = useState<AdminCheck | null>(null)

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loginLoading, setLoginLoading] = useState(false)
    const [loginError, setLoginError] = useState('')

    // =====================================
    // مراقبة جلسة المسؤول
    // =====================================

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(
            adminAuth,
            (currentUser) => {
                setUser(currentUser)
                setLoading(false)
                setAdminCheck(null)
            }
        )

        return unsubscribe
    }, [])

    // =====================================
    // التحقق من صلاحيات المدير
    // =====================================

    useEffect(() => {
        if (loading || !user || isLoginPage) return

        let active = true

        async function checkAdmin() {
            try {
                const adminRef = doc(
                    adminDb,
                    'admins',
                    user!.uid
                )

                const snapshot = await getDoc(adminRef)

                if (active) {
                    setAdminCheck({
                        uid: user!.uid,
                        allowed:
                            snapshot.exists() &&
                            snapshot.data().active === true &&
                            ['owner', 'admin'].includes(
                                snapshot.data().role
                            ),
                    })
                }
            } catch (error) {
                console.error('Admin access error:', error)

                if (active) {
                    setAdminCheck({
                        uid: user!.uid,
                        allowed: false,
                    })
                }
            }
        }

        void checkAdmin()

        return () => {
            active = false
        }
    }, [user, loading, isLoginPage])

    // =====================================
    // تسجيل دخول المدير
    // =====================================

    async function handleAdminLogin(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()

        setLoginError('')
        setLoginLoading(true)

        try {
            // فحص إعدادات Firebase قبل تسجيل الدخول
            console.log('Firebase diagnostic:', {
                adminAppName: adminAuth.app.name,
                customerAppName: auth.app.name,

                sameApiKey:
                    adminAuth.app.options.apiKey ===
                    auth.app.options.apiKey,

                adminProjectId:
                    adminAuth.app.options.projectId,

                customerProjectId:
                    auth.app.options.projectId,

                adminAuthDomain:
                    adminAuth.app.options.authDomain,

                customerAuthDomain:
                    auth.app.options.authDomain,
            })

            // تسجيل دخول المسؤول
            const credential = await signInWithEmailAndPassword(
                adminAuth,
                email.trim(),
                password
            )

            // قراءة مستند صلاحيات المسؤول باستخدام adminDb
            const adminRef = doc(
                adminDb,
                'admins',
                credential.user.uid
            )

            const snapshot = await getDoc(adminRef)

            // التحقق من صلاحيات الحساب
            if (
                !snapshot.exists() ||
                snapshot.data().active !== true ||
                !['owner', 'admin'].includes(snapshot.data().role)
            ) {
                await signOut(adminAuth)

                setLoginError(
                    'هذا الحساب غير مخوّل لإدارة المتجر.'
                )

                return
            }

            setAdminCheck({
                uid: credential.user.uid,
                allowed: true,
            })

            navigate('/admin', { replace: true })

        } catch (error) {
            console.error('Admin login error:', error)

            const firebaseError = error as {
                code?: string
                message?: string
            }

            console.error(
                'Firebase error code:',
                firebaseError.code
            )

            console.error(
                'Firebase error message:',
                firebaseError.message
            )

            setLoginError(
                `خطأ: ${firebaseError.code ?? 'unknown'}`
            )
        } finally {
            setLoginLoading(false)
        }
    }

    // =====================================
    // تسجيل خروج المدير فقط
    // =====================================

    async function handleAdminLogout() {
        try {
            await signOut(adminAuth)

            setAdminCheck(null)

            navigate('/admin/login', { replace: true })
        } catch (error) {
            console.error('Admin logout error:', error)
        }
    }

    // =====================================
    // صفحة تسجيل دخول الإدارة
    // =====================================

    if (isLoginPage) {
        return (
            <div className="admin-login-page" dir="rtl">

                <div className="admin-login-card">

                    <div className="admin-login-brand">
                        TREND<span>247</span>
                    </div>

                    <div className="admin-login-icon">
                        👑
                    </div>

                    <h1>مرحبًا بك في الإدارة</h1>

                    <p className="admin-login-description">
                        سجّل الدخول للوصول إلى لوحة تحكم المتجر.
                    </p>

                    <form onSubmit={handleAdminLogin}>

                        <label htmlFor="admin-email">
                            البريد الإلكتروني
                        </label>

                        <input
                            id="admin-email"
                            type="email"
                            placeholder="admin@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="username"
                        />

                        <label htmlFor="admin-password">
                            كلمة المرور
                        </label>

                        <input
                            id="admin-password"
                            type="password"
                            placeholder="أدخل كلمة المرور"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />

                        {loginError && (
                            <div className="admin-login-error">
                                {loginError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loginLoading}
                        >
                            {loginLoading
                                ? 'جارٍ التحقق...'
                                : 'دخول لوحة التحكم'}
                        </button>

                    </form>

                    <a href="/" className="admin-login-back">
                        العودة إلى المتجر
                    </a>

                    <small>
                        TREND247 · نظام الإدارة
                    </small>

                </div>

            </div>
        )
    }

    // =====================================
    // انتظار تحميل جلسة المسؤول
    // =====================================

    if (loading) {
        return (
            <div className="admin-loading">
                جاري التحقق من الحساب...
            </div>
        )
    }

    // =====================================
    // المسؤول غير مسجل الدخول
    // =====================================

    if (!user) {
        return <Navigate to="/admin/login" replace />
    }

    // =====================================
    // انتظار التحقق من صلاحيات المدير
    // =====================================

    if (!adminCheck || adminCheck.uid !== user.uid) {
        return (
            <div className="admin-loading">
                جاري التحقق من صلاحيات المدير...
            </div>
        )
    }

    // =====================================
    // الحساب ليس مديرًا
    // =====================================

    if (!adminCheck.allowed) {
        return (
            <div className="admin-loading">

                <div>
                    <h2>غير مصرح بالدخول</h2>

                    <p>
                        هذا الحساب غير مخوّل لإدارة المتجر.
                    </p>

                    <button
                        className="admin-logout"
                        onClick={handleAdminLogout}
                    >
                        تسجيل الخروج
                    </button>
                </div>

            </div>
        )
    }

    // =====================================
    // تحديد الصفحة الحالية
    // =====================================

    const currentPage =
        pageTitles[location.pathname] ??
        (location.pathname.startsWith('/admin/products/edit/')
            ? pageTitles['/admin/products/edit']
            : {
                title: 'صفحة غير موجودة',
                description: 'لم يتم العثور على الصفحة المطلوبة',
            })

    // =====================================
    // واجهة لوحة الإدارة
    // =====================================

    return (
        <AdminLayout
            title={currentPage.title}
            description={currentPage.description}
            email={user.email ?? ''}
            onLogout={handleAdminLogout}
        >

            {location.pathname === '/admin' ? (
                <AdminDashboard />

            ) : location.pathname === '/admin/products' ? (
                <AdminProducts />

            ) : location.pathname === '/admin/products/add' ? (
                <AdminAddProduct />

            ) : location.pathname.startsWith('/admin/products/edit/') ? (
                <AdminAddProduct />

            ) : location.pathname === '/admin/categories' ? (
                <AdminCategories />

            ) : location.pathname === '/admin/orders' ? (
                <AdminOrders />

            ) : location.pathname === '/admin/customers' ? (
                <AdminCustomers />

            ) : location.pathname === '/admin/offers' ? (
                <AdminOffers />

            ) : location.pathname === '/admin/banners' ? (
                <AdminBanners />

            ) : (
                <div className="admin-page-placeholder">
                    هذه الصفحة قيد التطوير
                </div>
            )}
        </AdminLayout>
    )
}

export default AdminApp
