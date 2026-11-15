
import type { ReactNode } from 'react'
import AdminSidebar from './AdminSidebar'
import AdminTopbar from './AdminTopbar'

type AdminLayoutProps = {
    children: ReactNode
    title: string
    description: string
    email?: string
    onLogout: () => void
}

function AdminLayout({
    children,
    title,
    description,
    email,
    onLogout,
}: AdminLayoutProps) {
    return (
        <div className="admin-layout" dir="rtl">

            <AdminSidebar onLogout={onLogout} />

            <main className="admin-main">

                <AdminTopbar
                    title={title}
                    description={description}
                    email={email}
                />

                <div className="admin-content">
                    {children}
                </div>

                <footer className="admin-footer">
                    TREND247 © {new Date().getFullYear()}
                    <span>جميع الحقوق محفوظة</span>
                </footer>

            </main>

        </div>
    )
}

export default AdminLayout
