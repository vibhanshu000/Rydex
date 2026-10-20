'use client'
import { RootState } from '@/redux/store';
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux';
import { motion } from "motion/react"
import { ArrowRight, Check, Clock, DollarSign, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import RejectionCard from './RejectionCard';
import StatusCard from './StatusCard';
import ActionCard from './ActionCard';
import axios from 'axios';
import PricingModal from './PricingModal';
import { IVehicle } from '@/models/vehicle.model';
import PartnerEarning from './PartnerEarning';
import { getSocket, setSocketIdentity } from '@/lib/socket';
type Step = {
    id: number,
    title: string,
    route?: string
};

/* ================= STEPS ================= */

const STEPS: Step[] = [
    { id: 1, title: "Vehicle", route: "/partner/onboarding/vehicle" },
    { id: 2, title: "Documents", route: "/partner/onboarding/documents" },
    { id: 3, title: "Bank", route: "/partner/onboarding/bank" },
    { id: 4, title: "Review" },
    { id: 5, title: "Pricing" },
    { id: 6, title: "Final Review" },
    { id: 7, title: "Live" },
];

const TOTAL_STEPS = STEPS.length;

function PartnerDashboard() {
    const [activeStep, setActiveStep] = useState(0)
    const { userData } = useSelector((state: RootState) => state.user)
    const router = useRouter()
    const [showPricing,setShowPricing]=useState(false)
    const [vehicleData,setVehicleData]=useState<IVehicle | null>(null)
    useEffect(() => {
        if (userData) {
            setActiveStep(userData.partnerOnBoardingSteps + 1)
        }
    }, [userData])

    const handleGetPricing=async ()=>{
        try {
            const {data}=await axios.get("/api/partner/onboarding/pricing")
            console.log(data)
            setVehicleData(data)
        } catch (error) {
            console.log(error)
        }
    }
    const [pendingBookings, setPendingBookings] = useState<any[]>([])

    const fetchPendingRequests = async () => {
        try {
            const { data } = await axios.get("/api/partner/bookings/pending")
            setPendingBookings(data || [])
        } catch (error) {
            console.log(error)
        }
    }

    const handleAcceptRide = async (id: string) => {
        try {
            await axios.get(`/api/partner/bookings/${id}/accept`)
            router.push("/partner/active-ride")
        } catch (error) {
            console.log(error)
        }
    }

    const handleRejectRide = async (id: string) => {
        try {
            await axios.get(`/api/partner/bookings/${id}/reject`)
            fetchPendingRequests()
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        handleGetPricing()
        if (userData?.role === "partner") {
            fetchPendingRequests()
        }
    }, [userData])

    // Real-time socket listener for incoming ride requests
    useEffect(() => {
        if (userData?.role !== "partner") return;
        if (userData?._id) {
            setSocketIdentity(userData._id)
        }
        const socket = getSocket()
        const onNewBooking = () => {
            fetchPendingRequests()
        }
        socket.on("new-booking", onNewBooking)
        return () => {
            socket.off("new-booking", onNewBooking)
        }
    }, [userData?.role, userData?._id])

    // Resilient 3-second polling fallback so requests appear immediately even if socket is dropped
    useEffect(() => {
        if (userData?.role !== "partner") return;
        const interval = setInterval(() => {
            fetchPendingRequests()
        }, 3000)
        return () => clearInterval(interval)
    }, [userData?.role])

    const goToStep = (step: Step) => {

        if(step.id==5 && userData?.partnerStatus==="approved"){
            setShowPricing(true)
            return;
        }
        if (step.route && step.id <= activeStep) {
            router.push(step.route)
        }
    }

    const progressPercentage = ((activeStep - 1) / (TOTAL_STEPS - 1)) * 100
    return (
        <div className='min-h-screen bg-linear-to-br from-gray-100 to-gray-200 px-4 pt-28 pb-20'>
            <div className='max-w-7xl mx-auto space-y-16'>
                <div>
                    <h1 className='text-4xl font-bold'>Partner Onboarding</h1>
                    <p className='text-gray-600 mt-3'>Complete all steps to activate your account</p>
                </div>

                <div className='bg-white rounded-3xl p-10 shadow-xl border overflow-x-auto'>
                    <div className='relative min-w-[800px]'>

                        <div className='absolute top-7 left-0 w-full h-[3px] bg-gray-200 rounded-full' />
                        <motion.div
                            animate={{ width: `${progressPercentage}%` }}
                            transition={{ duration: 0.6 }}
                            className="absolute top-7 left-0 h-[3px] bg-black rounded-full"
                        />
                        <div className='relative flex justify-between'>
                            {STEPS.map((s, index) => {
                                const completed = s.id < activeStep
                                const active = s.id == activeStep
                                const locked = s.id > activeStep

                                return (
                                    <motion.div
                                        key={s.id}
                                        whileHover={!locked ? { scale: 1.1 } : {}}
                                        onClick={() => goToStep(s)}
                                        className="flex flex-col items-center z-10 cursor-pointer"
                                    >
                                        <div
                                            className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all
                                                     ${completed
                                                    ? "bg-black text-white border-black"
                                                    : active
                                                        ? "border-black bg-white"
                                                        : "border-gray-300 text-gray-400 bg-white"
                                                }`}
                                        >
                                            {
                                                completed ? (
                                                    <Check size={20} />
                                                ) : locked ? (
                                                    <Lock size={20} />
                                                ) : (
                                                    s.id
                                                )
                                            }

                                        </div>
                                        <p className='mt-3 text-sm font-semibold text-center'>{s.title}</p>

                                    </motion.div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {
                    activeStep == 4 && userData?.partnerStatus === "rejected" && (
                        <RejectionCard
                            title="Partner Rejected"
                            reason={userData.rejectionReason}
                            actionLabel={`Review and Update`}
                            onAction={() => {
                                router.push("/partner/onboarding/vehicle")
                            }}
                        />
                    )

                }

                {
                    activeStep == 4 && userData?.partnerStatus === "pending" && (
                        <StatusCard
                            icon={<Clock size={18} />}
                            title={"Documents under review"}
                            desc={"Admin is verifying your documents."}
                        />
                    )
                }

                {
                    activeStep == 5 && (
                        <ActionCard
                            icon={<DollarSign size={18} />}
                            title={"Set Up Your Pricing"}
                            desc={"Your documents have been approved by Admin! Click below to configure your pricing."}
                            button={"Configure Pricing"}
                            onclick={() => setShowPricing(true)}
                        />
                    )
                }

{activeStep==6  && vehicleData?.status=="pending" && (
    <StatusCard
     icon={<Clock size={20} />}
        title="Pricing Under Review"
        desc="Admin is reviewing your pricing."
    />
)}
{activeStep==6  && vehicleData?.status=="rejected" && (
    <RejectionCard
      title="Pricing Rejected"
        reason={vehicleData.rejectionReason}
        actionLabel="Edit & Resubmit"
        onAction={() => setShowPricing(true)}
    />
)}

{(activeStep >= 7 || userData?.partnerStatus === "approved") && vehicleData?.status == "approved" && (
    <div className="space-y-6">
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black text-white rounded-3xl p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
            <div>
                <h2 className='text-2xl font-bold'>🚀 You're Live & Ready for Rides</h2>
                <p className='text-zinc-400 text-sm mt-1'>Incoming customer ride requests will show below in real time.</p>
            </div>
            <button onClick={() => router.push("/partner/bookings")} className='bg-white text-black px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-zinc-100 transition-colors flex-shrink-0'>
             View All Bookings <ArrowRight size={16}/>
            </button>
        </motion.div>

        {pendingBookings.length > 0 && (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-8 shadow-xl border border-zinc-200"
            >
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h3 className="text-xl font-black text-zinc-900">Incoming Ride Requests</h3>
                            <span className="min-w-6 h-6 px-2 bg-zinc-900 text-white text-xs font-black rounded-full inline-flex items-center justify-center">
                                {pendingBookings.length}
                            </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">{pendingBookings.length} customer request(s) waiting for response</p>
                    </div>
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingBookings.map((b) => (
                        <div key={b._id} className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-sm hover:shadow-md transition">
                            <div className="flex items-center justify-between">
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">New Request</span>
                                <span className="text-base font-black text-zinc-900">₹{b.fare}</span>
                            </div>

                            <div className="space-y-2 text-xs">
                                <div>
                                    <span className="font-bold text-zinc-400 uppercase">Pickup:</span>
                                    <p className="font-semibold text-zinc-900 text-sm truncate mt-0.5">{b.pickUpAddress}</p>
                                </div>
                                <div>
                                    <span className="font-bold text-zinc-400 uppercase">Drop:</span>
                                    <p className="font-semibold text-zinc-900 text-sm truncate mt-0.5">{b.dropAddress}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-zinc-200">
                                <button
                                    onClick={() => handleAcceptRide(b._id)}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-sm"
                                >
                                    Accept Ride
                                </button>
                                <button
                                    onClick={() => handleRejectRide(b._id)}
                                    className="px-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs py-2.5 rounded-xl transition"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        )}
    </div>
)}


          <PartnerEarning/>
            </div>
          
          <PricingModal
          open={showPricing}
          onClose={()=>setShowPricing(false)}
          data={vehicleData}
          />


        </div>
    )
}

export default PartnerDashboard
