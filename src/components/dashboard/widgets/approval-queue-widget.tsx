import { Widget } from "../widget"
import { DashboardList, DashboardListItem } from "../dashboard-list"
import { DollarSign, Loader2, Check } from "lucide-react"
import { ExpandableTile } from "../insights/expandable-tile"
import { ApprovalsPanel } from "../insights/panels/approvals-panel"
import { Button } from "@/components/ui/button"

interface ApprovalItem {
  id: string;
  title: string;
  sub: string;
  type: string;
  rawType: "finance" | "reimbursement";
}

interface ApprovalQueueWidgetProps {
  pendingApprovals: ApprovalItem[];
  insightData: any;
  actioningId: string | null;
  onApprove: (id: string, type: "finance" | "reimbursement", e?: React.MouseEvent) => void;
}

/**
 * Approval Queue widget extracted from PresidentDashboard.
 *
 * Displays pending finance / reimbursement approvals in a two-column
 * grid, with inline approve buttons and an expandable insight panel.
 */
export function ApprovalQueueWidget({
  pendingApprovals,
  insightData,
  actioningId,
  onApprove,
}: ApprovalQueueWidgetProps) {
  return (
    <ExpandableTile
      className="md:col-span-2 lg:col-span-3"
      title="Approval Queue — All Pending Items"
      subtitle="Events, finance, marketing & budget changes awaiting your review"
      insightPanel={<ApprovalsPanel data={insightData} />}
    >
      <Widget
        title="Approval Queue"
        fullWidth
        footer={
          <span className="cursor-pointer hover:text-primary transition-colors italic">
            Click to expand — {pendingApprovals.length} items pending review →
          </span>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <DashboardList>
            {pendingApprovals.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No pending approvals</p>}
            {pendingApprovals.slice(0, 2).map((a, i) => {
              const isActioning = actioningId === `approve-${a.id}`;
              return (
                <DashboardListItem
                  key={i}
                  title={a.title}
                  subtitle={a.sub}
                  metadata={a.type}
                  icon={<DollarSign className="h-4 w-4 text-primary" />}
                  action={
                    <Button
                      size="icon-xs"
                      variant="outline"
                      title={`Approve ${a.type}`}
                      className="h-6 w-6 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                      disabled={isActioning}
                      onClick={(e) => onApprove(a.id, a.rawType, e)}
                    >
                      {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </Button>
                  }
                />
              );
            })}
          </DashboardList>
          {pendingApprovals.length > 2 && (
            <DashboardList>
              {pendingApprovals.slice(2, 4).map((a, i) => {
                const isActioning = actioningId === `approve-${a.id}`;
                return (
                  <DashboardListItem
                    key={i}
                    title={a.title}
                    subtitle={a.sub}
                    metadata={a.type}
                    icon={<DollarSign className="h-4 w-4 text-amber-500" />}
                    action={
                      <Button
                        size="icon-xs"
                        variant="outline"
                        title={`Approve ${a.type}`}
                        className="h-6 w-6 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                        disabled={isActioning}
                        onClick={(e) => onApprove(a.id, a.rawType, e)}
                      >
                        {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </Button>
                    }
                  />
                );
              })}
            </DashboardList>
          )}
        </div>
      </Widget>
    </ExpandableTile>
  );
}
