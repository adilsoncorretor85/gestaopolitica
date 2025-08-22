'use client'

import { useState } from 'react'
import { Profile } from '@/types'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'

interface AppLayoutProps {
  children: React.ReactNode
  profile: Profile
}

export default function AppLayout({ children, profile }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        profile={profile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      
      <div className="flex">
        <div className="md:w-64 flex-shrink-0">
          <Sidebar 
            profile={profile}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
        
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}