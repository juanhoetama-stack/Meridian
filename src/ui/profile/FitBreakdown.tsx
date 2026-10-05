// Per-skill breakdown behind any fit percentage (brief §8.4, §9).
import type { Fit } from "../../engine/types";
import { data, skillName } from "../../data";
import { fitFormula } from "../../engine/fit";
import { Strength } from "../kit";
import { openPopover } from "../overlays/popover";

const r1 = (x: number) => (Math.round(x * 10) / 10).toString();

export function FitBreakdown({ fit, evidence }: { fit: Fit; evidence: "V" | "S" }) {
  const band = data.BANDS[fit.band];
  return (
    <div class="fitbd">
      <table class="tbl tbl-compact">
        <thead><tr><th>Skill</th><th>Need</th><th>Held</th><th>Evidence</th><th class="r">Weight</th><th class="r">Credit</th></tr></thead>
        <tbody>
          {fit.lines.map((l) => (
            <tr key={l.skill} class={l.held ? "" : "is-gap"}>
              <td>{skillName(l.skill)}</td>
              <td>{l.need}</td>
              <td>{l.held ?? <span class="t-rust">Not held</span>}</td>
              <td>{l.tier ? <Strength tier={l.tier} /> : <span class="muted">–</span>}</td>
              <td class="r">{l.weight}</td>
              <td class="r">{r1(l.credit * l.weight)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p class="fitbd-formula"><b>{fitFormula(fit)}</b></p>
      <p class="xs muted">Credit = min(1, held ÷ required proficiency) × evidence weight (verified 1.0, supported 0.7, inferred 0.4), times the skill's weight.</p>
      <p class="small fitbd-gate">
        Placement gate: {band.crit?.map(([s, p]) => `${skillName(s)} at ${p}`).join(" and ")} on {evidence === "S" ? "verified or supported" : "verified"} evidence.{" "}
        {fit.placeNow ? <b class="t-teal">Met.</b> : <b class="t-rust">Not met yet.</b>}
      </p>
    </div>
  );
}

export function FitButton({ fit, evidence, label }: { fit: Fit; evidence: "V" | "S"; label?: string }) {
  return (
    <button
      type="button" class="fit-btn" aria-haspopup="dialog" aria-label={`${fit.pct}% fit to ${fit.band}: show breakdown`}
      onClick={(e) => openPopover(e.currentTarget as HTMLElement, `${fit.band} ${data.BANDS[fit.band].n}`, <FitBreakdown fit={fit} evidence={evidence} />, true)}
    >
      {label ?? `${fit.pct}%`}
    </button>
  );
}

/** "Gap: A; B +n more (N weeks)". */
export function gapLine(fit: Fit): string {
  if (!fit.gaps.length) return "No skill gaps for this band";
  const names = fit.gaps.slice(0, 2).map(skillName).join("; ");
  const more = fit.gaps.length > 2 ? ` +${fit.gaps.length - 2} more` : "";
  return `Gap: ${names}${more} (${fit.weeks} weeks)`;
}
