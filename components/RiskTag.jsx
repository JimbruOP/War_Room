import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { RISK } from "@/lib/constants";

const RISK_ICONS = { low: ShieldCheck, medium: ShieldAlert, high: AlertTriangle };

export default function RiskTag({ risk, reason, mini }) {
  const r = RISK[risk] || RISK.medium;
  const Icon = RISK_ICONS[risk] || ShieldAlert;

  if (mini) {
    return (
      <span className="risk-mini" style={{ color: r.color, background: r.bg }}>
        <Icon size={11} /> {risk}
      </span>
    );
  }
  return (
    <div className="risk" style={{ color: r.color, background: r.bg }} title={reason}>
      <Icon size={13} /> {r.label}
    </div>
  );
}
