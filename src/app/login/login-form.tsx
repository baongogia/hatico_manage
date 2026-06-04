"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageBackground from "../dashboard/page-background";
import { loginWithStaff, Branch, StaffMember } from "../actions";

interface LoginFormProps {
  branches: Branch[];
  staff: StaffMember[];
}

const TECH_POSITIONS = new Set(["Kỹ thuật", "NVKT", "Lắp mooc", "GĐKV"]);

const LOGIN_BG_URL =
  "https://bmmmdhinlqrlxfrtozpt.supabase.co/storage/v1/object/public/avatar/IMG_8512.jpg";

export default function LoginForm({ branches, staff }: LoginFormProps) {
  const router = useRouter();

  const [selectedDeptType, setSelectedDeptType] = useState<string>("");
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);

  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [branchSearchQuery, setBranchSearchQuery] = useState("");

  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [profileSearchQuery, setProfileSearchQuery] = useState("");

  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setSelectedStaffId(null);
    setErrorMsg("");

    if (!selectedDeptType) {
      setFilteredStaff([]);
      return;
    }

    if (selectedDeptType === "Kinh doanh") {
      if (!selectedBranchId) {
        setFilteredStaff([]);
        return;
      }
      setFilteredStaff(staff.filter((s) => s.branch_id === selectedBranchId));
    } else if (selectedDeptType === "Kỹ thuật") {
      setFilteredStaff(
        staff.filter((s) => TECH_POSITIONS.has(s.position || "")),
      );
    }
  }, [selectedDeptType, selectedBranchId, staff]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId || !selectedDeptType) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await loginWithStaff(
        selectedStaffId,
        selectedDeptType as "Kinh doanh" | "Kỹ thuật",
      );

      if (res.error || !res.profile) {
        throw new Error(res.error || "Đăng nhập thất bại");
      }

      localStorage.setItem(
        "hatico_user_session",
        JSON.stringify({
          id: res.profile.id,
          full_name: res.profile.full_name,
          role: res.profile.role,
        }),
      );

      router.push(
        res.profile.role === "admin" ? "/dashboard/admin" : "/dashboard",
      );
      router.refresh();
    } catch (err: any) {
      console.error("Login failed:", err);
      setErrorMsg(err.message || "Đăng nhập thất bại, vui lòng thử lại.");
      setLoading(false);
    }
  };

  const getBranchLabel = (id: string) => {
    const branch = branches.find((b) => b.id === id);
    return branch ? branch.name : "";
  };

  const getStaffLabel = (id: number | null) => {
    if (!id) return "";
    const member = staff.find((s) => s.id === id);
    if (!member) return "";
    return member.full_name;
  };

  const searchedBranches = branches.filter((b) =>
    b.name.toLowerCase().includes(branchSearchQuery.toLowerCase()),
  );

  const searchedStaff = filteredStaff.filter((s) =>
    s.full_name.toLowerCase().includes(profileSearchQuery.toLowerCase()),
  );

  const glassInput =
    "w-full bg-white/10 backdrop-blur-sm text-white placeholder:text-white/45 px-3 py-2.5 rounded-lg text-left text-sm border border-white/20 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-colors pr-8 cursor-pointer font-medium";
  const glassLabel =
    "block text-xs font-bold text-white/80 uppercase tracking-wide";
  const dropdownPanel =
    "absolute z-20 mt-1 w-full bg-slate-900/85 backdrop-blur-xl border border-white/15 shadow-2xl rounded-lg py-1 max-h-60 overflow-y-auto no-scrollbar";

  return (
    <>
      <PageBackground url={LOGIN_BG_URL} variant="login" />
      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center p-4 max-sm:px-3 max-sm:pb-[max(1rem,env(safe-area-inset-bottom))] max-sm:pt-[max(1rem,env(safe-area-inset-top))] overflow-x-hidden">
      <div className="w-full max-w-sm p-5 sm:p-6 rounded-2xl border border-white/25 bg-white/12 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/10">
        <div className="flex flex-col items-center mb-5 text-center">
          <img
            src="/logo/hatico_logo.png"
            alt="Hatico Logo"
            width={2400}
            height={1049}
            className="w-[78%] max-w-[200px] h-auto mb-4 brightness-0 invert drop-shadow-sm"
          />
          <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
            HATICO MANAGER
          </h1>
          <p className="text-white/65 mt-0.5 text-xs">
            Báo cáo công việc hàng ngày nội bộ
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5 relative">
            <label className={glassLabel}>Khối / Bộ phận</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDeptDropdownOpen(!deptDropdownOpen)}
                className={`${glassInput} flex items-center justify-between hover:bg-white/15`}
              >
                <span className={selectedDeptType ? "" : "text-white/45"}>
                  {selectedDeptType
                    ? `Khối ${selectedDeptType}`
                    : "Chọn bộ phận..."}
                </span>
                <svg
                  className="h-4 w-4 text-white/50 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {deptDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDeptDropdownOpen(false)}
                  />
                  <div className={dropdownPanel}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDeptType("Kinh doanh");
                        setSelectedBranchId("");
                        setDeptDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 text-white/90 transition-colors font-semibold"
                    >
                      Khối Kinh doanh
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDeptType("Kỹ thuật");
                        setSelectedBranchId("");
                        setDeptDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 text-white/90 transition-colors font-semibold"
                    >
                      Khối Kỹ thuật
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {selectedDeptType === "Kinh doanh" && (
            <div className="space-y-1.5 relative transition-all">
              <label className={glassLabel}>Chi nhánh</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Chọn chi nhánh..."
                  value={
                    branchDropdownOpen
                      ? branchSearchQuery
                      : getBranchLabel(selectedBranchId)
                  }
                  onChange={(e) => {
                    setBranchSearchQuery(e.target.value);
                    if (!branchDropdownOpen) setBranchDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setBranchDropdownOpen(true);
                    setBranchSearchQuery("");
                  }}
                  className={glassInput}
                />
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-white/50">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>

                {branchDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setBranchDropdownOpen(false)}
                    />
                    <div className={dropdownPanel}>
                      {searchedBranches.length === 0 ? (
                        <p className="text-white/50 text-xs italic px-3 py-2">
                          Không tìm thấy chi nhánh
                        </p>
                      ) : (
                        searchedBranches.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              setSelectedBranchId(b.id);
                              setBranchSearchQuery("");
                              setBranchDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 text-white/90 transition-colors font-semibold"
                          >
                            {b.name}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {((selectedDeptType === "Kinh doanh" && selectedBranchId) ||
            selectedDeptType === "Kỹ thuật") && (
            <div className="space-y-1.5 relative transition-all">
              <label className={glassLabel}>Tên nhân viên</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Chọn tên nhân viên..."
                  value={
                    profileDropdownOpen
                      ? profileSearchQuery
                      : getStaffLabel(selectedStaffId)
                  }
                  onChange={(e) => {
                    setProfileSearchQuery(e.target.value);
                    if (!profileDropdownOpen) setProfileDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setProfileDropdownOpen(true);
                    setProfileSearchQuery("");
                  }}
                  className={glassInput}
                />
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-white/50">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>

                {profileDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setProfileDropdownOpen(false)}
                    />
                    <div className={dropdownPanel}>
                      {searchedStaff.length === 0 ? (
                        <p className="text-white/50 text-xs italic px-3 py-2">
                          Không tìm thấy nhân viên
                        </p>
                      ) : (
                        searchedStaff.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedStaffId(s.id);
                              setProfileSearchQuery("");
                              setProfileDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 text-white/90 transition-colors font-semibold"
                          >
                            {s.full_name}
                            {s.position ? (
                              <span className="text-white/50 font-normal">
                                {" "}
                                · {s.position}
                              </span>
                            ) : null}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-100 p-3 rounded-lg text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selectedStaffId}
            className="w-full bg-primary text-white hover:bg-primary-hover disabled:bg-white/10 disabled:text-white/35 disabled:border disabled:border-white/15 font-semibold px-4 py-3 rounded-lg shadow-lg shadow-black/25 transition-all cursor-pointer flex items-center justify-center text-sm"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <svg
                  className="animate-spin h-4 w-4 text-current"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Đang kết nối...
              </span>
            ) : (
              "Vào hệ thống"
            )}
          </button>
        </form>
      </div>
      </div>
    </>
  );
}
