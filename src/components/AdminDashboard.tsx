import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  Home,
  Link2,
  Loader2,
  Lock,
  LogOut,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { WITHBROKER_LOGO_URL } from '../data/properties';
import {
  adminDeleteSubmission,
  adminEditSubmission,
  adminUpdateSubmissionStatus,
  ensureInitialCatalogSeededByAdmin,
  listAdminNotificationsFromFirestore,
  listAdminSubmissionsAndStats,
  markAllAdminNotificationsRead,
} from '../lib/firestoreRepo';
import {
  AdminDashboardStats,
  AdminNotification,
  AdminPropertyRecord,
  FurnishingStatus,
  PropertyType,
  SubmitterRole,
  WorkflowStatus,
} from '../types/property';
import {
  buildOwnerContactWhatsAppUrl,
  formatDepositLabel,
  formatINR,
  getOwnerSubmissionShareUrl,
} from '../utils/propertyLogic';
import {
  ensureInitialRoommatesSeededByAdmin,
  listAllAdminRoommatesAndReports,
} from '../lib/roommateRepo';
import { AdminAiChatbot } from './AdminAiChatbot';
import { AdminRoommatePanel } from './AdminRoommatePanel';
import { SafeImage } from './SafeImage';
import { WhatsAppIcon } from './WhatsAppButton';

interface AdminDashboardProps {
  onBackToWebsite: () => void;
  onDataChanged: () => void;
}

type AdminTab = 'all' | 'Pending' | 'Approved' | 'Rejected' | 'Available' | 'Rented';

const STATUS_BADGE_MAP: Record<WorkflowStatus, string> = {
  Pending: 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/25',
  Available: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/25',
  Rejected: 'bg-red-50 text-red-700 ring-1 ring-red-600/25',
  Rented: 'bg-slate-100 text-slate-700 ring-1 ring-slate-500/25',
};

const EMPTY_STATS: AdminDashboardStats = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  available: 0,
  rented: 0,
  ownerSubmissions: 0,
  brokerSubmissions: 0,
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToWebsite,
  onDataChanged,
}) => {
  const { user, isAdmin, authLoading, authError, signInWithGoogle, logout } = useAuth();

  const [properties, setProperties] = useState<AdminPropertyRecord[]>([]);
  const [stats, setStats] = useState<AdminDashboardStats>(EMPTY_STATS);
  const [notifications, setNotifications] = useState<Array<AdminNotification & { docId: string }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [adminSection, setAdminSection] = useState<'properties' | 'roommates'>('properties');
  const [roommatePendingCount, setRoommatePendingCount] = useState(0);
  const [roommateReportCount, setRoommateReportCount] = useState(0);
  const [activeTab, setActiveTab] = useState<AdminTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);

  // Modals
  const [viewingProperty, setViewingProperty] = useState<AdminPropertyRecord | null>(null);
  const [editingProperty, setEditingProperty] = useState<AdminPropertyRecord | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminPropertyRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminPropertyRecord | null>(null);
  const [aiChatOpen, setAiChatOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const fetchAdminData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setErrorBanner(null);
    try {
      await Promise.all([
        ensureInitialCatalogSeededByAdmin(),
        ensureInitialRoommatesSeededByAdmin(),
      ]);
      const [propData, notifData, rmData] = await Promise.all([
        listAdminSubmissionsAndStats(),
        listAdminNotificationsFromFirestore(),
        listAllAdminRoommatesAndReports().catch(() => null),
      ]);

      setProperties(propData.properties);
      setStats(propData.stats);
      setNotifications(notifData.notifications);
      setUnreadCount(notifData.unreadCount);
      if (rmData) {
        setRoommatePendingCount(rmData.stats.pending);
        setRoommateReportCount(rmData.stats.openReports);
      }
    } catch (err: unknown) {
      setErrorBanner((err as Error)?.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      void fetchAdminData();
    }
  }, [fetchAdminData, isAdmin]);

  const handleStatusChange = async (
    property: AdminPropertyRecord,
    nextStatus: WorkflowStatus,
    reason?: string
  ) => {
    setActionBusyId(property.dbId);
    setErrorBanner(null);
    try {
      await adminUpdateSubmissionStatus(property.propertyCode, nextStatus, reason);

      showToast(
        nextStatus === 'Available'
          ? `${property.propertyCode} is now live on the website.`
          : nextStatus === 'Rejected'
            ? `${property.propertyCode} rejected and hidden.`
            : `${property.propertyCode} marked as ${nextStatus}.`
      );
      setRejectTarget(null);
      setRejectionReason('');
      await fetchAdminData();
      onDataChanged();
    } catch (err: unknown) {
      setErrorBanner((err as Error)?.message || 'Action failed.');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setActionBusyId(deleteTarget.dbId);
    setErrorBanner(null);
    try {
      await adminDeleteSubmission(deleteTarget.propertyCode);

      showToast(`${deleteTarget.propertyCode} permanently deleted.`);
      setDeleteTarget(null);
      await fetchAdminData();
      onDataChanged();
    } catch (err: unknown) {
      setErrorBanner((err as Error)?.message || 'Delete failed.');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleSaveEdit = async (updatedFields: Partial<AdminPropertyRecord>) => {
    if (!editingProperty) return;
    setActionBusyId(editingProperty.dbId);
    setErrorBanner(null);
    try {
      await adminEditSubmission(editingProperty.propertyCode, {
        title: String(updatedFields.title ?? editingProperty.title),
        propertyType: (updatedFields.propertyType ?? editingProperty.propertyType) as PropertyType,
        locality: String(updatedFields.locality ?? editingProperty.locality),
        societyName:
          updatedFields.societyName !== undefined
            ? updatedFields.societyName ?? null
            : editingProperty.societyName ?? null,
        monthlyRent: Number(updatedFields.monthlyRent ?? editingProperty.monthlyRent),
        securityDeposit:
          updatedFields.securityDeposit !== undefined
            ? updatedFields.securityDeposit
            : editingProperty.securityDeposit,
        brokerageAmount: Number(
          updatedFields.brokerageAmount ?? editingProperty.brokerageAmount ?? 0
        ),
        furnishing: (updatedFields.furnishing ?? editingProperty.furnishing) as FurnishingStatus,
        availableFrom: String(updatedFields.availableFrom ?? editingProperty.availableFrom),
        bathrooms: Number(updatedFields.bathrooms ?? editingProperty.bathrooms),
        balconies: Number(updatedFields.balconies ?? editingProperty.balconies),
        floorNumber:
          updatedFields.floorNumber !== undefined
            ? updatedFields.floorNumber ?? null
            : editingProperty.floorNumber ?? null,
        totalFloors:
          updatedFields.totalFloors !== undefined
            ? updatedFields.totalFloors ?? null
            : editingProperty.totalFloors ?? null,
        carpetArea:
          updatedFields.carpetArea !== undefined
            ? updatedFields.carpetArea ?? null
            : editingProperty.carpetArea ?? null,
        fullDescription: String(updatedFields.fullDescription ?? editingProperty.fullDescription),
        submitterRole: (updatedFields.submitterRole ??
          editingProperty.submitterRole) as SubmitterRole,
      });

      showToast(`${editingProperty.propertyCode} updated successfully.`);
      setEditingProperty(null);
      await fetchAdminData();
      onDataChanged();
    } catch (err: unknown) {
      setErrorBanner((err as Error)?.message || 'Update failed.');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.docId);
      await markAllAdminNotificationsRead(unreadIds);
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // Ignore silent read update failures
    }
  };

  const filteredProperties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return properties.filter((item) => {
      if (activeTab === 'Pending' && item.workflowStatus !== 'Pending') return false;
      if (
        activeTab === 'Approved' &&
        item.workflowStatus !== 'Available' &&
        item.workflowStatus !== 'Rented'
      ) {
        return false;
      }
      if (activeTab === 'Rejected' && item.workflowStatus !== 'Rejected') return false;
      if (activeTab === 'Available' && item.workflowStatus !== 'Available') return false;
      if (activeTab === 'Rented' && item.workflowStatus !== 'Rented') return false;

      if (!q) return true;
      return (
        item.propertyCode.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.locality.toLowerCase().includes(q) ||
        item.submitterName.toLowerCase().includes(q) ||
        item.submitterMobile.includes(q) ||
        item.propertyType.toLowerCase().includes(q)
      );
    });
  }, [properties, activeTab, searchQuery]);

  // Loading auth state
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9F8FC] p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#6B1CD4]" />
          <p className="text-sm font-medium text-[#524F61]">Verifying WithBroker Admin session...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated Login Gate
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F9F8FC] p-4 sm:p-6">
        <div className="w-full max-w-md rounded-2xl border border-[#090A14]/10 bg-white p-6 sm:p-8 shadow-lg">
          <div className="flex items-center justify-between">
            <img
              src={WITHBROKER_LOGO_URL}
              alt="WithBroker"
              className="h-10 w-auto object-contain"
            />
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#140A29] px-2.5 py-1 text-[11px] font-bold tracking-wider text-white uppercase">
              <Lock className="h-3 w-3" />
              Admin
            </span>
          </div>

          <h1 className="mt-6 font-display text-2xl font-bold text-[#090A14]">
            Private Owner Admin Sign In
          </h1>
          <p className="mt-2 text-sm text-[#656275]">
            Restricted exclusively to the single WithBroker owner account. Public users, owners, and brokers can submit properties free from the main website without an admin account.
          </p>

          {authError && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
            >
              {authError}
            </div>
          )}

          <button
            type="button"
            data-testid="admin-google-signin"
            onClick={() => void signInWithGoogle()}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[#6B1CD4] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5412AD]"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <span>Sign in with Google</span>
          </button>

          <button
            type="button"
            onClick={onBackToWebsite}
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] px-4 text-sm font-semibold text-[#090A14] transition-colors hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Public Website</span>
          </button>
        </div>
      </div>
    );
  }

  // Authenticated but unauthorized non-admin account
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F9F8FC] p-4 sm:p-6">
        <div
          data-testid="admin-access-denied"
          className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 sm:p-8 text-center shadow-lg"
        >
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-[#090A14]">
            Admin Access Restricted
          </h1>
          <p className="mt-2 text-sm text-[#656275]">
            Signed in as <span className="font-semibold text-[#090A14]">{user.email}</span>, which is not authorized as a WithBroker administrator.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#140A29] px-4 text-sm font-semibold text-white hover:bg-[#231445]"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out &amp; Switch Account</span>
            </button>
            <button
              type="button"
              onClick={onBackToWebsite}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#090A14]/12 bg-white px-4 text-sm font-semibold text-[#090A14] hover:border-[#6B1CD4]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Return to Website</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Properties', value: stats.total, icon: Building2, tone: 'text-[#6B1CD4] bg-[#F5EFFD]' },
    { label: 'Pending Approval', value: stats.pending, icon: Clock, tone: 'text-amber-700 bg-amber-50' },
    { label: 'Approved (Live)', value: stats.approved, icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, tone: 'text-red-700 bg-red-50' },
    { label: 'Available', value: stats.available, icon: Home, tone: 'text-[#6B1CD4] bg-[#F5EFFD]' },
    { label: 'Rented Out', value: stats.rented, icon: ShieldCheck, tone: 'text-slate-700 bg-slate-100' },
    { label: 'Owner Submissions', value: stats.ownerSubmissions, icon: UserCheck, tone: 'text-indigo-700 bg-indigo-50' },
    { label: 'Broker Submissions', value: stats.brokerSubmissions, icon: Users, tone: 'text-purple-700 bg-purple-50' },
  ];

  const tabs: Array<{ key: AdminTab; label: string; count: number }> = [
    { key: 'all', label: 'All Submissions', count: stats.total },
    { key: 'Pending', label: 'Pending Approval', count: stats.pending },
    { key: 'Approved', label: 'Approved Properties', count: stats.approved },
    { key: 'Rejected', label: 'Rejected Properties', count: stats.rejected },
    { key: 'Available', label: 'Available Properties', count: stats.available },
    { key: 'Rented', label: 'Rented Properties', count: stats.rented },
  ];

  return (
    <div className="min-h-screen bg-[#F9F8FC] text-[#090A14]">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#140A29] text-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white px-2.5 py-1">
              <img
                src={WITHBROKER_LOGO_URL}
                alt="WithBroker"
                className="h-7 w-auto object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <p className="font-display text-sm font-bold leading-tight">Admin Management Console</p>
              <p className="text-[11px] text-white/70">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* AI Property Chatbot Launcher */}
            <button
              type="button"
              data-testid="open-admin-ai-chatbot-btn"
              onClick={() => setAiChatOpen(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#7C2AE8] to-[#9333EA] px-3 text-xs font-bold text-white shadow-sm ring-1 ring-white/20 transition-opacity hover:opacity-95 sm:px-3.5"
            >
              <Bot className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>AI Add Flat</span>
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                type="button"
                aria-label="Open notifications"
                onClick={() => setNotifOpen((prev) => !prev)}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/8 text-white transition-colors hover:bg-white/15"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#DC2626] px-1 text-[10px] font-bold text-white tabular-nums">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 overflow-hidden rounded-2xl border border-[#090A14]/12 bg-white text-[#090A14] shadow-2xl">
                  <div className="flex items-center justify-between border-b border-[#090A14]/8 px-4 py-3">
                    <span className="font-display text-sm font-bold">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => void handleMarkAllRead()}
                        className="text-xs font-semibold text-[#6B1CD4] hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-[#090A14]/6">
                    {notifications.length === 0 ? (
                      <p className="p-5 text-center text-xs text-[#656275]">
                        No notifications yet. New submissions and status updates will appear here.
                      </p>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`px-4 py-3 ${notif.isRead ? 'bg-white' : 'bg-[#F5EFFD]/55'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-[#090A14]">{notif.title}</p>
                            {!notif.isRead && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-[#6B1CD4]" />
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-[#524F61]">{notif.message}</p>
                          <p className="mt-1 text-[10px] text-[#656275]">
                            {formatDateTime(notif.createdAt)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => void fetchAdminData()}
              aria-label="Refresh dashboard"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/15"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={onBackToWebsite}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#7C2AE8] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#6B1CD4]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Public Website</span>
            </button>

            <button
              type="button"
              onClick={() => void logout()}
              aria-label="Sign out"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-3 text-xs font-semibold text-white/90 transition-colors hover:bg-red-600/85 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {toastMessage && (
          <div
            role="status"
            className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-emerald-700 hover:text-emerald-950"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {errorBanner && (
          <div
            role="alert"
            className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            <span>{errorBanner}</span>
            <button type="button" onClick={() => setErrorBanner(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Admin Service Module Switcher: Rental Properties vs Roommate Management */}
        <nav
          aria-label="Admin sections"
          className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#090A14]/10 bg-white p-2 shadow-2xs"
        >
          <button
            type="button"
            data-testid="admin-nav-properties"
            onClick={() => setAdminSection('properties')}
            className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs sm:text-sm font-bold transition-colors ${
              adminSection === 'properties'
                ? 'bg-[#6B1CD4] text-white shadow-xs'
                : 'text-[#524F61] hover:bg-[#F5EFFD] hover:text-[#6B1CD4]'
            }`}
          >
            <Building2 className="h-4 w-4" aria-hidden="true" />
            <span>Rental Properties</span>
            {stats.pending > 0 && (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                  adminSection === 'properties'
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {stats.pending} pending
              </span>
            )}
          </button>

          <button
            type="button"
            data-testid="admin-nav-roommates"
            onClick={() => setAdminSection('roommates')}
            className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs sm:text-sm font-bold transition-colors ${
              adminSection === 'roommates'
                ? 'bg-[#6B1CD4] text-white shadow-xs'
                : 'text-[#524F61] hover:bg-[#F5EFFD] hover:text-[#6B1CD4]'
            }`}
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            <span>Roommate Management</span>
            {roommatePendingCount > 0 && (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                  adminSection === 'roommates'
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {roommatePendingCount} pending
              </span>
            )}
            {roommateReportCount > 0 && (
              <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white tabular-nums">
                {roommateReportCount} report{roommateReportCount === 1 ? '' : 's'}
              </span>
            )}
          </button>
        </nav>

        {adminSection === 'roommates' ? (
          <AdminRoommatePanel
            onDataChanged={() => {
              onDataChanged();
              void fetchAdminData();
            }}
            onStatsUpdated={(pending, reports) => {
              setRoommatePendingCount(pending);
              setRoommateReportCount(reports);
            }}
          />
        ) : (
          <>
        {/* AI Property Chatbot Quick Launch Banner */}
        <section
          aria-label="AI Property Assistant"
          className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#7C2AE8]/25 bg-gradient-to-r from-[#140A29] to-[#2B1257] p-4 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C2AE8] text-white">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-bold leading-snug">
                Add New Flat Instantly with AI Chatbot
              </p>
              <p className="mt-0.5 text-xs text-white/75">
                Paste any flat details or WhatsApp message + upload photos — AI extracts all fields and adds the flat straight to your property list.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAiChatOpen(true)}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-[#140A29] transition-colors hover:bg-[#F5EFFD]"
          >
            <Bot className="h-4 w-4 text-[#6B1CD4]" aria-hidden="true" />
            <span>Open AI Chatbot</span>
          </button>
        </section>

        {/* Direct Owner Form Link Strip (1-tap Copy or WhatsApp to Flat Owners) */}
        {(() => {
          const ownerFormUrl = getOwnerSubmissionShareUrl();
          const ownerShareMsg = encodeURIComponent(
            `Hello! You can directly add your rental flat on WithBroker using this Owner Form link (free, fast, no login needed):\n\n${ownerFormUrl}\n\nOnce you submit, we will verify and list it for tenants.`
          );
          const handleCopyOwnerLink = async () => {
            try {
              await navigator.clipboard.writeText(ownerFormUrl);
              showToast('Direct Owner Form link copied! Share it with flat owners on WhatsApp.');
            } catch {
              showToast(`Owner link: ${ownerFormUrl}`);
            }
          };

          return (
            <section
              aria-label="Direct owner submission link"
              className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#6B1CD4]/20 bg-[#F5EFFD]/60 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#6B1CD4]">
                  <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Special Direct Owner Form Link</span>
                </div>
                <p className="mt-0.5 truncate text-xs font-medium text-[#524F61]">
                  {ownerFormUrl}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void handleCopyOwnerLink()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#6B1CD4] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#5412AD]"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copy Owner Link</span>
                </button>
                <a
                  href={`https://wa.me/?text=${ownerShareMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#16A34A] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#15803D]"
                >
                  <WhatsAppIcon className="h-3.5 w-3.5 text-white" />
                  <span>Share to Owner</span>
                </a>
                <a
                  href={ownerFormUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#090A14]/12 bg-white px-3 text-xs font-semibold text-[#090A14] transition-colors hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
                >
                  <span>Preview</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </section>
          );
        })()}

        {/* 8 KPI Metric Cards */}
        <section aria-label="Property portfolio summary">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
            {statCards.map(({ label, value, icon: Icon, tone }) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-2xl border border-[#090A14]/8 bg-white p-4 shadow-2xs"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-[#656275]">{label}</p>
                  <p className="mt-1 font-display text-2xl font-bold text-[#090A14] tabular-nums">
                    {value}
                  </p>
                </div>
                <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Tabs & Search Controls */}
        <section className="mt-6 rounded-2xl border border-[#090A14]/8 bg-white p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div role="tablist" aria-label="Property workflow tabs" className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-[#6B1CD4] text-white shadow-xs'
                        : 'bg-[#F5F3FA] text-[#524F61] hover:bg-[#EDE6FA] hover:text-[#6B1CD4]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[11px] tabular-nums ${
                        isActive ? 'bg-white/20 text-white' : 'bg-white text-[#090A14]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full lg:w-72">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#656275]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, locality, owner, mobile..."
                className="h-10 w-full rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] pl-9 pr-3 text-xs font-medium text-[#090A14] focus:border-[#6B1CD4] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Property Management List */}
          <div className="mt-5 space-y-3.5">
            {loading && properties.length === 0 ? (
              <div className="flex items-center justify-center py-14 text-sm text-[#656275]">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#6B1CD4]" />
                Loading properties from database...
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#090A14]/15 bg-[#F9F8FC] px-6 py-12 text-center">
                <p className="font-display text-base font-bold text-[#090A14]">
                  No properties in this view
                </p>
                <p className="mt-1 text-xs text-[#656275]">
                  Switch tabs or clear your search query to view other listings.
                </p>
              </div>
            ) : (
              filteredProperties.map((prop) => {
                const isBusy = actionBusyId === prop.dbId;
                const ownerWaUrl = buildOwnerContactWhatsAppUrl({
                  ownerPhone: prop.submitterWhatsapp || prop.submitterMobile,
                  ownerName: prop.submitterName,
                  propertyCode: prop.propertyCode,
                  title: prop.title,
                  status: prop.workflowStatus,
                });

                return (
                  <article
                    key={prop.dbId}
                    data-testid={`admin-property-row-${prop.propertyCode}`}
                    className="flex flex-col gap-4 rounded-2xl border border-[#090A14]/10 bg-[#FCFBFE] p-4 transition-colors hover:border-[#6B1CD4]/30 lg:flex-row lg:items-center"
                  >
                    {/* Thumbnail */}
                    <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl bg-[#EFEBF9] lg:h-28 lg:w-40">
                      <SafeImage
                        src={prop.images[0] ?? ''}
                        alt={prop.title}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute top-2 left-2 rounded-md bg-[#140A29]/85 px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">
                        {prop.propertyCode}
                      </span>
                      <span className="absolute right-2 bottom-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums">
                        {prop.images.length} photo{prop.images.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    {/* Core Property Info */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${STATUS_BADGE_MAP[prop.workflowStatus]}`}
                        >
                          {prop.workflowStatus}
                        </span>
                        <span className="rounded-md bg-[#F5EFFD] px-2 py-0.5 text-[11px] font-bold text-[#6B1CD4]">
                          {prop.propertyType}
                        </span>
                        <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-[#524F61] ring-1 ring-[#090A14]/10">
                          {prop.submitterRole}
                        </span>
                        <span className="text-[11px] text-[#656275]">
                          Submitted: {formatDateTime(prop.submittedAt)}
                        </span>
                      </div>

                      <h3 className="truncate font-display text-base font-bold text-[#090A14]">
                        {prop.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#524F61]">
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#6B1CD4]" />
                          <span className="truncate">
                            {prop.locality}
                            {prop.societyName ? ` · ${prop.societyName}` : ''}
                          </span>
                        </span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${prop.coordinates.lat},${prop.coordinates.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-[#F5EFFD] px-2 py-0.5 text-[11px] font-semibold text-[#6B1CD4] hover:bg-[#6B1CD4] hover:text-white"
                        >
                          <span>Map Pin</span>
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-0.5 text-xs">
                        <span className="font-bold text-[#6B1CD4] tabular-nums">
                          Rent: {formatINR(prop.monthlyRent)}/mo
                        </span>
                        <span className="text-[#524F61] tabular-nums">
                          Deposit: {formatDepositLabel(prop.securityDeposit)}
                        </span>
                        <span className="text-[#524F61] tabular-nums">
                          Brokerage:{' '}
                          {prop.brokerageAmount > 0
                            ? formatINR(prop.brokerageAmount)
                            : prop.brokerageStatus}
                        </span>
                        <a
                          href={`tel:+91${prop.submitterMobile.replace(/\D/g, '').slice(-10)}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#140A29] px-2.5 py-1 text-[11px] font-bold text-white tabular-nums transition-colors hover:bg-[#6B1CD4]"
                          title={`Call ${prop.submitterRole}: ${prop.submitterName}`}
                        >
                          <Phone className="h-3 w-3" aria-hidden="true" />
                          <span>
                            {prop.submitterRole}: {prop.submitterName} · +91 {prop.submitterMobile}
                          </span>
                        </a>
                      </div>

                      {prop.workflowStatus === 'Rejected' && prop.rejectionReason && (
                        <p className="text-xs font-medium text-red-700">
                          Rejection Note: {prop.rejectionReason}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 lg:w-[300px] lg:justify-end">
                      {prop.workflowStatus !== 'Available' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleStatusChange(prop, 'Available')}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#16A34A] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#15803D] disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>
                            {prop.workflowStatus === 'Rented' ? 'Mark Available' : 'Approve'}
                          </span>
                        </button>
                      )}

                      {prop.workflowStatus === 'Available' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleStatusChange(prop, 'Rented')}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#140A29] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#2a1752] disabled:opacity-50"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Mark Rented</span>
                        </button>
                      )}

                      {prop.workflowStatus !== 'Rejected' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            setRejectTarget(prop);
                            setRejectionReason(prop.rejectionReason ?? '');
                          }}
                          className="inline-flex h-9 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setViewingProperty(prop)}
                        className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#090A14]/12 bg-white px-2.5 text-xs font-semibold text-[#090A14] hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingProperty(prop)}
                        className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#090A14]/12 bg-white px-2.5 text-xs font-semibold text-[#090A14] hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>

                      <a
                        href={ownerWaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                      >
                        <WhatsAppIcon className="h-3.5 w-3.5 text-[#16A34A]" />
                        <span>{prop.submitterRole}</span>
                      </a>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setDeleteTarget(prop)}
                        aria-label={`Delete ${prop.propertyCode}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#090A14]/12 bg-white text-[#656275] hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
          </>
        )}
      </main>

      {/* View Details Modal */}
      {viewingProperty && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A14]/65 p-4 backdrop-blur-xs"
          onClick={() => setViewingProperty(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#090A14]/8 px-5 py-4">
              <div>
                <span className="text-xs font-bold text-[#6B1CD4]">
                  {viewingProperty.propertyCode} · {viewingProperty.workflowStatus}
                </span>
                <h2 className="font-display text-lg font-bold text-[#090A14]">
                  {viewingProperty.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setViewingProperty(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#090A14]/12"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4 text-sm">
              {viewingProperty.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {viewingProperty.images.map((img, i) => (
                    <div key={`${img}-${i}`} className="aspect-[4/3] overflow-hidden rounded-xl bg-[#F3F0FA]">
                      <SafeImage src={img} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#F9F8FC] p-4 text-xs sm:grid-cols-3">
                <div>
                  <span className="text-[#656275]">Owner / Broker</span>
                  <p className="font-bold text-[#090A14]">
                    {viewingProperty.submitterName} ({viewingProperty.submitterRole})
                  </p>
                </div>
                <div>
                  <span className="text-[#656275]">Mobile / WhatsApp (Private — Admin Only)</span>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <a
                      href={`tel:+91${viewingProperty.submitterMobile.replace(/\D/g, '').slice(-10)}`}
                      className="font-bold text-[#6B1CD4] underline tabular-nums"
                    >
                      +91 {viewingProperty.submitterMobile}
                    </a>
                    {viewingProperty.submitterWhatsapp !== viewingProperty.submitterMobile && (
                      <span className="font-semibold text-[#090A14] tabular-nums">
                        / WA: {viewingProperty.submitterWhatsapp}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[#656275]">Rent / Deposit</span>
                  <p className="font-bold text-[#6B1CD4] tabular-nums">
                    {formatINR(viewingProperty.monthlyRent)} / {formatDepositLabel(viewingProperty.securityDeposit)}
                  </p>
                </div>
                <div>
                  <span className="text-[#656275]">Furnishing</span>
                  <p className="font-semibold text-[#090A14]">{viewingProperty.furnishing}</p>
                </div>
                <div>
                  <span className="text-[#656275]">Bathrooms / Balconies</span>
                  <p className="font-semibold text-[#090A14]">
                    {viewingProperty.bathrooms ?? 1} Bath · {viewingProperty.balconies ?? 0} Balcony
                  </p>
                </div>
                <div>
                  <span className="text-[#656275]">Floor / Carpet Area</span>
                  <p className="font-semibold text-[#090A14]">
                    {viewingProperty.floorInfo || 'N/A'} · {viewingProperty.carpetArea || 'N/A'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#090A14]">Location &amp; Society</h4>
                <p className="mt-1 text-xs text-[#524F61]">
                  {viewingProperty.locality}
                  {viewingProperty.societyName ? ` (${viewingProperty.societyName})` : ''}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#090A14]">Description</h4>
                <p className="mt-1 text-xs leading-relaxed text-[#524F61]">
                  {viewingProperty.fullDescription}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A14]/65 p-4 backdrop-blur-xs"
          onClick={() => setRejectTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold text-[#090A14]">
              Reject Property {rejectTarget.propertyCode}?
            </h3>
            <p className="mt-1 text-xs text-[#656275]">
              Rejected properties will not be displayed on the public website.
            </p>
            <label htmlFor="reject-reason" className="mt-4 block text-xs font-semibold text-[#090A14]">
              Reason (Optional)
            </label>
            <textarea
              id="reject-reason"
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Duplicate listing, incomplete photos, incorrect pricing..."
              className="mt-1.5 w-full rounded-xl border border-[#090A14]/12 bg-[#F9F8FC] p-3 text-sm focus:border-[#6B1CD4] focus:bg-white focus:outline-none"
            />
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="rounded-xl border border-[#090A14]/15 px-4 py-2 text-xs font-semibold text-[#090A14]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionBusyId === rejectTarget.dbId}
                onClick={() => void handleStatusChange(rejectTarget, 'Rejected', rejectionReason)}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A14]/65 p-4 backdrop-blur-xs"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-[#090A14]">
                  Delete {deleteTarget.propertyCode}?
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#656275]">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-semibold text-[#090A14]">{deleteTarget.title}</span> and all uploaded photos? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-[#090A14]/15 px-4 py-2 text-xs font-semibold text-[#090A14]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionBusyId === deleteTarget.dbId}
                onClick={() => void handleDeleteConfirm()}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Property Modal */}
      {editingProperty && (
        <AdminEditPropertyModal
          property={editingProperty}
          busy={actionBusyId === editingProperty.dbId}
          onClose={() => setEditingProperty(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* Admin AI Property Assistant Chatbot Drawer */}
      <AdminAiChatbot
        isOpen={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
        onPropertyCreated={(propertyCode, status) => {
          showToast(
            status === 'Available'
              ? `AI added & published ${propertyCode} live on WithBroker!`
              : `AI saved ${propertyCode} in Pending Approval.`
          );
          void fetchAdminData();
          onDataChanged();
        }}
      />
    </div>
  );
};

interface AdminEditPropertyModalProps {
  property: AdminPropertyRecord;
  busy: boolean;
  onClose: () => void;
  onSave: (updates: Partial<AdminPropertyRecord>) => Promise<void>;
}

const AdminEditPropertyModal: React.FC<AdminEditPropertyModalProps> = ({
  property,
  busy,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(property.title);
  const [propertyType, setPropertyType] = useState<PropertyType>(property.propertyType);
  const [locality, setLocality] = useState(property.locality);
  const [societyName, setSocietyName] = useState(property.societyName ?? '');
  const [monthlyRent, setMonthlyRent] = useState(String(property.monthlyRent));
  const [securityDeposit, setSecurityDeposit] = useState(
    property.securityDeposit !== null ? String(property.securityDeposit) : ''
  );
  const [brokerageAmount, setBrokerageAmount] = useState(String(property.brokerageAmount));
  const [furnishing, setFurnishing] = useState<FurnishingStatus>(property.furnishing);
  const [availableFrom, setAvailableFrom] = useState(property.availableFrom);
  const [bathrooms, setBathrooms] = useState(String(property.bathrooms ?? 1));
  const [balconies, setBalconies] = useState(String(property.balconies ?? 0));
  const [carpetArea, setCarpetArea] = useState(property.carpetArea ?? '');
  const [fullDescription, setFullDescription] = useState(property.fullDescription);
  const [submitterName, setSubmitterName] = useState(property.submitterName);
  const [submitterMobile, setSubmitterMobile] = useState(property.submitterMobile);
  const [submitterRole, setSubmitterRole] = useState<SubmitterRole>(property.submitterRole);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSave({
      title,
      propertyType,
      locality,
      societyName: societyName || null,
      monthlyRent: Number(monthlyRent),
      securityDeposit: securityDeposit.trim() === '' ? null : Number(securityDeposit),
      brokerageAmount: Number(brokerageAmount || 0),
      furnishing,
      availableFrom,
      bathrooms: Number(bathrooms || 1),
      balconies: Number(balconies || 0),
      carpetArea: carpetArea || undefined,
      fullDescription,
      submitterName,
      submitterMobile,
      submitterRole,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#090A14]/65 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#090A14]/8 px-5 py-4">
          <h3 className="font-display text-lg font-bold text-[#090A14]">
            Edit Listing ({property.propertyCode})
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#090A14]/12"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="font-semibold text-[#090A14]">Listing Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
              />
            </div>
            <div>
              <label className="font-semibold text-[#090A14]">Property Type</label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
              >
                <option value="1RK">1RK</option>
                <option value="1BHK">1BHK</option>
                <option value="2BHK">2BHK</option>
                <option value="3BHK">3BHK</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-[#090A14]">Furnishing</label>
              <select
                value={furnishing}
                onChange={(e) => setFurnishing(e.target.value as FurnishingStatus)}
                className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
              >
                <option value="Unfurnished">Unfurnished</option>
                <option value="Semi-Furnished">Semi-Furnished</option>
                <option value="Fully Furnished">Fully Furnished</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-[#090A14]">Location</label>
              <input
                type="text"
                required
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
              />
            </div>
            <div>
              <label className="font-semibold text-[#090A14]">Society / Building</label>
              <input
                type="text"
                value={societyName}
                onChange={(e) => setSocietyName(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
              />
            </div>
            <div>
              <label className="font-semibold text-[#090A14]">Monthly Rent (₹)</label>
              <input
                type="number"
                required
                min={1000}
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="font-semibold text-[#090A14]">Security Deposit (₹)</label>
              <input
                type="number"
                min={0}
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="font-semibold text-[#090A14]">Brokerage (₹)</label>
              <input
                type="number"
                min={0}
                value={brokerageAmount}
                onChange={(e) => setBrokerageAmount(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="font-semibold text-[#090A14]">Available From</label>
              <input
                type="text"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
              />
            </div>
            <div>
              <label className="font-semibold text-[#090A14]">Bathrooms</label>
              <input
                type="number"
                min={1}
                max={10}
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
              />
            </div>
            <div>
              <label className="font-semibold text-[#090A14]">Balconies</label>
              <input
                type="number"
                min={0}
                max={10}
                value={balconies}
                onChange={(e) => setBalconies(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
              />
            </div>
            <div>
              <label className="font-semibold text-[#090A14]">Carpet Area</label>
              <input
                type="text"
                value={carpetArea}
                onChange={(e) => setCarpetArea(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
              />
            </div>
            <div>
              <label className="font-semibold text-[#090A14]">Submitter Role</label>
              <select
                value={submitterRole}
                onChange={(e) => setSubmitterRole(e.target.value as SubmitterRole)}
                className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
              >
                <option value="Owner">Owner</option>
                <option value="Broker">Broker</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-[#090A14]">Owner / Broker Name</label>
              <input
                type="text"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm"
              />
            </div>
            <div>
              <label className="font-semibold text-[#090A14]">Contact Mobile</label>
              <input
                type="tel"
                value={submitterMobile}
                onChange={(e) => setSubmitterMobile(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-[#090A14]/15 px-3 text-sm tabular-nums"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="font-semibold text-[#090A14]">Full Description</label>
              <textarea
                rows={3}
                value={fullDescription}
                onChange={(e) => setFullDescription(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#090A14]/15 p-3 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-[#090A14]/8 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#090A14]/15 px-4 py-2 text-xs font-semibold text-[#090A14]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-[#6B1CD4] px-5 py-2 text-xs font-semibold text-white hover:bg-[#5412AD] disabled:opacity-50"
            >
              {busy ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
