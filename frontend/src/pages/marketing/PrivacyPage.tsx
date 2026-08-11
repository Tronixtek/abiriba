import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Overview",
    body: [
      "This policy explains what personal data Abiriba collects, why, and the rights you have over it under Nigerian data protection law, including the Nigeria Data Protection Act (NDPA) 2023 and the NDPR.",
      "It applies both to vendors who run a business on Abiriba and to their customers, whose details a vendor may enter while using the platform.",
    ],
  },
  {
    title: "2. Data we collect",
    body: [
      "Account data: your name, email address, and password (stored as a one-way hash — we never store or can see your actual password).",
      "Business data: your business name and the products, prices, and stock levels you enter.",
      "Customer data: when you or a customer places an order, we store the customer's name and, if given, their email or phone number — entered by you or submitted directly by the customer through your QR storefront.",
      "Transaction data: orders, line items, payments, and stock adjustments, so you and your staff can track sales and inventory.",
    ],
  },
  {
    title: "3. How we use this data",
    body: [
      "To operate the service: process orders, track stock, and let your staff sign in with the right permissions.",
      "To send receipts by email when a customer provides an email address at checkout.",
      "To maintain the audit trail of stock changes and sales visible on your account.",
      "We do not sell personal data, and we do not use it for advertising.",
    ],
  },
  {
    title: "4. Who controls this data",
    body: [
      "For your customers' details, you (the vendor) are the data controller — you decide what to collect and why — and Abiriba acts as the platform processing that data on your behalf.",
      "For your own account data, Abiriba is the controller.",
    ],
  },
  {
    title: "5. Sharing",
    body: [
      "We don't sell or rent personal data. We share it only where necessary to run the service — for example, with our email provider to send receipts — or where required by law.",
    ],
  },
  {
    title: "6. Data retention",
    body: [
      "We keep account and transaction data for as long as your account is active, and for a reasonable period after to meet accounting and legal obligations. You can request deletion as described below.",
    ],
  },
  {
    title: "7. Your rights",
    body: [
      "Under Nigerian data protection law, you have the right to access, correct, or request deletion of your personal data, and to object to certain uses of it. To exercise these rights, contact us through the details on your account dashboard.",
    ],
  },
  {
    title: "8. Security",
    body: [
      "Passwords are hashed with argon2 and never stored in plain text. Access to a business's data is restricted to that business's own staff, enforced on every request — no other vendor can see your data.",
    ],
  },
  {
    title: "9. Children",
    body: ["Abiriba is intended for business use and is not directed at children."],
  },
  {
    title: "10. Changes to this policy",
    body: [
      "We may update this policy from time to time. Continued use of Abiriba after a change means you accept the updated policy.",
    ],
  },
  {
    title: "11. Contact",
    body: ["Questions about this policy or your data? Reach us through the contact details on your account dashboard."],
  },
];

export function PrivacyPage() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between p-4">
          <Link to="/">
            <Logo size="md" />
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl p-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated August 2026</p>

        <div className="mt-10 flex flex-col gap-8">
          {SECTIONS.map((section) => (
            <div key={section.title} className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">{section.title}</h2>
              {section.body.map((paragraph, i) => (
                <p key={i} className="text-sm text-muted-foreground text-pretty">
                  {paragraph}
                </p>
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
