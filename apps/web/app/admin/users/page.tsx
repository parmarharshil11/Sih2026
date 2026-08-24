'use client';

import React, { useEffect, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { Users, CheckCircle, XCircle, ShieldCheck, UserCheck } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    setIsLoading(true);
    api
      .get('/admin/users?limit=50')
      .then((res) => setUsers(res.data || []))
      .catch(() => setUsers([]))
      .finally(() => setIsLoading(false));
  };

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
      toast.success(`User status updated to ${newStatus}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Status update failed');
    }
  };

  const handleVerifyTrainer = async (trainerId: string, verificationStatus: string) => {
    try {
      await api.patch(`/admin/trainers/${trainerId}/verify`, { status: verificationStatus });
      toast.success(`Trainer verification status updated to ${verificationStatus}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Trainer verification failed');
    }
  };

  const columns = [
    {
      header: 'User Email',
      accessor: (user: any) => (
        <div>
          <span className="font-bold text-white block">{user.email}</span>
          <span className="text-[10px] text-slate-500 font-mono">ID: {user.id}</span>
        </div>
      ),
    },
    {
      header: 'Assigned Roles',
      accessor: (user: any) => (
        <div className="flex flex-wrap gap-1">
          {user.userRoles?.map((ur: any, idx: number) => (
            <span
              key={idx}
              className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20"
            >
              {ur.role?.name || 'User'}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: 'Account Status',
      accessor: (user: any) => (
        <span
          className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
            user.status === 'active'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : user.status === 'suspended'
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}
        >
          {user.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (user: any) => (
        <div className="flex items-center gap-2">
          {user.status === 'active' ? (
            <button
              onClick={() => handleUpdateStatus(user.id, 'suspended')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
            >
              Suspend
            </button>
          ) : (
            <button
              onClick={() => handleUpdateStatus(user.id, 'active')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              Activate
            </button>
          )}

          {user.trainerProfile && (
            <button
              onClick={() => handleVerifyTrainer(user.trainerProfile.id, 'verified')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
            >
              Verify Trainer
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          User & Trainer Verification Management
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage system users, activate/suspend accounts, and moderate trainer verification applications.
        </p>
      </div>

      <DataTable columns={columns} data={users} isLoading={isLoading} />
    </div>
  );
}
