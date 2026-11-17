import './App.css'
import LayOut from './layOut/LayOut'
import { AuthProvider } from './auth/AuthContext'
import { PreferencesProvider } from './preferences/PreferencesContext'

function App() {
  return (
    <PreferencesProvider>
      <AuthProvider>
        <LayOut />
      </AuthProvider>
    </PreferencesProvider>
  )
}

export default App
