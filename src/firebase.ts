
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// إعدادات مشروع Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCwTAPQWBQkVCaQYadKGQanuPeJAc9PRjQ",
    authDomain: "trend-247.firebaseapp.com",
    projectId: "trend-247",
    storageBucket: "trend-247.firebasestorage.app",
    messagingSenderId: "204203477651",
    appId: "1:204203477651:web:90cdda6a6dfa9d1c759b66",
    measurementId: "G-Y4J30N4PKQ"
}

// =====================================
// تطبيق Firebase الأساسي للمتجر والعملاء
// =====================================

const app = initializeApp(firebaseConfig)

// =====================================
// تطبيق Firebase مستقل للوحة التحكم
// =====================================

const adminApp = initializeApp(
    firebaseConfig,
    'trend247-admin'
)

// =====================================
// Authentication
// =====================================

// تسجيل دخول العملاء
export const auth = getAuth(app)

// تسجيل دخول المسؤولين
export const adminAuth = getAuth(adminApp)

// =====================================
// Cloud Firestore
// =====================================

// قاعدة بيانات المتجر والعملاء
export const db = getFirestore(app)

// قاعدة بيانات لوحة التحكم
export const adminDb = getFirestore(adminApp)

// التطبيق الأساسي
export default app
