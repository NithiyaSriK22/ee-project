const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE staff_users 
      ADD COLUMN IF NOT EXISTS qualification VARCHAR(100),
      ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS designation VARCHAR(100),
      ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
  `);
  console.log('Columns qualification, experience_years, designation, phone_number added successfully.');
  
  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'staff_users';
  `);
  console.log('Staff users columns:', cols.map(c => c.column_name));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
