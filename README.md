# Group Picker - Supabase

## 1. Cấu hình Supabase

Mở `js/config.js` và điền:

```js
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_KEY = "YOUR-PUBLISHABLE-KEY";
```

Dùng **Publishable key**, không dùng Secret key/service_role.

## 2. Tạo database

Vào **Supabase → SQL Editor**, chạy toàn bộ file:

`supabase/schema.sql`

File này tạo:
- classes
- groups
- members
- member_weights
- history
- admin_settings
- admin_sessions
- RPC đăng nhập admin
- RPC CRUD admin

## 3. Mật khẩu admin

Mật khẩu mặc định:

`BuiAdmin@2026`

Không cần GitHub Auth, không cần tạo User trong Authentication.

Nếu muốn đổi mật khẩu, sửa dòng cuối trong `schema.sql` rồi chạy lại đoạn `insert into public.admin_settings...`, hoặc dùng SQL:

```sql
update public.admin_settings
set password_hash = crypt('MAT_KHAU_MOI', gen_salt('bf')),
    updated_at = now()
where id = 1;
```

Mật khẩu được lưu dưới dạng hash.

## 4. Chạy web

Upload toàn bộ thư mục lên GitHub Pages.

Trang thành viên:
- nhập tên
- bấm quay
- kết quả dùng xác suất đã cấu hình trong admin
- vòng quay vẫn chia đều theo số nhóm
- lịch sử được lưu chung trên Supabase

Trang admin:
- thêm/sửa/xóa lớp
- thêm/sửa/xóa thành viên
- thêm/sửa/xóa nhóm
- chỉnh xác suất từng thành viên
- xem/xóa lịch sử

Admin login dùng một mật khẩu duy nhất và phiên đăng nhập có thời hạn.

> Lưu ý: các trọng số hiện được trang thành viên đọc từ Supabase để thực hiện weighted random phía trình duyệt. Nếu cần giấu tuyệt đối các trọng số khỏi người dùng, nên chuyển việc chọn nhóm sang RPC/Edge Function phía server.
