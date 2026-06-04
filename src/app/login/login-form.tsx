"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginWithStaff, Branch, StaffMember } from "../actions";

interface LoginFormProps {
  branches: Branch[];
  staff: StaffMember[];
}

const TECH_POSITIONS = new Set(["Kỹ thuật", "NVKT", "Lắp mooc", "GĐKV"]);

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
      setFilteredStaff(staff.filter((s) => TECH_POSITIONS.has(s.position || "")));
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
        selectedDeptType as "Kinh doanh" | "Kỹ thuật"
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
        })
      );

      router.push(res.profile.role === "admin" ? "/dashboard/admin" : "/dashboard");
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
    b.name.toLowerCase().includes(branchSearchQuery.toLowerCase())
  );

  const searchedStaff = filteredStaff.filter((s) =>
    s.full_name.toLowerCase().includes(profileSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-3">
      <div className="bg-white p-4 rounded-lg shadow-xl shadow-slate-100 max-w-sm w-full transition-all relative">

        <div className="flex flex-col items-center mb-5 text-center">
          <img
            src="/logo/hatico_logo.png"
            alt="Hatico Logo"
            className="w-12 h-12 object-contain mb-3 rounded-lg"
          />
          <h1 className="text-xl font-bold tracking-tight text-primary">HATICO MANAGER</h1>
          <p className="text-slate-400 mt-0.5 text-xs">Báo cáo công việc hàng ngày nội bộ</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">

          <div className="space-y-1.5 relative">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Khối / Bộ phận</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDeptDropdownOpen(!deptDropdownOpen)}
                className="w-full bg-slate-50 text-slate-800 px-3 py-2.5 rounded-lg text-left text-sm flex items-center justify-between transition-colors cursor-pointer hover:bg-slate-100/50"
              >
                <span>{selectedDeptType ? `Khối ${selectedDeptType}` : "Chọn bộ phận..."}</span>
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {deptDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDeptDropdownOpen(false)} />
                  <div className="absolute z-20 mt-1 w-full bg-white shadow-lg rounded-lg py-1 max-h-60 overflow-y-auto no-scrollbar">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDeptType("Kinh doanh");
                        setSelectedBranchId("");
                        setDeptDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors font-semibold"
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
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors font-semibold"
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
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Chi nhánh</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Chọn chi nhánh..."
                  value={branchDropdownOpen ? branchSearchQuery : getBranchLabel(selectedBranchId)}
                  onChange={(e) => {
                    setBranchSearchQuery(e.target.value);
                    if (!branchDropdownOpen) setBranchDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setBranchDropdownOpen(true);
                    setBranchSearchQuery("");
                  }}
                  className="w-full bg-slate-50 text-slate-800 px-3 py-2.5 rounded-lg text-left text-sm focus:outline-none focus:bg-slate-100 transition-colors pr-8 cursor-pointer font-medium"
                />
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {branchDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setBranchDropdownOpen(false)} />
                    <div className="absolute z-20 mt-1 w-full bg-white shadow-lg rounded-lg py-1 max-h-60 overflow-y-auto no-scrollbar">
                      {searchedBranches.length === 0 ? (
                        <p className="text-slate-400 text-xs italic px-3 py-2">Không tìm thấy chi nhánh</p>
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
                            className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors font-semibold"
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

          {((selectedDeptType === "Kinh doanh" && selectedBranchId) || selectedDeptType === "Kỹ thuật") && (
            <div className="space-y-1.5 relative transition-all">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Tên nhân viên</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Chọn tên nhân viên..."
                  value={profileDropdownOpen ? profileSearchQuery : getStaffLabel(selectedStaffId)}
                  onChange={(e) => {
                    setProfileSearchQuery(e.target.value);
                    if (!profileDropdownOpen) setProfileDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setProfileDropdownOpen(true);
                    setProfileSearchQuery("");
                  }}
                  className="w-full bg-slate-50 text-slate-800 px-3 py-2.5 rounded-lg text-left text-sm focus:outline-none focus:bg-slate-100 transition-colors pr-8 cursor-pointer font-medium"
                />
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {profileDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProfileDropdownOpen(false)} />
                    <div className="absolute z-20 mt-1 w-full bg-white shadow-lg rounded-lg py-1 max-h-60 overflow-y-auto no-scrollbar">
                      {searchedStaff.length === 0 ? (
                        <p className="text-slate-400 text-xs italic px-3 py-2">Không tìm thấy nhân viên</p>
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
                            className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors font-semibold"
                          >
                            {s.full_name}
                            {s.position ? (
                              <span className="text-slate-400 font-normal"> · {s.position}</span>
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
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selectedStaffId}
            className="w-full bg-primary text-white hover:bg-primary-hover disabled:bg-slate-200 disabled:text-slate-400 font-semibold px-4 py-3 rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center text-sm"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
  );
}
