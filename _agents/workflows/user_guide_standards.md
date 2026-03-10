---
description: How to build 'User Guide' screens with the same level of depth, visual clarity, and logic as the Velocity Dashboard guide.
---

# User Guide Architecture: "The Velocity Insight Pattern"

Based on the highly successful **Velocity Dashboard User Guide**, all operational guide screens in the `Forensic OS` must adhere to the **Velocity Insight Pattern**.

This pattern ensures that every metric is mathematically transparent, practically grounded in real-world scenarios, and visually dissected so the user instinctively understands *what is in the denominator*.

## Core Philosophy: Transparency over Definitions
Do not just provide a textbook definition of a metric. You must:
1. Provide the exact mathematical string.
2. Provide a word-problem style "Real-World Example".
3. Use directional color-coding to indicate "Good vs. Bad" or "Higher is Better vs. Lower is Better".
4. Provide immediate, actionable insights on how to use the metric to troubleshoot the floor.

---

## The 4-Part Structure of a Guide Screen

Every guide screen MUST follow this chronological structure:

### 1. The Orientation Summary
- A 2-3 sentence paragraph at the very top.
- Explains **WHO** uses this dashboard and **WHY**.
- Must include a `hr border-slate-800` divider immediately after.

### 2. The Metric Cards (The "What & How")
Every individual metric on the dashboard must have a dedicated `MetricCard` with the following rigid properties:
- **Title:** The exact name as it appears on the dashboard.
- **Scope:** A smaller, secondary subtitle explaining exactly *what slice of data* this applies to (e.g., "Facility-Wide Aggregate" vs. "Per User Average").
- **Directionality:** Explicitly state if the user wants this number to go up or down.
  - *Higher is better* (Use `check_circle` / Emerald / Cyan)
  - *Lower is better* (Use `trending_down` / Rose / Amber)
  - *Target Range* (If applicable, state the goal, e.g., "~80-85%")
- **Exact Formula:** The literal, mathematical formula wrapped in a dark `bg-slate-950 font-mono` container.
- **Description:** A plain-English explanation of what the math actually means.
- **Real-World Example:** This is **mandatory**. Create a 2-sentence scenario involving a hypothetical worker or shift and show the exact math being applied. Keep the numbers simple (e.g., 8 hours, 8000 units, 10 workers).
- **Note (Optional):** Use a subtle italic callout for edge-cases or thresholds (like "BreakThreshold is 5 minutes").

### 3. The Visual Dissection (Timeline Bars)
For any metric dealing with TIME, SPEED, or UTILIZATION, you MUST provide a visual representation of the **Denominator**.
- Use the `ShiftTimelineVisual` pattern.
- The user must visually see what is **Included** (bright, solid colors) and what is **Excluded** (dimmed, 25% opacity, diagonally striped with a ✕ overlay).
- Place this visual *immediately beneath* the Metric Card it explains. Do not group them all at the bottom.

### 4. The Actionable Insights (The "So What?")
A dedicated section that cross-references the metrics from Step 2 to diagnose actual problems. Provide "If This + Then That" scenarios. 
- *Example:* "If Pick Flow Velocity is low BUT Productive UPH is high..." -> "The team is fast when working, but taking too many breaks (Efficiency is low)."
- Use a grid pattern to show distinct scenarios.

---

## Technical Component Checklist

When building a new User Guide screen, you must use/re-use these specific components from `src/components/guide/`:

### A. `<MetricCard />`
Standardize all high-level metric explanations.
```tsx
<MetricCard
    title="[Metric Name]"
    color="[blue|cyan|emerald|amber|rose|indigo]"
    direction="[Higher is Better | Lower is Better]"
    scope="[E.g., Average UPH per Picker]"
    formula="[Numerator] / [Denominator]"
    description="[Plain English definition]"
    example={{
        scenario: "[Word problem setup]",
        math: "[The math worked out]"
    }}
/>
```

### B. `<ShiftTimelineVisual />`
Mandatory for any metric where the denominator is a subset of time.
```tsx
<ShiftTimelineVisual
    title="[Metric Name] explicitly excludes [X]."
    metricLabel="[Metric Name]"
    accentColor="border-[color]-500/20"
    segments={[
        // Pass the array of segments. Set `excluded: true` on segments
        // that are NOT in the denominator of this specific metric.
        { label: 'Pick', width: 'w-[20%]', color: 'bg-cyan-600', textColor: 'text-white' },
        { label: 'Lunch', width: 'w-[12%]', color: 'bg-rose-600/40', textColor: 'text-white/60', excluded: true },
    ]}
    includedLabel="[Plain text defining the bright segments]"
    excludedLabel="[Plain text defining the striped segments]"
    note="[Context explaining why the exclusion matters]"
/>
```

### C. `<TimelineCard />`
Use for breaking down a chronological sequence into individual, bite-sized phases (e.g., the Task Lifecycle: Inter-Job -> Travel -> Pick -> Sort).
```tsx
<TimelineCard
    title="[Phase Name]"
    icon="[Material Icon name]"
    color="[slate|amber|blue]"
    definition="[What happens in this phase]"
    formula="[End Time - Start Time]"
    example="[Scenario]"
    diagnosticUse="[Why does this phase matter to a manager?]"
/>
```

## Styling Mandates
1. **Dark UI Native:** The guide must sit comfortably within the Forensic OS `bg-slate-900` / `bg-slate-950` environment.
2. **Icons:** Use `material-symbols-outlined`. Follow color conventions (Emerald=Good/Included, Rose=Bad/Excluded/Lower-is-better, Amber=Warning/Travel).
3. **Typography:** Formulas must be `font-mono`. General prose should be `text-slate-300` or `text-slate-400` to prevent harsh white glowing text on dark backgrounds. Main titles are `text-white font-bold tracking-tight`.
