import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminConsoleApi } from '../api/admin-console.api';
import { useAuth } from '../../auth/hooks/useAuth';
import { UserCog, UserPlus } from 'lucide-react';

export const StaffAdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('DOCTOR');
  const [newDept, setNewDept] = useState('General Medicine');

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const { data, isLoading } = useQuery({
    queryKey: ['admin-staff'],
    queryFn: () => adminConsoleApi.getStaff(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminConsoleApi.createStaff({
        email: newEmail,
        fullName: newName,
        role: newRole,
        hospitalDepartment: newDept,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
      setIsCreateOpen(false);
      setNewEmail('');
      setNewName('');
    },
    onError: (err: any) => {
      alert(err.response?.data?.error?.message || 'Failed to create staff account.');
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ staffId, role }: { staffId: string; role: string }) =>
      adminConsoleApi.updateStaffRole(staffId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error?.message || 'Failed to change role.');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (staffId: string) => adminConsoleApi.deactivateStaff(staffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error?.message || 'Failed to deactivate account.');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserCog className="w-5 h-5 text-indigo-600" />
            <span>Hospital Staff Account & Role Administration</span>
          </h2>
          <p className="text-xs text-slate-500">
            Powered by Module 2 authentication services. Role modifications and account deactivations are critical audit events.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Staff Accounts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-2xs uppercase text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Department</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">Loading staff directory...</td>
                </tr>
              ) : (
                data?.staff?.map((staff: any) => {
                  const isSelf = user?.id === staff.id;
                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-2.5 font-bold text-slate-900">
                        {staff.fullName} {isSelf && <span className="text-2xs font-normal text-indigo-600">(You)</span>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 font-mono text-2xs">
                        {staff.email}
                      </td>
                      <td className="px-4 py-2.5">
                        {isSuperAdmin && !isSelf ? (
                          <select
                            value={staff.role}
                            onChange={(e) => roleMutation.mutate({ staffId: staff.id, role: e.target.value })}
                            className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-0.5 font-bold text-indigo-700"
                          >
                            <option value="DOCTOR">DOCTOR</option>
                            <option value="STAFF_ATTENDANT">STAFF_ATTENDANT</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                            <option value="ANALYST">ANALYST</option>
                            <option value="AUDITOR">AUDITOR</option>
                          </select>
                        ) : (
                          <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-2xs">
                            {staff.role}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {staff.hospitalDepartment || 'General OPD'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-3xs font-bold ${
                            staff.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {staff.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {isSuperAdmin && !isSelf && staff.status === 'ACTIVE' && (
                          <button
                            onClick={() => {
                              if (confirm(`Deactivate account for ${staff.fullName}? Active sessions will be revoked.`)) {
                                deactivateMutation.mutate(staff.id);
                              }
                            }}
                            className="text-2xs font-semibold text-rose-600 hover:text-rose-800"
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Staff Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Provision Hospital Staff Account</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Rajesh Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="name@hospital.org"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assigned Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="DOCTOR">DOCTOR (Clinical Review)</option>
                  <option value="STAFF_ATTENDANT">STAFF_ATTENDANT (Kiosk Support)</option>
                  <option value="ADMIN">ADMIN (Operations & Content)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Full Governance)</option>
                  <option value="ANALYST">ANALYST (Aggregates Only)</option>
                  <option value="AUDITOR">AUDITOR (Audit Trail & Compliance)</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Department</label>
                <input
                  type="text"
                  placeholder="Department of General Medicine"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !newEmail || !newName}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
              >
                {createMutation.isPending ? 'Provisioning...' : 'Provision Staff'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
