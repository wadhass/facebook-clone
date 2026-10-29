import './App.css'
import LayOut from './layOut/LayOut'
import { AuthProvider } from './auth/AuthContext'

function App() {
  return (
    <AuthProvider>
      <LayOut />
    </AuthProvider>
  )
}

export default App
