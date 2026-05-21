import { Widget } from "../widget"
import { DashboardList, DashboardListItem } from "../dashboard-list"
import { AlertTriangle, Loader2, Check } from "lucide-react"
import { ExpandableTile } from "../insights/expandable-tile"
import { RisksPanel } from "../insights/panels/risks-panel"
import { Button } from "@/components/ui/button"

interface RiskItem {
  id: string;
  title: string;
  sub: string;
  severity: string;
  type: string;
}

interface RiskAlertsWidgetProps {
  risks: RiskItem[];
  insightData: any;
  actioningId: string | null;
  onResolveTask: (id: string, e?: React.MouseEvent) => void;
}

/**
 * Risk Alerts widget extracted from PresidentDashboard.
 *
 * Shows the top risk items with severity badges and an optional
 * "Mark Done" action for task-based risks.
 */
export function RiskAlertsWidget({
  risks,
  insightData,
  actioningId,
  onResolveTask,
}: RiskAlertsWidgetProps) {
  return (
    <ExpandableTile
      title="Risk Alerts — Analysis & Recommendations"
      subtitle="All active risks with severity, context & recommended actions"
      insightPanel={<RisksPanel data={insightData} />}
    >
      <Widget title="Risk Alerts" className="h-full">
        <DashboardList>
          {risks.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No active risks</p>}
          {risks.map((r, i) => {
            const isActioning = actioningId === `task-${r.id}`;
            return (
              <DashboardListItem
                key={i}
                title={r.title}
                subtitle={r.sub}
                metadata={r.severity}
                icon={<AlertTriangle className={`h-4 w-4 ${r.severity === "High" ? "text-destructive" : "text-amber-500"}`} />}
                action={
                  r.type === "task" ? (
                    <Button
                      size="icon-xs"
                      variant="outline"
                      title="Mark Done"
                      className="h-6 w-6 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                      disabled={isActioning}
                      onClick={(e) => onResolveTask(r.id, e)}
                    >
                      {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </Button>
                  ) : undefined
                }
              />
            );
          })}
        </DashboardList>
      </Widget>
    </ExpandableTile>
  );
}
