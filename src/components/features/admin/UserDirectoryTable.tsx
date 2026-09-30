import React from 'react'
import type { User } from '../../../types'
import { Card } from '../../ui/Card'
import { Badge } from '../../ui/Badge'
import { Avatar } from '../../ui/Avatar'
import { Button } from '../../ui/Button'
import { RefreshCw } from 'lucide-react'

interface UserDirectoryTableProps {
  users: User[]
  onPromote: (userId: string) => void
  onDemote: (userId: string) => void
  onRefresh: () => void
}

export const UserDirectoryTable: React.FC<UserDirectoryTableProps> = ({
  users,
  onPromote,
  onDemote,
  onRefresh,
}) => {
  return (
    <Card className="overflow-hidden shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 p-4 sm:p-5 bg-white">
        <div>
          <h3 className="text-base font-bold text-[#0B2545]">User Directory & Role Promotion</h3>
          <p className="text-xs text-slate-500">
            Promote verified employees to HR / Manager or demote back to candidate role.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onRefresh}
          icon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-[#F8FAFC] text-[11px] font-bold uppercase text-slate-500 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3">Member</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Current Role</th>
              <th className="px-5 py-3">Assigned By</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-slate-500">
                  No users loaded. Click Refresh to query database.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar src={u.avatar_url} name={u.full_name} size="xs" />
                      <span className="font-bold text-[#0F172A]">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant="role" role={u.role} />
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">
                    {u.assigned_by_name ? (
                      <span className="text-[#0B2545] font-semibold">Admin: {u.assigned_by_name}</span>
                    ) : u.role === 'admin' ? (
                      <span className="font-semibold text-[#0B2545]">Direct D1 DB</span>
                    ) : (
                      <span className="text-slate-400">Default</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {u.role === 'admin' ? (
                      <span className="text-xs text-slate-400 italic">Protected Admin</span>
                    ) : u.role === 'employee' ? (
                      <button
                        onClick={() => onPromote(u.id)}
                        className="rounded-full border border-[#F97316] bg-orange-50 px-3 py-1 text-xs font-bold text-[#EA580C] hover:bg-[#F97316] hover:text-white transition"
                      >
                        Promote to HR
                      </button>
                    ) : (
                      <button
                        onClick={() => onDemote(u.id)}
                        className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-gray-100 transition"
                      >
                        Demote to Candidate
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-200 bg-[#F8FAFC] p-4 text-xs flex items-center justify-between text-slate-500">
        <div>
          <span className="font-bold text-[#0B2545]">
            Enterprise Role Governance & Moderation Policy
          </span>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Admins have platform privileges to promote verified company recruiters to HR / Manager status. Candidate accounts remain protected.
          </p>
        </div>
        <Badge variant="role" role="admin" />
      </div>
    </Card>
  )
}
