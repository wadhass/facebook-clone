import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { getRealtimeUrl } from '../api'
import RealtimeContext from './context'

export function RealtimeProvider({ userId, children }) {
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (!userId || !token) {
      setSocket(null)
      return undefined
    }

    const connection = io(getRealtimeUrl(), {
      autoConnect: false,
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 10000,
    })
    setSocket(connection)
    connection.connect()

    return () => {
      connection.disconnect()
      setSocket(null)
    }
  }, [userId])

  const value = useMemo(() => ({ socket, userId }), [socket, userId])
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}
