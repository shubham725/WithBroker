import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit3,
  Loader2,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  deleteMyRoommateListing,
  renewMyRoommateListing,
  subscribeMyRoommateListings,
  updateMyRoommateStatus,
} from '../lib/roommateRepo';
import type { RoommateListingRecord, RoommateStatus } from '../types/roommate';
import { formatINR } from '../utils/propertyLogic';
import {
  formatRoommateDate,
  getListingTypeShortLabel,
  isRoommateListingExpired,
} from '../utils/roommateLogic';

interface MyRoommateDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  onEditListing: (listing: RoommateListingRecord) => void;
  onUserListingsLoaded?: (listings: RoommateListingRecord[]) => void;
}

const STATUS_STYLE: Record<RoommateStatus, string> = {
  Pending: 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/20',
  Active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  Fulfilled: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20',
  Unavailable: 'bg-slate-100 text-slate-700 ring-1 ring-slate-500/20',
  Rejected: 'bg-red-50 text-red-700 ring-1 ring-red-600/20',
};

export const MyRoommateDashboardModal: React.FC<MyRoommateDashboardModalProps> = ({
  isOpen,
  onClose,
  onCreateNew,
  onEditListing,
  onUserListingsLoaded,
}) => {
  const { user, authLoading, authError, signInWithGoogle, logout } = useAuth();
  const [listings, setListings] = useState<RoommateListingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [confirmDeleteCode, setConfirmDeleteCode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen || !user) {
      setListings([]);
      return;
    }
    setLoading(true);
    const unsub = subscribeMyRoommateListings(
      user.uid,
      (items) => {
        setListings(items);
        onUserListingsLoaded?.(items);
        setLoading(false);
      },
      (err) => {
        setFeedback({ type: 'err', text: err.message || 'Unable to load your listings.' });
        setLoading(false);
      }
    );
    return () => unsub();
  }, [isOpen, user, onUserListingsLoaded]);

  if (!isOpen) return null;

  const runAction = async (
    code: string,
    fn: () => Promise<void>,
    successMsg: string
  ) => {
    setBusyCode(code);
    setFeedback(null);
    try {
      await fn();
      setFeedback({ type: 'ok', text: successMsg });
      setConfirmDeleteCode(null);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Action failed. Please try again.',
      });
    } finally {
      setBusyCode(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-roommate-dashboard-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#090A14]/65 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#090A14]/10 bg-[#FAF8FF] px-5 py-4 sm:px-6">
          <div>
            <h2
              id="my-roommate-dashboard-title"
              className="font-display text-lg font-bold text-[#090A14] sm:text-xl"
            >
              My Roommate Listings Dashboard
            </h2>
            <p className="text-xs text-[#656275]">
              Manage, edit, renew, or mark your own WithBroker roommate listings as fulfilled
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close my roommate dashboard"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#090A14]/12 bg-white text-[#524F61] hover:text-[#090A14]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {authLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14">
              <Loader2 className="h-7 w-7 animate-spin text-[#6B1CD4]" />
              <p className="text-sm text-[#656275]">Checking your account...</p>
            </div>
          ) : !user ? (
            <div
              data-testid="my-roommates-signin-gate"
              className="mx-auto max-w-md py-8 text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5EFFD] text-[#6B1CD4]">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-[#090A14]">
                Sign In to Manage Your Roommate Listings
              </h3>
              <p className="mt-2 text-sm text-[#656275]">
                Only the verified owner of a listing can view private status, edit details, mark it fulfilled, renew expiry, or delete it.
              </p>
              {authError && (
                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                  {authError}
                </p>
              )}
              <button
                type="button"
                data-testid="my-roommates-google-signin"
                onClick={() => void signInWithGoogle()}
                className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#6B1CD4] px-5 text-sm font-bold text-white hover:bg-[#5412AD]"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Continue with Google</span>
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Account Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#090A14]/8 bg-[#F9F8FC] px-4 py-3">
                <div className="text-xs sm:text-sm">
                  <span className="text-[#656275]">Signed in as </span>
                  <strong className="text-[#090A14]">{user.email}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onCreateNew}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#6B1CD4] px-3.5 text-xs font-bold text-white hover:bg-[#5412AD]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>New Listing</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#090A14]/12 bg-white px-3 text-xs font-semibold text-[#524F61] hover:text-[#090A14]"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>

              {feedback && (
                <div
                  role="status"
                  className={`rounded-xl border px-4 py-2.5 text-xs font-medium ${
                    feedback.type === 'ok'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {feedback.text}
                </div>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-[#6B1CD4]" />
                  <p className="text-xs text-[#656275]">Loading your roommate listings...</p>
                </div>
              ) : listings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#090A14]/15 bg-[#FAF8FF] px-6 py-10 text-center">
                  <Users className="mx-auto h-8 w-8 text-[#6B1CD4]/60" />
                  <h3 className="mt-3 font-display text-base font-bold text-[#090A14]">
                    You haven&apos;t posted any roommate listings yet
                  </h3>
                  <p className="mt-1 text-xs text-[#656275]">
                    Post a vacant room or your roommate requirement and track approval &amp; status right here.
                  </p>
                  <button
                    type="button"
                    onClick={onCreateNew}
                    className="mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#6B1CD4] px-5 text-xs font-bold text-white hover:bg-[#5412AD]"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Post Your Requirement</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {listings.map((item) => {
                    const expired = isRoommateListingExpired(item);
                    const isBusy = busyCode === item.listingCode;
                    const canEdit =
                      item.status === 'Pending' ||
                      item.status === 'Active' ||
                      item.status === 'Rejected';

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-[#090A14]/10 bg-white p-4 sm:p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-mono font-bold text-[#6B1CD4]">
                                {item.listingCode}
                              </span>
                              <span className="text-[#656275]">·</span>
                              <span className="font-semibold text-[#524F61]">
                                {getListingTypeShortLabel(item.listingType)}
                              </span>
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                  expired && item.status === 'Active'
                                    ? 'bg-orange-50 text-orange-800 ring-1 ring-orange-600/20'
                                    : STATUS_STYLE[item.status]
                                }`}
                              >
                                {expired && item.status === 'Active' ? 'Expired' : item.status}
                              </span>
                            </div>

                            <h3 className="mt-1.5 font-display text-base font-bold text-[#090A14]">
                              {item.roomType} in {item.location}
                            </h3>
                            <p className="mt-0.5 text-xs text-[#656275] tabular-nums">
                              Rent: {formatINR(item.rent)}/mo · Deposit: {formatINR(item.deposit)} · Looking for: {item.preferredGender} · Posted {formatRoommateDate(item.createdAt)} · Expires {formatRoommateDate(item.expiresAt)}
                            </p>
                          </div>
                        </div>

                        {item.status === 'Rejected' && item.rejectionReason && (
                          <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>Admin feedback: {item.rejectionReason}</span>
                          </div>
                        )}

                        {expired && item.status === 'Active' && (
                          <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              This listing has expired and is hidden from public search. Click Renew to make it live for another 30 days.
                            </span>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#090A14]/8 pt-3.5">
                          {canEdit && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => onEditListing(item)}
                              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#090A14]/12 bg-[#F9F8FC] px-3 text-xs font-semibold text-[#090A14] hover:border-[#6B1CD4] hover:text-[#6B1CD4]"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>{item.status === 'Rejected' ? 'Edit & Resubmit' : 'Edit'}</span>
                            </button>
                          )}

                          {item.status === 'Active' && !expired && (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  void runAction(
                                    item.listingCode,
                                    () => updateMyRoommateStatus(item, 'Fulfilled', user.uid),
                                    `${item.listingCode} marked as Fulfilled and removed from public search.`
                                  )
                                }
                                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Mark Fulfilled</span>
                              </button>

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  void runAction(
                                    item.listingCode,
                                    () => updateMyRoommateStatus(item, 'Unavailable', user.uid),
                                    `${item.listingCode} marked as No Longer Available and hidden from search.`
                                  )
                                }
                                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Mark Unavailable</span>
                              </button>
                            </>
                          )}

                          {(expired ||
                            item.status === 'Fulfilled' ||
                            item.status === 'Unavailable') && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                void runAction(
                                  item.listingCode,
                                  () => renewMyRoommateListing(item, user.uid),
                                  item.status === 'Active'
                                    ? `${item.listingCode} renewed for 30 more days!`
                                    : `${item.listingCode} renewed and resubmitted for approval.`
                                )
                              }
                              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#6B1CD4] px-3 text-xs font-semibold text-white hover:bg-[#5412AD]"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span>Renew (+30 Days)</span>
                            </button>
                          )}

                          {confirmDeleteCode === item.listingCode ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  void runAction(
                                    item.listingCode,
                                    () => deleteMyRoommateListing(item, user.uid),
                                    `${item.listingCode} permanently deleted.`
                                  )
                                }
                                className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-red-600 px-3 text-xs font-bold text-white hover:bg-red-700"
                              >
                                Confirm Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteCode(null)}
                                className="inline-flex min-h-[36px] items-center rounded-lg border border-[#090A14]/15 px-2.5 text-xs font-semibold text-[#524F61]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setConfirmDeleteCode(item.listingCode)}
                              className="ml-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
