'use client'
import React, { useEffect, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Crosshair, Loader2, Locate, MapPin, Minus, Plus, Search, X } from 'lucide-react'
import axios from 'axios'

type MapPickerProps = {
  open: boolean
  onClose: () => void
  title: string
  initialLat?: number
  initialLng?: number
  onConfirm: (address: string, lat: number, lng: number) => void
}

const pinIcon = new L.DivIcon({
  html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 6px 18px rgba(0,0,0,0.35));transform:translate3d(0,0,0)">
      <div style="background:#0a0a0a;color:#ffffff;padding:5px 14px;border-radius:100px;font-size:10px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;white-space:nowrap;font-family:-apple-system,system-ui,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,0.25)">PIN LOCATION</div>
      <div style="width:2px;height:10px;background:#0a0a0a"></div>
      <div style="width:14px;height:14px;background:#0a0a0a;border-radius:50%;border:3px solid #ffffff;box-shadow:0 0 0 2px rgba(0,0,0,0.25)"></div>
    </div>`,
  className: '',
  iconSize: [100, 50],
  iconAnchor: [50, 50],
})

function MapEventsHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void
}) {
  const map = useMap()
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng)
      map.panTo(e.latlng, { animate: true })
    },
  })
  return null
}

function MapController({
  initialCenter,
  setMapInstance,
}: {
  initialCenter: [number, number]
  setMapInstance: (map: L.Map) => void
}) {
  const map = useMap()
  useEffect(() => {
    setMapInstance(map)
    map.setView(initialCenter, 16)
    map.invalidateSize()
    const t1 = setTimeout(() => map.invalidateSize(), 150)
    const t2 = setTimeout(() => map.invalidateSize(), 350)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [map, initialCenter, setMapInstance])
  return null
}

export default function MapPickerModal({
  open,
  onClose,
  title,
  initialLat,
  initialLng,
  onConfirm,
}: MapPickerProps) {
  const defaultPos: [number, number] = [
    initialLat && !isNaN(initialLat) && initialLat !== 0 ? initialLat : 28.6139,
    initialLng && !isNaN(initialLng) && initialLng !== 0 ? initialLng : 77.209,
  ]

  const [pos, setPos] = useState<[number, number]>(defaultPos)
  const [address, setAddress] = useState('')
  const [loadingAddr, setLoadingAddr] = useState(false)
  const [locating, setLocating] = useState(false)
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])

  const reverseGeocode = async (lat: number, lng: number) => {
    setLoadingAddr(true)
    let resolvedAddress = ''

    // 1. Try Geoapify if a key is provided
    const geoKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY
    if (geoKey && geoKey.length >= 30) {
      try {
        const { data } = await axios.get('https://api.geoapify.com/v1/geocode/reverse', {
          params: {
            lat,
            lon: lng,
            apiKey: geoKey,
            filter: 'countrycode:in',
          },
          timeout: 3500,
        })
        if (data?.features?.length) {
          const p = data.features[0].properties
          resolvedAddress = p.formatted || [p.name, p.street, p.city, p.state, p.country].filter(Boolean).join(', ')
        }
      } catch (err) {
        console.warn('Geoapify reverse geocode skipped/failed:', err)
      }
    }

    // 2. OpenStreetMap Nominatim reverse geocode fallback
    if (!resolvedAddress) {
      try {
        const nomRes = await axios.get(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          {
            headers: { 'Accept-Language': 'en' },
            timeout: 5000,
          }
        )
        if (nomRes.data?.display_name) {
          resolvedAddress = nomRes.data.display_name
        }
      } catch (nomErr) {
        console.warn('Nominatim reverse geocode error:', nomErr)
      }
    }

    setAddress(resolvedAddress || `${lat.toFixed(4)}, ${lng.toFixed(4)}`)
    setLoadingAddr(false)
  }

  useEffect(() => {
    if (open) {
      setPos(defaultPos)
      reverseGeocode(defaultPos[0], defaultPos[1])
    }
  }, [open, initialLat, initialLng])

  const handleSelect = (lat: number, lng: number) => {
    setPos([lat, lng])
    reverseGeocode(lat, lng)
  }

  const handleLocateMe = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (posRes) => {
        const lat = posRes.coords.latitude
        const lng = posRes.coords.longitude
        setPos([lat, lng])
        reverseGeocode(lat, lng)
        if (mapInstance) {
          mapInstance.flyTo([lat, lng], 17, { duration: 1.2 })
        }
        setLocating(false)
      },
      (err) => {
        console.warn('Geolocation error:', err)
        setLocating(false)
      },
      { timeout: 8000, enableHighAccuracy: true }
    )
  }

  const handleRecenter = () => {
    if (mapInstance) {
      mapInstance.flyTo(pos, 16, { duration: 0.8 })
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const { data } = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}&limit=5`,
        { headers: { 'Accept-Language': 'en' }, timeout: 5000 }
      )
      setSearchResults(data || [])
    } catch (err) {
      console.warn('Search error:', err)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleSelectSearchResult = (item: any) => {
    const lat = parseFloat(item.lat)
    const lng = parseFloat(item.lon)
    setPos([lat, lng])
    setAddress(item.display_name)
    setSearchResults([])
    setSearchQuery('')
    if (mapInstance) {
      mapInstance.flyTo([lat, lng], 16, { duration: 1 })
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 flex flex-col h-[88vh] max-h-[660px]"
        >
          {/* Header with Search */}
          <div className="px-5 py-3.5 border-b border-zinc-100 bg-white flex flex-col gap-2.5 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-zinc-950 flex items-center justify-center text-white shadow-sm">
                  <MapPin size={15} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-zinc-900 tracking-tight">{title}</h2>
                  <p className="text-[10px] text-zinc-400 font-medium">Drag pin or click anywhere to pinpoint location</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Search Input */}
            <form onSubmit={handleSearch} className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search street, locality, or landmark in India..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="h-9 px-3.5 rounded-xl bg-zinc-900 hover:bg-black disabled:opacity-40 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                {searching ? <Loader2 size={12} className="animate-spin" /> : 'Find'}
              </button>
            </form>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute left-5 right-5 top-[108px] z-[500] bg-white rounded-2xl border border-zinc-200 shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full p-2.5 text-left hover:bg-zinc-50 border-b border-zinc-100 last:border-0 flex items-start gap-2.5 transition-colors"
                  >
                    <MapPin size={14} className="text-zinc-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-zinc-800 line-clamp-1">{item.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map Body with White Background Theme */}
          <div className="relative flex-1 w-full bg-white z-0 overflow-hidden white-map-theme">
            <MapContainer
              className="white-map-theme"
              center={pos}
              zoom={16}
              maxZoom={19}
              scrollWheelZoom={true}
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
              <MapController initialCenter={pos} setMapInstance={setMapInstance} />
              <MapEventsHandler onLocationSelect={handleSelect} />
              <Marker
                position={pos}
                icon={pinIcon}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const m = e.target.getLatLng()
                    handleSelect(m.lat, m.lng)
                  },
                }}
              />
            </MapContainer>

            {/* Top Helper Badge */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-zinc-950/85 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg pointer-events-none backdrop-blur-md tracking-wider uppercase">
              Click anywhere or drag pin
            </div>

            {/* Floating Map Controls (Zoom + GPS + Recenter) */}
            <div className="absolute right-3.5 bottom-3.5 z-[400] flex flex-col gap-2">
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={locating}
                title="Current GPS Location"
                className="w-9 h-9 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200/90 text-zinc-800 flex items-center justify-center shadow-lg transition-transform active:scale-95"
              >
                {locating ? <Loader2 size={15} className="animate-spin text-zinc-900" /> : <Locate size={15} />}
              </button>
              <button
                type="button"
                onClick={handleRecenter}
                title="Recenter Pin"
                className="w-9 h-9 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200/90 text-zinc-800 flex items-center justify-center shadow-lg transition-transform active:scale-95"
              >
                <Crosshair size={15} />
              </button>
              <div className="flex flex-col rounded-xl bg-white border border-zinc-200/90 shadow-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => mapInstance?.zoomIn()}
                  title="Zoom In"
                  className="w-9 h-8 hover:bg-zinc-50 text-zinc-800 flex items-center justify-center border-b border-zinc-100 font-bold transition-colors"
                >
                  <Plus size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => mapInstance?.zoomOut()}
                  title="Zoom Out"
                  className="w-9 h-8 hover:bg-zinc-50 text-zinc-800 flex items-center justify-center font-bold transition-colors"
                >
                  <Minus size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="p-4 bg-white border-t border-zinc-100 space-y-3 z-10">
            <div className="flex items-start gap-3 bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3">
              <div className="w-7 h-7 rounded-lg bg-zinc-950 flex items-center justify-center flex-shrink-0 text-white mt-0.5 shadow-sm">
                <MapPin size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Selected Location</p>
                <div className="mt-0.5">
                  {loadingAddr ? (
                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                      <Loader2 size={12} className="animate-spin text-zinc-800" />
                      <span>Resolving address...</span>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm font-bold text-zinc-900 leading-snug line-clamp-2">
                      {address || `${pos[0].toFixed(5)}, ${pos[1].toFixed(5)}`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              disabled={loadingAddr || !address}
              onClick={() => {
                onConfirm(address, pos[0], pos[1])
                onClose()
              }}
              className="w-full h-11 rounded-2xl bg-zinc-950 hover:bg-black disabled:opacity-40 text-white font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99]"
            >
              <Check size={16} />
              <span>Confirm Location</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
