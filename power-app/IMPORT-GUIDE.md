# Import Guide — AI Use Case Selection Power App

Follow these steps in order. Each step must complete before the next.

---

## Prerequisites

- Power Apps licence with Dataverse access (Power Apps Premium or Developer Plan)
- AI Builder credits (included in Premium, or purchase AI Builder add-on)
- Power Platform CLI installed: `npm install -g @microsoft/powerplatform-cli` *(for Canvas App packing only)*
- Access to [make.powerapps.com](https://make.powerapps.com)

---

## Step 1 — Create Dataverse Tables

Go to [make.powerapps.com](https://make.powerapps.com) → your environment → **Dataverse** → **Tables** → **+ New table**

### Table 1: `ai_ClientProfile`

Display name: `AI Client Profile`  
Schema name: `ai_ClientProfile`

Add these columns (after table is created, go into the table and add columns):

| Display Name | Schema Name | Data Type | Required |
|---|---|---|---|
| Name | ai_name | Single line of text | Yes |
| Systems | ai_systems | Multiline text | No |
| Integrations | ai_integrations | Multiline text | No |
| Data Platforms | ai_dataplatforms | Multiline text | No |
| Channels | ai_channels | Multiline text | No |
| Cloud Environment | ai_cloudenv | Single line of text | No |
| Data Quality | ai_dataquality | Single line of text | No |
| Constraints | ai_constraints | Multiline text | No |

---

### Table 2: `ai_UseCase`

Display name: `AI Use Case`  
Schema name: `ai_UseCase`

Add these columns:

| Display Name | Schema Name | Data Type | Required |
|---|---|---|---|
| Title | ai_title | Single line of text | Yes |
| Description | ai_description | Multiline text | Yes |
| Business Objective | ai_businessobjective | Multiline text | Yes |
| Business Unit | ai_businessunit | Single line of text | No |
| Domain | ai_domain | Single line of text | No |
| Workspace | ai_workspace | Single line of text | No |
| Category | ai_category | Single line of text | No |
| Owner | ai_owner | Single line of text | No |
| Status | ai_status | Single line of text | No — default: `DRAFT` |
| Score Value | ai_scorevalue | Whole Number | No |
| Score Feasibility | ai_scorefeasibility | Whole Number | No |
| Score Data | ai_scoredata | Whole Number | No |
| Score Speed | ai_scorespeed | Whole Number | No |
| Score Risk | ai_scorerisk | Whole Number | No |
| Total Score | ai_totalscore | Decimal | No |
| Recommendation | ai_recommendation | Single line of text | No |
| AI Score Value | ai_aiscorevalue | Whole Number | No |
| AI Score Feasibility | ai_aiscorefeasi | Whole Number | No |
| AI Score Data | ai_aiscoredata | Whole Number | No |
| AI Score Speed | ai_aiscorspeed | Whole Number | No |
| AI Score Risk | ai_aiscorisk | Whole Number | No |
| AI Summary | ai_aisummary | Multiline text | No |
| Business Problem | ai_businessproblem | Multiline text | No |
| Reasoning | ai_reasoning | Multiline text | No |
| Created By | ai_createdby | Single line of text | No |
| Reviewed By | ai_reviewedby | Single line of text | No |
| Approved By | ai_approvedby | Single line of text | No |
| Reviewed At | ai_reviewedat | Date and Time | No |
| Approved At | ai_approvedat | Date and Time | No |
| Client Profile | ai_clientprofileid | Lookup → ai_ClientProfile | No |

---

### Table 3: `ai_Comment`

Display name: `AI Comment`  
Schema name: `ai_Comment`

| Display Name | Schema Name | Data Type | Required |
|---|---|---|---|
| Content | ai_content | Multiline text | Yes |
| Author | ai_author | Single line of text | Yes |
| Role | ai_role | Single line of text | No |
| Use Case | ai_usecaseid | Lookup → ai_UseCase | Yes |

---

## Step 2 — Import the Flows (6 flows)

For each flow in the `flows/` folder, follow these steps:

1. Go to [make.powerautomate.com](https://make.powerautomate.com)
2. **+ Create** → **Import Package (Legacy)**
3. Upload the `definition.json` from each flow folder

> **Alternative (simpler):** Create each flow manually.
>
> 1. **+ Create** → **Instant cloud flow** → **Power Apps (V2)** trigger
> 2. Add the inputs listed in each flow's `definition.json` under `triggers.manual.inputs.schema.properties`
> 3. Add actions in order as listed in the flow's `actions` block
> 4. For `AnalyzeUseCase`: add the **AI Builder → Create text with GPT** action and paste the prompt from the definition

### Naming convention (match exactly — Canvas App references these names):
- `AnalyzeUseCase`
- `SubmitUseCase`
- `ReviewUseCase`
- `ApproveUseCase`
- `RejectUseCase`
- `AddComment`

---

## Step 3 — Pack the Canvas App

The Canvas App source lives in `power-app/src/`. Use the Power Platform CLI to pack it into a `.msapp` file.

```bash
# Install CLI (if not installed)
npm install -g @microsoft/powerplatform-cli

# Pack the canvas app
pac canvas pack \
  --sources ./power-app/src \
  --msapp ./power-app/AIUseCaseSelection.msapp
```

This produces `AIUseCaseSelection.msapp` ready for import.

---

## Step 4 — Import the Canvas App

1. Go to [make.powerapps.com](https://make.powerapps.com)
2. **Apps** → **Import canvas app**
3. Upload `AIUseCaseSelection.msapp`
4. Power Apps will open it in the Studio editor

---

## Step 5 — Connect Data Sources in Studio

Once the app opens in Power Apps Studio:

1. Left panel → **Data** (cylinder icon) → **+ Add data**
2. Search for **Microsoft Dataverse**
3. Add all 3 tables:
   - `AI Client Profile` (ai_ClientProfile)
   - `AI Use Case` (ai_UseCase)
   - `AI Comment` (ai_Comment)

---

## Step 6 — Connect Flows in Studio

For each button that calls a flow:

1. Select the button (e.g. `btnAnalyze` on `scrUseCaseDetail`)
2. In the formula bar, the `OnSelect` references `AnalyzeUseCase.Run(...)`
3. Left panel → **Power Automate** → **+ Add flow** → select `AnalyzeUseCase`
4. Repeat for all 6 flows

> If the flow name in the formula doesn't match the actual flow name, update the formula to match.

---

## Step 7 — Test End-to-End

Test in this order:

| # | Action | Expected |
|---|---|---|
| 1 | Open app, set role to Creator | App loads, Dashboard shows empty state |
| 2 | Navigate to Client Profile, create a profile | Profile appears in list, set as active |
| 3 | Navigate to New Use Case, fill form, create | Navigates to detail page |
| 4 | Click **Run AI Analysis** | Scores and AI summary populate (10–30 seconds) |
| 5 | Click **Submit for Review** | Status changes to IN_REVIEW |
| 6 | Switch role to Reviewer, adjust scores, Save Review | Scores update |
| 7 | Switch role to Approver, click Approve | Status changes to APPROVED |
| 8 | Post a comment at any stage | Comment appears in list |

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `pac canvas pack` fails | Ensure CLI version ≥ 1.22. Run `pac --version` |
| Flow not found in Studio | Ensure flow is turned **on** in Power Automate and is in the same environment |
| AI Builder action missing | Requires AI Builder connection — add **AI Builder** connector in the flow |
| Dataverse table not found | Check schema names match exactly (case-sensitive) |
| `ai_clientprofileid` lookup fails | Ensure the Lookup column was created with a relationship to `ai_ClientProfile`, not just a text field |

---

## File Reference

```
power-app/
├── src/
│   ├── App.fx.yaml                  — App OnStart, global vars
│   ├── CanvasManifest.json          — App metadata
│   └── Src/
│       ├── scrDashboard.fx.yaml     — Dashboard screen
│       ├── scrClientProfile.fx.yaml — Client profile screen
│       ├── scrNewUseCase.fx.yaml    — New use case form
│       └── scrUseCaseDetail.fx.yaml — Detail + workflow + comments
└── flows/
    ├── AnalyzeUseCase/definition.json
    ├── SubmitUseCase/definition.json
    ├── ReviewUseCase/definition.json
    ├── ApproveUseCase/definition.json
    ├── RejectUseCase/definition.json
    └── AddComment/definition.json
```
