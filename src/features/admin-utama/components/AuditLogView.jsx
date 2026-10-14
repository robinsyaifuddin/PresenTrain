import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Calendar, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Eye, 
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Activity
} from 'lucide-react';
import api from '../../../services/api';

export default function AuditLogView() {
  const [logs, setLogs] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [stats, setStats] = useState({
    total_today: 0,
    success_today: 0,
    failed_today: 0,
    total_all: 0,
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLogDetail, setSelectedLogDetail] = useState(null);

  // Filter States
  const [filterUserId, setFilterUserId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterModule, setFilterModule] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Data Logs
  const fetchLogs = async (page = 1) => {
    setIsLoading(true);
    try {
      const filters = {
        page,
        user_id: filterUserId,
        status: filterStatus,
        module: filterModule,
        action: filterAction,
        start_date: filterStartDate,
        end_date: filterEndDate,
        search: searchQuery,
      };

      const res = await api.getAuditLogs(filters);
      if (res?.ok && res?.data?.success) {
        setLogs(res.data.data || []);
        if (res.data.pagination) setPagination(res.data.pagination);
        if (res.data.admins) setAdmins(res.data.admins);
        if (res.data.stats) setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [filterUserId, filterStatus, filterModule, filterAction, filterStartDate, filterEndDate]);

  // Debounced Search Handler
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const resetFilters = () => {
    setFilterUserId('all');
    setFilterStatus('all');
    setFilterModule('all');
    setFilterAction('all');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchQuery('');
  };

  const getStatusBadge = (status) => {
    if (status === 'SUCCESS') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Sukses
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
        <XCircle className="w-3.5 h-3.5 text-rose-600" />
        Gagal
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const isSuper = ['admin_utama', 'super_admin'].includes(role?.toLowerCase());
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${
        isSuper 
          ? 'bg-purple-100 text-purple-700 border border-purple-200' 
          : 'bg-blue-100 text-blue-700 border border-blue-200'
      }`}>
        {isSuper ? 'Admin Utama' : 'Administrator'}
      </span>
    );
  };

  const getActionBadge = (action) => {
    const colorMap = {
      LOGIN: 'bg-sky-50 text-sky-700 border-sky-200',
      LOGOUT: 'bg-slate-100 text-slate-600 border-slate-200',
      CREATE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      UPDATE: 'bg-amber-50 text-amber-700 border-amber-200',
      DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
      SCAN: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      OPEN_SESSION: 'bg-teal-50 text-teal-700 border-teal-200',
      CLOSE_SESSION: 'bg-orange-50 text-orange-700 border-orange-200',
      OPEN_QUIZ: 'bg-purple-50 text-purple-700 border-purple-200',
      CLOSE_QUIZ: 'bg-pink-50 text-pink-700 border-pink-200',
    };
    const cls = colorMap[action] || 'bg-slate-50 text-slate-700 border-slate-200';
    return (
      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${cls}`}>
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-600" />
            Audit & Server Activity Log
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Merekam seluruh jejak aktivitas Admin Utama & Administrator secara valid dan transparan.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchLogs(pagination.current_page)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/80 rounded-xl shadow-xs hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            Segarkan
          </button>
        </div>
      </div>

      {/* Top Statistic Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Aktivitas Hari Ini</p>
            <p className="text-xl font-bold text-slate-900">{stats.total_today}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Berhasil (Hari Ini)</p>
            <p className="text-xl font-bold text-teal-600">{stats.success_today}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Gagal / Ditolak</p>
            <p className="text-xl font-bold text-rose-600">{stats.failed_today}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Riwayat Log</p>
            <p className="text-xl font-bold text-indigo-700">{stats.total_all}</p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari deskripsi aktivitas, nama admin, atau IP address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-20 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Cari
            </button>
          </form>

          {/* Quick Clear Filter */}
          <button
            onClick={resetFilters}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium underline self-end lg:self-center"
          >
            Reset Semua Filter
          </button>
        </div>

        {/* Multi-Select Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100">
          {/* Filter Akun Admin */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Akun Administrator</label>
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="all">Semua Administrator</option>
              {admins.map((adm) => (
                <option key={adm.id} value={adm.id}>
                  {adm.name} ({adm.role === 'admin_utama' ? 'Super Admin' : 'Admin'})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Status Eksekusi</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="all">Semua Status</option>
              <option value="SUCCESS">✅ Sukses</option>
              <option value="FAILED">❌ Gagal / Ditolak</option>
            </select>
          </div>

          {/* Filter Modul */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Modul Sistem</label>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="all">Semua Modul</option>
              <option value="Autentikasi">Autentikasi / Login</option>
              <option value="Peserta">Peserta</option>
              <option value="Administrator">Administrator</option>
              <option value="Pelatihan">Pelatihan / Sesi</option>
              <option value="Presensi">Presensi / Scanner</option>
              <option value="Penilaian">Penilaian Peserta</option>
              <option value="Kuis">Kuis & Ujian</option>
            </select>
          </div>

          {/* Filter Tanggal Mulai */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Mulai Tanggal</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Filter Tanggal Sampai */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Waktu & Tanggal</th>
                <th className="py-3.5 px-4">Pelaksana (Admin)</th>
                <th className="py-3.5 px-4">Aksi / Modul</th>
                <th className="py-3.5 px-4">Deskripsi Aktivitas</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Memuat data audit log...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Belum ada log aktivitas yang cocok dengan kriteria filter saat ini.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const dateStr = log.created_at ? new Date(log.created_at).toLocaleString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }) : '-';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {dateStr} WIB
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{log.user_name || 'Sistem / Tamu'}</span>
                          <span className="mt-0.5">{getRoleBadge(log.user_role)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {getActionBadge(log.action)}
                          <span className="text-[11px] text-slate-600 font-medium">{log.module}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs md:max-w-md">
                        <p className="text-slate-800 font-medium leading-relaxed truncate" title={log.description}>
                          {log.description}
                        </p>
                        {log.failure_reason && (
                          <p className="text-[11px] text-rose-600 mt-0.5 font-normal">
                            Alasan: {log.failure_reason}
                          </p>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">
                          IP: {log.ip_address || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLogDetail(log)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Lihat Detail Log"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.last_page > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Menampilkan halaman <strong>{pagination.current_page}</strong> dari <strong>{pagination.last_page}</strong> ({pagination.total} total)
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={pagination.current_page <= 1 || isLoading}
                onClick={() => fetchLogs(pagination.current_page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <button
                disabled={pagination.current_page >= pagination.last_page || isLoading}
                onClick={() => fetchLogs(pagination.current_page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-40"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Detail Log */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Detail Log Audit #{selectedLogDetail.id}
              </h3>
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Pelaksana</span>
                  <span className="font-bold text-slate-800">{selectedLogDetail.user_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Status</span>
                  <div className="mt-0.5">{getStatusBadge(selectedLogDetail.status)}</div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Modul / Aksi</span>
                  <span className="font-semibold text-slate-700">{selectedLogDetail.module} ({selectedLogDetail.action})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Waktu</span>
                  <span className="font-mono text-slate-700">{selectedLogDetail.created_at}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px] uppercase">IP & Perangkat</span>
                  <span className="font-mono text-slate-700 block truncate">{selectedLogDetail.ip_address} • {selectedLogDetail.user_agent}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-1">Deskripsi Aktivitas:</span>
                <p className="p-3 bg-slate-50 rounded-xl text-slate-800 leading-relaxed border border-slate-100">
                  {selectedLogDetail.description}
                </p>
              </div>

              {selectedLogDetail.properties && (
                <div>
                  <span className="text-slate-500 font-semibold block mb-1">Data / Payload JSON:</span>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                    {JSON.stringify(selectedLogDetail.properties, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
