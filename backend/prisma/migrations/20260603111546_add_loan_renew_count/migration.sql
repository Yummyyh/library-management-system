-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Loan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barcodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkoutDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "returnDate" DATETIME,
    "fineAmount" REAL NOT NULL DEFAULT 0,
    "finePaid" BOOLEAN NOT NULL DEFAULT false,
    "fineForgiven" BOOLEAN NOT NULL DEFAULT false,
    "renewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Loan_barcodeId_fkey" FOREIGN KEY ("barcodeId") REFERENCES "Barcode" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Loan" ("barcodeId", "checkoutDate", "createdAt", "dueDate", "fineAmount", "fineForgiven", "finePaid", "id", "returnDate", "userId") SELECT "barcodeId", "checkoutDate", "createdAt", "dueDate", "fineAmount", "fineForgiven", "finePaid", "id", "returnDate", "userId" FROM "Loan";
DROP TABLE "Loan";
ALTER TABLE "new_Loan" RENAME TO "Loan";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
