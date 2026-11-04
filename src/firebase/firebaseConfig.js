import { getApps, initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyBQ8Jk0mK3CV2tG93RIST9SJfVv8LGysug',
  authDomain: 'qavero-application.firebaseapp.com',
  projectId: 'qavero-application',
  storageBucket: 'qavero-application.firebasestorage.app',
  messagingSenderId: '517565648708',
  appId: '1:517565648708:web:a44a9840bd84f23d955111',
}

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export default firebaseConfig
