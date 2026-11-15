
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore'

import {
  updateProfile,
  type User,
} from 'firebase/auth'

import { auth, db } from '../firebase'

export type UserProfile = {
  name: string
  email: string
  phone: string
  phoneVerified: boolean
  emailVerified: boolean
  createdAt?: unknown
  updatedAt?: unknown
}

// الحصول على بيانات المستخدم الحالي
export async function getUserProfile() {
  const user = auth.currentUser

  if (!user) {
    throw new Error('يجب تسجيل الدخول أولاً')
  }

  const userRef = doc(db, 'users', user.uid)
  const snapshot = await getDoc(userRef)

  if (!snapshot.exists()) {
    throw new Error('لم يتم العثور على بيانات الحساب')
  }

  return snapshot.data() as UserProfile
}

// الاستماع المباشر إلى بيانات المستخدم الحالي
export function subscribeUserProfile(
    userId: string,
    onSuccess: (profile: UserProfile) => void,
    onError: (error: Error) => void
) {
    const userRef = doc(db, 'users', userId)

    return onSnapshot(
        userRef,
        (snapshot) => {
            // قد لا يكون المستند قد أُنشئ بعد.
            // ننتظر وصوله بدل إظهار خطأ للمستخدم.
            if (!snapshot.exists()) {
                return
            }

            onSuccess(snapshot.data() as UserProfile)
        },
        (error) => {
            onError(error)
        }
    )
}

// تحديث اسم المستخدم
export async function updateUserName(name: string) {
  const user = auth.currentUser

  if (!user) {
    throw new Error('يجب تسجيل الدخول أولاً')
  }

  const cleanName = name.trim()

  if (cleanName.length < 2) {
    throw new Error('يجب أن يتكون الاسم من حرفين على الأقل')
  }

  await updateProfile(user, {
    displayName: cleanName,
  })

  await updateDoc(doc(db, 'users', user.uid), {
    name: cleanName,
    updatedAt: serverTimestamp(),
  })

  return cleanName
}

// تحديث حالة التحقق من البريد بعد التحقق الفعلي

export async function syncEmailVerification() {
  const user = auth.currentUser

  if (!user) {
    throw new Error('يجب تسجيل الدخول أولاً')
  }

  // تحديث بيانات المستخدم من Firebase Authentication
  await user.reload()

  const currentUser = auth.currentUser

  if (!currentUser) {
    throw new Error('لم يتم العثور على المستخدم')
  }

  if (!currentUser.emailVerified) {
    return false
  }

  // تحديث رمز الدخول حتى يتضمن حالة توثيق البريد الجديدة
  await currentUser.getIdToken(true)

  // حفظ حالة التوثيق في Firestore
  await updateDoc(doc(db, 'users', currentUser.uid), {
    emailVerified: true,
    updatedAt: serverTimestamp(),
  })

  return true
}


// مزامنة رقم الجوال بعد نجاح ربطه والتحقق منه عبر Firebase
export async function syncVerifiedPhone(user: User) {
  const currentUser = auth.currentUser

  if (!currentUser || currentUser.uid !== user.uid) {
    throw new Error('المستخدم غير مصرح له بتنفيذ هذه العملية')
  }

  if (!user.phoneNumber) {
    throw new Error('لم يتم ربط رقم جوال بالحساب')
  }

  await updateDoc(doc(db, 'users', user.uid), {
    phone: user.phoneNumber,
    phoneVerified: true,
    updatedAt: serverTimestamp(),
  })

  return user.phoneNumber
}
