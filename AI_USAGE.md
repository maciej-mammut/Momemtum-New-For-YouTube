# AI Usage Guide

- Use shadcn/ui components from `@/components/ui/*`.
- Do not add other UI libraries (MUI, Ant, Chakra, HeadlessUI). Use Tailwind only.
- If a component is missing, run: `npx shadcn@latest add <name>`.
- Prefer accessible props and controlled inputs.
- See example usage in `app/examples/ui-showcase/page.tsx`.
EOF

# Create an example UI showcase page
mkdir -p app/examples/ui-showcase
cat > app/examples/ui-showcase/page.tsx <<\"TSX\"
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function UIShowcasePage() {
  return (
    <main className="flex min-h-screen flex-col gap-8 p-8">
      <h1 className="text-2xl font-semibold">shadcn/ui Showcase</h1>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button disabled>Disabled</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" placeholder="you@example.com" type="email" />
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
TSX

# Commit changes
git add -A
git commit -m "feat: configure shadcn, add components, AI guide, and UI showcase"
