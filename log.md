# Group 13 - Project Log (ITR1)

## Team Meetings

### March 20th to March 27th 2026 - ITR3 Planning & Refactoring Strategy

- **Attendees:** Yusuf Garba, Shivam Patel, Taziz Ahsan, Ashdeep Singh, Daniel Kyere.
- **Agenda:** Addressing code smells and finalizing 15 end-to-end user stories.
- **Decisions:** Ensure that the team knows what to complete for the final draft of the project as well as understanding what are the necessary design changes and code smells that need to be taken into account
- **Rationale:** To meet ITR3 quality standards and ensure the system is release-ready

---

# Task Tracking & Estimates

| User Story | Developer | Task | Est. Time | Actual Time Status |

User Story: Automated Document Categorization
Developer: Yusuf Garba
Task: Update the DocumentsPage to include a category dropdown and map it to a category column in the Supabase documents table
Est. Time: 3 days
Actual Time: 3 days
Status: Completed

User Story: Document Version Tracking
Developer: Yusuf Garba
Task: Implement a History side-panel GUI to display a modification log for specific files ordered by update metadata
Est. Time: 2 days
Actual Time: 2 days
Status: Completed

User Story: Member Directory Export
Developer: Shivam Patel
Task: Create a utility function and GUI button to convert the JSON result from the members query into a downloadable CSV blob
Est. Time: 2 days
Actual Time: 2 days
Status: Completed

User Story: Live Profile Preview Cards
Developer: Shivam Patel
Task: Build a reusable ProfileCard component that triggers on hover to fetch and display social media data from the database
Est. Time: 3 days
Actual Time: 4 days
Status: Completed

User Story: Role-Based Access Control (RBAC) UI
Developer: Daniel Kyere
Task: Create an "Access Management" GUI in Settings to update user roles and permissions within the profile table
Est. Time: 4 days
Actual Time: 4 days
Status: Completed

User Story: Security Audit Log Viewer
Developer: Daniel Kyere
Task: Implement a "logs" table and GUI fetcher to display the most recent sensitive system actions in a paginated list
Est. Time: 3 days
Actual Time: 3 days
Status: Completed

User Story: First-Time User Guided Tour
Developer: Ashdeep Ashdeep Singh
Task: Implement an interactive tooltip-based tour for the Sidebar and Finance pages triggered by a database status flag
Est. Time: 3 days
Actual Time: 3 days
Status: Completed

User Story: Organization Setup Portal
Developer: Ashdeep Ashdeep Singh
Task: Build a GUI screen for users to create or join organizations via invite codes linked to the Supabase backend
Est. Time: 4 days
Actual Time: 5 days
Status: Completed

Developer Story: UI Decomposition
Developer: Yusuf Garba
Task: Split DashboardPage into StatsCard and Activity components to resolve "Large Class" smell
Est. Time: 6 hours
Actual Time: 6 hours
Status: Completed

Developer Story: Search Standardization
Developer: Naeem Baig
Task: Implement SearchStrategy interface to unify search logic across Finance and Contacts modules
Est. Time: 5 hours
Actual Time: 8 hours
Status: Completed

Developer Story: Data Layer Hardening
Developer: Shivam Patel
Task: Replace primitive data types with Transaction and Event domain objects for validation
Est. Time: 4 hours
Actual Time: 4 hours
Status: Completed

Developer Story: Logic Decoupling
Developer: Taziz Ahsan
Task: Extract search and filter logic from ContactsPage.tsx into useContactSearch hook
Est. Time: 4 hours
Actual Time: 5 hours
Status: Completed

User Story: Centralized Contact and Organization Management
Developer: Taziz Ahsan
Task: Setup the Task Page to handle Professional Contacts and architect global CRM context
Est. Time: 5 days
Actual Time: 5 days
Status: Completed

User Story: Confidentiality with CRM Access
Developer: Daniel Kyere
Task: Configure the login screen to ensure personal information is kept personal with no data leakage or disclosure of unauthorized access
Est. Time: 4 days
Actual TIme: Exceeded 4 days
Status: Completed

User Story: Sophisticated Sorting
Developer: Naeem Baig, Yusuf Garba, Ashdeep Ashdeep Singh, and Taziz Ahsan
Task: Configure the Events Page, Task Page, Finance Page and Members Page to have a sleek dynamic sorting algorithm
Est. Time: 2 weeks
Actual Time: 2 weeks
Status: Completed

User Story: View Professional Contact
Developer: Taziz Ahsan
Task: Configure the CRM directory and detail sheets to track and view professional partners
Est. Time: 3 days
Actual Time: 3 days
Status: Completed

User Story: Add new Professional Contact
Developer: Taziz Ahsan
Task: Configure and implement the dialog and logic to add new professionals to our database
Est. Time: 5 days
Actual Time: 4 days
Status: Completed

User Story: Event & Calendar Management
Developer: Naeem Baig
Task: Build the Events Page with Month/Week/Day calendar views, event creation/editing modal, event detail panel, and events context provider
Est. Time: 4 days
Actual Time: 3 days
Status: Completed

User Story: Multi-View Task Board
Developer: Naeem Baig
Task: Build the Tasks Page with Board (Kanban drag-and-drop), List (sortable/groupable), Timeline (Gantt chart), Calendar, and Workflow views, plus task modal and tasks context provider
Est. Time: 5 days
Actual Time: 5 days
Status: Completed

User Story: Club Finance Management
Developer: Naeem Baig
Task: Build the Finance Page with Budget Overview (charts, stats), Expenses tab (CRUD, approve/deny), Reimbursements tab (submit/approve/deny/paid flow), Income tab (dues, sponsorships, fundraising), and Analytics tab (trends, burn rate, insights)
Est. Time: 3 days
Actual Time: 2 days
Status: Completed

User Story: Customizable Dashboard Engine
Developer: Taziz Ahsan
Task: Implement a persistent drag-and-drop layout system using @dnd-kit across all 8 role-based dashboards, including widget visibility management.
Est. Time: 4 days
Actual Time: 3 days
Status: Completed

User Story: Live Data Dashboard Integration
Developer: Taziz Ahsan
Task: Connect all role-specific dashboards to real-time application state via React Contexts and implement a secure JWT-authenticated KPI Backend API.
Est. Time: 5 days
Actual Time: 4 days
Status: Completed

User Story: Comprehensive Testing Infrastructure
Developer: Taziz Ahsan
Task: Establish a robust testing suite comprising 10 unit tests (with logic stubs) and 3 integration tests (live Supabase connectivity) to ensure project stability.
Est. Time: 3 days
Actual Time: 2 days
Status: Completed

User Story: Omniscient Global Search & Navigator
Developer: Taziz Ahsan
Task: Implement cross-module indexing for all 6 primary modules, build keyboard-driven UX (Ctrl+K), and develop persistent search history engine.
Est. Time: 4 days
Actual Time: 4 days
Status: Completed

User Story: End-to-End Professional Relationship CRM
Developer: Taziz Ahsan
Developer Story: Global CRM State & Directory Architecture
Task: Architect global SponsorsContext provider for unified CRUD management
Est. Time: 2 days
Actual Time: 2 days
Status: Completed

User Story: End-to-End Professional Relationship CRM
Developer: Taziz Ahsan
Developer Story: Contact Lifecycle & Visualization Sheets
Task: Implement Contact Profile Visualization Sheet with LinkedIn integration
Est. Time: 1 day
Actual Time: 1 day
Status: Completed

User Story: Production-Grade Reliability & Verification Framework
Developer: Taziz Ahsan
Developer Story: 70+ Coverage Validation Suite
Task: Develop comprehensive Unit & Integration suite for all 5 Context modules
Est. Time: 3 days
Actual Time: 3 days
Status: Completed

User Story: Onboarding Flow
Developer: Ashdeep Ashdeep Singh
Developer Story: End-to-End Authentication & Profile Initialization
Task: Design and implement a multi-step "Welcome" wizard for first-time users to improve user experience and authorization
Est. Time: 3 days
Actual Time: 3 days
Status: In Progress

User Story: Social Media & External Profile Integration
Developer: Shivam Patel
Developer Story: OAuth Integration and External Data Mapping
Task: Implement logic to automatically fetch and map bios from external APIs to the local CRM database.
Est. Time: 3 days
Actual Time: 3 days
Status: In Progress

User Story: Tracking Documents in Database
Developer: Yusuf Garba
Developer Story: Database Storage Integration
Task: Implement a Document Upload system using Supabase Storage buckets.
Est. Time: 3 days
Actual Time: 3 days
Status: In Progress

---

## Concerns


- **Time management:** A lot of our group members underestimated just how daunting the project would be and were not on tasks with the work that they had to put out consistently
- **Testing coverage:** Test files were an after thought in the software development cycle and the team aims to improve upon them and add more details to them and ensure that all unit tests pass
- **Coordination:** With each team member working on separate pages, ensuring UI consistency required extra effort. The shared UI primitives helped, but a design system document would further improve this.


---

## Major Design Decisions & Rationale

- **Decision:** Simplistic design as opposed to our convoluted everything-app discussion
- **Rationale:** As per the customer's requests, we went with focusing on simplicity rather than versatility of our app so that we also aren't copying other products similar to ours but, instead, we are focused on making it user friendly and still aiming to make it a strong competitor when it comes to professional contact.

---

## Plan Revisions

- **Original Plan (ITR0):** We had the plan to make our very own CRM (ClubRM) to be able to do everything that other CRMs (like Salesforce, Monday, and Zoho) but built specifically for student associations and clubs, essentially pitching a business tool used in the industry but would be used for students, by students.
- **Revised Plan (ITR1):** After talking to the customer, we still have the general idea down, but downsized a bit to ensure that we are able to deliver and prioritize an easier time for our users and to also ensure that the simplicity in its design would attract more users.
- **Revised Plan (ITR3):** During ITR3, we had to revise our schedule to address a bottleneck. We had repeatedly pushed back the implementation of the Professional Contact Page in favor of core infrastructure. In the final weeks, we shifted priorities to ensure this page was fully functional with end-to-end database connectivity, as it is a core value proposition for our customer.
- **Reason for Change:** Time Considerations and Ensuring that Final Product is implemented before Deadline.
