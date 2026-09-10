# Group Picker - Supabase complete

1. Supabase SQL Editor: chạy `supabase/schema.sql`.
2. Authentication -> Users -> Add user -> tạo tài khoản admin.
3. Copy User UID, chạy `insert into public.admins(user_id) values ('USER-UID');`
4. Project Settings -> API Keys: lấy Project URL + Publishable key.
5. Điền vào `js/config.js`.
6. Upload toàn bộ thư mục lên GitHub Pages.

Không đưa Secret key/service_role vào frontend.

Dữ liệu lớp, nhóm, thành viên, xác suất và lịch sử đều lưu chung trên Supabase. Vòng quay chia đều; xác suất chỉ chọn kết quả. Animation nhận chính index kết quả nên dừng đúng nhóm.
