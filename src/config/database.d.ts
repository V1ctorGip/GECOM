declare module "config/database.js" {
  import { Pool } from 'pg';
  const pool: Pool;
  export default pool;
}
