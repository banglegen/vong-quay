/*
  CẤU HÌNH SUPABASE
  1. Tạo project tại https://supabase.com
  2. Vào Project Settings -> API
  3. Điền URL và anon key bên dưới.
  4. Chạy file supabase/schema.sql trong SQL Editor.
*/
var SUPABASE_URL = "";
var SUPABASE_ANON_KEY = "";

/* Nếu chưa điền Supabase, app dùng localStorage để test giao diện. */
var USE_SUPABASE = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
var ADMIN_PASSWORD = "kajehiefhi"; // Demo local only. Production nên dùng Supabase Auth.
