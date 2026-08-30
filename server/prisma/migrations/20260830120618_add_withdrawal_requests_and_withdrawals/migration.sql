-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "depositorId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "requestDate" DATETIME NOT NULL,
    "targetDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "paidSoFar" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WithdrawalRequest_depositorId_fkey" FOREIGN KEY ("depositorId") REFERENCES "Depositor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "withdrawalRequestId" INTEGER,
    "depositorId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Withdrawal_withdrawalRequestId_fkey" FOREIGN KEY ("withdrawalRequestId") REFERENCES "WithdrawalRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Withdrawal_depositorId_fkey" FOREIGN KEY ("depositorId") REFERENCES "Depositor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
