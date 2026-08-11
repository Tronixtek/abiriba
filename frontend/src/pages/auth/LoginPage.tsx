import { useState, type FormEvent } from "react";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";
import { Logo } from "@/components/brand/Logo";

export function LoginPage() {
  const { status, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === "signedIn") return <Navigate to="/app" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <Link to="/">
        <Logo size="md" />
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Access your store's dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting} className="mt-2">
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              New business?{" "}
              <Link to="/signup" className="underline underline-offset-4">
                Create an account
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
