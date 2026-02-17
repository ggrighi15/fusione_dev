# Branch Protection Checklist (main + develop)

## main

- [ ] Require a pull request before merging
- [ ] Require approvals: 1
- [ ] Dismiss stale pull request approvals when new commits are pushed
- [ ] Require conversation resolution before merging
- [ ] Require status checks to pass before merging:
  - [ ] `FusionCore CI / guardrails`
  - [ ] `FusionCore CI / python-tests`
  - [ ] `FusionCore CI / ui-react-tests`
- [ ] Require branches to be up to date before merging
- [ ] Restrict force pushes
- [ ] Restrict deletions
- [ ] Include administrators

## develop

- [ ] Require a pull request before merging
- [ ] Require approvals: 1
- [ ] Dismiss stale pull request approvals
- [ ] Require conversation resolution before merging
- [ ] Require status checks to pass before merging:
  - [ ] `FusionCore CI / guardrails`
  - [ ] `FusionCore CI / python-tests`
  - [ ] `FusionCore CI / ui-react-tests`
- [ ] Require branches to be up to date before merging
- [ ] Restrict force pushes
- [ ] Restrict deletions
- [ ] Include administrators
