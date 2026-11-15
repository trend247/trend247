
type AdminTopbarProps = {
    title: string
    description: string
    email?: string
}

function AdminTopbar({
    title,
    description,
    email,
}: AdminTopbarProps) {
    return (
        <header className="admin-topbar">
            <div>
                <h2>{title}</h2>
                <p>{description}</p>
            </div>

            <div className="admin-profile">
                <div className="admin-profile-info">
                    <strong>مدير المتجر</strong>
                    <small>{email || 'حساب الإدارة'}</small>
                </div>

                <div className="admin-profile-avatar">
                    👑
                </div>
            </div>
        </header>
    )
}

export default AdminTopbar
