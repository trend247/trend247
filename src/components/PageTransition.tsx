
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import logo from '../assets/logo.png'

function PageTransition() {
    const location = useLocation()
    const [visible, setVisible] = useState(false)
    const firstRender = useRef(true)

    useEffect(() => {
        // لا نعرض التحميل عند فتح الموقع لأول مرة
        if (firstRender.current) {
            firstRender.current = false
            return
        }

        setVisible(true)

        const timer = window.setTimeout(() => {
            setVisible(false)
        }, 1000)

        return () => window.clearTimeout(timer)
    }, [location.pathname])

    if (!visible) return null

    return (
        <div className="page-transition-loader" role="status" aria-label="جارٍ تحميل الصفحة">
            <div className="page-loader-content">
                <div className="page-loader-logo">
                    <img src={logo} alt="TREND247" />
                </div>

                <p>كل ما هو ترند في مكان واحد</p>

                <div className="page-loader-track">
                    <span />
                </div>

                <small>لحظات ونكون معك...</small>
            </div>
        </div>
    )
}

export default PageTransition
