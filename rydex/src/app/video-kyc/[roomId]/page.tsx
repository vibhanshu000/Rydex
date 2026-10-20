'use client'
import React, { useEffect, useRef, useState } from 'react'
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import Image from 'next/image';
import { CheckCircle, Mic, MicOff, PhoneOff, ShieldAlert, Video, VideoOff, X, XCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { AnimatePresence, motion } from 'motion/react';

function page() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [joined, setJoined] = useState(false)
  const previewRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const { roomId } = useParams()
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState("")
  const [aLoading, setALoading] = useState(false)
  const [rLoading, setRLoading] = useState(false)
  const [showApprovalModal, setShowApprovalModel] = useState(false)
  const [showRejectionModal, setShowRejectionModel] = useState(false)
  // role is set from the server response — never from client-side Redux state
  const [role, setRole] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (joined) return
    let localstream: MediaStream | null = null
    const init = async () => {
      try {
        localstream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })
        setStream(localstream)
        if (previewRef.current) {
          previewRef.current.srcObject = localstream
        }
      } catch (error) {
        console.log(error)
      }
    }
    init()

    return () => {
      if (localstream) {
        localstream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [joined])

  const toggleCamera = () => {
    if (!stream) return
    stream.getVideoTracks().forEach((track) => track.enabled = !isCameraOn);
    setIsCameraOn(!isCameraOn)
  }

  const toggleMic = () => {
    if (!stream) return
    stream.getAudioTracks().forEach((track) => track.enabled = !isMicOn);
    setIsMicOn(!isMicOn)
  }

  const handleApprove = async () => {
    setALoading(true)
    try {
      await axios.post("/api/admin/video-kyc/complete", { roomId, action: "approved" })
      setALoading(false)
      router.push("/")
    } catch (error: any) {
      console.log(error?.response?.data?.message ?? error)
      setALoading(false)
    }
  }

  const handleReject = async () => {
    setRLoading(true)
    try {
      await axios.post("/api/admin/video-kyc/complete", { roomId, action: "rejected", reason })
      setRLoading(false)
      router.push("/")
    } catch (error: any) {
      console.log(error?.response?.data?.message ?? error)
      setRLoading(false)
    }
  }

  const startCall = async () => {
    if (!containerRef.current) return
    setLoading(true)

    try {
      // All token generation and authorization happens server-side.
      // The server reads the session, verifies room ownership, and issues the token.
      // The client never touches the Zego server secret or decides its own role.
      const { data } = await axios.post("/api/video-kyc/token", {
        roomId: roomId?.toString()
      })

      // Release preview camera stream tracks so Zego can claim the camera hardware
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
        setStream(null)
      }

      // Store the role as returned by the server (cannot be spoofed)
      setRole(data.role)
      setJoined(true)
      setLoading(false)

      setTimeout(() => {
        if (!containerRef.current) return
        const zp = ZegoUIKitPrebuilt.create(data.token)
        zp.joinRoom({
          container: containerRef.current,
          scenario: {
            mode: ZegoUIKitPrebuilt.OneONoneCall,
          },
          showPreJoinView: false,
        });
      }, 100);
    } catch (error: any) {
      setLoading(false)
      const status = error?.response?.status
      if (status === 401 || status === 403) {
        // User is not authorized for this room — show access denied screen
        setAccessDenied(true)
      } else {
        console.error("[video-kyc] Failed to join call:", error?.response?.data?.message ?? error)
      }
    }
  }

  // Access denied screen — shown when server rejects the token request
  if (accessDenied) {
    return (
      <div className='min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 p-8'>
        <div className='w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center'>
          <ShieldAlert size={40} className='text-red-400' />
        </div>
        <h1 className='text-2xl font-bold'>Access Denied</h1>
        <p className='text-gray-400 text-center max-w-sm'>
          You are not authorized to join this video KYC session. This room may not be assigned to you, or the session may no longer be active.
        </p>
        <button
          onClick={() => router.push("/")}
          className='bg-white text-black px-6 py-3 rounded-xl font-semibold'
        >
          Go to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-black text-white flex flex-col'>
      <div className='px-6 py-4 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <Image src={"/logo.png"} alt='logo' width={44} height={44} priority />
          {/* Role label is set from the server response, not from client state */}
          <p className='text-xs text-gray-400'>
            {role === "admin" ? "Admin Verification" : role === "partner" ? "Partner Video KYC" : "Video KYC"}
          </p>
        </div>

        {joined && (
          <div className='flex flex-wrap gap-3'>
            {/* Approve/Reject only shown when server confirmed the caller is admin */}
            {role === "admin" && (
              <>
                <button
                  className='bg-green-600 hover:bg-green-700 px-4 py-2 rounded-full text-sm flex items-center gap-2'
                  onClick={() => setShowApprovalModel(true)}
                >
                  <CheckCircle size={16} /> Approve
                </button>
                <button
                  className='bg-red-600 hover:bg-red-700 px-4 py-2 rounded-full text-sm flex items-center gap-2'
                  onClick={() => setShowRejectionModel(true)}
                >
                  <XCircle size={16} /> Reject
                </button>
              </>
            )}
            <button
              className='bg-red-700 hover:bg-red-800 px-4 py-2 rounded-full text-sm flex items-center gap-2'
              onClick={() => router.push("/")}
            >
              <PhoneOff size={16} /> End Call
            </button>
          </div>
        )}
      </div>

      <div className='flex-1 relative'>
        <div ref={containerRef} className={`absolute inset-0 ${joined ? "block" : "hidden"}`} />

        {!joined && (
          <div className='h-full flex items-center justify-center px-4 py-10'>
            <div className='w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
              <div className='relative rounded-2xl overflow-hidden border border-white/10 bg-white/5'>
                <video
                  ref={previewRef}
                  autoPlay
                  muted
                  playsInline
                  className='w-full h-[300px] sm:h-[400px] object-cover'
                />
                {!isCameraOn && (
                  <div className='absolute inset-0 bg-black flex items-center justify-center'>
                    <VideoOff size={40} />
                  </div>
                )}
              </div>

              <div className='space-y-8 text-center lg:text-left'>
                <h1 className='text-3xl sm:text-4xl font-bold'>
                  Secure Video KYC
                </h1>
                <div className='flex justify-center lg:justify-start gap-6'>
                  <button
                    onClick={toggleCamera}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition ${isCameraOn
                      ? "bg-white text-black"
                      : "bg-white/10 border border-white/20"
                      }`}
                  >
                    {isCameraOn ? <Video /> : <VideoOff />}
                  </button>

                  <button
                    onClick={toggleMic}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition ${isMicOn
                      ? "bg-white text-black"
                      : "bg-white/10 border border-white/20"
                      }`}
                  >
                    {isMicOn ? <Mic /> : <MicOff />}
                  </button>
                </div>

                <button
                  onClick={startCall}
                  className="w-full bg-white text-black py-4 rounded-xl font-semibold disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? "Connecting..." : "Join Secure Call"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showApprovalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="relative bg-[#111] w-full max-w-md rounded-2xl p-6 shadow-2xl"
            >
              <button className='absolute top-4 right-4 text-gray-400' onClick={() => setShowApprovalModel(false)}>
                <X size={16} />
              </button>
              <h2 className='text-lg font-semibold mb-4'>Confirm Approval</h2>
              <div className='flex gap-4'>
                <button onClick={() => setShowApprovalModel(false)} className='flex-1 border rounded-xl py-2'>Cancel</button>
                <button className='flex-1 bg-green-600 rounded-xl py-2' disabled={aLoading} onClick={handleApprove}>
                  {aLoading ? "Processing..." : "Approve"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRejectionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="relative bg-[#111] w-full max-w-md rounded-2xl p-6 shadow-2xl"
            >
              <button className='absolute top-4 right-4 text-gray-400' onClick={() => setShowRejectionModel(false)}>
                <X size={16} />
              </button>
              <h2 className='text-lg font-semibold mb-4'>Reject Partner</h2>
              <textarea
                placeholder='Give Rejection Reason'
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className='w-full bg-white/10 border border-white/20 rounded-xl p-3 mb-4 text-sm'
              />
              <div className='flex gap-4'>
                <button onClick={() => setShowRejectionModel(false)} className='flex-1 border rounded-xl py-2'>Cancel</button>
                <button className='flex-1 bg-red-600 rounded-xl py-2' disabled={rLoading} onClick={handleReject}>
                  {rLoading ? "Processing..." : "Reject"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default page
