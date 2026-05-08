<#
.SYNOPSIS
  Pulls open issues from a GitHub repo, spins up Claude Code (Opus 4.7, xhigh
  effort) to resolve each one on a new branch, and opens a PR.

.DESCRIPTION
  - All gh/git operations run against the "kristopherkewish" GitHub account
    (the non-interfi one). The script switches the active gh account at start
    and restores the previous one on exit.
  - For each open issue:
      1. Skips it if a matching branch (issue-<n>-*) already exists on the
         remote or an open PR references it.
      2. Creates a fresh branch from origin/main.
      3. Invokes `claude -p` (Opus 4.7, --effort xhigh, perms bypassed) with a
         prompt that instructs Claude to implement, commit, push, AND open the
         PR itself — Claude writes the PR title and description with full
         context on what changed and why.
  - Issues are processed sequentially. Failures are logged and the loop
    continues with the next issue.

.PARAMETER Repo
  Target repo in <owner>/<name> form. Defaults to kristopherkewish/timebox.

.PARAMETER Account
  gh account to use. Defaults to kristopherkewish.

.PARAMETER Issues
  Specific issue numbers to process. If empty, all open issues are pulled.

.PARAMETER Limit
  Cap on the number of issues to process in this run. 0 = no cap.

.PARAMETER Model
  Claude model alias. Defaults to opus.

.PARAMETER Effort
  Claude effort level. Defaults to xhigh.

.PARAMETER DryRun
  Print the planned actions without invoking Claude, pushing, or opening PRs.

.EXAMPLE
  pwsh ./scripts/resolve-issues.ps1
  pwsh ./scripts/resolve-issues.ps1 -Issues 12,17 -Limit 2
  pwsh ./scripts/resolve-issues.ps1 -DryRun
#>

[CmdletBinding()]
param(
    [string]   $Repo    = 'kristopherkewish/timebox',
    [string]   $Account = 'kristopherkewish',
    [int[]]    $Issues  = @(),
    [int]      $Limit   = 0,
    [string]   $Model   = 'opus',
    [string]   $Effort  = 'xhigh',
    [switch]   $DryRun
)

$ErrorActionPreference = 'Stop'

function Write-Step  ([string]$msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Info  ([string]$msg) { Write-Host "    $msg" -ForegroundColor DarkGray }
function Write-Warn2 ([string]$msg) { Write-Host "!!! $msg" -ForegroundColor Yellow }
function Write-Err   ([string]$msg) { Write-Host "XXX $msg" -ForegroundColor Red }

function Require-Cmd ([string]$name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "Required command not found on PATH: $name"
    }
}

function Get-ActiveGhAccount {
    $status = gh auth status 2>&1 | Out-String
    $match = [regex]::Match($status, "Logged in to github\.com account (\S+)[\s\S]*?Active account: true")
    if ($match.Success) { return $match.Groups[1].Value }
    return $null
}

function Slugify ([string]$text) {
    if (-not $text) { return 'untitled' }
    $s = $text.ToLowerInvariant()
    $s = [regex]::Replace($s, '[^a-z0-9]+', '-')
    $s = $s.Trim('-')
    if ($s.Length -gt 40) { $s = $s.Substring(0, 40).TrimEnd('-') }
    if (-not $s) { $s = 'untitled' }
    return $s
}

# ---------------------------------------------------------------------------
# Pre-flight
# ---------------------------------------------------------------------------

Require-Cmd gh
Require-Cmd git
Require-Cmd claude

$repoRoot = git rev-parse --show-toplevel
if ($LASTEXITCODE -ne 0) { throw "Not inside a git working tree." }
Set-Location $repoRoot

$dirty = git status --porcelain
if ($dirty) {
    throw "Working tree is not clean. Commit, stash, or discard changes before running this script."
}

$startBranch = git rev-parse --abbrev-ref HEAD
$priorAccount = Get-ActiveGhAccount

Write-Step "Repo: $Repo  |  Account: $Account  |  Model: $Model  |  Effort: $Effort"
if ($DryRun) { Write-Warn2 "Dry-run mode: no Claude calls, no pushes, no PRs." }

# Switch gh active account
if ($priorAccount -ne $Account) {
    Write-Step "Switching gh active account to '$Account' (was '$priorAccount')"
    gh auth switch --hostname github.com --user $Account | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "gh auth switch to '$Account' failed." }
}

try {
    # -----------------------------------------------------------------------
    # Refresh main
    # -----------------------------------------------------------------------
    Write-Step "Refreshing main from origin"
    git fetch origin --prune | Out-Null
    git checkout main | Out-Null
    git pull --ff-only origin main | Out-Null

    # -----------------------------------------------------------------------
    # Pull open issues
    # -----------------------------------------------------------------------
    Write-Step "Fetching open issues from $Repo"
    $issuesJson = gh issue list --repo $Repo --state open --limit 200 `
        --json number,title,body,url,labels
    if ($LASTEXITCODE -ne 0) { throw "gh issue list failed." }

    $allIssues = $issuesJson | ConvertFrom-Json
    if ($Issues.Count -gt 0) {
        $allIssues = $allIssues | Where-Object { $Issues -contains $_.number }
    }

    # Sort oldest-first for deterministic ordering
    $allIssues = $allIssues | Sort-Object number

    if ($Limit -gt 0) {
        $allIssues = $allIssues | Select-Object -First $Limit
    }

    Write-Info "$($allIssues.Count) issue(s) selected."
    if ($allIssues.Count -eq 0) { return }

    # -----------------------------------------------------------------------
    # Pre-fetch existing remote branches + open PRs once
    # -----------------------------------------------------------------------
    $remoteBranches = (git ls-remote --heads origin 2>$null) `
        | ForEach-Object { ($_ -split "`t")[1] -replace '^refs/heads/', '' }

    $openPrsJson = gh pr list --repo $Repo --state open --limit 200 `
        --json number,headRefName,body,title
    $openPrs = $openPrsJson | ConvertFrom-Json

    # -----------------------------------------------------------------------
    # Per-issue loop
    # -----------------------------------------------------------------------
    foreach ($issue in $allIssues) {
        $num   = $issue.number
        $title = $issue.title
        Write-Host ""
        Write-Step "Issue #$num — $title"

        # Skip if a branch exists for it
        $branchPrefix = "issue-$num-"
        $existingBranch = $remoteBranches | Where-Object { $_ -like "$branchPrefix*" -or $_ -eq "issue-$num" } | Select-Object -First 1
        if ($existingBranch) {
            Write-Warn2 "Skipping: remote branch '$existingBranch' already exists."
            continue
        }

        # Skip if an open PR mentions it
        $closesPattern = "(?i)\b(close[sd]?|fix(e[sd])?|resolve[sd]?)\s+#$num\b"
        $linkedPr = $openPrs | Where-Object {
            ($_.body  -and ($_.body  -match $closesPattern)) -or
            ($_.title -and ($_.title -match $closesPattern))
        } | Select-Object -First 1
        if ($linkedPr) {
            Write-Warn2 "Skipping: PR #$($linkedPr.number) ('$($linkedPr.headRefName)') already targets this issue."
            continue
        }

        $slug   = Slugify $title
        $branch = "issue-$num-$slug"

        Write-Info "Branch: $branch"

        if ($DryRun) {
            Write-Info "[dry-run] Would create branch, run Claude, push, and open PR."
            continue
        }

        # -------------------------------------------------------------------
        # Branch from main
        # -------------------------------------------------------------------
        git checkout -b $branch main | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Failed to create branch $branch — skipping issue."
            git checkout main | Out-Null
            continue
        }

        # -------------------------------------------------------------------
        # Build prompt for Claude
        # -------------------------------------------------------------------
        $issueBody = if ($issue.body) { $issue.body } else { '(no body)' }
        $issueLabels = ($issue.labels | ForEach-Object { $_.name }) -join ', '
        if (-not $issueLabels) { $issueLabels = '(none)' }

        $prompt = @"
You are working on the Timebox project. Read CLAUDE.md, docs/PLAN.md, and
docs/PROGRESS.md before making changes. Follow every hard invariant listed in
CLAUDE.md.

You are currently on branch '$branch', forked from main, with a clean tree.
The active gh CLI account is '$Account' and the target repo is '$Repo'.
Your task is to fully resolve the GitHub issue described below, then push the
branch and open a pull request yourself.

# Issue #$num — $title
URL: $($issue.url)
Labels: $issueLabels

$issueBody

# Required workflow
1. Investigate the relevant code before editing.
2. Make the smallest correct change that resolves the issue.
3. Run ``npm run build`` (and any relevant ``vitest`` tests) and ensure they
   pass before committing. If the build or tests fail, fix the underlying
   issue rather than bypassing checks.
4. Update docs/PROGRESS.md only if the change materially affects roadmap state.
5. Commit your changes on branch '$branch' with a clear message that
   references the issue (e.g. "fix: <summary> (#$num)"). Use a single commit
   unless the change is large enough to warrant logical splits.
6. Push the branch with ``git push -u origin $branch``.
7. Open a pull request against ``main`` with ``gh pr create`` (the active gh
   account is already '$Account', so do not pass --repo unless required).
   - Title: short and specific (under 70 chars), e.g. "Fix <thing> (#$num)".
   - Body must:
     * Start with ``Closes #$num`` so the issue auto-closes on merge.
     * Summarise what changed and why (the actual reasoning behind your fix,
       not a generic restatement of the issue).
     * Call out anything reviewers should pay attention to: tradeoffs,
       follow-ups, manual test steps, edge cases you considered.
   - Pass the body via ``--body-file`` using a temp file to preserve newlines.
8. Do NOT switch off branch '$branch' until after the PR is opened. Do NOT
   rebase, force-push, or modify git remotes.
9. If you determine the issue is invalid, ambiguous, or already fixed, make
   no commits and do not open a PR — instead end your run by printing a
   single line beginning with "NO_CHANGES:" followed by a short explanation.

When the PR is open, print its URL on its own line as the final output.
"@

        # Pre-assign a session ID so the conversation can be resumed later
        # via `claude --resume <id>` for follow-up work on the PR.
        $sessionId   = [guid]::NewGuid().ToString()
        $sessionName = "issue-$num"

        Write-Step "Invoking Claude (model=$Model effort=$Effort session=$sessionId)"

        # stream-json + verbose + Tee-Object: matches the proven automation
        # pattern from ZyzzAi/run_claude.ps1. Default text output mode buffers
        # and on Windows can leave the stdout pipe open after Claude finishes
        # the visible response, which causes the script to hang indefinitely.
        $streamLog = Join-Path $env:TEMP "timebox-issue-$num-stream.jsonl"
        try {
            $prompt | & claude `
                --model $Model `
                --effort $Effort `
                --permission-mode bypassPermissions `
                --session-id $sessionId `
                --name $sessionName `
                --output-format stream-json `
                --verbose `
                -p 2>&1 | Tee-Object -FilePath $streamLog
            $claudeExit = $LASTEXITCODE
        } finally {
            Remove-Item $streamLog -ErrorAction SilentlyContinue
        }

        if ($claudeExit -ne 0) {
            Write-Err "Claude exited with code $claudeExit — abandoning issue #$num."
            git reset --hard main | Out-Null
            git checkout main | Out-Null
            git branch -D $branch | Out-Null
            continue
        }

        # -------------------------------------------------------------------
        # Verify Claude actually made commits on this branch
        # -------------------------------------------------------------------
        $newCommits = git rev-list --count "main..$branch"
        if ([int]$newCommits -eq 0) {
            Write-Warn2 "Claude produced no commits — discarding branch $branch."
            git checkout main | Out-Null
            git branch -D $branch | Out-Null
            continue
        }

        $stillDirty = git status --porcelain
        if ($stillDirty) {
            Write-Warn2 "Working tree still dirty after Claude run — discarding branch $branch."
            git reset --hard "origin/main" | Out-Null
            git checkout main | Out-Null
            git branch -D $branch | Out-Null
            continue
        }

        # -------------------------------------------------------------------
        # Verify Claude pushed the branch and opened a PR
        # -------------------------------------------------------------------
        git fetch origin $branch 2>$null | Out-Null
        $remoteSha = git rev-parse --verify --quiet "origin/$branch"
        if (-not $remoteSha) {
            Write-Warn2 "Claude committed locally but did not push '$branch'. Pushing now as a fallback."
            git push -u origin $branch | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Err "Fallback push failed for $branch."
                git checkout main | Out-Null
                continue
            }
        }

        $prInfo = gh pr list --repo $Repo --state open --head $branch `
            --json number,url --limit 1 | ConvertFrom-Json
        $prUrl    = $null
        $prNumber = $null
        if ($prInfo -and $prInfo.Count -gt 0) {
            $prUrl    = $prInfo[0].url
            $prNumber = $prInfo[0].number
            Write-Step "PR #$prNumber open for issue #$num : $prUrl"
        } else {
            Write-Warn2 "No open PR found for branch '$branch'. Claude may have failed to run gh pr create — open one manually."
        }

        # -------------------------------------------------------------------
        # Append session log entry. Use `claude --resume <session_id>` later
        # to pick the conversation back up with full context for follow-ups.
        # -------------------------------------------------------------------
        $logEntry = [ordered]@{
            timestamp  = [DateTimeOffset]::UtcNow.ToString('o')
            issue      = $num
            title      = $title
            branch     = $branch
            session_id = $sessionId
            session_name = $sessionName
            pr_number  = $prNumber
            pr_url     = $prUrl
            model      = $Model
            effort     = $Effort
        }
        $logLine = $logEntry | ConvertTo-Json -Compress -Depth 4
        $logPath = Join-Path $repoRoot 'scripts/.resolve-log.jsonl'
        Add-Content -Path $logPath -Value $logLine -Encoding UTF8
        Write-Info "Logged session to scripts/.resolve-log.jsonl (resume: claude --resume $sessionId)"

        git checkout main | Out-Null
    }
}
finally {
    # Restore caller's branch and gh account.
    git checkout $startBranch 2>$null | Out-Null
    if ($priorAccount -and $priorAccount -ne $Account) {
        Write-Step "Restoring gh active account to '$priorAccount'"
        gh auth switch --hostname github.com --user $priorAccount | Out-Null
    }
}
