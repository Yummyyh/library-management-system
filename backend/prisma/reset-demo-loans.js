/**
 * 仅重置演示借阅数据（不修改用户/书目）。
 * 用法：node prisma/reset-demo-loans.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;

function daysFromNow(days) {
  return new Date(Date.now() + days * DAY_MS);
}

async function seedActiveLoan({ barcodeStr, userId, checkoutDate, dueDate }) {
  const bc = await prisma.barcode.findUnique({ where: { barcode: barcodeStr } });
  if (!bc || !userId) return false;

  await prisma.loan.deleteMany({ where: { barcodeId: bc.id } });
  await prisma.barcode.update({ where: { id: bc.id }, data: { status: 'BORROWED' } });
  await prisma.loan.create({
    data: {
      barcodeId: bc.id,
      userId,
      checkoutDate,
      dueDate,
      returnDate: null,
      fineAmount: 0,
      finePaid: false,
      fineForgiven: false,
    },
  });
  return true;
}

async function seedReturnedLoan({ barcodeStr, userId, checkoutDate, dueDate, returnDate }) {
  const bc = await prisma.barcode.findUnique({ where: { barcode: barcodeStr } });
  if (!bc || !userId) return false;

  await prisma.loan.deleteMany({ where: { barcodeId: bc.id } });
  await prisma.barcode.update({ where: { id: bc.id }, data: { status: 'AVAILABLE' } });
  await prisma.loan.create({
    data: {
      barcodeId: bc.id,
      userId,
      checkoutDate,
      dueDate,
      returnDate,
      fineAmount: 0,
      finePaid: true,
      fineForgiven: false,
    },
  });
  return true;
}

async function main() {
  const student1 = await prisma.user.findUnique({ where: { studentId: 'STU2023001' } });

  if (!student1) {
    throw new Error('Student STU2023001 not found. Run full seed first.');
  }

  // 清空全部在借/历史，并恢复条形码为可借（随后只为演示册单独设为 BORROWED）
  await prisma.loan.deleteMany({});
  await prisma.barcode.updateMany({ data: { status: 'AVAILABLE' } });

  await seedActiveLoan({
    barcodeStr: '9780132350884-001',
    userId: student1.id,
    checkoutDate: daysFromNow(-10),
    dueDate: daysFromNow(20),
  });
  await seedActiveLoan({
    barcodeStr: '9780061120084-001',
    userId: student1.id,
    checkoutDate: daysFromNow(-26),
    dueDate: daysFromNow(4),
  });
  await seedReturnedLoan({
    barcodeStr: '9780201616224-001',
    userId: student1.id,
    checkoutDate: daysFromNow(-40),
    dueDate: daysFromNow(-12),
    returnDate: daysFromNow(-11),
  });
  // 逾期样例（原 STU2023002），改挂在 STU2023001，供读者/馆员逾期演示
  await seedActiveLoan({
    barcodeStr: '9780307887894-001',
    userId: student1.id,
    checkoutDate: daysFromNow(-25),
    dueDate: daysFromNow(-5),
  });

  console.log('✅ Demo loans reset.');
  console.log('   STU2023001: 2 active (on-time + due soon), 1 overdue, 1 returned');
}

main()
  .catch((e) => {
    console.error('❌ Reset failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
