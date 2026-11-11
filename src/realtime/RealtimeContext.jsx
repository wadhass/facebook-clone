import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { getAuthToken, getRealtimeUrl } from '../api'
import RealtimeContext from './context'

export function RealtimeProvider({ userId, children }) {
  const [socket, setSocket] = useState(null)
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set())

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
    connection.on('presence:state', ({ onlineUserIds: ids = [] } = {}) => {
      setOnlineUserIds(new Set(ids))
    })
    connection.on('presence:update', ({ userId: changedUserId, online }) => {
      setOnlineUserIds((currentIds) => {
        const nextIds = new Set(currentIds)
        if (online) nextIds.add(changedUserId)
        else nextIds.delete(changedUserId)
        return nextIds
      })
    })
    connection.on('disconnect', () => setOnlineUserIds(new Set()))
    setSocket(connection)
    connection.connect()

    return () => {
      connection.removeAllListeners('presence:state')
      connection.removeAllListeners('presence:update')
      connection.removeAllListeners('disconnect')
      connection.disconnect()
      setSocket(null)
    }
  }, [userId])

  const value = useMemo(() => ({ socket, userId, onlineUserIds }), [socket, userId, onlineUserIds])
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}
