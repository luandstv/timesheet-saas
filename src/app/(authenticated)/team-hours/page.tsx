import { DateTime } from "luxon";

import { getWorkspaceContext } from "@/lib/workspace-context";
import { TIMEZONE } from "@/lib/constants";
import { HoursBudgetService } from "@/services/hours-budget.service";
import { TeamHoursClient } from "./team-hours-client";

export default async function TeamHoursPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const { user, workspace, member } = await getWorkspaceContext();
  const query = (await searchParams) ?? {};
  const now = DateTime.now().setZone(TIMEZONE);
  const parsed = query.month
    ? DateTime.fromFormat(`${query.month}-01`, "yyyy-MM-dd", { zone: TIMEZONE })
    : now.startOf("month");
  const month =
    parsed.isValid && /^\d{4}-\d{2}$/.test(query.month ?? "")
      ? parsed.toFormat("yyyy-MM")
      : now.toFormat("yyyy-MM");
  const overview = await HoursBudgetService.getOverview(user.id, workspace.id, month);
  const canManage =
    member.active &&
    workspace.kind === "COMPANY" &&
    (member.role === "OWNER" || member.role === "MANAGER");

  return (
    <div className="mx-auto w-full max-w-360">
      <TeamHoursClient
        key={month}
        overview={overview}
        workspaceId={workspace.id}
        month={month}
        canManage={canManage}
        canConfigureFeatures={member.role === "OWNER" || member.role === "MANAGER"}
      />
    </div>
  );
}
