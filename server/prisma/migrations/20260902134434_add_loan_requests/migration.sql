-- CreateTable
CREATE TABLE "LoanRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "externalId" TEXT,
    "borrowerId" INTEGER,
    "nameAsEntered" TEXT NOT NULL,
    "phoneAsEntered" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "numInstallments" INTEGER,
    "notes" TEXT,
    "rawFormData" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "loanId" INTEGER,
    "requestDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoanRequest_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "Borrower" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LoanRequest_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "LoanRequest_loanId_key" ON "LoanRequest"("loanId");
