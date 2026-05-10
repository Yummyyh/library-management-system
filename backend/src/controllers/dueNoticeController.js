const { PrismaClient } = require('@prisma/client');
const { success } = require('../utils/response');

const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;

exports.listDueNotices = async (req, res, next) => {
    try {
        const userId = req.student.id;
        const days = parseInt(req.query.days || '14', 10);

        const now = new Date();
        const endDate = new Date(now.getTime() + days * DAY_MS);

        const loans = await prisma.loan.findMany({
            where: {
                userId,
                returnDate: null,
                dueDate: {
                    lte: endDate,
                },
            },
            orderBy: {
                dueDate: 'asc',
            },
            select: {
                id: true,
                checkoutDate: true,
                dueDate: true,
                barcode: {
                    select: {
                        barcode: true,
                        book: {
                            select: {
                                id: true,
                                title: true,
                                author: true,
                                isbn: true,
                            },
                        },
                    },
                },
            },
        });

        let overdue = 0;
        let dueSoon = 0;

        const list = loans.map((loan) => {
            const diffDays = Math.ceil((loan.dueDate.getTime() - now.getTime()) / DAY_MS);
            const status = diffDays < 0 ? 'OVERDUE' : 'DUE_SOON';

            if (status === 'OVERDUE') {
                overdue += 1;
            } else {
                dueSoon += 1;
            }

            return {
                loanId: loan.id,
                status,
                daysRemaining: diffDays,
                checkoutDate: loan.checkoutDate,
                dueDate: loan.dueDate,
                barcode: loan.barcode?.barcode || '',
                book: loan.barcode?.book || null,
            };
        });

        res.json(success({
            list,
            summary: {
                total: list.length,
                overdue,
                dueSoon,
            },
        }, 'Due notices retrieved'));
    } catch (err) {
        next(err);
    }
};