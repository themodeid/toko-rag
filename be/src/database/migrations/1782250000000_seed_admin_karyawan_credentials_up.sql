-- ==============================================================================
-- 🔐 MIGRATION: SEED SECURE ADMIN & KARYAWAN CREDENTIALS
-- ==============================================================================
-- Default Credentials:
-- 1. admin    / admin123    (Role: admin, akses Hub Owner /admin & KDS)
-- 2. karyawan / karyawan123 (Role: karyawan, akses Station Kasir /kasir & KDS Barista)
--
-- Bcrypt Hashes (Cost Factor 10):
-- admin123:    $2b$10$LiJotwE0Z9DE79tXJon3Ye3uZ6ZvJtSAxBi3uH9KU6OxGuaAZX5GO
-- karyawan123: $2b$10$WtE4QNQvOydx7VgFQfUPPu6ufK8E7PgMVZ6UwnTLmdOEh3avQNMsS

-- 1. Upsert ke tabel auth
INSERT INTO auth (username, password, role)
VALUES 
    ('admin', '$2b$10$LiJotwE0Z9DE79tXJon3Ye3uZ6ZvJtSAxBi3uH9KU6OxGuaAZX5GO', 'admin'),
    ('karyawan', '$2b$10$WtE4QNQvOydx7VgFQfUPPu6ufK8E7PgMVZ6UwnTLmdOEh3avQNMsS', 'karyawan')
ON CONFLICT (username) DO UPDATE 
SET password = EXCLUDED.password, role = EXCLUDED.role;

-- 2. Upsert ke tabel tb_staff
INSERT INTO tb_staff (username, password_hash, nama, role)
VALUES 
    ('admin', '$2b$10$LiJotwE0Z9DE79tXJon3Ye3uZ6ZvJtSAxBi3uH9KU6OxGuaAZX5GO', 'Administrator', 'admin'),
    ('karyawan', '$2b$10$WtE4QNQvOydx7VgFQfUPPu6ufK8E7PgMVZ6UwnTLmdOEh3avQNMsS', 'Karyawan Barista', 'karyawan')
ON CONFLICT (username) DO UPDATE 
SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role;
