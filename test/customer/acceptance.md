# Acceptance (Customer) Testing

### AT-01: Strategic AI Executive Briefing
User Story: Omniscient Global Search & Navigator (AI Component)
Developer: Naeem Baig / Yusuf Garba
Scenario: An executive needs a quick summary of their current workload without manual filtering.

Steps:
User navigates to the Dashboard.
User clicks the RotateCw (Refresh) icon in the "Strategic Brief" banner.
The system calls the generateStrategicBrief function, passing the user’s role, top 5 pending tasks, and next 3 upcoming events to the Gemini API.
Success Criteria: The banner displays a 2-sentence summary. If the API fails (e.g., rate limit), the Emergency Fallback Logic triggers, displaying a pre-defined strategic message specific to the user's role (e.g., "Budget utilization is currently at 84%..." for VP Finance).

### AT-02: Role-Specific Workstation Rendering
User Story: Customizable Dashboard Engine
Developer: Taziz Ahsan
Scenario: Ensuring different club executives see the specific tools required for their job.

Steps:
Login as a user with the role "VP Finance".
Observe the dashboard content.
Logout and login as a user with the role "VP Events".
Success Criteria: The system successfully executes the renderDashboard() switch statement. The VP Finance sees the VPFinanceDashboard variant, while the VP Events user sees the VPEventsDashboard variant, confirmed by the sub-header text: "Viewing the [Role] workstation."

### AT-03: Resource Vault - Cloud Document Lifecycle
User Story: Tracking Documents in Database
Developer: Yusuf Garba
Scenario: A marketing lead needs to upload and then retrieve a club flyer.

Steps:
Navigate to the Resource Vault (Documents Page).
Click "Upload", select a file, and assign the category "marketing".
Click "Upload".
Search for the file name in the filter bar.
Click the "Get" (Download) button on the generated file card.
Success Criteria: The file is stored in the azure-planbstorage bucket. The database creates a record in the documents table. The download triggers a URL.createObjectURL from the Supabase storage blob, successfully saving the file to the local machine.

### AT-04: Real-Time Financial Ledger Persistence
User Story: Club Finance Management
Developer: Naeem Baig
Scenario: Approving an expense and seeing it reflected in the overall organization health.

Steps:
Navigate to the Finance Page -> Expenses Tab.
Locate a "Pending" expense and click "Approve".
Navigate back to the Budget Overview tab.
Success Criteria: The updateExpenseStatus function updates the Supabase expenses table. The totalSpent useMemo hook automatically recalculates, including the newly approved amount in the "Total Spent" tally, proving the live link between the database and the UI state.

### AT-05: Multi-Tab Financial Data Segmentation
User Story: Club Finance Management
Developer: Naeem Baig
Scenario: Navigating between different financial data streams.

Steps:
On the Finance Page, click through the sub-navigation tabs: Overview, Expenses, Reimbursements, Income, Analytics.
Success Criteria: The activeTab state updates the UI to render the correct component (e.g., IncomeTab). Each tab successfully fetches its specific dataset (e.g., the Income table) via the FinanceProvider, and the layout uses the animate-in CSS transition for a smooth visual switch.

### AT-06: Resource Vault Category Filtering
User Story: Sophisticated Sorting
Developer: Ashdeep Singh / Daniel Kyere
Scenario: A user only wants to see Governance documents to review club bylaws.

Steps:
Navigate to the Documents Page.
Click the "governance" trigger in the Tabs list.
Success Criteria: The filtered useMemo logic triggers, excluding all documents where category !== "governance". The UI updates to show only relevant files, and the getCategoryIcon function displays the ShieldCheck icon for all remaining items.