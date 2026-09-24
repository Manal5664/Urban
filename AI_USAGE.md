# AI-assisted development declaration

OpenAI ChatGPT and Codex are AI-assisted development tools used for this project.
AI-assisted work must be independently reviewed, tested, understood, and
modified where necessary by the project team.

## Phase 1 use

- **Tool:** OpenAI ChatGPT/Codex agent.
- **Purpose:** Implement and review the deterministic UrbanTransit IQ synthetic
  dataset generator, smoke fixtures, validators, tests, and documentation.
- **Type of help:** Python architecture, code generation, debugging, test
  design, and documentation drafting.
- **Files affected:** `data_generator/`, `tests/test_data_generator.py`,
  `documentation/DATA_GENERATOR_PHASE1.md`, selected architecture/dictionary/
  generation/checklist status notes, `README.md`, `requirements.txt`,
  `.gitignore`, `AI_USAGE.md`, and `DEVELOPMENT_LOG.md`.
- **Modifications made:** The implementation was split into configuration,
  deterministic IDs/seeds, streaming writers, domain generators, lifecycle/DQ
  fixtures, and independent validation modules.  Raw defects are explicitly
  separated from clean truth through a test-oracle manifest.
- **Testing completed:** Python compilation, standard-library unit tests, two
  same-seed smoke generations, smoke generation, and smoke validation.  The
  exact executed counts and results are recorded in `DEVELOPMENT_LOG.md` and
  the final phase report.
- **Verifying team member:** To be completed by the project team during final
  independent review.

Final analytics, predictions, classifications, forecasts, recommendations, and
application outputs must be produced by the team's own implemented Big Data,
Data Science, ML, and application logic.  No external generative-AI prediction
API is used by this generator.

## Pre-production recovery review

Codex inspected and preserved the inherited OpenCode Phase 1 work, implemented
a deterministic production fleet allocator and metadata-only preflight, added
focused tests, and fixed bounded-memory/provenance risks. See
[PREPRODUCTION_REVIEW.md](documentation/PREPRODUCTION_REVIEW.md) for changed
files, executed checks and remaining blockers. No production facts, system
changes, independent cleaning, models, commits or pushes were performed.
