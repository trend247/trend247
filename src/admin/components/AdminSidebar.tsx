
import { NavLink } from 'react-router-dom'

const menuItems = [
    { to: '/admin', label: 'الرئيسية', icon: '▦', end: true },
    { to: '/admin/products', label: 'المنتجات', icon: '▣' },
    { to: '/admin/categories', label: 'التصنيفات', icon: '◈' },
    { to: '/admin/orders', label: 'الطلبات', icon: '🛍' },
    { to: '/admin/customers', label: 'العملاء', icon: '♙' },
    { to: '/admin/offers', label: 'العروض والخصومات', icon: '%' },
    { to: '/admin/banners', label: 'البانرات', icon: '▧' },
    { to: '/admin/reports', label: 'التقارير', icon: '▤' },
    { to: '/admin/settings', label: 'الإعدادات', icon: '⚙' },
]

type AdminSidebarProps = {
    onLogout: () => void
}

function AdminSidebar({ onLogout }: AdminSidebarProps) {
    return (
        <aside className="admin-sidebar">

            <div className="admin-brand">
                <span>TREND<span>247</span></span>
                <small>لوحة إدارة المتجر</small>
            </div>

            <div className="admin-menu-label">
                القائمة الرئيسية
            </div>

            <nav className="admin-menu">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                    >
                        <span>{item.icon}</span>
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div className="admin-sidebar-bottom">

                <a href="/" className="admin-back-store">
                    <span>↗</span>
                    العودة إلى المتجر
                </a>

                <button
                    className="admin-logout"
                    onClick={onLogout}
                >
                    <span>⇥</span>
                    تسجيل الخروج
                </button>

            </div>

        </aside>
    )
}

export default AdminSidebar
