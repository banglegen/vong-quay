# Group Picker — Green + Supabase

## Điểm đã sửa
- Animation luôn khớp chính xác với nhóm được chọn.
- Vòng quay luôn chia đều theo số nhóm, KHÔNG bị thay đổi bởi %.
- % chỉ dùng để weighted random chọn kết quả.
- Giao diện tone xanh lá.
- Có schema database Supabase trong `supabase/schema.sql`.
- Nếu chưa cấu hình Supabase, website vẫn chạy demo bằng localStorage.

## Chạy database
1. Tạo project Supabase.
2. Mở SQL Editor.
3. Chạy toàn bộ `supabase/schema.sql`.
4. Vào Project Settings -> API.
5. Mở `js/config.js`, điền:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

## Lưu ý bảo mật
Mật khẩu `ADMIN_PASSWORD` trong frontend chỉ phù hợp demo/local.
Website public thật nên dùng Supabase Auth cho admin và RLS chặt chẽ.
# vong-quay
