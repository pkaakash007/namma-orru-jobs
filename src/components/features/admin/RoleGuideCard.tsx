import React from 'react'
import { Card } from '../../ui/Card'
import { ShieldCheck } from 'lucide-react'

export const RoleGuideCard: React.FC = () => {
  return (
    <Card className="border-[#E0DFDC] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-bold text-[#0B2545]">
        <ShieldCheck className="h-5 w-5 text-[#0B2545]" />
        <span>Role-Based Access Governance</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Enterprise multi-tier role permissions and security:
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 text-xs leading-relaxed sm:grid-cols-3">
        <div className="rounded-lg border border-[#E0DFDC] bg-[#F8FAFC] p-3.5">
          <div className="flex items-center gap-1.5 font-bold text-[#0B2545]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0B2545] text-[10px] text-white">1</span>
            <span>Platform Administrator</span>
          </div>
          <p className="mt-2 text-slate-600">
            <strong>Database Manual Assignment Only.</strong> Highest privilege level. Cannot be selected during signup. Admin status is provisioned directly in database.
          </p>
        </div>

        <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-3.5">
          <div className="flex items-center gap-1.5 font-bold text-[#EA580C]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F97316] text-[10px] text-white">2</span>
            <span>HR / Hiring Manager</span>
          </div>
          <p className="mt-2 text-slate-600">
            <strong>Verified Recruiter.</strong> Authorized to publish new job opportunities, review applicant resumes, and hire talent.
          </p>
        </div>

        <div className="rounded-lg border border-[#E0DFDC] bg-[#F8FAFC] p-3.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 text-[10px] text-white">3</span>
            <span>Candidate / Professional</span>
          </div>
          <p className="mt-2 text-slate-600">
            <strong>Standard Member.</strong> Default profile for all registered professionals. Can discover opportunities, easy apply, and connect.
          </p>
        </div>
      </div>
    </Card>
  )
}
