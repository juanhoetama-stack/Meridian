# Changelog

There was no `reference/index.html` in the repository, so the numbers in brief §11 serve as the oracle. This file records every choice made where the brief left the behaviour open, and every place the build differs from a literal reading of it.

## Unreleased

### Engine decisions (Phases 1–2)
- **As-of date is injected.** Ages, service and certificate status take `today` as a parameter. Tests pin 2026-10-05. The brief's v1 counts (3 retire / 4 stay / 8 high / 3 medium / 4 choices) hold for as-of dates from **2026-01-15 to 2026-11-30**. On 2026-12-01 Yohanes Manurung's SKTTK certificate (valid until 2026-11-30) expires, his K3 skill drops to Inferred, his best fit falls from 91% to 68%, and the split becomes 7 high / 4 medium. Before 2026-01-15, I Wayan Sudarsa is under 54 and retire is 2.
- **Fit classification uses the displayed whole percentage.** Rina Marlina's B6 fit is exactly 70.0%. Classifying on the rounded percentage means "70% fit" always reads as high at the default threshold, and it avoids floating-point edge cases. The result is the same as the brief's counts.
- **Jaro-Winkler** counts transpositions as half the out-of-order matches, as a real number. That gives "muh rizal" vs "muhammad rizal" = 0.85, as the brief states (integer halving gives 0.86).
- **NIK demo hash** = FNV-1a 32-bit over `normName|dob`, shown as `nik#xxxxxxxx`.

### Sample payload details the brief does not fix
- **SAP SF ids:** `EMP-` + 41000 + (i·1597 mod 8999). Seed #8 (Agus Setiawan) is fixed at `EMP-48213`.
- **SF name variants:** every 4th seed is in UPPERCASE. The next seed carries the degree suffix its education implies (`, S.T.` for S1 Teknik, `, A.Md.` for D3/D4, `, M.Psi.` for S2 Psikologi, `, S.Kom.`, `, S.E.`, `, S.H.`). SMA/SMK holders carry none. Muhammad Rizal appears as "Muh. Rizal, S.T.".
- **SF dates** use the OData v2 `/Date(ms)/` form, which is converted on import.
- **One transfer:** Agung Wibowo moves RU-1 → RU-2 in SF, so the preview shows a real "Unit: X → Y" change.
- **Names on existing records are never overwritten by SF.** The KTP spelling is kept, and the SF spelling is shown as a note on the update. This is a refinement of "identity comes from SF": the KTP is the legal name document.
- **Moodle completion proficiency** comes from the course grade (≥85 Advanced, ≥70 Working, otherwise Foundation). Seed completions reproduce each seed's proficiency, so they cause no change.
- **Blank Moodle idnumbers:** Rina Marlina, Nur Aini and Yuliana Pasaribu (linked by name + unit).
- **Pre-2023 completions** for Suparman, Rusdi Hasibuan, Joko Susilo and Taufik Hidayat, plus Komang Adi Putra's two 2021–22 courses from `LMS_NEW`, are excluded (6 in total). Agus's LMS-ANO-115 is in progress (excluded).
- **Ratings** are generated deterministically per person for 2025. Five people also carry a 2022 row, which is ignored. RU-3 uses dd/mm/yyyy. Agus = `RU2-PRF-0331`.
- **"Duplicates avoided"** counts SAP SF records matched to an existing person instead of being created again.
