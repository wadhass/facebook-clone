import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'

import Login from '../pages/login/Login'
import Signup from '../pages/signup/Signup'
import ForgotPassword from '../pages/auth/ForgotPassword'
import ResetPassword from '../pages/auth/ResetPassword'
import Home from '../pages/home/Home'
import Profile from '../pages/profile/Profile'
import ChatBox from '../pages/chatbox/ChatBox'
import Friends from '../pages/friends/Friends'
import Nav from '../components/nav/Nav'
import LeftBar from '../components/leftbar/LeftBar'
import RightBar from '../components/rightbar/RightBar'
import { useAuth } from '../auth/useAuth'

function ProtectedLayout() {
  const { user, loading, authError } = useAuth()

  if (loading) return <div role='status'>Loading your account...</div>
  if (authError) return <p role='alert'>{authError}</p>
  if (!user) return <Navigate to='/login' replace />

  return (
    <>
      <Nav />
      <main>
        <LeftBar />
        <div className='container'>
          <Outlet />
        </div>
        <RightBar />
      </main>
    </>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'profile/:id', element: <Profile /> },
      { path: 'chatbox/:id', element: <ChatBox /> },
      { path: 'friends', element: <Friends /> },
    ],
  },
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/reset-password', element: <ResetPassword /> },
])

export default function LayOut() {
  return <RouterProvider router={router} />
}
