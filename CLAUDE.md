@AGENTS.md

## Claude Code workflow
- The main session runs on Opus and plans and reviews. It does not
  implement tasks itself, except trivial fixes found during review.
- Every implementation batch runs through `/implement [phase N | task
  ids]`, which delegates to the Sonnet `implementer` subagent and reviews
  its report, diff, and test output before accepting.
- When a phase is done, the main session details the next phase in
  `tasklist.md` (no code), asks the user to confirm, and then continues
  with `/implement`.
