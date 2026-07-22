import { POSTURE } from "@/lib/constants";

export default function PostureTag({ posture, reason }) {
  const p = POSTURE[posture] || POSTURE.align;
  return (
    <div className={`posture ${p.cls}`} title={reason}>
      {p.label}
    </div>
  );
}
