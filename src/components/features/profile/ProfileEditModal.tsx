import React from 'react'
import { X } from 'lucide-react'
import { UserProfilePage } from './UserProfilePage'

interface ProfileEditModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-[22px] bg-[#F2F2F7]/95 backdrop-blur-2xl shadow-2xl border border-white/60 overflow-hidden my-auto p-4 sm:p-6 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-200/70 hover:text-gray-700 transition cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <UserProfilePage onBack={onClose} showHeaderBack={false} />
      </div>
    </div>
  )
}
