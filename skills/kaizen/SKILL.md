# Kaizen Pass

Turn a drift signal into a persisted improvement. The standard is never
finished — this skill is the discipline that captures an improvement so it
survives the session, instead of being re-discovered every time.

## When to use

When `sni-validator audit` or `sni-kaizen list` flags a skill with
`drift_risk > 0.4`, or after any significant session, run the retrospective.

## Procedure

1. **Select** the target — highest `drift_risk` skill (`sni-kaizen retro <dir>`).
2. **Scan for the seven wastes**: overproduction, waiting, transport,
   over-processing, inventory, motion, defects.
3. **Answer the five questions** in the generated retro scaffold:
   - What waste appeared, named by category?
   - What assumption did the AI make that I corrected? (write it down now)
   - What worked well enough to formalise?
   - Did scope drift — intentional, or velocity illusion?
   - Is the constitution still accurate?
4. **Formalise** the standard and **complete** the pass
   (`sni-kaizen complete <dir> <skill-id> --note "…"`). This appends to
   `CONSTITUTION.md`, records `kaizen_history` in the manifest, and clears drift.

## Relationships

### Feeds into

- **sni-validator** (HIGH): a completed pass clears the drift_risk this skill consumes from the validator's signal

### Fed by

- **sni-validator** (HIGH): drift signals tell Kaizen which skill to target

### Feedback loops

- **Positive signal:** drift_risk drops after the pass and the formalised standard prevents a recurring correction
- **Negative signal:** the same waste reappears in a later session (it was not actually written into the constitution)
- **Manifest signal:** drift_risk > 0.4, or a kaizen_history entry whose drift_before keeps climbing back
