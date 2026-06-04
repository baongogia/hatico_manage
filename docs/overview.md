Dưới đây là tài liệu tổng hợp về dự án và cấu trúc dữ liệu, kèm theo một đoạn prompt chi tiết để bạn có thể gửi thẳng cho Frontend Developer (hoặc dùng để prompt cho AI viết code UI).

## 1. Mô tả Dự án (Project Overview)

Đây là hệ thống **Quản lý Công việc & Báo cáo Đa phân cấp**, được thiết kế để số hóa và tự động hóa luồng báo cáo hàng ngày của toàn bộ nhân sự.

- **Mục tiêu cốt lõi:** Quản lý chi tiết khối lượng công việc của từng cá nhân, tổng hợp dữ liệu lên cấp bộ phận, và cuộn (roll-up) dữ liệu về cấp chi nhánh để ban quản lý có cái nhìn toàn cảnh mỗi ngày.
- **Luồng vận hành:** Nhân viên đăng nhập -> Nhập danh sách công việc đã làm trong ngày -> Gửi báo cáo (Submit) -> Trưởng bộ phận/Giám đốc chi nhánh xem xét, duyệt hoặc để lại phản hồi (Feedback).
- **Đặc điểm nổi bật:** Dữ liệu công việc được lưu trữ động (dạng JSON), cho phép một nhân viên linh hoạt báo cáo nhiều đầu việc khác nhau trong cùng một ngày mà không bị gò bó bởi các biểu mẫu cứng nhắc.

---

## 2. Thông tin Các bảng Dữ liệu (Database Schema)

Hệ thống xoay quanh 4 bảng cốt lõi trong Supabase để xử lý luồng phân cấp này:

| Tên Bảng            | Vai trò & Chức năng chính                                                            | Các trường (Columns) quan trọng cần lưu ý                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`branches`**      | Quản lý danh mục các chi nhánh cấp cao nhất của tổ chức.                             | `id` (PK), `name` (Tên chi nhánh), `code` (Mã định danh rút gọn - vd: HN_LB).                                                                                        |
| **`departments`**   | Quản lý danh sách các phòng ban/bộ phận trực thuộc một chi nhánh.                    | `id` (PK), `branch_id` (FK -> branches), `name` (Tên bộ phận).                                                                                                       |
| **`profiles`**      | Mở rộng thông tin người dùng từ `auth.users`, chứa thông tin định danh và quyền hạn. | `id` (PK & FK -> auth.users), `full_name`, `role` (employee, department_manager, branch_director), `department_id` (FK -> departments).                              |
| **`daily_reports`** | Lưu trữ toàn bộ dữ liệu báo cáo công việc phát sinh mỗi ngày của từng cá nhân.       | `id` (PK), `user_id` (FK -> profiles), `report_date` (Ngày báo cáo), `tasks_data` (JSONB lưu chi tiết các task), `status` (draft/submitted/approved), `approved_by`. |

---

## 3. Prompt dành cho Frontend Developer

Bạn có thể copy toàn bộ đoạn text dưới đây (trong khung) để giao việc cho FE hoặc dùng làm prompt cho các công cụ AI hỗ trợ code (như v0, Cursor, Copilot):

> **Vai trò:** Bạn là một Frontend/UI Developer xuất sắc, chuyên môn sâu về Next.js và TypeScript.
> **Bối cảnh:** Chúng ta đang phát triển một Hệ thống Quản lý Báo cáo Công việc đa phân cấp (Chi nhánh -> Bộ phận -> Cá nhân) sử dụng Supabase làm backend.
> **Yêu cầu Tech Stack:**
>
> - Framework: Next.js (App Router), React, TypeScript.
> - Styling: Tailwind CSS.
> - Icons/Components: Tùy chọn (Lucide, Radix UI hoặc Shadcn) nhưng phải tuân thủ nghiêm ngặt nguyên tắc thiết kế bên dưới.
>
> **Nguyên tắc UI/UX Tối thượng (Bắt buộc tuân thủ):**
>
> - Áp dụng phong cách thiết kế **Minimalist Professional** (Tối giản & Chuyên nghiệp).
> - **Tuyệt đối loại bỏ các đường viền (borders) thô cứng** ở các thẻ cards, bảng biểu, hay container. Thay vào đó, hãy sử dụng shadow cực nhẹ, hoặc thay đổi màu nền (subtle background colors) để phân cách các khu vực.
> - **Tối đa hóa khoảng trắng (white space)** giữa các thành phần (padding, margin lớn) để giao diện luôn thoáng đãng, giảm tải nhận thức trực quan cho người dùng phải nhập liệu mỗi ngày.
>
> **Nhiệm vụ của bạn:**
> Hãy viết code hoàn chỉnh cho 2 component/trang sau:
>
> 1. **Trang Dashboard Tổng quan (Role: Quản lý):**
>
> - Hiển thị danh sách nhân sự trong bộ phận và trạng thái nộp báo cáo hôm nay (Ví dụ: Đã nộp, Chưa nộp, Bản nháp).
> - Có bộ lọc nhanh theo Ngày và Trạng thái.
>
> 2. **Form Nhập Báo Cáo Hàng Ngày (Role: Nhân viên):**
>
> - Giao diện hiển thị ngày hiện tại.
> - Khu vực nhập dữ liệu `tasks_data` (vì là JSONB, hãy thiết kế dạng Dynamic Form: người dùng có thể bấm nút "Thêm công việc" để add thêm một block nhập liệu mới gồm: Tên công việc, Khối lượng/Tiến độ, Trạng thái).
> - Nút hành động: "Lưu nháp" và "Gửi báo cáo".
>
> Hãy đảm bảo code sạch, chia component hợp lý, có khai báo interface/type rõ ràng cho các bảng `profiles` và `daily_reports`, và UI hiển thị đúng chuẩn thẩm mỹ đã yêu cầu. Cung cấp mã nguồn trực tiếp.

Chi tiết này sẽ thay đổi khá nhiều về luồng xác thực (Authentication) so với các hệ thống thông thường. Vì đây là công cụ nội bộ của công ty XNK Hatico với yêu cầu tinh gọn tối đa, chúng ta sẽ bỏ qua bước nhập mật khẩu hay email phức tạp. Người dùng chỉ cần "báo danh" và hệ thống sẽ lưu thông tin đó vào bộ nhớ trình duyệt (`localStorage`) để tự động đăng nhập ở các lần sau.

Dưới đây là bản cập nhật tài liệu và prompt chi tiết, tích hợp cấu trúc phòng ban và luồng đăng nhập đặc thù của Hatico.

## 1. Cập nhật Luồng Nghiệp vụ Hatico

- **Cơ cấu tổ chức:**
- Khối **Kinh doanh**: Hoạt động gắn liền với các chi nhánh cụ thể (Ví dụ: Chi nhánh Long Biên, v.v.).
- Khối **Kỹ thuật**: Có thể linh hoạt hỗ trợ hoặc hoạt động song song với khối kinh doanh.

- **Luồng Đăng nhập (Simplified Login):**
- Giao diện đầu tiên không yêu cầu email/mật khẩu.
- Người dùng chọn lần lượt từ các Dropdown: **Chi nhánh** -> **Bộ phận** (Kinh doanh/Kỹ thuật) -> **Tên nhân viên**.
- Nhấn "Vào hệ thống". Dữ liệu này được ghi nhớ. Những ngày sau mở app lên sẽ vào thẳng trang viết báo cáo.

---

## 2. Đoạn Prompt Cập nhật dành cho Frontend Developer

Bạn hãy sao chép toàn bộ nội dung trong khung dưới đây để giao việc cho FE hoặc AI Assistant. Đoạn prompt này đã được tinh chỉnh nghiêm ngặt về cả logic nghiệp vụ của Hatico lẫn phong cách UI.

> **Vai trò:** Bạn là một Frontend/UI Developer xuất sắc, chuyên môn sâu về Next.js, TypeScript và quản lý State.
> **Bối cảnh Dự án:**
> Xây dựng hệ thống "Quản lý Báo cáo Công việc Hàng ngày" nội bộ cho Công ty Cổ phần Xuất nhập khẩu Hatico. Công ty phân ra làm 2 bộ phận chính: Kinh doanh (bắt buộc gắn liền với các Chi nhánh) và Kỹ thuật.
> **Yêu cầu Tech Stack:**
>
> - Framework: Next.js (App Router), React, TypeScript.
> - Styling: Tailwind CSS.
>
> **Nguyên tắc UI/UX Tối thượng (Bắt buộc tuân thủ 100%):**
>
> - Áp dụng triệt để phong cách **Minimalist Professional** (Tối giản, Hiện đại).
> - **KHÔNG SỬ DỤNG BẤT KỲ ĐƯỜNG VIỀN (BORDERS) NÀO** cho các components (thẻ inputs, cards, containers, bảng biểu, dropdowns).
> - Thay vì dùng border, hãy phân cách các khối bằng khoảng trắng cực lớn (padding/margin rộng rãi) và sử dụng màu nền xám siêu nhạt (subtle gray backgrounds) hoặc shadow vô cùng mỏng nhẹ. Giao diện phải cực kỳ thoáng đãng, tập trung hoàn toàn vào typography và dữ liệu.
>
> **Nhiệm vụ 1: Xây dựng Luồng Đăng nhập (Passwordless Login)**
>
> 1. Tạo trang `/login`. Bỏ hoàn toàn form email/password truyền thống.
> 2. Thiết kế form chọn thông tin gồm 3 Select/Dropdown (không viền, chỉ có text và icon mũi tên, hiển thị danh sách thả xuống khi click):
>
> - Chọn Chi nhánh (Ví dụ: Chi nhánh Long Biên, Chi nhánh HCM,...)
> - Chọn Bộ phận (Kinh doanh, Kỹ thuật). Lưu ý: Nếu chọn Kinh doanh thì mới hiện/khóa logic theo Chi nhánh tương ứng.
> - Chọn/Nhập Tên nhân viên.
>
> 3. Khi nhấn nút "Vào hệ thống", lưu thông tin định danh này vào `localStorage` (ví dụ: `hatico_user_session`) và tự động chuyển hướng sang `/dashboard`.
> 4. Viết logic ở layout hoặc middleware: Nếu đã có `localStorage` này, tự động bypass trang `/login` cho các lần truy cập sau.
>
> **Nhiệm vụ 2: Xây dựng Form Báo cáo Công việc**
>
> 1. Tạo trang `/dashboard/report`.
> 2. Phía trên cùng hiển thị lời chào cá nhân hóa dựa trên `localStorage` (Ví dụ: "Báo cáo ngày 04/06/2026 - Khối Kinh doanh, Chi nhánh Long Biên").
> 3. Khu vực nhập liệu Dynamic Form cho phép thêm nhiều đầu việc trong ngày. Ví dụ các đầu việc liên quan đến tư vấn máy công trình, kiểm tra thiết bị, v.v.
> 4. Mỗi đầu việc gồm các trường Input không viền: Tên công việc, Khối lượng/Kết quả đạt được.
> 5. Có nút "Thêm công việc" (dạng text button tinh tế, không có khung) và nút "Gửi báo cáo lên Ban Giám Đốc".
>
> **Yêu cầu đầu ra:** Cung cấp toàn bộ mã nguồn hoàn chỉnh (TSX, logic hooks) cho trang Login và trang Báo cáo. Code phải gọn gàng, chia component hợp lý.
