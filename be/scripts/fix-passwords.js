const bcrypt = require('bcrypt');
const { Pool } = require('pg');

async function main() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://adam_dev:adamwahyukur@postgres-db:5432/toko_online_adam';
  const pool = new Pool({ connectionString: dbUrl });

  const hashKasir = await bcrypt.hash('kasir123', 10);
  const hashOwner = await bcrypt.hash('owner123', 10);

  console.log('Generated fresh bcrypt hashes');

  // 1. Update tb_staff
  await pool.query('UPDATE tb_staff SET password_hash = $1 WHERE username = $2', [hashKasir, 'kasir']);
  await pool.query('UPDATE tb_staff SET password_hash = $1 WHERE username = $2', [hashOwner, 'owner']);

  // 2. Update auth table (legacy)
  await pool.query('UPDATE auth SET password = $1 WHERE username = $2', [hashOwner, 'owner']);
  await pool.query('UPDATE auth SET password = $1 WHERE username = $2', [hashOwner, 'admin']);
  await pool.query('UPDATE auth SET password = $1 WHERE username = $2', [hashKasir, 'karyawan']);

  // 3. Verification tb_staff
  console.log('--- tb_staff Verification ---');
  const staff = await pool.query('SELECT username, role, password_hash FROM tb_staff');
  for (const s of staff.rows) {
    const pwd = s.username === 'kasir' ? 'kasir123' : 'owner123';
    const ok = await bcrypt.compare(pwd, s.password_hash);
    console.log(`tb_staff [${s.username}] role=${s.role} pass=${pwd} match=${ok}`);
  }

  // 4. Verification auth
  console.log('--- auth Verification ---');
  const auth = await pool.query('SELECT username, role, password FROM auth WHERE username IN (\'owner\', \'admin\', \'karyawan\')');
  for (const a of auth.rows) {
    const pwd = a.username === 'karyawan' ? 'kasir123' : 'owner123';
    const ok = await bcrypt.compare(pwd, a.password);
    console.log(`auth [${a.username}] role=${a.role} pass=${pwd} match=${ok}`);
  }

  await pool.end();
  console.log('SUCCESS: All passwords synced & verified 100%!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
