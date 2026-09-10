# Group Picker - Supabase

## Tính năng
- Trang thành viên: nhập tên và quay vòng.
- Admin: đăng nhập bằng mật khẩu `BuiAdmin@2026` (mật khẩu được lưu dạng hash trong Supabase).
- Quản lý lớp, thành viên, nhóm.
- Mỗi nhóm có **giới hạn thành viên tối đa**. Nhập `0` nghĩa là không giới hạn.
- Khi nhóm đủ số người, nhóm đó tự động bị loại khỏi lượt quay.
- Mỗi thành viên chỉ được chia một lần; quay lại cùng tên sẽ hiện nhóm đã được chia.
- Xác suất từng thành viên theo từng nhóm vẫn được chỉnh trong Admin và tổng phải bằng 100%.
- Vòng quay luôn chia đều theo số nhóm; phần trăm chỉ dùng để chọn kết quả.
- Lịch sử dùng chung trên Supabase.

## Cài đặt
1. Vào Supabase SQL Editor và chạy toàn bộ `supabase/schema.sql`.
2. Sửa `js/config.js`:
   - `SUPABASE_URL`: URL project Supabase, không có `/` cuối.
   - `SUPABASE_KEY`: Publishable key.
3. Upload toàn bộ thư mục lên GitHub Pages.

## Cấu hình giới hạn nhóm
Khi thêm nhóm, Admin sẽ hỏi:
- `0`: không giới hạn
- `5`: tối đa 5 thành viên
- `10`: tối đa 10 thành viên

Khi sửa nhóm, có thể đổi giới hạn tương tự.

## Lưu ý migration
Nếu database đã có bảng `groups`, schema có `ALTER TABLE ... ADD COLUMN IF NOT EXISTS max_members` để thêm cột mới mà không cần xóa dữ liệu.
