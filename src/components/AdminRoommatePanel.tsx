import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BedDouble,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  Flag,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {
  adminDeleteRoommateListing,
  adminEditRoommateListing,
  adminUpdateRoommateReportStatus,
  adminUpdateRoommateStatus,
  listAllAdminRoommatesAndReports,
} from '../lib/roommateRepo';
import {
  PreferredGender,
  PreferredOccupation,
  ROOMMATE_ROOM_TYPES,
  RoommateDashboardStats,
  RoommateFlatOccupancy,
  RoommateFurnishing,
  RoommateListingRecord,
  RoommateReportRecord,
  RoommateRoomType,
  RoommateStatus,
} from '../types/roommate';
import { formatINR } from '../utils/propertyLogic';
import {
  buildRoommateAdminContactUrl,
  formatRoommateDate,
  isRoommateListingExpired,
} from '../utils/roommateLogic';
import { SafeImage } from './SafeImage';
import { WhatsAppIcon } from './WhatsAppButton';

interface AdminRoommatePanelProps {
  onDataChanged: () => void;
  onStatsUpdated?: (pendingCount: number, openReportsCount: number) => void;
}

type AdminRoommateTab =
  | 'all'
  | 'Pending'
  | 'Active'
  | 'Fulfilled'
  | 'Unavailable'
  | 'Rejected'
  | 'Reports';

const EMPTY_RM_STATS: RoommateDashboardStats = {
  total: 0,
  pending: 0,
  active: 0,
  maleRequirements: 0,
  femaleRequirements: 0,
  roomsAvailable: 0,
  fulfilled: 0,
  unavailable: 0,
  rejected: 0,
  openReports: 0,
};

const STATUS_BADGE: Record<RoommateStatus, string> = {
  Pending: 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/25',
  Active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/25',
  Fulfilled: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/25',
  Unavailable: 'bg-slate-100 text-slate-700 ring-1 ring-slate-500/25',
  Rejected: 'bg-red-50 text-red-700 ring-1 ring-red-600/25',
};

export const AdminRoommatePanel: React.FC<AdminRoommatePanelProps> = ({
  onDataChanged,
  onStatsUpdated,
}) => {
  const [listings, setListings] = useState<RoommateListingRecord[]>([]);
  const [reports, setReports] = useState<RoommateReportRecord[]>([]);
  const [stats, setStats] = useState<RoommateDashboardStats>(EMPTY_RM_STATS);
  const [loading, setLoading] = useState(true);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminRoommateTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [viewing, setViewing] = useState<RoommateListingRecord | null>(null);
  const [editing, setEditing] = useState<RoommateListingRecord | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RoommateListingRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<RoommateListingRecord | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((prev) => (prev === msg ? null : prev)), 3500);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const data = await listAllAdminRoommatesAndReports();
      setListings(data.listings);
      setReports(data.reports);
      setStats(data.stats);
      onStatsUpdated?.(data.stats.pending, data.stats.openReports);
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to load roommate data.');
    } finally {
      setLoading(false);
    }
  }, [onStatsUpdated]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const filteredListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return listings.filter((item) => {
      if (activeTab !== 'all' && activeTab !== 'Reports' && item.status !== activeTab) {
        return false;
      }
      if (!q) return true;
      return (
        item.listingCode.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.roomType.toLowerCase().includes(q) ||
        item.contactNumber.includes(q) ||
        item.preferredGender.toLowerCase().includes(q)
      );
    });
  }, [listings, activeTab, searchQuery]);

  const handleStatusChange = async (
    listing: RoommateListingRecord,
    nextStatus: RoommateStatus,
    reason?: string
  ) => {
    setBusyCode(listing.listingCode);
    setErrorBanner(null);
    try {
      await adminUpdateRoommateStatus(listing.listingCode, nextStatus, reason);
      showToast(
        nextStatus === 'Active'
          ? `${listing.listingCode} approved and published live.`
          : `${listing.listingCode} marked as ${nextStatus}.`
      );
      setRejectTarget(null);
      setRejectReason('');
      await fetchAll();
      onDataChanged();
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setBusyCode(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setBusyCode(deleteTarget.listingCode);
    setErrorBanner(null);
    try {
      await adminDeleteRoommateListing(deleteTarget);
      showToast(`${deleteTarget.listingCode} permanently deleted.`);
      setDeleteTarget(null);
      await fetchAll();
      onDataChanged();
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setBusyCode(null);
    }
  };

  const handleReportStatus = async (reportId: string, status: 'reviewed' | 'dismissed') => {
    setBusyCode(reportId);
    try {
      await adminUpdateRoommateReportStatus(reportId, status);
      showToast(`Report marked as ${status}.`);
      await fetchAll();
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Unable to update report.');
    } finally {
      setBusyCode(null);
    }
  };

  const statCards = [
    { label: 'Total Roommate Listings', value: stats.total, icon: Users, tone: 'text-[#6B1CD4] bg-[#F5EFFD]' },
    { label: 'Pending Listings', value: stats.pending, icon: Clock, tone: 'text-amber-700 bg-amber-50' },
    { label: 'Active Listings', value: stats.active, icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'Male Requirements', value: stats.maleRequirements, icon: UserCheck, tone: 'text-blue-700 bg-blue-50' },
    { label: 'Female Requirements', value: stats.femaleRequirements, icon: UserCheck, tone: 'text-pink-700 bg-pink-50' },
    { label: 'Rooms Available', value: stats.roomsAvailable, icon: BedDouble, tone: 'text-purple-700 bg-purple-50' },
    { label: 'Requirements Fulfilled', value: stats.fulfilled, icon: Check, tone: 'text-indigo-700 bg-indigo-50' },
    { label: 'Open Reports', value: stats.openReports, icon: Flag, tone: 'text-red-700 bg-red-50' },
  ];

  const tabs: Array<{ key: AdminRoommateTab; label: string; count: number }> = [
    { key: 'all', label: 'All Listings', count: stats.total },
    { key: 'Pending', label: 'Pending Approval', count: stats.pending },
    { key: 'Active', label: 'Active', count: stats.active },
    { key: 'Fulfilled', label: 'Fulfilled', count: stats.fulfilled },
    { key: 'Unavailable', label: 'Unavailable', count: stats.unavailable },
    { key: 'Rejected', label: 'Rejected', count: stats.rejected },
    { key: 'Reports', label: 'Reported Listings', count: stats.openReports },
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          {toast}
        </div>
      )}

      {errorBanner && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {errorBanner}
        </div>
      )}

      {/* 8 Roommate KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-[#090A14]/8 bg-white p-4 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#656275]">{card.label}</span>
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${card.tone}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-[#090A14] tabular-nums">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filter Tabs & Search */}
      <div className="rounded-2xl border border-[#090A14]/8 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === tab.key
                    ? 'bg-[#6B1CD4] text-white'
                    : 'bg-[#F9F8FC] text-[#524F61] hover:bg-[#F3ECFF] hover:text-[#6B1CD4]'
                }`}
              >
                <span>{tab.label}</span>
                <span className="tabular-nums opacity-80">({tab.count})</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#656275]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, name, area, phone..."
                className="h-10 w-full rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] pr-3 pl-9 text-xs text-[#090A14] focus:border-[#6B1CD4] focus:bg-white focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => void fetchAll()}
              aria-label="Refresh roommate listings"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#090A14]/12 bg-white text-[#524F61] hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area: Reported Listings Queue OR Roommate Listings List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-14">
          <Loader2 className="h-7 w-7 animate-spin text-[#6B1CD4]" />
          <p className="text-sm text-[#656275]">Loading Roommate Management...</p>
        </div>
      ) : activeTab === 'Reports' ? (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="rounded-2xl border border-[#090A14]/8 bg-white p-10 text-center text-sm text-[#656275]">
              No reported roommate listings right now.
            </div>
          ) : (
            reports.map((rep) => {
              const matchedListing = listings.find((l) => l.listingCode === rep.listingCode);
              return (
                <div
                  key={rep.id}
                  className="rounded-2xl border border-[#090A14]/10 bg-white p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-[#6B1CD4]">{rep.listingCode}</span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            rep.status === 'open'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {rep.status}
                        </span>
                        <span className="text-[#656275]">{formatRoommateDate(rep.createdAt)}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-bold text-[#090A14]">{rep.reason}</p>
                      {rep.details && <p className="mt-1 text-xs text-[#524F61]">{rep.details}</p>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {matchedListing && (
                        <button
                          type="button"
                          onClick={() => setViewing(matchedListing)}
                          className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#090A14]/12 px-3 text-xs font-semibold text-[#090A14] hover:border-[#6B1CD4]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Inspect Listing</span>
                        </button>
                      )}
                      {rep.status === 'open' && (
                        <>
                          <button
                            type="button"
                            disabled={busyCode === rep.id}
                            onClick={() => void handleReportStatus(rep.id, 'reviewed')}
                            className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Mark Reviewed</span>
                          </button>
                          <button
                            type="button"
                            disabled={busyCode === rep.id}
                            onClick={() => void handleReportStatus(rep.id, 'dismissed')}
                            className="inline-flex h-9 items-center gap-1 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                          >
                            <span>Dismiss</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="rounded-2xl border border-[#090A14]/8 bg-white p-10 text-center text-sm text-[#656275]">
          No roommate listings found for this filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredListings.map((item) => {
            const expired = isRoommateListingExpired(item);
            const isBusy = busyCode === item.listingCode;

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-[#090A14]/10 bg-white p-4 shadow-xs sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-[#F5EFFD]">
                      {item.images.length > 0 ? (
                        <SafeImage
                          src={item.images[0]}
                          alt={item.roomType}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#6B1CD4]">
                          <BedDouble className="h-6 w-6" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-[#6B1CD4]">{item.listingCode}</span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${STATUS_BADGE[item.status]}`}
                        >
                          {item.status}
                        </span>
                        {expired && item.status === 'Active' && (
                          <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-bold text-orange-800">
                            Expired
                          </span>
                        )}
                        <span className="rounded-md bg-[#F5EFFD] px-2 py-0.5 text-[11px] font-bold text-[#6B1CD4]">
                          {item.flatOccupancy || 'Pre-Occupied Flat'}
                        </span>
                        {item.urgent && (
                          <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-600/20">
                            Urgent
                          </span>
                        )}
                        {item.shiftingNow && (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                            Shifting Now
                          </span>
                        )}
                      </div>

                      <h3 className="mt-1 font-display text-base font-bold text-[#090A14]">
                        {item.peopleRequired} {item.preferredGender !== 'Any' ? item.preferredGender : ''} Roommate · {item.roomType} · {item.location}
                        {item.buildingName ? ` (${item.buildingName})` : ''}
                      </h3>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#524F61] tabular-nums">
                        <span className="font-bold text-[#6B1CD4]">{formatINR(item.rent)}/mo</span>
                        <span>Deposit: {formatINR(item.deposit)}</span>
                        {item.electricityBill && <span>Bill: {item.electricityBill}</span>}
                        <span>{item.furnishing}</span>
                        <span>Joining: {formatRoommateDate(item.availableFrom)}</span>
                      </div>

                      {item.facilities && item.facilities.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {item.facilities.slice(0, 5).map((fac) => (
                            <span
                              key={fac}
                              className="rounded-md bg-[#F9F8FC] px-2 py-0.5 text-[10px] font-medium text-[#524F61] ring-1 ring-[#090A14]/8"
                            >
                              {fac}
                            </span>
                          ))}
                          {item.facilities.length > 5 && (
                            <span className="text-[10px] font-semibold text-[#6B1CD4]">
                              +{item.facilities.length - 5} more
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#656275]">
                        <span>
                          Posted by <strong className="text-[#090A14]">{item.name}</strong> ({item.gender}, {item.occupation})
                        </span>
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Phone className="h-3 w-3 text-[#6B1CD4]" />
                          {item.contactNumber}
                          {item.secondaryContact ? ` / ${item.secondaryContact}` : ''}
                        </span>
                        <span>Submitted: {formatRoommateDate(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Action Controls */}
                  <div className="flex flex-wrap items-center gap-2 lg:max-w-md lg:justify-end">
                    <button
                      type="button"
                      onClick={() => setViewing(item)}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#090A14]/12 bg-[#F9F8FC] px-2.5 text-xs font-semibold text-[#090A14] hover:border-[#6B1CD4]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View</span>
                    </button>

                    <a
                      href={buildRoommateAdminContactUrl(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#25D366] px-2.5 text-xs font-bold text-white hover:bg-[#1ebe5d]"
                    >
                      <WhatsAppIcon className="h-3.5 w-3.5" />
                      <span>WhatsApp</span>
                    </a>

                    {item.status !== 'Active' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleStatusChange(item, 'Active')}
                        className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    {item.status !== 'Rejected' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setRejectTarget(item);
                          setRejectReason(item.rejectionReason || '');
                        }}
                        className="inline-flex h-9 items-center gap-1 rounded-lg bg-red-50 px-2.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>
                    )}

                    {item.status !== 'Fulfilled' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleStatusChange(item, 'Fulfilled')}
                        className="inline-flex h-9 items-center gap-1 rounded-lg bg-indigo-50 px-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Fulfilled</span>
                      </button>
                    )}

                    {item.status !== 'Unavailable' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleStatusChange(item, 'Unavailable')}
                        className="inline-flex h-9 items-center gap-1 rounded-lg bg-slate-100 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                      >
                        <span>Unavailable</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setEditing(item)}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#090A14]/12 bg-white px-2.5 text-xs font-semibold text-[#524F61] hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setDeleteTarget(item)}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Full Private Record Modal */}
      {viewing && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A14]/65 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewing(null);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#090A14]/10 pb-3">
              <div>
                <p className="font-mono text-xs font-bold text-[#6B1CD4]">{viewing.listingCode}</p>
                <h3 className="font-display text-lg font-bold text-[#090A14]">
                  {viewing.roomType} in {viewing.location}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                aria-label="Close detail preview"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#090A14]/12"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:text-sm">
              <div><span className="text-[#656275] block text-[11px]">Submitter Name</span><strong>{viewing.name}</strong></div>
              <div>
                <span className="text-[#656275] block text-[11px]">Mobile / WhatsApp</span>
                <strong className="tabular-nums">
                  {viewing.contactNumber} / {viewing.whatsappNumber}
                  {viewing.secondaryContact ? ` · Alt: ${viewing.secondaryContact}` : ''}
                </strong>
              </div>
              <div><span className="text-[#656275] block text-[11px]">Flat Category</span><strong>{viewing.flatOccupancy || 'Pre-Occupied Flat'}{viewing.urgent ? ' · Urgent' : ''}{viewing.shiftingNow ? ' · Shifting Now' : ''}</strong></div>
              <div><span className="text-[#656275] block text-[11px]">Electricity Bill</span><strong>{viewing.electricityBill || 'Shared separately'}</strong></div>
              <div><span className="text-[#656275] block text-[11px]">Rent / Deposit / Brokerage</span><strong className="tabular-nums">{formatINR(viewing.rent)} / {formatINR(viewing.deposit)} / {formatINR(viewing.brokerage)}</strong></div>
              <div><span className="text-[#656275] block text-[11px]">Address / Society</span><strong>{viewing.buildingName || 'Not provided'} ({viewing.showExactAddress ? 'Public' : 'Private'})</strong></div>
              <div><span className="text-[#656275] block text-[11px]">Roommate Required</span><strong>{viewing.peopleRequired} {viewing.preferredGender} · {viewing.preferredOccupation}</strong></div>
              <div><span className="text-[#656275] block text-[11px]">Public Contact Consent</span><strong>{viewing.showPublicContact ? 'Opted In' : 'Hidden (WithBroker WhatsApp)'}</strong></div>
            </div>

            {viewing.facilities && viewing.facilities.length > 0 && (
              <div className="mt-4 rounded-xl border border-[#090A14]/8 bg-white p-3.5 text-xs">
                <p className="font-bold text-[#090A14]">Facilities</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {viewing.facilities.map((fac) => (
                    <span key={fac} className="rounded-lg bg-[#F5EFFD] px-2.5 py-1 text-[11px] font-semibold text-[#5412AD]">
                      {fac}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 rounded-xl bg-[#F9F8FC] p-3.5 text-xs leading-relaxed text-[#524F61]">
              <p className="font-bold text-[#090A14]">Description</p>
              <p className="mt-1 whitespace-pre-line">{viewing.description}</p>
            </div>

            {viewing.images.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {viewing.images.map((img) => (
                  <div key={img} className="aspect-square overflow-hidden rounded-lg bg-[#F5EFFD]">
                    <SafeImage src={img} alt="Room photo" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A14]/65 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-display text-lg font-bold text-[#090A14]">
              Reject {rejectTarget.listingCode}?
            </h3>
            <p className="mt-1 text-xs text-[#656275]">
              Provide an optional reason so the tenant can fix and resubmit.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Incomplete location or duplicate listing..."
              className="mt-3 w-full rounded-xl border border-[#090A14]/15 p-3 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="h-10 rounded-xl border border-[#090A14]/15 px-4 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyCode === rejectTarget.listingCode}
                onClick={() => void handleStatusChange(rejectTarget, 'Rejected', rejectReason)}
                className="h-10 rounded-xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A14]/65 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-display text-lg font-bold text-[#090A14]">
                Delete {deleteTarget.listingCode}?
              </h3>
            </div>
            <p className="mt-2 text-xs text-[#656275]">
              This permanently deletes the roommate listing and its uploaded photos from Firestore.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="h-10 rounded-xl border border-[#090A14]/15 px-4 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyCode === deleteTarget.listingCode}
                onClick={() => void handleDeleteConfirm()}
                className="h-10 rounded-xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit Modal */}
      {editing && (
        <AdminEditRoommateModal
          listing={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            showToast(`${editing.listingCode} updated successfully.`);
            await fetchAll();
            onDataChanged();
          }}
        />
      )}
    </div>
  );
};

interface AdminEditRoommateModalProps {
  listing: RoommateListingRecord;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const AdminEditRoommateModal: React.FC<AdminEditRoommateModalProps> = ({
  listing,
  onClose,
  onSaved,
}) => {
  const [flatOccupancy, setFlatOccupancy] = useState<RoommateFlatOccupancy>(
    listing.flatOccupancy || 'Pre-Occupied Flat'
  );
  const [electricityBill, setElectricityBill] = useState(
    listing.electricityBill || 'Shared separately'
  );
  const [urgent, setUrgent] = useState(Boolean(listing.urgent));
  const [shiftingNow, setShiftingNow] = useState(Boolean(listing.shiftingNow));
  const [roomType, setRoomType] = useState<RoommateRoomType>(listing.roomType);
  const [location, setLocation] = useState(listing.location);
  const [buildingName, setBuildingName] = useState(listing.buildingName || '');
  const [rent, setRent] = useState(String(listing.rent));
  const [deposit, setDeposit] = useState(String(listing.deposit));
  const [brokerage, setBrokerage] = useState(String(listing.brokerage));
  const [furnishing, setFurnishing] = useState<RoommateFurnishing>(listing.furnishing);
  const [availableFrom, setAvailableFrom] = useState(listing.availableFrom);
  const [existingRoommates, setExistingRoommates] = useState(String(listing.existingRoommates));
  const [peopleRequired, setPeopleRequired] = useState(String(listing.peopleRequired));
  const [preferredGender, setPreferredGender] = useState<PreferredGender>(listing.preferredGender);
  const [preferredOccupation, setPreferredOccupation] = useState<PreferredOccupation>(
    listing.preferredOccupation
  );
  const [description, setDescription] = useState(listing.description);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await adminEditRoommateListing(listing, {
        listingType: 'have_room',
        flatOccupancy,
        electricityBill: electricityBill.trim() || null,
        urgent,
        shiftingNow,
        roomType,
        location,
        buildingName: buildingName.trim() || null,
        rent: Number(rent),
        deposit: Number(deposit || 0),
        brokerage: Number(brokerage || 0),
        furnishing,
        availableFrom,
        existingRoommates: Number(existingRoommates || 0),
        peopleRequired: Number(peopleRequired || 1),
        preferredGender,
        preferredOccupation,
        description,
      });
      await onSaved();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Unable to save edits.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A14]/65 p-4">
      <form
        onSubmit={handleSave}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-[#090A14]/10 pb-3">
          <h3 className="font-display text-lg font-bold text-[#090A14]">
            Edit Roommate Listing ({listing.listingCode})
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 text-[#656275]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
          <div>
            <label className="font-semibold text-[#524F61]">Flat Category</label>
            <select
              value={flatOccupancy}
              onChange={(e) => setFlatOccupancy(e.target.value as RoommateFlatOccupancy)}
              className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
            >
              <option value="Pre-Occupied Flat">Pre-Occupied Flat</option>
              <option value="New Flat">New Flat</option>
            </select>
          </div>
          <div>
            <label className="font-semibold text-[#524F61]">Electricity Bill</label>
            <input
              type="text"
              value={electricityBill}
              onChange={(e) => setElectricityBill(e.target.value)}
              placeholder="e.g. Shared separately"
              className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
            />
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-4 pt-1">
            <label className="inline-flex items-center gap-2 font-semibold text-[#090A14]">
              <input
                type="checkbox"
                checked={urgent}
                onChange={(e) => setUrgent(e.target.checked)}
                className="h-4 w-4 accent-[#6B1CD4]"
              />
              <span>Urgently Required</span>
            </label>
            <label className="inline-flex items-center gap-2 font-semibold text-[#090A14]">
              <input
                type="checkbox"
                checked={shiftingNow}
                onChange={(e) => setShiftingNow(e.target.checked)}
                className="h-4 w-4 accent-[#6B1CD4]"
              />
              <span>Available for shifting now</span>
            </label>
          </div>
          <div>
            <label className="font-semibold text-[#524F61]">Room Type</label>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value as RoommateRoomType)}
              className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
            >
              {ROOMMATE_ROOM_TYPES.map((rt) => (
                <option key={rt} value={rt}>
                  {rt}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-semibold text-[#524F61]">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
            />
          </div>
          <div>
            <label className="font-semibold text-[#524F61]">Building / Society</label>
            <input
              type="text"
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
            />
          </div>
          <div>
            <label className="font-semibold text-[#524F61]">Rent (₹)</label>
            <input
              type="number"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
            />
          </div>
          <div>
            <label className="font-semibold text-[#524F61]">Deposit (₹)</label>
            <input
              type="number"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
            />
          </div>
          <div>
            <label className="font-semibold text-[#524F61]">Brokerage (₹)</label>
            <input
              type="number"
              value={brokerage}
              onChange={(e) => setBrokerage(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
            />
          </div>
          <div>
            <label className="font-semibold text-[#524F61]">Furnishing</label>
            <select
              value={furnishing}
              onChange={(e) => setFurnishing(e.target.value as RoommateFurnishing)}
              className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
            >
              <option value="Furnished">Furnished</option>
              <option value="Semi-Furnished">Semi-Furnished</option>
              <option value="Unfurnished">Unfurnished</option>
            </select>
          </div>
          <div>
            <label className="font-semibold text-[#524F61]">Available From</label>
            <input
              type="date"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
            />
          </div>
          <div>
            <label className="font-semibold text-[#524F61]">Looking For Gender</label>
            <select
              value={preferredGender}
              onChange={(e) => setPreferredGender(e.target.value as PreferredGender)}
              className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
            >
              <option value="Any">Any</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div>
            <label className="font-semibold text-[#524F61]">Preferred Occupation</label>
            <select
              value={preferredOccupation}
              onChange={(e) => setPreferredOccupation(e.target.value as PreferredOccupation)}
              className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
            >
              <option value="Any">Any</option>
              <option value="Working Professional">Working Professional</option>
              <option value="Student">Student</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-[#524F61]">Existing</label>
              <input
                type="number"
                min={0}
                value={existingRoommates}
                onChange={(e) => setExistingRoommates(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
              />
            </div>
            <div>
              <label className="font-semibold text-[#524F61]">Needed</label>
              <input
                type="number"
                min={1}
                value={peopleRequired}
                onChange={(e) => setPeopleRequired(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="font-semibold text-[#524F61]">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#090A14]/15 p-3 text-sm"
            />
          </div>
        </div>

        {err && <p className="text-xs font-medium text-red-600">{err}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-[#090A14]/15 px-4 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-xl bg-[#6B1CD4] px-5 text-xs font-bold text-white hover:bg-[#5412AD]"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
