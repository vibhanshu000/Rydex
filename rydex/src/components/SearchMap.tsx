'use client'
import React, { useEffect, useState } from 'react'
import L from "leaflet"
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import axios from 'axios'
import { AnimatePresence, motion } from 'motion/react'
import { MapPin, Navigation2 } from 'lucide-react'

type props = {
  pickUp: string,
  drop: string,
  pickUpLat?: number,
  pickUpLon?: number,
  dropLat?: number,
  dropLon?: number,
  onChange: (p: string, d: string) => void,
  onDistance: (d: number) => void
}

function FitBounds({ p1, p2 }: { p1?: [number, number], p2?: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
    if (p1 && p2) {
      map.fitBounds([p1, p2], { padding: [72, 72], maxZoom: 15, animate: true, duration: 1 })
    } else if (p1) {
      map.setView(p1, 14, { animate: true })
    } else if (p2) {
      map.setView(p2, 14, { animate: true })
    }
  }, [p1, p2, map])
  return null
}


const pickUpIcon = new L.DivIcon({
  html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 6px 18px rgba(0,0,0,0.22))">
      <div style="
        background:#0a0a0a;color:#fff;
        padding:5px 14px;border-radius:100px;
        font-size:10px;font-weight:800;letter-spacing:0.14em;
        text-transform:uppercase;white-space:nowrap;
        font-family:-apple-system,system-ui,sans-serif;
        box-shadow:0 2px 12px rgba(0,0,0,0.25);
      ">PICKUP</div>
      <div style="width:2px;height:10px;background:#0a0a0a;opacity:0.4"></div>
      <div style="
        width:13px;height:13px;background:#0a0a0a;border-radius:50%;
        border:3px solid #fff;
        box-shadow:0 0 0 2px rgba(0,0,0,0.15), 0 3px 10px rgba(0,0,0,0.3);
      "></div>
    </div>`,
  className: "",
  iconSize: [90, 58],
  iconAnchor: [45, 58]
})

const dropIcon = new L.DivIcon({
  html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 6px 18px rgba(0,0,0,0.22))">
      <div style="
        background:#0a0a0a;color:#fff;
        padding:5px 14px;border-radius:100px;
        font-size:10px;font-weight:800;letter-spacing:0.14em;
        text-transform:uppercase;white-space:nowrap;
        font-family:-apple-system,system-ui,sans-serif;
        box-shadow:0 2px 12px rgba(0,0,0,0.25);
      ">Drop</div>
      <div style="width:2px;height:10px;background:#0a0a0a;opacity:0.4"></div>
      <div style="
        width:13px;height:13px;background:#0a0a0a;border-radius:50%;
        border:3px solid #fff;
        box-shadow:0 0 0 2px rgba(0,0,0,0.15), 0 3px 10px rgba(0,0,0,0.3);
      "></div>
    </div>`,
  className: "",
  iconSize: [90, 58],
  iconAnchor: [45, 58]
})




function SearchMap({ pickUp, drop, pickUpLat, pickUpLon, dropLat, dropLon, onChange, onDistance }: props) {

  const [p1, setP1] = useState<[number, number]>()
  const [p2, setP2] = useState<[number, number]>()
  const [route, setRoute] = useState<[number, number][]>([])
  const [km, setKm] = useState<number | null>(0)
  const [ready, setReady] = useState(false)
  const geoCoding = async (q: string): Promise<[number, number] | null> => {
    try {
      if (!q || !q.trim()) return null
      try {
        const { data } = await axios.get("https://api.geoapify.com/v1/geocode/search", {
          params: {
            text: q.trim(),
            apiKey: process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY,
            filter: "countrycode:in",
            limit: 1
          }
        })
        if (data.features?.length) {
          const [lon, lat] = data.features[0].geometry.coordinates
          return [lat, lon]
        }
      } catch (err) {
        console.log("Geoapify search error:", err)
      }

      try {
        const { data } = await axios.get("https://api.geoapify.com/v1/geocode/autocomplete", {
          params: {
            text: q.trim().split(",")[0],
            apiKey: process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY,
            filter: "countrycode:in",
            limit: 1
          }
        })
        if (data.features?.length) {
          const [lon, lat] = data.features[0].geometry.coordinates
          return [lat, lon]
        }
      } catch (err) {
        console.log("Geoapify autocomplete error:", err)
      }

      try {
        const { data } = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q.trim())}&limit=1`)
        if (data?.length) {
          return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
        }
      } catch (err) {
        console.log("Nominatim geocode error:", err)
      }

      return null
    } catch (error) {
      console.log(error)
      return null
    }
  }

  const reverseGeoCoding = async (lat: number, lon: number) => {
    try {
      if (process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY) {
        const { data } = await axios.get("https://api.geoapify.com/v1/geocode/reverse", {
          params: {
            lat,
            lon,
            apiKey: process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY,
            filter: "countrycode:in"
          }
        })
        if (data?.features?.length) {
          const p = data.features[0].properties
          return [p.name, p.street, p.city, p.state, p.country].filter(Boolean).join(",")
        }
      }
    } catch (err) {
      console.warn("Geoapify reverse geocoding error:", err)
    }

    try {
      const { data } = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
      if (data?.display_name) {
        return data.display_name
      }
    } catch (nomErr) {
      console.warn("Nominatim reverse geocode error:", nomErr)
    }

    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`
  }

  const loadRoute = async (p: [number, number], d: [number, number]) => {
    try {
      const { data } = await axios.get(`https://router.project-osrm.org/route/v1/driving/${p[1]},${p[0]};${d[1]},${d[0]}?overview=full&geometries=geojson`)
      console.log(data)
      if (!data.routes.length) return;
      setRoute(data.routes[0].geometry.coordinates.map(([lon, lat]: number[]) => [lat, lon]))
      const distKm = +((data.routes[0].distance) / 1000).toFixed(2)
      setKm(distKm)
      onDistance(distKm)
    } catch (error) {
      console.log(error)
    }
  }

  const dragPickUp = async (lat: number, lon: number) => {
    const addr = await reverseGeoCoding(lat, lon)
    setP1([lat, lon])
    if (p2) {
      loadRoute([lat, lon], p2)
    }
    if (addr) {
      onChange?.(addr, drop)
    }
  }
  const dragDrop = async (lat: number, lon: number) => {
    const addr = await reverseGeoCoding(lat, lon)
    setP2([lat, lon])
    if (p1) {
      loadRoute(p1, [lat, lon])
    }
    if (addr) {
      onChange?.(pickUp, addr)
    }
  }




  useEffect(() => {
    (async () => {
      setReady(false)
      let a: [number, number] | null = null
      let b: [number, number] | null = null

      if (pickUpLat !== undefined && pickUpLon !== undefined && !isNaN(pickUpLat) && !isNaN(pickUpLon) && pickUpLat !== 0 && pickUpLon !== 0) {
        a = [pickUpLat, pickUpLon]
      } else if (pickUp) {
        a = await geoCoding(pickUp)
      }

      if (dropLat !== undefined && dropLon !== undefined && !isNaN(dropLat) && !isNaN(dropLon) && dropLat !== 0 && dropLon !== 0) {
        b = [dropLat, dropLon]
      } else if (drop) {
        b = await geoCoding(drop)
      }

      if (a) setP1(a)
      if (b) setP2(b)

      if (a && b) {
        await loadRoute(a, b)
      }
      setReady(true)
    })()
  }, [pickUp, drop, pickUpLat, pickUpLon, dropLat, dropLon])


  return (
    <div className='relative h-full w-full bg-white white-map-theme'>
      <MapContainer
        className='white-map-theme'
        style={{ width: "100%", height: "100%" }}
        center={p1 ?? [28.6139, 77.2090]}
        zoom={13}
        zoomControl={false}
      >


        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {(p1 || p2) && <FitBounds p1={p1} p2={p2} />}

        {p1 && <Marker
          position={p1}
          icon={pickUpIcon}
          draggable
          eventHandlers={{
            dragend: e => {
              const m = e.target.getLatLng()
              dragPickUp(m.lat, m.lng)
            }
          }}
        />}
        {p2 && <Marker
          position={p2}
          icon={dropIcon}
          draggable
          eventHandlers={{
            dragend: e => {
              const m = e.target.getLatLng()
              dragDrop(m.lat, m.lng)
            }
          }}
        />}

        {route.length > 0 && (
          <>
            <Polyline positions={route} pathOptions={{ color: "#0a0a0a", weight: 4, lineCap: "round", lineJoin: "round" }} />

          </>
        )}

      </MapContainer>

      <AnimatePresence>
        {!ready && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-0 z-[999] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center gap-4"
          >
            <div className='relative w-14 h-14 flex items-center justify-center'>
              <motion.div
               animate={{ rotate: 360 }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-zinc-900"
              />
               <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 rounded-full border border-transparent border-t-zinc-300"
               />
               <MapPin  size={15} className="text-zinc-800" />
            </div>
            <div className='text-center'>
              <p className='text-zinc-900 text-xs font-black tracking-[0.22em] uppercase'>Loading Map</p>
              <p className='text-zinc-400 text-[10px] font-medium tracking-wider mt-0.5'>Plotting your route…</p>
            </div>

          </motion.div>

        )}
      </AnimatePresence>

      <AnimatePresence>
        {ready && km!==null && (
          <motion.div
           initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-20 left-4 z-[500] flex items-center gap-2 bg-white border border-zinc-200 px-3.5 py-2 rounded-xl shadow-lg"
          >
            <Navigation2 size={13} className="text-zinc-900"/>
            <span className='text-zinc-900 text-xs font-bold'>{km} km</span>
            <span className='w-px h-3 bg-zinc-200'/>
            <span> ~{Math.max(3, Math.round((km / 25) * 60))} min</span>

          </motion.div>
        )}
      </AnimatePresence>


    </div>
  )
}

export default SearchMap
