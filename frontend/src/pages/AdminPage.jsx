import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('users');

  // User creation form
  const [showUserForm, setShowUserForm] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    national_id: '',
  });

  // Role assignment modal
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);

  // Role creation form
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/auth/users/');
      setUsers(response.data.results || response.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch users');
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await api.get('/auth/roles/');
      setRoles(response.data.results || response.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch roles');
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      clearMessages();
      await Promise.all([fetchUsers(), fetchRoles()]);
      setLoading(false);
    };
    fetchData();
  }, [fetchUsers, fetchRoles]);

  // --- User CRUD ---

  const handleCreateUser = async (e) => {
    e.preventDefault();
    clearMessages();
    try {
      await api.post('/auth/users/', newUserForm);
      setShowUserForm(false);
      setNewUserForm({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        national_id: '',
      });
      setSuccess('User created successfully.');
      fetchUsers();
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object' && !data.detail) {
        const messages = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' | ');
        setError(messages);
      } else {
        setError(data?.detail || 'Failed to create user');
      }
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    clearMessages();
    try {
      await api.delete(`/auth/users/${userId}/`);
      setSuccess('User deleted successfully.');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleToggleActive = async (user) => {
    clearMessages();
    try {
      await api.patch(`/auth/users/${user.id}/`, { is_active: !user.is_active });
      setSuccess(`User ${user.is_active ? 'deactivated' : 'activated'} successfully.`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update user status');
    }
  };

  // --- Role Assignment ---

  const openRoleEditor = (user) => {
    setEditingUser(user);
    const userRoleNames = user.roles || [];
    const matchedIds = roles
      .filter((r) => userRoleNames.includes(r.name))
      .map((r) => r.id);
    setSelectedRoleIds(matchedIds);
    clearMessages();
  };

  const handleSaveRoles = async () => {
    if (!editingUser) return;
    clearMessages();
    try {
      await api.post(`/auth/users/${editingUser.id}/assign_roles/`, {
        role_ids: selectedRoleIds,
      });
      setSuccess(`Roles updated for ${editingUser.username}.`);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign roles');
    }
  };

  const toggleRole = (roleId) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  // --- Role CRUD ---

  const handleCreateRole = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!newRoleName.trim()) return;
    try {
      await api.post('/auth/roles/', { name: newRoleName.trim() });
      setShowRoleForm(false);
      setNewRoleName('');
      setSuccess('Role created successfully.');
      fetchRoles();
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object' && !data.detail) {
        const messages = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' | ');
        setError(messages);
      } else {
        setError(data?.detail || 'Failed to create role');
      }
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    clearMessages();
    try {
      await api.delete(`/auth/roles/${roleId}/`);
      setSuccess('Role deleted successfully.');
      fetchRoles();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete role');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Admin Panel</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-4 mb-8 border-b">
          <button
            onClick={() => { setActiveTab('users'); clearMessages(); }}
            className={`px-4 py-2 font-semibold border-b-2 transition ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => { setActiveTab('roles'); clearMessages(); }}
            className={`px-4 py-2 font-semibold border-b-2 transition ${
              activeTab === 'roles'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Roles
          </button>
        </div>

        {/* ========== USERS TAB ========== */}
        {activeTab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Users Management</h2>
              <button
                onClick={() => { setShowUserForm(!showUserForm); clearMessages(); }}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-semibold transition"
              >
                {showUserForm ? 'Cancel' : 'Create User'}
              </button>
            </div>

            {/* Create User Form */}
            {showUserForm && (
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Create New User</h3>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                      <input
                        type="text"
                        value={newUserForm.username}
                        onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        value={newUserForm.email}
                        onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                      <input
                        type="text"
                        value={newUserForm.first_name}
                        onChange={(e) => setNewUserForm({ ...newUserForm, first_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                      <input
                        type="text"
                        value={newUserForm.last_name}
                        onChange={(e) => setNewUserForm({ ...newUserForm, last_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                      <input
                        type="text"
                        value={newUserForm.phone}
                        onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">National ID *</label>
                      <input
                        type="text"
                        value={newUserForm.national_id}
                        onChange={(e) => setNewUserForm({ ...newUserForm, national_id: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                      <input
                        type="password"
                        value={newUserForm.password}
                        onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg font-semibold transition"
                  >
                    Create
                  </button>
                </form>
              </div>
            )}

            {/* Role Assignment Modal */}
            {editingUser && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Manage Roles — {editingUser.username}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Current roles: {(editingUser.roles || []).join(', ') || 'None'}
                  </p>
                  <div className="max-h-64 overflow-y-auto border rounded-lg p-3 mb-4">
                    {roles.length === 0 ? (
                      <p className="text-gray-500 text-sm">No roles available.</p>
                    ) : (
                      <div className="space-y-2">
                        {roles.map((role) => (
                          <label
                            key={role.id}
                            className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedRoleIds.includes(role.id)}
                              onChange={() => toggleRole(role.id)}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300"
                            />
                            <span className="text-gray-900 font-medium">{role.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setEditingUser(null)}
                      className="px-4 py-2 rounded-lg font-semibold text-gray-600 hover:text-gray-900 border border-gray-300 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveRoles}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                    >
                      Save Roles
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {users.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-600 text-lg">No users found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Username</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Roles</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                            {user.username}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">{user.email}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {user.first_name} {user.last_name}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {(user.roles || []).length > 0 ? (
                                user.roles.map((role, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800"
                                  >
                                    {role}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400">No roles</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                                user.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => openRoleEditor(user)}
                                className="text-blue-600 hover:text-blue-700 font-semibold"
                              >
                                Roles
                              </button>
                              <button
                                onClick={() => handleToggleActive(user)}
                                className={`font-semibold ${
                                  user.is_active
                                    ? 'text-yellow-600 hover:text-yellow-700'
                                    : 'text-green-600 hover:text-green-700'
                                }`}
                              >
                                {user.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 hover:text-red-700 font-semibold"
                              >
                                Delete
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
          </div>
        )}

        {/* ========== ROLES TAB ========== */}
        {activeTab === 'roles' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Roles Management</h2>
              <button
                onClick={() => { setShowRoleForm(!showRoleForm); clearMessages(); }}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-semibold transition"
              >
                {showRoleForm ? 'Cancel' : 'Create Role'}
              </button>
            </div>

            {/* Create Role Form */}
            {showRoleForm && (
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Create New Role</h3>
                <form onSubmit={handleCreateRole} className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role Name *</label>
                    <input
                      type="text"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg font-semibold transition"
                  >
                    Create
                  </button>
                </form>
              </div>
            )}

            {/* Roles Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {roles.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-600 text-lg">No roles found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Role Name</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {roles.map((role) => (
                        <tr key={role.id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 text-sm text-gray-700">#{role.id}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">{role.name}</td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              onClick={() => handleDeleteRole(role.id)}
                              className="text-red-600 hover:text-red-700 font-semibold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
