import React, { useState } from 'react'

function DocPreview({ label, url }: { label: string; url?: string }) {
    const [imgError, setImgError] = useState(false)

    if (!url) {
        return (
            <div className='bg-gray-50 rounded-2xl border overflow-hidden shadow-sm'>
                <div className='px-4 py-2 border-b text-sm font-semibold'>{label}</div>
                <div className='h-52 flex items-center justify-center bg-white text-xs text-gray-400'>
                    Image Not Uploaded
                </div>
            </div>
        )
    }

    const displayUrl = (url.includes('/image/upload/') && url.toLowerCase().endsWith('.pdf'))
        ? url.replace(/\.pdf$/i, '.png')
        : url

    return (
        <div className='bg-gray-50 rounded-2xl border overflow-hidden shadow-sm flex flex-col justify-between'>
            <div className='px-4 py-2 border-b text-sm font-semibold'>{label}</div>
            <div className='h-52 flex items-center justify-center bg-white overflow-hidden relative p-1'>
                {!imgError ? (
                    <img 
                        src={displayUrl} 
                        alt={label} 
                        className='w-full h-full object-contain' 
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <iframe src={displayUrl} className='w-full h-full border-0' title={label} />
                )}
            </div>
            <button
                type="button"
                onClick={() => {
                    window.open(displayUrl, '_blank', 'noopener,noreferrer')
                }}
                className="w-full text-center text-xs py-2.5 font-semibold text-blue-600 hover:bg-gray-100 border-t transition cursor-pointer"
            >
                Open Full Document ↗
            </button>
        </div>
    )
}

export default DocPreview
