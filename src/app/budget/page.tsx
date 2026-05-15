import { AppShell } from "@/components/app/app-shell";
import { BudgetPage } from "@/components/budget/budget-page";
import { getAppDataOrRedirect } from "@/lib/page-data";

export default async function BudgetRoute() {
  const data = await getAppDataOrRedirect();

  return (
    <AppShell data={data} active="budget" crumb="Budget & Guardrails">
      <BudgetPage data={data} />
    </AppShell>
  );
}
