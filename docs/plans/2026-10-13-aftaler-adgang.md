# Aftaler (schools, banks, estate agents) – seats, kundeadmin and access by mail

**Goal:** One way to give organisations access for many people. The owner sells an agreement (aftale) in `/admin`; the
agreement buys *packs* of seats (X seats × Y months). Each organisation has one or more **kundeadmins** who log in to a
small admin (`/aftale`) and give access to their users by typing an e-mail – nothing else. budgetpro mails the user a
personal code and link. Schools give seats to teachers (who may then make classes); banks and estate agents give their
customers a free period (e.g. 3 months), after which the customer can buy access themselves.

**Decisions (from the owner, 2026-10-13):**
- Schools pay per teacher.
- Duration is set per pack: "X seats with Y months".
- A bank/estate-agent seat gives the customer Y months free; afterwards the customer may buy their own plan. Banks can
  buy long packs (e.g. 12–24 months), estate agents short ones (e.g. 3 months).
- Every teacher can sign up and try Skole in a demo, but only a teacher with a seat can make classes.
- **Nobody sees a code** – not the kundeadmin, not the owner. A kundeadmin can only type an e-mail: send once, or send
  the same code again to the same e-mail. The code exists only in the mail to the user.
- Schools, banks and estate agents all have kundeadmins who hand out the access.

## Model

The agreement lives on the existing `Org` in the owner ledger (`lib/owner.ts`), so `/admin` stays the owner's one place:

```ts
interface Org {
  ...as today (id, name, category, plan?, seats?, note?)
  admins?: string[];          // kundeadmin e-mails (max 5); the owner adds the first, kundeadmins add colleagues
  packs?: Pack[];
}
interface Pack {
  id: string;                 // "p-…"
  count: number;              // seats in the pack
  months: number;             // access per seat, counted from the day the user takes it
  bought: string;             // YYYY-MM-DD
  sendBy: string;             // YYYY-MM-DD, last day a seat can be sent/used (default bought + 12 months)
  price?: number;             // kroner, once – feeds the revenue overview
}
```

Access grants (one per e-mail) are in the store, not the ledger:

```
aftaler/<orgId>/adgange/<grantId>.json  { id, org, pack, email, sentAt, sends, lastSentAt, usedBy?, usedAt?, until?, revoked? }
aftaler/koder/<sha256(code)>.json       { org, grant }      lookup when a user types the code or opens the link
aftaler/admins/<hash(email)>.json       { email, org, ...login token like the teachers }
```

- **No code is stored in readable form.** The code is derived: `code = HMAC(AUTH_SECRET, grantId)`, cut to 8 characters
  from an unambiguous alphabet (no 0/O/1/I), shown in the mail as `ABCD-EFGH`. "Send igen" computes the same code again.
  Only its hash is kept for the lookup. No API returns a code.
- **Send:** the kundeadmin types an e-mail. If the org has a free seat (oldest pack with room first) and the e-mail has
  no open grant here, a grant is made and the mail goes out. Same e-mail again → "Send igen" (same code, max 3 a day).
- **Use:** the link in the mail (`/aftale/brug?kode=…`) or the code typed by hand. One use. It sets `usedBy`
  (account id or teacher id), `usedAt` and `until = usedAt + months`.
- **Withdraw:** a kundeadmin can withdraw a grant that is not used yet (e.g. a typo in the e-mail) – the seat comes back.
  A school can also remove a teacher – the seat comes back. A used bank/estate-agent seat does not come back.

## Who sees what

| | `/admin` (owner) | `/aftale` (kundeadmin) |
|---|---|---|
| Make/edit agreement, first kundeadmin | yes | no |
| Add/remove kundeadmin colleagues | yes | yes (max 5) |
| Add a pack | yes | no (later: buy more) |
| Seats: used / sent / free per pack | yes | yes |
| Send access to an e-mail, send again, withdraw unused | no | yes |
| List of e-mails with status (sendt / i brug / udløbet) and end date | count only | yes |
| The codes | never | never |
| Customers' budgets or names | never | never |

## Teacher sign-up when the school already has an agreement

- **Invited first (the normal way):** the kundeadmin sends access to the teacher's e-mail. The teacher opens the link,
  signs up (the e-mail is filled in) and has a seat right away. If the teacher already has a login with that e-mail,
  the seat is added when they open the link.
- **Signed up first:** the teacher lands in the demo. If a grant for that e-mail is waiting, it is used at once (no code
  needed). Otherwise the teacher can type a code, or pick their school from the list of schools with an agreement and
  press "Bed om adgang" – the kundeadmins get a mail and send access with one press in `/aftale`.
- **No agreement:** "Fortæl din skole om budgetpro" – a mail to the address the teacher types, with a short text and a
  link to `/skole`.

Teachers who made classes before this change keep a seat on a free "Tidlige lærere" agreement the owner can end.

## Demo for teachers

The teacher home shows a fictional class ("Demoklasse 9.B", built in `lib/skole.ts` from the existing cases) with
progress, choices and answers, opened the same way as a real class but read-only. The create form is replaced by a short
text and the ways to a seat. `POST /api/skole/klasse` answers 403 without an active seat.

## Bank and estate-agent customers

- The mail link opens `/opret` with the e-mail and code filled in; existing users get the seat after logging in.
  Users can also type the code in the app under Indstillinger.
- Using a seat links the account to the org in the ledger and records `until`. The owner overview shows the account as
  "Betalt af aftale" until that day.
- **Note:** there is no paywall yet – everybody can use budgetpro for free today. Until payment exists, the seats
  only decide who counts as an agreement customer and when the free period ends. A mail a week before the end
  ("Din adgang via <org> slutter den …") is part of this plan; actually closing access waits for the payment step.

## Steps

1. **Agreements in `/admin`.** Extend `Org` + `applyChange` (admins, packs), `lib/agreements.ts` (seats free/used,
   make grant, derive code, use code, withdraw) with tests, the Firmaaftaler dialog with kundeadmins and packs. Pack
   prices go into the revenue overview.
2. **Kundeadmin login and `/aftale`.** Mail login (same scheme as teachers, own cookie `budgetr_aftale`), invite mail
   when a kundeadmin is added, the page: seats per pack, "Giv adgang" (e-mail field), list with send again / withdraw,
   colleagues.
3. **Skole.** Seat for teachers (grant link, waiting grant on sign-up, code, request + send), demo class, 403 on class
   creation without a seat, "Tidlige lærere", remove a teacher.
4. **Bank/estate-agent customers.** Link/code on `/opret` and in the app, ledger link + `until`, status in the overview,
   the reminder mail before the end, the demo customer.

Each step ends with `pnpm test`, `pnpm typecheck`, `pnpm build`, and for UI `pnpm dev` + `pnpm smoke`. CLAUDE.md gets a
short "Aftaler" paragraph in step 1, updated as the steps land.
