"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { logoutUser, getAdminDashboardData, DailyReport, Profile, AdminDashboardData } from "../actions";
import { glassPanel, layoutGap, layoutPad } from "@/lib/glass-styles";
import LiveClock from "./live-clock";
import PageBackground from "./page-background";
import { AdminViewTabs, type AdminView } from "./admin-view-tabs";
import { AdminSummarySkeleton } from "./admin-summary-skeleton";
import { ReportStatusIndicator } from "./report-status-indicator";
import { SlidingSegmentedTabs } from "./sliding-segmented-tabs";

const AdminSummaryPanel = dynamic(
  () => import("./admin-summary-panel").then((m) => m.AdminSummaryPanel),
  { loading: () => <AdminSummarySkeleton /> },
);

interface DashboardClientProps {
  initialData: {
    role: string;
    profile: Profile;
    reports?: DailyReport[];
    employees?: Profile[];
    date?: string;
  };
  initialAdminView?: AdminView;
  initialAdminData?: AdminDashboardData | null;
  notice?: string;
}

const NOTICE_MESSAGES: Record<string, { title: string; message: string }> = {
  submitted: {
    title: "Gửi báo cáo thành công",
    message: "Báo cáo của bạn đã được lưu.",
  },
};

export default function DashboardClient({
  initialData,
  initialAdminView = "personal",
  initialAdminData = null,
  notice,
}: DashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adminView, setAdminView] = useState<AdminView>(initialAdminView);
  const [adminData, setAdminData] = useState<AdminDashboardData | null>(initialAdminData);
  const [adminLoading, startAdminLoad] = useTransition();

  const { role, profile, reports: initialReports = [] } = initialData;
  const isAdmin = role === "admin";

  const syncAdminUrl = useCallback((view: AdminView) => {
    const url = view === "summary" ? "/dashboard?view=summary" : "/dashboard";
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    if (!isAdmin || adminData) return;
    const prefetch = () => {
      getAdminDashboardData().then((result) => {
        if (!("error" in result)) setAdminData(result);
      });
    };
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(prefetch, { timeout: 2500 });
      return () => cancelIdleCallback(id);
    }
    const t = window.setTimeout(prefetch, 600);
    return () => window.clearTimeout(t);
  }, [isAdmin, adminData]);

  const handleAdminViewChange = (view: AdminView) => {
    if (view === "personal") {
      setAdminView("personal");
      syncAdminUrl("personal");
      return;
    }
    if (adminData) {
      setAdminView("summary");
      syncAdminUrl("summary");
      return;
    }
    startAdminLoad(async () => {
      const result = await getAdminDashboardData();
      if (!("error" in result)) {
        setAdminData(result);
        setAdminView("summary");
        syncAdminUrl("summary");
      }
    });
  };

  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(
    null,
  );

  // Custom Alert Modal state
  const [alertModal, setAlertModal] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({
    show: false,
    title: "",
    message: "",
  });

  // Mobile navigation tabs
  const [activeEmployeeTab, setActiveEmployeeTab] = useState<
    "today" | "history"
  >("today");
  useEffect(() => {
    if (!notice || !NOTICE_MESSAGES[notice]) return;

    const { title, message } = NOTICE_MESSAGES[notice];
    setTimeout(() => {
      setAlertModal({ show: true, title, message });
    }, 0);
    window.history.replaceState(null, "", "/dashboard");
  }, [notice]);

  // Handle logout
  const handleLogout = async () => {
    await logoutUser();
    localStorage.removeItem("hatico_user_session");
    router.replace("/login");
  };

  // Handle date change
  const handleReload = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  const canUsePersonalReports = role === "employee" || role === "admin";

  const todayStr = new Date().toISOString().split("T")[0];
  const todayReport = canUsePersonalReports
    ? initialReports.find((r) => r.report_date === todayStr)
    : null;

  const header = (
    <header
      className={`${glassPanel} px-3 py-2 flex items-center justify-between shrink-0 no-print`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Image
          src="/logo/hatico_logo.png"
          alt="Hatico Logo"
          width={160}
          height={70}
          priority
          className="h-10 sm:h-11 w-auto max-w-[160px] object-contain object-left shrink-0"
        />
        <div className="border-l border-slate-300/80 pl-2.5 min-w-0">
          <LiveClock />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right text-[11px] leading-tight hidden sm:block">
          <p className="font-bold text-slate-900">{profile.full_name}</p>
          <p className="text-slate-600">
            {profile.department?.name}
            {profile.department?.branch &&
              ` - ${profile.department.branch.name}`}
          </p>
        </div>

        <button
          onClick={handleReload}
          disabled={isPending}
          title="Tải lại dữ liệu"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-primary hover:bg-white/60 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <svg
            className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>

        {isAdmin && adminView === "personal" && (
          <button
            type="button"
            onClick={() => handleAdminViewChange("summary")}
            disabled={adminLoading}
            className="hidden sm:inline-flex items-center gap-1 text-primary hover:text-primary-hover text-xs font-bold transition-colors cursor-pointer bg-white/60 border border-white/80 px-2.5 py-1.5 rounded-lg backdrop-blur-sm touch-manipulation disabled:opacity-60"
          >
            Tổng hợp
          </button>
        )}
        {isAdmin && adminView === "summary" && (
          <button
            type="button"
            onClick={() => handleAdminViewChange("personal")}
            className="hidden sm:inline-flex text-primary hover:text-primary-hover text-xs font-bold cursor-pointer bg-white/60 border border-white/80 px-2.5 py-1.5 rounded-lg backdrop-blur-sm touch-manipulation"
          >
            Báo cáo của tôi
          </button>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-slate-700 hover:text-rose-600 text-xs font-bold transition-colors cursor-pointer"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7"
            />
          </svg>
          Thoát
        </button>
      </div>
    </header>
  );

  return (
    <div className="flex flex-col h-[100dvh] min-h-[100dvh] overflow-hidden font-sans relative print:h-auto print:overflow-visible print:bg-white">
      {canUsePersonalReports ? (
        <>
          <PageBackground />

          <div
            className={`relative z-10 flex flex-col h-full min-h-0 overflow-hidden print:h-auto print:min-h-0 print:overflow-visible ${layoutPad} ${layoutGap} max-sm:pt-[calc(12px+env(safe-area-inset-top,0px))] max-sm:pb-[max(12px,env(safe-area-inset-bottom,0px))] print:p-0 print:gap-0`}
          >
            {header}

            {isAdmin && (
              <AdminViewTabs
                view={adminView}
                onViewChange={handleAdminViewChange}
                pending={adminLoading}
              />
            )}

            {adminView === "summary" ? (
              adminLoading && !adminData ? (
                <AdminSummarySkeleton />
              ) : adminData ? (
                <AdminSummaryPanel initialData={adminData} onDataUpdate={setAdminData} />
              ) : (
                <AdminSummarySkeleton />
              )
            ) : (
              <div className="no-print flex flex-1 min-h-0 flex-col overflow-hidden min-w-0 max-sm:gap-3">
                <SlidingSegmentedTabs
                  className="sm:hidden shrink-0"
                  variant="glass"
                  ariaLabel="Chuyển vùng báo cáo"
                  value={activeEmployeeTab}
                  onChange={setActiveEmployeeTab}
                  options={[
                    { value: "today", label: "Báo cáo hôm nay" },
                    { value: "history", label: "Lịch sử báo cáo" },
                  ]}
                />

                <div className={`flex flex-1 min-h-0 overflow-hidden ${layoutGap}`}>
              <aside
                className={`${
                  activeEmployeeTab === "history" ? "flex" : "hidden"
                } sm:flex flex-col w-full sm:w-80 shrink-0 min-h-0 overflow-hidden ${glassPanel}`}
              >
                <div className="p-3 border-b border-white/60 shrink-0">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                    Lịch sử báo cáo đã nộp
                  </h3>
                </div>
                <div className="flex-grow overflow-y-auto no-scrollbar p-3 gap-2 flex flex-col">
                  {initialReports.length === 0 ? (
                    <p className="text-slate-600 text-xs italic p-2 text-center">
                      Chưa nộp báo cáo nào
                    </p>
                  ) : (
                    initialReports.map((report) => (
                      <div
                        key={report.id}
                        onClick={() => {
                          setSelectedReport(report);
                          setActiveEmployeeTab("today");
                        }}
                        className={`p-3 rounded-xl cursor-pointer transition-colors text-left flex items-center justify-between border ${
                          selectedReport?.id === report.id
                            ? "bg-white/75 border-primary/30 shadow-sm"
                            : "bg-white/45 border-white/70 hover:bg-white/65"
                        } backdrop-blur-sm`}
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {formatDateDisplay(report.report_date)}
                          </p>
                          <p className="text-[10px] text-slate-600 mt-0.5">
                            {report.tasks_data?.length || 0} việc đã làm
                          </p>
                        </div>
                        <ReportStatusIndicator hasReport={true} />
                      </div>
                    ))
                  )}
                </div>
              </aside>

              <main
                className={`${
                  activeEmployeeTab === "today" ? "flex" : "hidden sm:flex"
                } flex-1 flex-col min-h-0 overflow-y-auto ${layoutGap}`}
              >
                <div className={`flex flex-col flex-grow min-h-0 ${layoutGap}`}>
                  {selectedReport || todayReport ? (
                    <div className={layoutGap}>
                      {(() => {
                        const displayReport = selectedReport || todayReport;
                        if (!displayReport) return null;
                        return (
                          <div className={`${glassPanel} p-4 space-y-3`}>
                            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                              <div>
                                <h3 className="text-xs font-bold text-slate-900">
                                  Báo cáo ngày{" "}
                                  {formatDateDisplay(displayReport.report_date)}
                                </h3>
                                {displayReport.id === todayReport?.id && (
                                  <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-lg font-bold mt-1 inline-block">
                                    Báo cáo hôm nay
                                  </span>
                                )}
                              </div>
                              <ReportStatusIndicator
                                hasReport={true}
                                size="md"
                              />
                            </div>

                            <div className="space-y-2">
                              <h4 className="text-[11px] font-bold text-primary uppercase tracking-wide">
                                Đầu việc:
                              </h4>
                              <div className="flex flex-wrap gap-1.5">
                                {displayReport.tasks_data.map((task, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-white/70 border border-slate-200/80 text-slate-900 text-xs font-semibold px-3 py-1.5 rounded-lg"
                                  >
                                    {task.title}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-200/80 flex gap-2">
                              <button
                                onClick={() =>
                                  router.push(
                                    `/dashboard/report?id=${displayReport.id}`,
                                  )
                                }
                                className="bg-primary text-white hover:bg-primary-hover font-bold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
                              >
                                Chỉnh sửa báo cáo
                              </button>
                              {selectedReport && (
                                <button
                                  onClick={() => setSelectedReport(null)}
                                  className="bg-white/70 border border-slate-300 text-slate-800 hover:bg-white font-bold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
                                >
                                  Xem báo cáo hôm nay
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div
                      className={`${glassPanel} p-6 flex flex-col items-center justify-center text-center py-12`}
                    >
                      <ReportStatusIndicator hasReport={false} size="md" />
                      <p className="text-slate-900 font-bold text-sm mt-3">
                        Chưa có báo cáo hôm nay
                      </p>
                      <p className="text-slate-600 text-xs mt-1">
                        Vui lòng viết báo cáo công việc hôm nay.
                      </p>
                      <button
                        onClick={() => router.push("/dashboard/report")}
                        className="bg-primary text-white hover:bg-primary-hover font-bold px-5 py-2.5 rounded-lg mt-4 transition-colors shadow-sm cursor-pointer text-xs"
                      >
                        Bắt đầu viết ngay
                      </button>
                    </div>
                  )}
                </div>
              </main>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {header}
          <div className="flex-grow h-[calc(100vh-5rem)] overflow-hidden bg-slate-50" />
        </>
      )}

      {alertModal.show && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-50 p-3 no-print">
          <div className="bg-white p-4 rounded-lg shadow-xl max-w-xs w-full space-y-3 animate-slide-in">
            <h3 className="font-bold text-slate-800 text-sm">
              {alertModal.title}
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              {alertModal.message}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() =>
                  setAlertModal({ show: false, title: "", message: "" })
                }
                className="bg-primary hover:bg-primary-hover text-white font-bold text-xs px-3.5 py-1.5 rounded-lg cursor-pointer transition-colors"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
