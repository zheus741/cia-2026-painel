import { AppShell } from '@/components/app-shell'

export default function WarRoomLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell section="War Room" fullWidth>
      {children}
    </AppShell>
  )
}
