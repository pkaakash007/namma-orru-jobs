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
  onChangeRole?: (userId: string, newRole: 'manager' | 'employee' | 'staff') => void
  onRefresh: () => void
}

export const UserDirectoryTable: React.FC<UserDirectoryTableProps> = ({
  users,
  onPromote,
  onDemote,
  onChangeRole,
  onRefresh,
}) => {
  return (
    <Card className="overflow-hidden shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 p-4 sm:p-5 bg-white">
        <div>
          <h3 className="text-base font-bold text-[#0B2545]">User Directory & Role Assignment</h3>
          <p className="text-xs text-slate-500">
            Assign user roles: Member (Job Seeker), HR / Recruiter, or Company Staff.
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
              <th className="px-5 py-3 text-right">Assign Role</th>
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
                    ) : (
                      <select
                        value={u.role}
                        onChange={(e) => {
                          const newRole = e.target.value as 'manager' | 'employee' | 'staff'
                          if (onChangeRole) {
                            onChangeRole(u.id, newRole)
                          } else if (newRole === 'manager') {
                            onPromote(u.id)
                          } else {
                            onDemote(u.id)
                          }
                        }}
                        className="rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs transition"
                      >
                        <option value="employee">Member</option>
                        <option value="manager">HR / Recruiter</option>
                        <option value="staff">Company Staff</option>
                      </select>
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
