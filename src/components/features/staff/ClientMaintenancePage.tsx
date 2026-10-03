import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Building2,
  Phone,
  Mail,
  Receipt,
  Plus,
  Search,
  Trash2,
  Edit3,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  WalletCards,
} from 'lucide-react'
import { clientService } from '../../../services/api'
import { useToast } from '../../../context/ToastContext'
import type { Client, ClientBilling, ClientOverviewStats } from '../../../types'

export const ClientMaintenancePage: React.FC = () => {
  const { showToast } = useToast()

  // Data state
  const [clients, setClients] = useState<Client[]>([])
  const [stats, setStats] = useState<ClientOverviewStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all')
  const [onlyPendingFilter, setOnlyPendingFilter] = useState(false)

  // Modals state
  const [isAddClientOpen, setIsAddClientOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null)

  // Billing Drawer / Modal state
  const [selectedClientForBilling, setSelectedClientForBilling] = useState<Client | null>(null)
  const [clientBillingRecords, setClientBillingRecords] = useState<ClientBilling[]>([])
  const [clientBillingTotals, setClientBillingTotals] = useState<{
    total_billed: number
    total_paid: number
    total_pending: number
  }>({ total_billed: 0, total_paid: 0, total_pending: 0 })
  const [isLoadingBilling, setIsLoadingBilling] = useState(false)

  // Add / Edit Monthly Bill Modal
  const [isAddBillOpen, setIsAddBillOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<ClientBilling | null>(null)
  const [deletingBillingId, setDeletingBillingId] = useState<string | null>(null)

  // Form states - Client
  const [clientForm, setClientForm] = useState({
    client_name: '',
    company_name: '',
    phone: '',
    email: '',
    address: '',
    service_type: 'Monthly Recruitment',
    total_agreed_amount: '',
    status: 'active' as 'active' | 'paused' | 'completed',
    notes: '',
  })
  const [isSubmittingClient, setIsSubmittingClient] = useState(false)

  // Form states - Billing
  const getCurrentMonthStr = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const [billForm, setBillForm] = useState({
    billing_month: getCurrentMonthStr(),
    billed_amount: '',
    paid_amount: '0',
    due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    payment_status: 'pending' as 'paid' | 'partially_paid' | 'pending' | 'overdue',
    payment_date: '',
    payment_mode: 'Bank Transfer',
    notes: '',
  })
  const [isSubmittingBill, setIsSubmittingBill] = useState(false)

  // Load clients and stats from backend
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true)
    else setIsRefreshing(true)
    try {
      const [clientsRes, statsRes] = await Promise.all([
        clientService.getClients(searchQuery.trim() || undefined),
        clientService.getOverviewStats().catch(() => null),
      ])
      setClients(clientsRes.clients || [])
      if (statsRes) setStats(statsRes)
    } catch (err: any) {
      showToast(err.message || 'Failed to load client records', 'error')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [searchQuery, showToast])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData()
    }, 200)
    return () => clearTimeout(timer)
  }, [loadData])

  // Load billing records for selected client
  const loadClientBilling = useCallback(async (clientId: string) => {
    setIsLoadingBilling(true)
    try {
      const res = await clientService.getClient(clientId)
      setSelectedClientForBilling(res.client)
      setClientBillingRecords(res.billing || [])
      setClientBillingTotals(res.totals || { total_billed: 0, total_paid: 0, total_pending: 0 })
    } catch (err: any) {
      showToast(err.message || 'Failed to load billing history', 'error')
    } finally {
      setIsLoadingBilling(false)
    }
  }, [showToast])

  // Filter clients locally
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (onlyPendingFilter && (c.total_pending || 0) <= 0) return false
      return true
    })
  }, [clients, statusFilter, onlyPendingFilter])

  // Open Add Client
  const handleOpenAddClient = () => {
    setClientForm({
      client_name: '',
      company_name: '',
      phone: '',
      email: '',
      address: '',
      service_type: 'Monthly Recruitment',
      total_agreed_amount: '',
      status: 'active',
      notes: '',
    })
    setEditingClient(null)
    setIsAddClientOpen(true)
  }

  // Open Edit Client
  const handleOpenEditClient = (client: Client) => {
    setEditingClient(client)
    setClientForm({
      client_name: client.client_name,
      company_name: client.company_name,
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      service_type: client.service_type || 'Monthly Recruitment',
      total_agreed_amount: client.total_agreed_amount ? String(client.total_agreed_amount) : '',
      status: client.status,
      notes: client.notes || '',
    })
    setIsAddClientOpen(true)
  }

  // Submit Client Form
  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientForm.client_name.trim() || !clientForm.company_name.trim()) {
      showToast('Client Name and Company Name are required', 'error')
      return
    }

    setIsSubmittingClient(true)
    try {
      const payload: Partial<Client> = {
        client_name: clientForm.client_name.trim(),
        company_name: clientForm.company_name.trim(),
        phone: clientForm.phone.trim(),
        email: clientForm.email.trim(),
        address: clientForm.address.trim(),
        service_type: clientForm.service_type.trim(),
        total_agreed_amount: parseFloat(clientForm.total_agreed_amount) || 0,
        status: clientForm.status,
        notes: clientForm.notes.trim(),
      }

      if (editingClient) {
        await clientService.updateClient(editingClient.id, payload)
        showToast('Client updated successfully', 'success')
      } else {
        await clientService.createClient(payload)
        showToast('Client added successfully', 'success')
      }
      setIsAddClientOpen(false)
      loadData(true)
    } catch (err: any) {
      showToast(err.message || 'Failed to save client', 'error')
    } finally {
      setIsSubmittingClient(false)
    }
  }

  // Delete Client
  const handleDeleteClient = async () => {
    if (!deletingClientId) return
    try {
      await clientService.deleteClient(deletingClientId)
      showToast('Client and all billing records deleted', 'success')
      setDeletingClientId(null)
      if (selectedClientForBilling?.id === deletingClientId) {
        setSelectedClientForBilling(null)
      }
      loadData(true)
    } catch (err: any) {
      showToast(err.message || 'Failed to delete client', 'error')
    }
  }

  // Open Add Bill
  const handleOpenAddBill = () => {
    setBillForm({
      billing_month: getCurrentMonthStr(),
      billed_amount: '',
      paid_amount: '0',
      due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      payment_status: 'pending',
      payment_date: '',
      payment_mode: 'Bank Transfer',
      notes: '',
    })
    setEditingBill(null)
    setIsAddBillOpen(true)
  }

  // Open Edit Bill
  const handleOpenEditBill = (bill: ClientBilling) => {
    setEditingBill(bill)
    setBillForm({
      billing_month: bill.billing_month,
      billed_amount: String(bill.billed_amount || 0),
      paid_amount: String(bill.paid_amount || 0),
      due_date: bill.due_date || '',
      payment_status: bill.payment_status,
      payment_date: bill.payment_date || '',
      payment_mode: bill.payment_mode || 'Bank Transfer',
      notes: bill.notes || '',
    })
    setIsAddBillOpen(true)
  }

  // Auto calculate payment status when billed or paid amount changes
  const handleAmountChange = (field: 'billed_amount' | 'paid_amount', val: string) => {
    const updated = { ...billForm, [field]: val }
    const billed = parseFloat(updated.billed_amount) || 0
    const paid = parseFloat(updated.paid_amount) || 0

    if (paid >= billed && billed > 0) {
      updated.payment_status = 'paid'
      if (!updated.payment_date) {
        updated.payment_date = new Date().toISOString().split('T')[0]
      }
    } else if (paid > 0 && paid < billed) {
      updated.payment_status = 'partially_paid'
    } else {
      updated.payment_status = 'pending'
    }
    setBillForm(updated)
  }

  // Save Billing Record
  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClientForBilling) return
    const billed = parseFloat(billForm.billed_amount) || 0
    const paid = parseFloat(billForm.paid_amount) || 0
    if (billed <= 0) {
      showToast('Please enter a valid billed amount greater than 0', 'error')
      return
    }

    setIsSubmittingBill(true)
    try {
      const payload: Partial<ClientBilling> = {
        billing_month: billForm.billing_month.trim(),
        billed_amount: billed,
        paid_amount: paid,
        pending_amount: Math.max(0, billed - paid),
        due_date: billForm.due_date,
        payment_status: billForm.payment_status,
        payment_date: billForm.payment_date || undefined,
        payment_mode: billForm.payment_mode || undefined,
        notes: billForm.notes.trim() || undefined,
      }

      if (editingBill) {
        await clientService.updateClientBilling(selectedClientForBilling.id, editingBill.id, payload)
        showToast('Billing record updated', 'success')
      } else {
        await clientService.addClientBilling(selectedClientForBilling.id, payload)
        showToast('Monthly billing record added', 'success')
      }
      setIsAddBillOpen(false)
      loadClientBilling(selectedClientForBilling.id)
      loadData(true)
    } catch (err: any) {
      showToast(err.message || 'Failed to save billing record', 'error')
    } finally {
      setIsSubmittingBill(false)
    }
  }

  // Delete Billing Record
  const handleDeleteBill = async () => {
    if (!selectedClientForBilling || !deletingBillingId) return
    try {
      await clientService.deleteClientBilling(selectedClientForBilling.id, deletingBillingId)
      showToast('Billing record removed', 'success')
      setDeletingBillingId(null)
      loadClientBilling(selectedClientForBilling.id)
      loadData(true)
    } catch (err: any) {
      showToast(err.message || 'Failed to delete billing record', 'error')
    }
  }

  // Format currency in Indian Rupees
  const formatCurrency = (amt: number | undefined) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt || 0)
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      {/* ── Top Header & Action Row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
              <WalletCards className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Client Maintenance & Billing
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Manage company clients, contract details, and month-by-month pending balance collections
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh Data"
          >
            <RotateCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleOpenAddClient}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* ── KPI Overview Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Clients</p>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {stats?.total_clients ?? clients.length}
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold inline-flex items-center gap-1 mt-1">
            <CheckCircle2 className="h-3 w-3" />
            {stats?.active_clients ?? clients.filter((c) => c.status === 'active').length} Active
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Contract Value</p>
          <p className="text-lg sm:text-xl font-black text-slate-900 mt-1 truncate">
            {formatCurrency(stats?.total_contract_value ?? clients.reduce((acc, c) => acc + (c.total_agreed_amount || 0), 0))}
          </p>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">Agreed Scope</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Billed</p>
          <p className="text-lg sm:text-xl font-black text-blue-700 mt-1 truncate">
            {formatCurrency(stats?.total_billed ?? clients.reduce((acc, c) => acc + (c.total_billed || 0), 0))}
          </p>
          <span className="text-[11px] text-blue-600 font-medium mt-1 block">All Invoices</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Collected / Paid</p>
          <p className="text-lg sm:text-xl font-black text-emerald-700 mt-1 truncate">
            {formatCurrency(stats?.total_paid ?? clients.reduce((acc, c) => acc + (c.total_paid || 0), 0))}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Received In Bank</span>
        </div>

        <div className="col-span-2 bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Total Pending Due</p>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-900">
              Outstanding
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-700 mt-1">
            {formatCurrency(stats?.total_pending ?? clients.reduce((acc, c) => acc + (c.total_pending || 0), 0))}
          </p>
          <p className="text-[11px] text-rose-700 font-medium mt-1">
            Active balance awaiting collection across all billing cycles
          </p>
        </div>
      </div>

      {/* ── Search, Filters & Quick Toggles ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client name, company, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none transition font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            {(['all', 'active', 'paused', 'completed'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md capitalize transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Only Pending Balance Toggle */}
          <button
            type="button"
            onClick={() => setOnlyPendingFilter(!onlyPendingFilter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
              onlyPendingFilter
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
            <span>Has Pending Due</span>
          </button>
        </div>
      </div>

      {/* ── Client Cards / Directory ── */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
          <RotateCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Loading client registry...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
          <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Clients Found</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            {searchQuery || statusFilter !== 'all' || onlyPendingFilter
              ? 'No client records matched your selected search criteria or filters.'
              : 'Start by registering your company clients to record service contracts and maintain month-wise billing history.'}
          </p>
          {!searchQuery && statusFilter === 'all' && !onlyPendingFilter && (
            <button
              onClick={handleOpenAddClient}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xs hover:bg-indigo-700 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Your First Client</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const pendingBal = client.total_pending ?? 0
            const hasPending = pendingBal > 0

            return (
              <div
                key={client.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
              >
                <div>
                  {/* Top row: Company & Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
                        <h3 className="text-base font-bold text-slate-900 truncate">
                          {client.company_name}
                        </h3>
                      </div>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5 truncate">
                        Contact: <span className="text-slate-800">{client.client_name}</span>
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize shrink-0 border ${
                        client.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : client.status === 'paused'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {client.status}
                    </span>
                  </div>

                  {/* Service type & contract amount */}
                  <div className="bg-slate-50 rounded-xl p-3 mb-3.5 space-y-1.5 border border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Service / Plan:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[170px]">
                        {client.service_type || 'General'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Contract Value:</span>
                      <span className="font-extrabold text-slate-900">
                        {formatCurrency(client.total_agreed_amount)}
                      </span>
                    </div>
                  </div>

                  {/* Financial Collection Snapshot */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50/70 border border-slate-200 mb-3 text-center">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase">Billed</p>
                      <p className="text-xs font-black text-slate-800 mt-0.5">
                        {formatCurrency(client.total_billed)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-emerald-700 uppercase">Paid</p>
                      <p className="text-xs font-black text-emerald-700 mt-0.5">
                        {formatCurrency(client.total_paid)}
                      </p>
                    </div>
                    <div className={hasPending ? 'bg-rose-100/60 rounded-lg py-0.5' : ''}>
                      <p className={`text-[10px] font-bold uppercase ${hasPending ? 'text-rose-800' : 'text-slate-500'}`}>
                        Pending
                      </p>
                      <p className={`text-xs font-black mt-0.5 ${hasPending ? 'text-rose-700' : 'text-slate-800'}`}>
                        {formatCurrency(pendingBal)}
                      </p>
                    </div>
                  </div>

                  {/* Contact Info Pills */}
                  <div className="space-y-1 text-xs text-slate-600 mb-4">
                    {client.phone && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <a
                          href={`tel:${client.phone}`}
                          className="hover:text-indigo-600 hover:underline truncate"
                        >
                          {client.phone}
                        </a>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <a
                          href={`mailto:${client.email}`}
                          className="hover:text-indigo-600 hover:underline truncate"
                        >
                          {client.email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => loadClientBilling(client.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition cursor-pointer"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    <span>Monthly Bills ({client.billing_count || 0})</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditClient(client)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                      title="Edit Client"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingClientId(client.id)}
                      className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete Client"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          MONTHLY BILLING DRAWER / MODAL
          ─────────────────────────────────────────────────────────── */}
      {selectedClientForBilling && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200 flex items-start justify-between gap-3 bg-slate-50/80">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-indigo-600" />
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">
                    {selectedClientForBilling.company_name} — Billing Ledger
                  </h2>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Client: <strong className="text-slate-800">{selectedClientForBilling.client_name}</strong> |
                  Plan: <span className="text-slate-700">{selectedClientForBilling.service_type || 'General'}</span> |
                  Agreed Total: <span className="text-slate-900 font-bold">{formatCurrency(selectedClientForBilling.total_agreed_amount)}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedClientForBilling(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Financial Summary */}
            <div className="grid grid-cols-3 gap-3 p-4 sm:p-6 bg-slate-100/70 border-b border-slate-200">
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-2xs">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Total Billed</p>
                <p className="text-base sm:text-lg font-black text-blue-700 mt-0.5">
                  {formatCurrency(clientBillingTotals.total_billed)}
                </p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-2xs">
                <p className="text-[10px] font-bold text-emerald-700 uppercase">Total Paid</p>
                <p className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
                  {formatCurrency(clientBillingTotals.total_paid)}
                </p>
              </div>
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-center shadow-2xs">
                <p className="text-[10px] font-bold text-rose-800 uppercase">Current Pending</p>
                <p className="text-base sm:text-lg font-black text-rose-700 mt-0.5">
                  {formatCurrency(clientBillingTotals.total_pending)}
                </p>
              </div>
            </div>

            {/* Content & Monthly Ledger */}
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Month-Wise Billing Records ({clientBillingRecords.length})
                </h3>
                <button
                  type="button"
                  onClick={handleOpenAddBill}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Record New Month Bill</span>
                </button>
              </div>

              {isLoadingBilling ? (
                <div className="py-12 text-center">
                  <RotateCw className="h-7 w-7 text-indigo-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-semibold">Loading ledger records...</p>
                </div>
              ) : clientBillingRecords.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No monthly billing records yet</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Add the first monthly invoice for this client to start tracking billed amounts, collections, and pending balances.
                  </p>
                  <button
                    onClick={handleOpenAddBill}
                    className="mt-4 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Month Bill</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-3">Billing Month</th>
                        <th className="py-3 px-3">Billed</th>
                        <th className="py-3 px-3">Paid</th>
                        <th className="py-3 px-3">Pending Due</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Due Date</th>
                        <th className="py-3 px-3">Payment Mode</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clientBillingRecords.map((bill) => (
                        <tr key={bill.id} className="hover:bg-slate-50/80 transition font-medium">
                          <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                            {bill.billing_month}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">
                            {formatCurrency(bill.billed_amount)}
                          </td>
                          <td className="py-3 px-3 font-bold text-emerald-700 whitespace-nowrap">
                            {formatCurrency(bill.paid_amount)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`font-black ${
                                (bill.pending_amount || 0) > 0 ? 'text-rose-600' : 'text-slate-400'
                              }`}
                            >
                              {formatCurrency(bill.pending_amount)}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                bill.payment_status === 'paid'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : bill.payment_status === 'partially_paid'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : bill.payment_status === 'overdue'
                                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {bill.payment_status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                            {bill.due_date || '—'}
                          </td>
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                            {bill.payment_mode || '—'}
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditBill(bill)}
                                className="px-2 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-[11px] cursor-pointer"
                              >
                                Edit / Pay
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingBillingId(bill.id)}
                                className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="Delete Bill"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                All records stored securely in Cloudflare D1
              </span>
              <button
                type="button"
                onClick={() => setSelectedClientForBilling(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          ADD / EDIT CLIENT MODAL
          ─────────────────────────────────────────────────────────── */}
      {isAddClientOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {editingClient ? 'Edit Client Details' : 'Register New Company Client'}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddClientOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="p-4 sm:p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={clientForm.company_name}
                    onChange={(e) => setClientForm({ ...clientForm, company_name: e.target.value })}
                    placeholder="e.g. Acme Tech Corp"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={clientForm.client_name}
                    onChange={(e) => setClientForm({ ...clientForm, client_name: e.target.value })}
                    placeholder="e.g. John Doe (Director)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    placeholder="client@company.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Service / Package</label>
                  <select
                    value={clientForm.service_type}
                    onChange={(e) => setClientForm({ ...clientForm, service_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none font-medium cursor-pointer"
                  >
                    <option value="Monthly Recruitment">Monthly Recruitment</option>
                    <option value="Candidate Staffing">Candidate Staffing</option>
                    <option value="Annual Retainer">Annual Retainer</option>
                    <option value="Platform Job Posting">Platform Job Posting</option>
                    <option value="Consulting & Training">Consulting & Training</option>
                    <option value="Custom Project">Custom Project</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Agreed Value (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={clientForm.total_agreed_amount}
                    onChange={(e) => setClientForm({ ...clientForm, total_agreed_amount: e.target.value })}
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={clientForm.status}
                    onChange={(e) => setClientForm({ ...clientForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none font-medium cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Office Address</label>
                  <input
                    type="text"
                    value={clientForm.address}
                    onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                    placeholder="City / Location"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Terms</label>
                <textarea
                  rows={2}
                  value={clientForm.notes}
                  onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                  placeholder="Payment cycles, GST number, special requirements..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none font-medium resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddClientOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClient}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingClient ? 'Saving...' : editingClient ? 'Save Changes' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          RECORD / EDIT MONTHLY BILL MODAL
          ─────────────────────────────────────────────────────────── */}
      {isAddBillOpen && selectedClientForBilling && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {editingBill ? 'Edit Monthly Bill' : 'Record Monthly Bill'}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddBillOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBill} className="p-4 sm:p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Billing Month *</label>
                  <input
                    type="month"
                    required
                    value={billForm.billing_month}
                    onChange={(e) => setBillForm({ ...billForm, billing_month: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none font-medium cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Status</label>
                  <select
                    value={billForm.payment_status}
                    onChange={(e) => setBillForm({ ...billForm, payment_status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none font-medium cursor-pointer capitalize"
                  >
                    <option value="pending">Pending</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="paid">Fully Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Billed Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={billForm.billed_amount}
                    onChange={(e) => handleAmountChange('billed_amount', e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Paid / Collected (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={billForm.paid_amount}
                    onChange={(e) => handleAmountChange('paid_amount', e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none font-bold text-emerald-700"
                  />
                </div>
              </div>

              {/* Dynamic Balance preview */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="font-semibold text-slate-600">Calculated Pending Due:</span>
                <span className="font-black text-rose-600 text-sm">
                  {formatCurrency(
                    Math.max(
                      0,
                      (parseFloat(billForm.billed_amount) || 0) - (parseFloat(billForm.paid_amount) || 0)
                    )
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={billForm.due_date}
                    onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none font-medium cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Received Date</label>
                  <input
                    type="date"
                    value={billForm.payment_date}
                    onChange={(e) => setBillForm({ ...billForm, payment_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none font-medium cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={billForm.payment_mode}
                  onChange={(e) => setBillForm({ ...billForm, payment_mode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none font-medium cursor-pointer"
                >
                  <option value="Bank Transfer (NEFT/RTGS/IMPS)">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="UPI / GPay / PhonePe">UPI / GPay / PhonePe</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit / Debit Card">Credit / Debit Card</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Transaction Reference</label>
                <input
                  type="text"
                  value={billForm.notes}
                  onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })}
                  placeholder="UTR number, cheque number, invoice ref..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-indigo-600 outline-none font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBillOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBill}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingBill ? 'Saving...' : editingBill ? 'Update Record' : 'Record Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          CONFIRM DELETE CLIENT MODAL
          ─────────────────────────────────────────────────────────── */}
      {deletingClientId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 w-full max-w-sm text-center animate-in zoom-in-95">
            <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Client?</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              This action will permanently delete this client along with all their associated monthly billing records.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingClientId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteClient}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          CONFIRM DELETE BILLING MODAL
          ─────────────────────────────────────────────────────────── */}
      {deletingBillingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 w-full max-w-sm text-center animate-in zoom-in-95">
            <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Billing Record?</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Are you sure you want to remove this monthly billing entry? This will update the client's total billed and pending balance.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingBillingId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBill}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Delete Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
