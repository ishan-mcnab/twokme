import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  return (
    <>
      <div className="min-h-dvh pb-[calc(5.75rem+env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]">
        <Outlet />
      </div>
      <BottomNav />
    </>
  )
}
