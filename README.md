# gemach-loans

A loan management system for a community interest-free loan fund (*gemach*).

A *gemach* (Hebrew: גמ"ח, short for *gemilut chasadim* — "acts of kindness") is a
community fund that lends money without interest. This project digitizes the work
of running a small one: tracking who borrowed what, what they still owe, who's
behind on payments, and how much money is currently available to lend.

It replaces the notebook-and-spreadsheet workflow that a volunteer fund manager
would otherwise maintain by hand.

---

## Why this exists

The fund manager is a volunteer with a day job. Running the *gemach* on paper meant:

- No way to know who hadn't paid without checking manually
- No clear picture of how much money was free to lend at any moment
- Chasing late payments — the most unpleasant part — with no reminders
- Everything depending on one person and one notebook

This system records and reminds. It never touches money and never connects to a
bank — it's a source of truth, not a payment processor.

---

## Features

- **Borrowers** — a directory of people the fund lends to
- **Loans** — interest-free loans, each with an explicit installment schedule
- **Payment tracking** — records real payments and allocates them across
  scheduled installments **oldest-first (FIFO)**, so partial, early, and
  multi-month payments all resolve correctly
- **Late detection** — a loan is late once an installment's due date has passed
  and it isn't fully paid
- **Available funds** — computes cash on hand as
  `opening balance + payments received − principal lent out`
- **Hebrew UI, full RTL** — built for a non-technical user

---

## Tech stack

| Layer     | Technology                          |
| --------- | ----------------------------------- |
| Frontend  | React, TypeScript                   |
| Backend   | Node, Express, TypeScript           |
| Database  | SQLite via Prisma ORM               |

The entire system runs locally on the fund manager's own machine. Data privacy
is a requirement, not an afterthought — nothing leaves the local server.

---

## Data model

Six tables capture the domain:

- **Borrower** — a person the fund lends to
- **Loan** — a single loan issued to a borrower
- **Installment** — one scheduled payment in a loan's repayment plan
  (the schedule is stored explicitly, not computed on the fly)
- **Payment** — an actual payment received from a borrower
- **Allocation** — a bridge linking a payment to the installment(s) it covers,
  which is what makes FIFO allocation possible
- **Setting** — system-level values such as the opening balance

See [`server/prisma/schema.prisma`](server/prisma/schema.prisma) for the full schema.

---

## Getting started

### Prerequisites

- Node.js ⟨version — check `.nvmrc` or your installed version, e.g. 22+⟩
- npm

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/Ruth7808/gemach-loans.git
cd gemach-loans

# 2. Set up the backend
cd server
npm install
⟨create a .env file — see "Environment" below⟩
npx prisma migrate dev        # creates the SQLite database and tables
⟨npm run dev — confirm the actual script name in server/package.json⟩

# 3. Set up the frontend (in a second terminal)
cd client
npm install
⟨npm run dev — confirm the actual script name in client/package.json⟩
```

The frontend runs on ⟨e.g. http://localhost:5173⟩ and the backend on
⟨e.g. http://localhost:3001⟩.

### Environment

The backend needs a `.env` file in `server/` with:

```
DATABASE_URL="file:./dev.db"
⟨any other variables — PORT, etc.⟩
```

### First run

⟨Does the opening balance need to be set before the dashboard is accurate?
If so, note here how to set it — e.g. via Prisma Studio or a seed step.⟩

---

## Project structure

```
gemach-loans/
├── server/          # Node + Express + TypeScript API
│   └── prisma/      # Prisma schema and SQLite database
├── client/          # React + TypeScript frontend
└── CLAUDE.md        # Project context and conventions
```

---

## Scope

This is the first working version, built intentionally small to be finished and
actually used before expanding. The following are planned for later stages and
are **deliberately out of the current scope**:

- Depositors and guarantors
- Post-dated checks
- Automated reminders (WhatsApp / email)
- Google Sheets and other integrations
- Reports and analytics
- Multi-user access

---

## License

⟨Choose one — e.g. MIT — or state "Private project" if you'd rather not license it.⟩
