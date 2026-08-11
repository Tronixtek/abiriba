import { Link } from "react-router-dom";
import {
  Package,
  CreditCard,
  QrCode,
  Users,
  BarChart3,
  History,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/brand/Logo";

const FEATURES = [
  {
    icon: Package,
    title: "Inventory & low-stock alerts",
    description: "Track every product's stock level and get warned before you run out.",
  },
  {
    icon: CreditCard,
    title: "Fast in-person checkout",
    description: "Build a cart, take payment, and print or email a receipt in seconds.",
  },
  {
    icon: QrCode,
    title: "Customer self-ordering",
    description: "Share a QR code so customers can browse and order from their own phone.",
  },
  {
    icon: Users,
    title: "Staff roles & permissions",
    description: "Owners, managers, and staff each see exactly what they need to.",
  },
  {
    icon: BarChart3,
    title: "Sales reports",
    description: "Daily, weekly, and monthly revenue and top-seller breakdowns.",
  },
  {
    icon: History,
    title: "Full audit trail",
    description: "Every stock change and sale is logged — nothing goes unaccounted for.",
  },
];

const STEPS = [
  { title: "Add your products", description: "Set your prices and stock levels — takes minutes." },
  { title: "Sell your way", description: "Ring up sales at the counter or share your QR code for self-ordering." },
  { title: "Track it all", description: "Stock, sales, and staff activity update in real time." },
];

const TRUST_ITEMS = ["No monthly fees", "You keep 100% of your price", "Simple, transparent pricing"];

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function LandingPage() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <Logo size="md" />
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl gap-10 p-4 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div className="flex flex-col gap-6">
            <h1 className="text-4xl font-bold tracking-tight text-balance md:text-5xl">
              Sell, stock, and grow your shop.
            </h1>
            <p className="text-lg text-muted-foreground text-pretty">
              Abiriba is the point of sale, inventory, and QR ordering platform built for Nigerian
              shops. Set your price — you keep every naira of it.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-11 px-5 text-base">
                <Link to="/signup">
                  Create your free account
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 px-5 text-base">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
            <ul className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
              {TRUST_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <Card className="w-full max-w-sm justify-self-center shadow-lg">
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm font-medium text-muted-foreground">Today's sale</p>
              <div className="flex flex-col gap-2 text-sm">
                {[
                  { name: "Bag of rice (50kg)", qty: 1, price: 45000 },
                  { name: "Vegetable oil (5L)", qty: 2, price: 12500 },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <span>
                      {item.name} × {item.qty}
                    </span>
                    <span className="font-medium">₦{money(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
                <span>Total</span>
                <span>₦{money(45000 + 12500 * 2)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Paid via Cash · Receipt sent</p>
            </CardContent>
          </Card>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-6xl p-4 py-16 md:py-24">
            <div className="mb-10 flex flex-col gap-2 text-center">
              <h2 className="text-3xl font-bold tracking-tight">Everything your shop needs</h2>
              <p className="text-muted-foreground">One dashboard for the counter, the stockroom, and the books.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <Card key={feature.title}>
                  <CardContent className="flex flex-col gap-3">
                    <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <feature.icon className="size-5" />
                    </span>
                    <p className="font-semibold">{feature.title}</p>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl p-4 py-16 md:py-24">
          <div className="mb-10 flex flex-col gap-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Up and running in three steps</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex flex-col gap-2">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <p className="font-semibold">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Fee transparency */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-6xl p-4 py-16 md:py-24">
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              <div className="flex flex-col gap-3">
                <h2 className="text-3xl font-bold tracking-tight">Pricing that's actually honest</h2>
                <p className="text-muted-foreground text-pretty">
                  You set your price, and that's exactly what lands in your pocket. A small platform
                  fee is automatically included in the single price your customer sees — no surprise
                  deductions, no monthly bill.
                </p>
                <Link to="/terms" className="text-sm font-medium text-primary underline underline-offset-4">
                  Read our full pricing terms
                </Link>
              </div>
              <Card>
                <CardContent className="flex flex-col gap-3 text-sm">
                  {[
                    "You always set the price",
                    "Customers see one all-inclusive price",
                    "You're paid your exact set price, every time",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl p-4 py-16 text-center md:py-24">
          <h2 className="text-3xl font-bold tracking-tight">Ready to run your shop smarter?</h2>
          <p className="mt-2 text-muted-foreground">Free to start. No card required.</p>
          <Button asChild size="lg" className="mt-6 h-11 px-6 text-base">
            <Link to="/signup">
              Create your free account
              <ArrowRight />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <Logo size="sm" />
            <p className="max-w-sm text-xs text-muted-foreground">
              Named after Abiriba, a town in southeastern Nigeria known for generations of trading.
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/login" className="text-muted-foreground hover:text-foreground">
              Login
            </Link>
            <Link to="/signup" className="text-muted-foreground hover:text-foreground">
              Sign up
            </Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground">
              Terms
            </Link>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Abiriba</p>
        </div>
      </footer>
    </div>
  );
}
