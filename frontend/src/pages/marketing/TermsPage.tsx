import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Acceptance of these terms",
    body: [
      "By creating an account or using Abiriba, you agree to these terms. If you don't agree, please don't use the service.",
    ],
  },
  {
    title: "2. The service",
    body: [
      "Abiriba is a point-of-sale, inventory, and QR self-ordering platform for shops. It's provided \"as is\" to help you record sales, track stock, and let customers browse and place orders for you to fulfil in person.",
    ],
  },
  {
    title: "3. Accounts",
    body: [
      "The person who creates a business account is the Owner and is responsible for that business's account, including any Manager or Staff accounts they add under it.",
      "You're responsible for keeping your login credentials secure and for all activity under your account.",
    ],
  },
  {
    title: "4. Fees",
    body: [
      "Abiriba has no subscription or monthly fee.",
      "A platform fee of 0.5% of an item's price is applied per item sold, capped at ₦200 per item.",
      "This fee is included in the single price shown to your customer — it is never shown to them as a separate charge. The combined price is rounded up to the nearest whole Naira.",
      "You are always paid the exact price you set for an item. The platform fee is not deducted from your price — it is added on top of it, inside the one price your customer sees.",
      "We may change the fee rate or cap in the future. If we do, we'll give notice before the change takes effect.",
    ],
  },
  {
    title: "5. Your responsibilities as a vendor",
    body: [
      "You're responsible for the accuracy of your product listings, prices, and stock levels, and for fulfilling orders placed through Abiriba.",
      "You agree to comply with applicable Nigerian law in how you operate your business, including consumer protection and tax obligations.",
    ],
  },
  {
    title: "6. Customer orders",
    body: [
      "Orders placed through your QR storefront are submitted to you for in-person confirmation and payment — Abiriba is not a party to the sale between you and your customer.",
    ],
  },
  {
    title: "7. Prohibited use",
    body: [
      "You may not use Abiriba to list or sell illegal goods, to defraud customers, or to interfere with the platform's operation or other users' accounts.",
    ],
  },
  {
    title: "8. Termination",
    body: [
      "You may stop using Abiriba at any time. We may suspend or terminate an account that violates these terms.",
    ],
  },
  {
    title: "9. Disclaimers & limitation of liability",
    body: [
      "Abiriba is provided without warranties of any kind. To the extent permitted by law, Abiriba is not liable for indirect or consequential losses arising from your use of the service.",
    ],
  },
  {
    title: "10. Changes to these terms",
    body: [
      "We may update these terms from time to time. Continued use of Abiriba after a change means you accept the updated terms.",
    ],
  },
  {
    title: "11. Contact",
    body: ["Questions about these terms? Reach us through the contact details on your account dashboard."],
  },
];

export function TermsPage() {
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
        <h1 className="text-3xl font-bold tracking-tight">Terms & Conditions</h1>
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
