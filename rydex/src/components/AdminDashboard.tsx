'use client'
import axios from 'axios'
import { CheckCircle2, Clock, LogOut, Settings, Truck, User, Users, XCircle } from 'lucide-react'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import Kpi from './Kpi'
import TabButton from './TabButton'
import { AnimatePresence } from 'motion/react'
import { motion } from "motion/react"
import ContentList from './ContentList'
import AdminEarning from './AdminEarning'
import { signOut } from 'next-auth/react'

type Stats = {
  totalApprovedPartners: number
  totalPartners: number
  totalPendingPartners: number
  totalRejectedPartners: number
}

type Tab = "partner" | "vehicle"
function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("partner")
  const [partnerReviews, setPartnerReviews] = useState<any>()
  const [vehicleReviews, setVehicleReviews] = useState<any>()
  const handleGetData = async () => {
    try {
      const { data } = await axios.get("/api/admin/dashboard")
      setStats(data.stats)
      setPartnerReviews(data.pendingPartnersReviews)
      setVehicleReviews(data.pendingVehicles)
    } catch (error) {
      console.log(error)
    }
  }

  const handleLogOut = async () => {
    await signOut({ redirect: false })
    window.location.reload()
  }

  useEffect(() => {
    handleGetData()
  }, [])
  return (
    <div className='min-h-screen bg-linear-to-br from-gray-100 to-gray-200'>
      <div className='sticky top-0 bg-white/80 backdrop-blur-lg border-b z-40'>
        <div className='max-w-7xl mx-auto h-16 px-6 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <Image src={"/logo.png"} alt='logo' width={44} height={44} priority />
          </div>

          <div className='flex items-center gap-4'>
            <div className='flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-black text-white'>
              <User size={14} />
              Admin Dashboard
            </div>
            <button
              onClick={handleLogOut}
              className='flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium cursor-pointer transition'
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </div>
      <main className='max-w-7xl mx-auto px-6 py-12 space-y-16'>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-6'>
          <Kpi label="Total Partners" value={stats?.totalPartners} icon={<Users />} variant={"totalPartners"} />
          <Kpi label="Approved Partners" value={stats?.totalApprovedPartners} icon={<CheckCircle2 />} variant={"approved"} />
          <Kpi label="Pending Partners" value={stats?.totalPendingPartners} icon={<Clock />} variant={"pending"} />
          <Kpi label="Rejected Partners" value={stats?.totalRejectedPartners} icon={<XCircle />} variant={"rejected"} />
        </div>


        <div className='bg-white rounded-2xl p-2 shadow-lg border border-gray-100 flex flex-wrap gap-2'>
          <TabButton
            active={activeTab == "partner"}
            count={partnerReviews?.length ?? 0}
            icon={<Users size={15} />}
            onClick={() => setActiveTab("partner")}
          >
            Pending Partner Reviews
          </TabButton>

          <TabButton
            active={activeTab == "vehicle"}
            count={vehicleReviews?.length ?? 0}
            icon={<Truck size={15} />}
            onClick={() => setActiveTab("vehicle")}
          >
            Pending Vehicle Reviews
          </TabButton>
        </div>
        <AnimatePresence mode='wait'>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-3"
          >
{activeTab=="partner"&& <ContentList data={partnerReviews ?? []} type={"partner"}/>}
{activeTab=="vehicle"&& <ContentList data={vehicleReviews ?? []} type={"vehicle"}/>}
          </motion.div>
        </AnimatePresence>

      <AdminEarning/>

      </main>


    </div>
  )
}

export default AdminDashboard
