"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loginUser, Branch, Department, Profile } from "../actions";

interface LoginFormProps {
  branches: Branch[];
  departments: Department[];
  profiles: Profile[];
}

const EMAIL_MAP: Record<string, string> = {
  "Nguyễn Văn An": "an@hatico.com",
  "Trần Thị Bình": "binh@hatico.com",
  "Trần Văn Hùng": "hung@hatico.com",
  "Nguyễn Thế Sơn": "son@hatico.com",
  "Phạm Văn Cường": "cuong@hatico.com",
  "Lê Hoàng Hải": "hai@hatico.com",
  "Hoàng Thị Dung": "dung@hatico.com",
  "Vũ Văn Long": "long@hatico.com",
  "Lê Văn Đông": "dong@hatico.com",
};

export default function LoginForm({ branches, departments, profiles }: LoginFormProps) {
  const router = useRouter();
  
  // Custom dropdown states
  const [selectedDeptType, setSelectedDeptType] = useState<string>(""); // "Kinh doanh" | "Kỹ thuật"
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);

  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [branchSearchQuery, setBranchSearchQuery] = useState("");

  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [profileSearchQuery, setProfileSearchQuery] = useState("");

  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Update filtered profiles based on choices
  useEffect(() => {
    setSelectedProfileId("");
    setErrorMsg("");

    if (!selectedDeptType) {
      setFilteredProfiles([]);
      return;
    }

    if (selectedDeptType === "Kinh doanh") {
      if (!selectedBranchId) {
        setFilteredProfiles([]);
        return;
      }
      
      const salesDepts = departments.filter(
        d => d.name === "Kinh doanh" && d.branch_id === selectedBranchId
      );
      const salesDeptIds = salesDepts.map(d => d.id);
      
      const filtered = profiles.filter(p => salesDeptIds.includes(p.department_id));
      setFilteredProfiles(filtered);
    } else if (selectedDeptType === "Kỹ thuật") {
      const techDepts = departments.filter(d => d.name === "Kỹ thuật");
      const techDeptIds = techDepts.map(d => d.id);
      
      const filtered = profiles.filter(p => techDeptIds.includes(p.department_id));
      setFilteredProfiles(filtered);
    }
  }, [selectedDeptType, selectedBranchId, departments, profiles]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileId) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const profile = profiles.find(p => p.id === selectedProfileId);
      if (!profile) throw new Error("Không tìm thấy thông tin nhân viên");

      const email = EMAIL_MAP[profile.full_name];
      if (!email) {
        throw new Error(`Nhân viên ${profile.full_name} chưa có cấu hình tài khoản hệ thống`);
      }

      const supabase = createClient();
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password: "Password123!",
      });

      if (authErr) throw authErr;

      await loginUser(profile.id, profile.role, profile.full_name);

      localStorage.setItem(
        "hatico_user_session",
        JSON.stringify({
          id: profile.id,
          full_name: profile.full_name,
          role: profile.role,
        })
      );

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      console.error("Login failed:", err);
      setErrorMsg(err.message || "Đăng nhập thất bại, vui lòng thử lại.");
      setLoading(false);
    }
  };

  const getBranchLabel = (id: string) => {
    const branch = branches.find(b => b.id === id);
    return branch ? `${branch.name}` : "";
  };

  const getProfileLabel = (id: string) => {
    const p = profiles.find(prof => prof.id === id);
    if (!p) return "";
    const roleText = p.role === "employee" ? "Nhân viên" : p.role === "department_manager" ? "Trưởng phòng" : "Giám đốc";
    return `${p.full_name} (${roleText})`;
  };

  // Filter lists based on search queries
  const searchedBranches = branches.filter(b =>
    b.name.toLowerCase().includes(branchSearchQuery.toLowerCase())
  );

  const searchedProfiles = filteredProfiles.filter(p =>
    p.full_name.toLowerCase().includes(profileSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-3">
      <div className="bg-white p-4 rounded-lg shadow-xl shadow-slate-100 max-w-sm w-full transition-all relative">
        
        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-5 text-center">
          <img
            src="/logo/hatico_logo.png"
            alt="Hatico Logo"
            className="w-12 h-12 object-contain mb-3 rounded-lg"
          />
          <h1 className="text-xl font-bold tracking-tight text-primary">HATICO MANAGER</h1>
          <p className="text-slate-400 mt-0.5 text-xs">Báo cáo công việc hàng ngày nội bộ</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Custom Department Dropdown (Standard select button is fine since it has 2 choices) */}
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

          {/* Custom Branch Dropdown - COMBINED IN-BOX SEARCH INPUT */}
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
                    setBranchSearchQuery(""); // Clear search to show all options
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

          {/* Custom Employee Dropdown - COMBINED IN-BOX SEARCH INPUT */}
          {((selectedDeptType === "Kinh doanh" && selectedBranchId) || selectedDeptType === "Kỹ thuật") && (
            <div className="space-y-1.5 relative transition-all">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Tên nhân viên</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Chọn tên nhân viên..."
                  value={profileDropdownOpen ? profileSearchQuery : getProfileLabel(selectedProfileId)}
                  onChange={(e) => {
                    setProfileSearchQuery(e.target.value);
                    if (!profileDropdownOpen) setProfileDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setProfileDropdownOpen(true);
                    setProfileSearchQuery(""); // Clear search to show all options
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
                      {searchedProfiles.length === 0 ? (
                        <p className="text-slate-400 text-xs italic px-3 py-2">Không tìm thấy nhân viên</p>
                      ) : (
                        searchedProfiles.map((p) => {
                          const roleText = p.role === "employee" ? "Nhân viên" : p.role === "department_manager" ? "Trưởng phòng" : "Giám đốc";
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedProfileId(p.id);
                                setProfileSearchQuery("");
                                setProfileDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors font-semibold"
                            >
                              {p.full_name} ({roleText})
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !selectedProfileId}
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
