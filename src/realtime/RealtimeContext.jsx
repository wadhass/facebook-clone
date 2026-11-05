import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { getAuthToken, getRealtimeUrl } from '../api'
import RealtimeContext from './context'

export function RealtimeProvider({ userId, children }) {
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    if (!userId) {
      setSocket(null)
      return undefined
    }

    const connection = io(getRealtimeUrl(), {
      autoConnect: false,
      transports: ['websocket'],
      auth: async (callback) => {
        try {
          callback({ token: await getAuthToken() })
        } catch (error) {
          console.error('Unable to get an authentication token for realtime connection', error)
          callback({ token: '' })
        }
      },
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
