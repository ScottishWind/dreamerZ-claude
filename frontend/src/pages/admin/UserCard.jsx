import { useState } from 'react';
import { Trash2, Lock, Sparkles, User, Shield, UserPlus, X, ChevronDown } from 'lucide-react';

export const UserCard = ({ 
  user, 
  currentUser,
  allSupervisors = [],
  onRoleChange, 
  onAIToggle, 
  onActiveToggle, 
  onAssignSupervisor,
  onRemoveSupervisor,
  onDelete, 
  roleLoading, 
  deleteConfirm, 
  setDeleteConfirm 
}) => {
  const [localRole, setLocalRole] = useState(user.role || 'learner');
  const [supervisorPickerOpen, setSupervisorPickerOpen] = useState(false);

  const roleColors = {
    admin: 'bg-amber-50 text-amber-700 border-amber-200',
    creator: 'bg-blue-50 text-blue-700 border-blue-200',
    supervisor: 'bg-purple-50 text-purple-700 border-purple-200',
    learner: 'bg-slate-50 text-slate-600 border-slate-200'
  };

  const avatarColors = {
    admin: 'bg-amber-500',
    creator: 'bg-blue-500',
    supervisor: 'bg-purple-500',
    learner: 'bg-slate-500'
  };

  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleRoleSelect = (e) => {
    const newRole = e.target.value;
    setLocalRole(newRole);
    onRoleChange(user.username, newRole);
  };

  const SegmentedControl = ({ value, options, onChange, disabled = false }) => (
    <div className={`inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 ${disabled ? 'opacity-50' : ''}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled || value === option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors min-w-[68px] ${
            value === option.value
              ? option.activeClass
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
          } disabled:cursor-default`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  const isCurrentUser = user.username === currentUser?.username || user.email === currentUser?.email;
  const isProtected = user.is_super_admin || isCurrentUser;
  const isCreatorOrAdmin = user.role === 'creator' || user.role === 'admin';

  return (
    <div
      className={`relative bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow ${
        supervisorPickerOpen ? 'z-30' : 'z-0'
      }`}
    >
      {!isProtected && (
        <div className="absolute top-3 right-3 z-10">
          {deleteConfirm === user.username ? (
            <div className="flex items-center gap-1 rounded-lg bg-white border border-slate-200 shadow-sm p-1">
              <button
                onClick={() => onDelete(user.username)}
                className="px-2.5 py-1.5 bg-red-500 text-white text-xs font-medium rounded-md hover:bg-red-600 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-2.5 py-1.5 text-slate-600 text-xs font-medium rounded-md hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDeleteConfirm(user.username)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm"
              title="Delete user"
              aria-label={`Delete user ${user.username}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,320px)_minmax(220px,1fr)_minmax(360px,auto)]">
        <div className="p-4 md:p-5 border-b lg:border-b-0 lg:border-r border-slate-100">
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-xl ${avatarColors[user.role] || avatarColors.learner}`}>
                {getInitial(user.username)}
              </div>
              <div className={`absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full border-2 border-white ${user.is_active !== false ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 text-lg truncate">{user.username}</h3>
                {isProtected && (
                  <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" title="Protected account" />
                )}
              </div>
              <p className="text-sm text-slate-500 truncate">{user.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${roleColors[user.role] || roleColors.learner}`}>
                  {user.role || 'Learner'}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full ${user.is_active !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                  {user.is_active !== false ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-5 border-b lg:border-b-0 lg:border-r border-slate-100 flex items-center">
          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Joined</div>
              <div className="font-medium text-slate-900 text-sm">
                {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Last Login</div>
              <div className="font-medium text-slate-900 text-sm">
                {formatDate(user.last_login)}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[auto_auto_auto_auto] gap-3 xl:items-end">
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Shield className="w-4 h-4" />
                Role
              </span>
              <select
                value={localRole}
                onChange={handleRoleSelect}
                disabled={isProtected || roleLoading === user.username}
                className={`w-full sm:w-[140px] text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                  isProtected
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : roleColors[user.role] || roleColors.learner
                } disabled:opacity-50`}
              >
                <option value="learner">Learner</option>
                <option value="creator">Creator</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Sparkles className="w-4 h-4" />
                AI Feature
              </span>
              <SegmentedControl
                value={user.ai_generation_enabled ? 'on' : 'off'}
                onChange={() => onAIToggle(user.username, user.ai_generation_enabled)}
                disabled={!isCreatorOrAdmin || roleLoading === user.username}
                options={[
                  { value: 'on', label: 'ON', activeClass: 'bg-emerald-500 text-white shadow-sm' },
                  { value: 'off', label: 'OFF', activeClass: 'bg-slate-600 text-white shadow-sm' },
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <User className="w-4 h-4" />
                User State
              </span>
              <SegmentedControl
                value={user.is_active !== false ? 'active' : 'disabled'}
                onChange={() => onActiveToggle(user.username, user.is_active !== false)}
                disabled={isProtected || roleLoading === user.username}
                options={[
                  { value: 'active', label: 'ACTIVE', activeClass: 'bg-emerald-500 text-white shadow-sm' },
                  { value: 'disabled', label: 'DISABLE', activeClass: 'bg-red-500 text-white shadow-sm' },
                ]}
              />
            </div>

          </div>
          {isProtected && (
            <div className="text-xs text-slate-400 mt-3">
              Protected account - cannot delete
            </div>
          )}
        </div>
      </div>

      {/* Supervisor assignment (learners only) */}
      {user.role === 'learner' && (
        <div className="border-t border-slate-100 bg-slate-50/60 rounded-b-xl px-4 md:px-5 py-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 md:w-32 flex-shrink-0">
              <UserPlus className="w-4 h-4" />
              Supervisors
            </div>

            <div className="flex-1 flex flex-wrap items-center gap-2">
              {(user.supervisors || []).length === 0 ? (
                <span className="text-xs text-slate-400 italic">None assigned</span>
              ) : (
                (user.supervisors || []).map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-medium"
                  >
                    {s}
                    <button
                      onClick={() => onRemoveSupervisor(user.username, s)}
                      disabled={roleLoading === user.username}
                      className="ml-0.5 w-4 h-4 rounded-full hover:bg-purple-100 flex items-center justify-center disabled:opacity-40"
                      title={`Remove ${s}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}

              <div className="relative ml-auto">
                <button
                  onClick={() => setSupervisorPickerOpen((o) => !o)}
                  disabled={roleLoading === user.username}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-dashed border-slate-300 text-xs font-medium text-slate-600 hover:border-purple-300 hover:text-purple-700 hover:bg-white transition-colors disabled:opacity-40"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Assign
                  <ChevronDown className={`w-3 h-3 transition-transform ${supervisorPickerOpen ? 'rotate-180' : ''}`} />
                </button>

                {supervisorPickerOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setSupervisorPickerOpen(false)}
                    />
                    <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-64 overflow-auto">
                    {(() => {
                      const assigned = new Set(user.supervisors || []);
                      const available = allSupervisors.filter(
                        (s) => !assigned.has(s.username)
                      );
                      if (available.length === 0) {
                        return (
                          <div className="px-3 py-2 text-xs text-slate-400">
                            No supervisors available
                          </div>
                        );
                      }
                      return available.map((s) => (
                        <button
                          key={s.username}
                          onClick={() => {
                            onAssignSupervisor(user.username, s.username);
                            setSupervisorPickerOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2"
                        >
                          <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-semibold">
                            {s.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-medium">{s.username}</div>
                            <div className="text-xs text-slate-400 truncate">{s.email}</div>
                          </div>
                        </button>
                      ));
                    })()}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserCard;
