import { useContext } from 'react'
import CallContext from './context'

export function useCalls() {
  const context = useContext(CallContext)
  if (!context) throw new Error('useCalls must be used within CallProvider')
  return context
}
