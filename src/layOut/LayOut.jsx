import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'

import Login from '../pages/login/Login'
import Signup from '../pages/signup/Signup'
import ResetPassword from '../pages/auth/ResetPassword'
import VerifyEmail from '../pages/auth/VerifyEmail'
import Home from '../pages/home/Home'
import Profile from '../pages/profile/Profile'
import ChatBox from '../pages/chatbox/ChatBox'
import Friends from '../pages/friends/Friends'
import Connections from '../pages/connections/Connections'
import Groups from '../pages/groups/Groups'
import GroupChat from '../pages/groups/GroupChat'
import Nav from '../components/nav/Nav'
import LeftBar from '../components/leftbar/LeftBar'
import RightBar from '../components/rightbar/RightBar'
import { useAuth } from '../auth/useAuth'
import { RealtimeProvider } from '../realtime/RealtimeContext'
import { CallProvider } from '../calls/CallProvider'
import CallOverlay from '../calls/CallOverlay'
import Calls from '../pages/calls/Calls'
import Reels from '../pages/reels/Reels'

function ProtectedLayout() {
  const { user, loading, authError } = useAuth()

  if (loading) return <div role='status'>Loading your account...</div>
  if (authError) return <p role='alert'>{authError}</p>
  if (!user) return <Navigate to='/login' replace />

  return (
    <RealtimeProvider userId={user.id}>
      <CallProvider>
        <Nav />
        <main>
          <LeftBar />
          <div className='container'>
            <Outlet />
          </div>
          <RightBar />
        </main>
        <CallOverlay />
      </CallProvider>
    </RealtimeProvider>
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
      { path: 'connections/:id', element: <Connections /> },
      { path: 'groups', element: <Groups /> },
      { path: 'groups/:id', element: <GroupChat /> },
      { path: 'calls', element: <Calls /> },
      { path: 'reels', element: <Reels /> },
    ],
  },
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
  { path: '/forgot-password', element: <Navigate to='/reset-password' replace /> },
  { path: '/reset-password', element: <ResetPassword /> },
  { path: '/reset-password/:token', element: <ResetPassword /> },
  { path: '/verify-email', element: <VerifyEmail /> },
])

export default function LayOut() {
  return <RouterProvider router={router} />
}
