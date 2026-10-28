-- ==============================================================================
-- 🔐 MIGRATION DOWN: ROLLBACK ADMIN & KARYAWAN CREDENTIALS
-- ==============================================================================

DELETE FROM tb_staff WHERE username IN ('admin', 'karyawan');
DELETE FROM auth WHERE username IN ('admin', 'karyawan');
