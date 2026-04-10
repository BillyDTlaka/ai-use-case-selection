# AI Use Case Selection — Power Platform Design Specification

**Version:** 1.0  
**Date:** 2026-04-10  
**Status:** Draft

---

## 1. Overview

This document specifies the full conversion of the AI Use Case Selection web application into a Microsoft Power Platform solution. The original stack (React + Fastify + PostgreSQL + Anthropic API) is replaced entirely with Power Apps, Dataverse, Power Automate, and AI Builder.

### 1.1 Objectives

- Replicate all existing functionality within the Power Platform
- Use AI Builder (GPT-powered prompt actions) in Power Automate to replace the Anthropic Claude API for use case scoring and analysis
- Store all data in Dataverse
- Deliver a Canvas App as the primary user interface

### 1.2 Scope

| In Scope | Out of Scope |
|---|---|
| Canvas App (4 screens) | Model-driven app |
| Dataverse data model (3 tables) | Power BI reporting |
| Power Automate flows (6 flows) | Azure integration |
| AI Builder scoring prompt | Custom connectors |
| Role-based workflow (Creator → Reviewer → Approver) | Mobile app |

---

## 2. Architecture

```
┌─────────────────────────────────────────────┐
│              Canvas App                      │
│  Dashboard │ Client Profile │ New Use Case  │
│            │  Use Case Detail               │
└────────────────────┬────────────────────────┘
                     │ Power Automate flows
         ┌───────────┴───────────┐
         │                       │
    ┌────▼────┐           ┌──────▼──────┐
    │Dataverse│           │ AI Builder  │
    │  Tables │           │ (GPT Prompt)│
    └─────────┘           └─────────────┘
```

### 2.1 Component Responsibilities

| Component | Responsibility |
|---|---|
| **Canvas App** | UI, navigation, user interaction |
| **Dataverse** | Persistent data storage (replaces PostgreSQL) |
| **Power Automate** | Business logic, workflow orchestration (replaces Fastify) |
| **AI Builder** | GPT-powered use case scoring and analysis (replaces Anthropic API) |

---

## 3. Dataverse Data Model

### 3.1 Table: `ai_ClientProfile`

Stores the client's technical architecture context used to assess use case feasibility.

| Display Name | Schema Name | Type | Required | Notes |
|---|---|---|---|---|
| Name | `ai_name` | Single line of text | Yes | Client organisation name |
| Systems | `ai_systems` | Multiline text | No | Comma-separated: SAP, CRM, Core Insurance |
| Integrations | `ai_integrations` | Multiline text | No | Comma-separated: REST APIs, MuleSoft |
| Data Platforms | `ai_dataplatforms` | Multiline text | No | Comma-separated: Snowflake, Fabric |
| Channels | `ai_channels` | Multiline text | No | Comma-separated: Web, Mobile |
| Cloud Environment | `ai_cloudenv` | Choice | Yes | AWS, Azure, GCP, Hybrid, On-Premise |
| Data Quality | `ai_dataquality` | Choice | Yes | High, Medium, Low |
| Constraints | `ai_constraints` | Multiline text | No | Comma-separated: POPIA, legacy systems |
| Created On | `createdon` | Date and Time | Auto | System managed |

> **Note on arrays:** Power Apps does not natively support array columns. Systems, Integrations, Data Platforms, Channels, and Constraints are stored as comma-separated strings and split/joined in Power Automate and Canvas App formulas.

---

### 3.2 Table: `ai_UseCase`

Central table. Holds use case details, manual scores, AI scores, workflow state.

| Display Name | Schema Name | Type | Required | Notes |
|---|---|---|---|---|
| Title | `ai_title` | Single line of text | Yes | |
| Description | `ai_description` | Multiline text | Yes | |
| Business Objective | `ai_businessobjective` | Multiline text | Yes | |
| Business Unit | `ai_businessunit` | Choice | Yes | Claims, Underwriting, Finance, Operations, HR, IT, CX |
| Domain | `ai_domain` | Choice | Yes | Fraud, Claims, CX, Operations, Underwriting, Finance, HR, Other |
| Workspace | `ai_workspace` | Choice | Yes | Innovation, Core Systems, Digital, Analytics, Infrastructure |
| Category | `ai_category` | Choice | No | Fraud, Claims, CX, Operations, Underwriting, Finance, HR, Other |
| Owner | `ai_owner` | Single line of text | Yes | |
| Status | `ai_status` | Choice | Yes | DRAFT, IN_REVIEW, APPROVED, REJECTED — default: DRAFT |
| **Manual Scores** | | | | |
| Score Value | `ai_scorevalue` | Whole Number | No | 1–5 |
| Score Feasibility | `ai_scorefeasibility` | Whole Number | No | 1–5 |
| Score Data | `ai_scoredata` | Whole Number | No | 1–5 |
| Score Speed | `ai_scorespeed` | Whole Number | No | 1–5 |
| Score Risk | `ai_scorerisk` | Whole Number | No | 1–5 — penalises total |
| Total Score | `ai_totalscore` | Decimal | No | Formula: (Value×2) + Feasibility + Data + Speed − Risk |
| Recommendation | `ai_recommendation` | Choice | No | QUICK_WIN (≥18), STRATEGIC (≥12), AVOID (<12) |
| **AI Scores** | | | | |
| AI Score Value | `ai_aiscorevalue` | Whole Number | No | Raw AI output |
| AI Score Feasibility | `ai_aiscorefeasi` | Whole Number | No | |
| AI Score Data | `ai_aiscoredata` | Whole Number | No | |
| AI Score Speed | `ai_aiscorspeed` | Whole Number | No | |
| AI Score Risk | `ai_aiscorisk` | Whole Number | No | |
| **AI Analysis** | | | | |
| AI Summary | `ai_aisummary` | Multiline text | No | Max 3 lines from AI Builder |
| Business Problem | `ai_businessproblem` | Multiline text | No | |
| Reasoning | `ai_reasoning` | Multiline text | No | Scoring justification |
| **Workflow Tracking** | | | | |
| Created By | `ai_createdby` | Single line of text | Yes | User display name |
| Reviewed By | `ai_reviewedby` | Single line of text | No | |
| Approved By | `ai_approvedby` | Single line of text | No | |
| Reviewed At | `ai_reviewedat` | Date and Time | No | |
| Approved At | `ai_approvedat` | Date and Time | No | |
| **Relationships** | | | | |
| Client Profile | `ai_clientprofileid` | Lookup → ai_ClientProfile | Yes | Many-to-one |

---

### 3.3 Table: `ai_Comment`

Threaded comments on a use case from any role.

| Display Name | Schema Name | Type | Required | Notes |
|---|---|---|---|---|
| Content | `ai_content` | Multiline text | Yes | |
| Author | `ai_author` | Single line of text | Yes | Display name of commenter |
| Role | `ai_role` | Single line of text | Yes | Creator, Reviewer, Approver |
| Use Case | `ai_usecaseid` | Lookup → ai_UseCase | Yes | Many-to-one |
| Created On | `createdon` | Date and Time | Auto | System managed |

---

### 3.4 Scoring Formula

Replicated from the original `scoring.js`:

```
Total Score = (Score Value × 2) + Score Feasibility + Score Data + Score Speed − Score Risk

Recommendation:
  Total ≥ 18  →  QUICK_WIN
  Total ≥ 12  →  STRATEGIC
  Total < 12  →  AVOID
```

This formula is applied inside Power Automate (not in Canvas App) to ensure consistency.

---

## 4. Power Automate Flows

Six flows cover all backend operations. All are **Instant flows triggered from Power Apps (v2 trigger)**.

---

### 4.1 Flow: `Analyze Use Case`

**Replaces:** `POST /analyze` + `claude.js` + `scoring.js`  
**Trigger:** PowerApps (v2) — Input: `useCaseId` (Text)

#### Steps

| # | Action | Details |
|---|---|---|
| 1 | Get row by ID | Table: `ai_UseCase`, Row ID: `useCaseId` |
| 2 | Get row by ID | Table: `ai_ClientProfile`, Row ID: use case's `ai_clientprofileid` |
| 3 | AI Builder — Create text with GPT | See prompt below |
| 4 | Parse JSON | Schema: AI scoring response object |
| 5 | Calculate total score | Expression: `(scoreValue * 2) + scoreFeasibility + scoreData + scoreSpeed - scoreRisk` |
| 6 | Set recommendation | Condition: ≥18 → QUICK_WIN, ≥12 → STRATEGIC, else AVOID |
| 7 | Update row | Table: `ai_UseCase` — write all AI scores + manual scores + totals + analysis text |
| 8 | Respond to PowerApps | Return updated use case row |

#### AI Builder Prompt

```
You are an AI enterprise architect and strategy advisor.

Client architecture:
- Name: @{ClientProfile[ai_name]}
- Core Systems: @{ClientProfile[ai_systems]}
- Integration Layer: @{ClientProfile[ai_integrations]}
- Data Platforms: @{ClientProfile[ai_dataplatforms]}
- Channels: @{ClientProfile[ai_channels]}
- Cloud Environment: @{ClientProfile[ai_cloudenv]}
- Data Quality: @{ClientProfile[ai_dataquality]}
- Constraints: @{ClientProfile[ai_constraints]}

Use case:
- Title: @{UseCase[ai_title]}
- Description: @{UseCase[ai_description]}
- Business Objective: @{UseCase[ai_businessobjective]}
- Business Unit: @{UseCase[ai_businessunit]}
- Domain: @{UseCase[ai_domain]}

Assess realistically based on integration complexity, data availability, and legacy constraints.

Return ONLY valid JSON in this exact structure:
{
  "summary": "max 3 lines",
  "businessProblem": "the core business problem being solved",
  "category": "one of: Fraud, Claims, CX, Operations, Underwriting, Finance, HR, Other",
  "scoreValue": 1-5,
  "scoreFeasibility": 1-5,
  "scoreData": 1-5,
  "scoreSpeed": 1-5,
  "scoreRisk": 1-5,
  "reasoning": "2-3 sentences explaining the assessment"
}

Score guidance:
- scoreValue: 1=low business impact, 5=transformational
- scoreFeasibility: 1=very complex or blocked, 5=straightforward with existing stack
- scoreData: 1=data unavailable or poor quality, 5=data ready and high quality
- scoreSpeed: 1=18+ months to deliver, 5=under 3 months
- scoreRisk: 1=low risk, 5=high risk (this PENALISES the total score)
```

---

### 4.2 Flow: `Submit Use Case`

**Replaces:** `POST /use-case/submit`  
**Trigger:** PowerApps (v2) — Input: `useCaseId` (Text), `submittedBy` (Text)

| # | Action | Details |
|---|---|---|
| 1 | Get row by ID | Verify status is DRAFT |
| 2 | Condition | If status ≠ DRAFT → respond with error |
| 3 | Update row | Set `ai_status` = IN_REVIEW |
| 4 | Respond to PowerApps | Return success |

---

### 4.3 Flow: `Review Use Case`

**Replaces:** `POST /use-case/review`  
**Trigger:** PowerApps (v2) — Input: `useCaseId`, `reviewedBy`, `scoreValue`, `scoreFeasibility`, `scoreData`, `scoreSpeed`, `scoreRisk` (all Text/Number)

| # | Action | Details |
|---|---|---|
| 1 | Get row by ID | Verify status is IN_REVIEW |
| 2 | Calculate total score | Expression on input scores |
| 3 | Set recommendation | Condition block (≥18/≥12/<12) |
| 4 | Update row | Write reviewer name, reviewed date, all scores, total, recommendation |
| 5 | Respond to PowerApps | Return updated row |

---

### 4.4 Flow: `Approve Use Case`

**Replaces:** `POST /use-case/approve`  
**Trigger:** PowerApps (v2) — Input: `useCaseId` (Text), `approvedBy` (Text)

| # | Action | Details |
|---|---|---|
| 1 | Get row by ID | Verify status is IN_REVIEW |
| 2 | Update row | Set `ai_status` = APPROVED, write approver name and timestamp |
| 3 | Respond to PowerApps | Return success |

---

### 4.5 Flow: `Reject Use Case`

**Replaces:** `POST /use-case/reject`  
**Trigger:** PowerApps (v2) — Input: `useCaseId` (Text), `rejectedBy` (Text)

| # | Action | Details |
|---|---|---|
| 1 | Get row by ID | Verify status is IN_REVIEW |
| 2 | Update row | Set `ai_status` = REJECTED, write rejector name and timestamp |
| 3 | Respond to PowerApps | Return success |

---

### 4.6 Flow: `Add Comment`

**Replaces:** `POST /use-case/comment`  
**Trigger:** PowerApps (v2) — Input: `useCaseId`, `content`, `author`, `role` (all Text)

| # | Action | Details |
|---|---|---|
| 1 | Create row | Table: `ai_Comment` with all inputs |
| 2 | Respond to PowerApps | Return new comment row |

---

## 5. Canvas App

### 5.1 Global Variables

| Variable | Type | Purpose |
|---|---|---|
| `gblCurrentUser` | Record | `{name: User().FullName, email: User().Email}` — set on app start |
| `gblCurrentRole` | Text | User's role: "Creator", "Reviewer", or "Approver" — set on app start via a lookup or hardcoded for POC |
| `gblActiveClientId` | Text | Selected ClientProfile row ID — persists for session |
| `gblActiveClientName` | Text | Display name of selected profile |

---

### 5.2 Screen 1: Dashboard

**Purpose:** Overview of all use cases with summary cards and filterable table.

#### Layout

```
┌─────────────────────────────────────────────────────────┐
│  AI Use Case Selection          [User name]  [Profile ▼]│
├─────────────────────────────────────────────────────────┤
│  Dashboard                                               │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Total   │ │Quick Win │ │Strategic │ │  Avoid   │  │
│  │   24     │ │    8     │ │   12     │ │    4     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                          │
│  [Business Unit ▼] [Domain ▼] [Status ▼] [Recom. ▼]   │
│                                                    [+ New]│
│  ┌───────────────────────────────────────────────────┐  │
│  │ Title | BU | Domain | Owner | V | F | D | S | R  │  │
│  │       | Score | Total | Recommendation | Status  │  │
│  ├───────────────────────────────────────────────────┤  │
│  │ [row] [row] [row] ...                             │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

#### Controls

| Control | Type | Data Source | Notes |
|---|---|---|---|
| `lblTotal` | Label | `CountRows(galUseCases.AllItems)` | |
| `lblQuickWins` | Label | `CountIf(colUseCases, ai_recommendation = "QUICK_WIN")` | |
| `lblStrategic` | Label | `CountIf(colUseCases, ai_recommendation = "STRATEGIC")` | |
| `lblAvoid` | Label | `CountIf(colUseCases, ai_recommendation = "AVOID")` | |
| `ddlBusinessUnit` | Dropdown | Hardcoded choices | Filter trigger |
| `ddlDomain` | Dropdown | Hardcoded choices | Filter trigger |
| `ddlStatus` | Dropdown | Hardcoded choices | Filter trigger |
| `ddlRecommendation` | Dropdown | Hardcoded choices | Filter trigger |
| `galUseCases` | Gallery (vertical) | `ai_UseCase` table with filter expression | |
| `btnNewUseCase` | Button | Navigate to Screen 3 | Visible only when `gblActiveClientId` is set |

#### Gallery Filter Formula

```powerapps
Filter(
    ai_UseCase,
    (ddlBusinessUnit.Selected.Value = "All" || ai_businessunit = ddlBusinessUnit.Selected.Value),
    (ddlDomain.Selected.Value = "All" || ai_domain = ddlDomain.Selected.Value),
    (ddlStatus.Selected.Value = "All" || ai_status = ddlStatus.Selected.Value),
    (ddlRecommendation.Selected.Value = "All" || ai_recommendation = ddlRecommendation.Selected.Value)
)
```

#### Score Cell Colour Logic (per score label in gallery)

```powerapps
// Background colour for score chips
Switch(
    ThisItem.ai_scorevalue,
    5, RGBA(21,128,61,1),   // green
    4, RGBA(74,222,128,1),  // light green
    3, RGBA(250,204,21,1),  // yellow
    2, RGBA(249,115,22,1),  // orange
    1, RGBA(220,38,38,1),   // red
    RGBA(229,231,235,1)     // grey (no score)
)
```

#### Recommendation Badge Colour

```powerapps
Switch(
    ThisItem.ai_recommendation,
    "QUICK_WIN", RGBA(21,128,61,1),
    "STRATEGIC", RGBA(29,78,216,1),
    "AVOID", RGBA(185,28,28,1),
    RGBA(107,114,128,1)
)
```

---

### 5.3 Screen 2: Client Profile

**Purpose:** Create and select a client architecture profile.

#### Layout

```
┌─────────────────────────────────────────────────────────┐
│  ← Back                         Client Profile           │
├─────────────────────────────────────────────────────────┤
│  Existing Profiles                                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │ [Profile 1 — Azure · High data quality]  [✓]   │    │
│  │ [Profile 2 — AWS · Medium data quality]        │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  New Profile                                             │
│  Client Name: [________________]                         │
│  Core Systems: [tag input]                               │
│  Integration Layer: [tag input]                          │
│  Data Platforms: [tag input]                             │
│  Channels: [tag input]                                   │
│  Cloud Environment: [AWS ▼]  Data Quality: [High ▼]     │
│  Constraints: [tag input]                                │
│                              [Save Profile]              │
└─────────────────────────────────────────────────────────┘
```

#### Tag Input Pattern

Power Apps has no native tag input. Implement using:
- A `TextInput` for typing new tags
- An `AddIcon` button calling `Collect(colTags, {value: txtTagInput.Text})`
- A horizontal `Gallery` showing `colTags` with an `×` remove button per item
- On form submit, join tags: `Concat(colTags, value, ",")`

One collection per tag field: `colSystems`, `colIntegrations`, `colDataPlatforms`, `colChannels`, `colConstraints`

#### Save Profile Action

```powerapps
Patch(
    ai_ClientProfile,
    Defaults(ai_ClientProfile),
    {
        ai_name: txtClientName.Text,
        ai_systems: Concat(colSystems, value, ","),
        ai_integrations: Concat(colIntegrations, value, ","),
        ai_dataplatforms: Concat(colDataPlatforms, value, ","),
        ai_channels: Concat(colChannels, value, ","),
        ai_cloudenv: ddlCloud.Selected.Value,
        ai_dataquality: ddlDataQuality.Selected.Value,
        ai_constraints: Concat(colConstraints, value, ",")
    }
);
Set(gblActiveClientId, Last(ai_ClientProfile).ai_ClientProfileId);
Set(gblActiveClientName, txtClientName.Text);
Notify("Profile saved and set as active", NotificationType.Success)
```

---

### 5.4 Screen 3: New Use Case

**Purpose:** Create a new use case linked to the active client profile.

#### Layout

```
┌─────────────────────────────────────────────────────────┐
│  ← Back                           New Use Case           │
├─────────────────────────────────────────────────────────┤
│  ⚠ No client profile selected. Set one up first.        │
│  (shown only when gblActiveClientId is blank)            │
│                                                          │
│  Title *         [________________________________]      │
│  Description *   [________________________________]      │
│                  [________________________________]      │
│                  [________________________________]      │
│  Business        [________________________________]      │
│  Objective *     [________________________________]      │
│                                                          │
│  Business Unit [Claims ▼]  Domain [Fraud ▼]             │
│  Workspace [Innovation ▼]                                │
│                                                          │
│  Owner *         [________________________________]      │
│                                                          │
│                              [Create Use Case]           │
└─────────────────────────────────────────────────────────┘
```

#### Create Use Case Action

```powerapps
If(
    IsBlank(gblActiveClientId),
    Notify("Please select a Client Profile first", NotificationType.Warning),
    With(
        {newRecord: Patch(
            ai_UseCase,
            Defaults(ai_UseCase),
            {
                ai_title: txtTitle.Text,
                ai_description: txtDescription.Text,
                ai_businessobjective: txtObjective.Text,
                ai_businessunit: ddlBusinessUnit.Selected.Value,
                ai_domain: ddlDomain.Selected.Value,
                ai_workspace: ddlWorkspace.Selected.Value,
                ai_owner: txtOwner.Text,
                ai_status: "DRAFT",
                ai_createdby: gblCurrentUser.name,
                ai_clientprofileid: {ai_ClientProfileId: gblActiveClientId}
            }
        )},
        Navigate(scrUseCaseDetail, None, {recSelectedUseCase: newRecord})
    )
)
```

---

### 5.5 Screen 4: Use Case Detail

**Purpose:** View full use case, run AI analysis, manage scores, progress workflow, add comments.

#### Layout

```
┌─────────────────────────────────────────────────────────┐
│  ← Back          [Title]   [Status badge] [Recom badge] │
│                                    [Run AI Analysis] [Submit]│
├─────────────────────────────────────────────────────────┤
│  Details                                                  │
│  Description | Business Objective | BU / Domain         │
│  Workspace / Owner                                       │
├─────────────────────────────────────────────────────────┤
│  AI Analysis  (visible when ai_aisummary is not blank)   │
│  Summary | Business Problem | Reasoning                  │
├─────────────────────────────────────────────────────────┤
│  Scores                              Total: [24]         │
│  Value  Feasibility  Data  Speed  Risk                   │
│  [ 4 ]    [ 3 ]     [ 5 ] [ 4 ] [ 2 ]                  │
│  (AI:3)                                                  │
│  [Score editor — dropdowns — visible to Reviewer only]  │
│  [Save Review]                                           │
├─────────────────────────────────────────────────────────┤
│  [Approve] [Reject]  (visible to Approver, IN_REVIEW)   │
├─────────────────────────────────────────────────────────┤
│  Comments                                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [Author] [Role]                      [timestamp]│   │
│  │ Comment text                                     │   │
│  └─────────────────────────────────────────────────┘   │
│  [Add a comment...                    ] [Post]          │
└─────────────────────────────────────────────────────────┘
```

#### Visibility Rules

| Control | Visible When |
|---|---|
| `btnRunAIAnalysis` | `recSelectedUseCase.ai_status = "DRAFT"` |
| `btnSubmit` | `ai_status = "DRAFT"` AND `ai_totalscore <> Blank()` |
| `grpScoreEditor` | `ai_status = "IN_REVIEW"` AND `gblCurrentRole = "Reviewer"` |
| `btnSaveReview` | Same as score editor |
| `grpApproveReject` | `ai_status = "IN_REVIEW"` AND `gblCurrentRole = "Approver"` |
| `txtCommentInput` + `btnPost` | `ai_status <> "APPROVED"` |

#### Run AI Analysis Action

```powerapps
Set(gblAnalyzing, true);
Set(
    gblUpdatedUseCase,
    AnalyzeUseCase.Run(recSelectedUseCase.ai_UseCaseId)
);
Set(recSelectedUseCase, gblUpdatedUseCase);
Set(gblAnalyzing, false)
```

#### Submit Action

```powerapps
SubmitUseCase.Run(recSelectedUseCase.ai_UseCaseId, gblCurrentUser.name);
Set(recSelectedUseCase, LookUp(ai_UseCase, ai_UseCaseId = recSelectedUseCase.ai_UseCaseId))
```

#### Save Review Action

```powerapps
ReviewUseCase.Run(
    recSelectedUseCase.ai_UseCaseId,
    gblCurrentUser.name,
    Value(ddlScoreValue.Selected.Value),
    Value(ddlScoreFeasibility.Selected.Value),
    Value(ddlScoreData.Selected.Value),
    Value(ddlScoreSpeed.Selected.Value),
    Value(ddlScoreRisk.Selected.Value)
);
Set(recSelectedUseCase, LookUp(ai_UseCase, ai_UseCaseId = recSelectedUseCase.ai_UseCaseId))
```

#### Post Comment Action

```powerapps
If(
    Not(IsBlank(txtComment.Text)),
    AddComment.Run(
        recSelectedUseCase.ai_UseCaseId,
        txtComment.Text,
        gblCurrentUser.name,
        gblCurrentRole
    );
    Reset(txtComment);
    ClearCollect(colComments, Filter(ai_Comment, ai_usecaseid.ai_UseCaseId = recSelectedUseCase.ai_UseCaseId))
)
```

---

## 6. Role Model (POC)

For the POC, roles are set via a hardcoded dropdown in the app header (replacing the `UserSelector` component from the original app).

| Role | Permissions |
|---|---|
| **Creator** | Create use case, run AI analysis, submit for review, add comments |
| **Reviewer** | Adjust scores, save review, add comments |
| **Approver** | Approve or reject, add comments |

A `ddlUserRole` dropdown in the app header sets `gblCurrentRole`. In production this would be replaced by Azure AD group membership.

---

## 7. Workflow State Machine

```
DRAFT
  │
  ├── [Run AI Analysis]  → stays DRAFT (scores populated)
  │
  └── [Submit for Review] ──→ IN_REVIEW
                                  │
                        ┌─────────┴─────────┐
                        │                   │
                   [Approve]           [Reject]
                        │                   │
                   APPROVED             REJECTED
```

### Transition Rules

| From | Action | To | Guard |
|---|---|---|---|
| DRAFT | Run AI Analysis | DRAFT | No status change |
| DRAFT | Submit | IN_REVIEW | `ai_totalscore` must not be blank |
| IN_REVIEW | Approve | APPROVED | Role = Approver |
| IN_REVIEW | Reject | REJECTED | Role = Approver |

---

## 8. AI Builder Configuration

### 8.1 License Requirements

AI Builder credits are required for the **Create text with GPT** action.

| Licence | AI Builder Credits Included |
|---|---|
| Power Apps Premium (per user) | 500 credits/month |
| Power Automate Premium | 500 credits/month |
| AI Builder Add-on | Purchasable in blocks |

For a POC with low usage, the included credits are sufficient.

### 8.2 Prompt Configuration

- **Model:** GPT-4 (default in AI Builder)
- **Temperature:** Default (balanced)
- **Expected output:** JSON object — parsed with the Power Automate `Parse JSON` action
- **JSON schema** for Parse JSON step:

```json
{
  "type": "object",
  "properties": {
    "summary": { "type": "string" },
    "businessProblem": { "type": "string" },
    "category": { "type": "string" },
    "scoreValue": { "type": "integer" },
    "scoreFeasibility": { "type": "integer" },
    "scoreData": { "type": "integer" },
    "scoreSpeed": { "type": "integer" },
    "scoreRisk": { "type": "integer" },
    "reasoning": { "type": "string" }
  }
}
```

---

## 9. Build Order

| Phase | Task |
|---|---|
| 1 | Create Dataverse environment (use default or dedicated) |
| 2 | Create all 3 Dataverse tables with columns and relationships |
| 3 | Build and test Flow: **Analyze Use Case** (most complex — validate AI Builder output) |
| 4 | Build and test Flows: **Submit**, **Review**, **Approve**, **Reject**, **Add Comment** |
| 5 | Build Canvas App: global variables, navigation, Screen 2 (Client Profile) |
| 6 | Build Screen 3 (New Use Case) and wire to Dataverse |
| 7 | Build Screen 1 (Dashboard) with gallery and filters |
| 8 | Build Screen 4 (Use Case Detail) — most complex screen |
| 9 | End-to-end test: create profile → create use case → analyze → submit → review → approve |

---

## 10. Out of Scope for POC

- Azure AD role integration (manual role selection used instead)
- Email notifications on status change
- Audit logging
- Power BI dashboard
- Multi-environment deployment (dev/prod)
- Row-level security in Dataverse
