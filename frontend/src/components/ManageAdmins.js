import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import api, { getErrorMessage } from '../lib/api';
import useFetch from '../hooks/useFetch';
import Field from './Field';
import { EmptyBox, ErrorBox, PageLoading } from './StateViews';
import { formatDay } from '../lib/dates';

function UserRow({ u, busy, onToggle }) {
  return (
    <tr className="border-b border-black/5 last:border-0" data-testid={`admin-user-row-${u.id}`}>
      <td className="p-4 font-medium">
        {u.name}
        {u.is_you && <span className="ml-2 text-xs uppercase tracking-widest text-brand-muted">(you)</span>}
      </td>
      <td className="p-4 break-all">{u.email}</td>
      <td className="p-4 whitespace-nowrap">{formatDay(u.created_at, 'MMM d, yyyy')}</td>
      <td className="p-4">
        {u.is_admin ? (
          <span className="inline-flex items-center gap-1 text-brand-green font-medium" data-testid={`admin-badge-${u.id}`}><ShieldCheck size={16} aria-hidden="true" /> Admin</span>
        ) : (
          <span className="text-brand-muted">Member</span>
        )}
      </td>
      <td className="p-4 text-right">
        {!u.is_you && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onToggle(u)}
            data-testid={`toggle-admin-${u.id}`}
            className={`btn-outline !px-4 !py-2 !text-xs whitespace-nowrap ${u.is_admin ? '!text-brand-orange !border-brand-orange' : ''}`}
          >
            {u.is_admin ? 'Remove admin' : 'Make admin'}
          </button>
        )}
      </td>
    </tr>
  );
}

export default function ManageAdmins() {
  const users = useFetch('/admin/users');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);

  const toggle = async (u) => {
    const makeAdmin = !u.is_admin;
    const msg = makeAdmin
      ? `Give ${u.name} (${u.email}) full admin access?`
      : `Remove admin access from ${u.name} (${u.email})?`;
    if (!window.confirm(msg)) return;
    setBusyId(u.id);
    try {
      await api.patch(`/admin/users/${u.id}`, { is_admin: makeAdmin });
      toast.success(makeAdmin ? `${u.name} is now an admin.` : `${u.name} is no longer an admin.`);
      users.reload();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  if (users.loading && !users.data) return <PageLoading />;
  if (users.error) return <ErrorBox message={users.error} onRetry={users.reload} />;

  const q = query.trim().toLowerCase();
  const shown = users.data.filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  const adminCount = users.data.filter((u) => u.is_admin).length;

  return (
    <div data-testid="manage-admins">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div className="sm:w-80">
          <Field label="Search members" type="search" data-testid="admin-user-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or email" />
        </div>
        <p className="text-sm text-brand-muted" data-testid="admin-count">
          {adminCount} {adminCount === 1 ? 'admin' : 'admins'} · {users.data.length} {users.data.length === 1 ? 'member' : 'members'}
        </p>
      </div>
      <p className="text-sm text-brand-muted mb-6">
        To add an admin, ask them to create an account first, then find them here and choose “Make admin”. Admins can edit all content and see attendee details.
      </p>
      {shown.length === 0 ? <EmptyBox>No members match that search.</EmptyBox> : (
        <div className="overflow-x-auto border border-black/10 bg-white/50">
          <table className="w-full text-left text-sm" data-testid="admin-users-table">
            <caption className="sr-only">Members and admins</caption>
            <thead className="border-b border-black/10 uppercase tracking-widest text-xs text-brand-muted">
              <tr>
                <th scope="col" className="p-4">Name</th><th scope="col" className="p-4">Email</th><th scope="col" className="p-4">Joined</th>
                <th scope="col" className="p-4">Role</th><th scope="col" className="p-4"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => <UserRow key={u.id} u={u} busy={busyId === u.id} onToggle={toggle} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
