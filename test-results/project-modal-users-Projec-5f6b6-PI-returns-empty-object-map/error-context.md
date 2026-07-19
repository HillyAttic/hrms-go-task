# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: project-modal-users.test.ts >> ProjectModal - Team Members User Selector >> should show "No users found" when API returns empty object map
- Location: src\__tests__\e2e\project-modal-users.test.ts:79:7

# Error details

```
TimeoutError: locator.waitFor: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Add New Project")') to be visible

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - main [ref=e4]:
    - generic [ref=e6]:
      - generic [ref=e10]:
        - generic [ref=e11]:
          - generic [ref=e12]: Email*
          - generic [ref=e13]:
            - textbox "Email*" [ref=e14]:
              - /placeholder: Enter your email
            - img [ref=e15]
        - generic [ref=e17]:
          - generic [ref=e18]:
            - generic [ref=e19]: Password*
            - textbox "Password*" [ref=e21]:
              - /placeholder: Enter your password
          - button "Show password" [ref=e22] [cursor=pointer]:
            - img [ref=e23]
        - generic [ref=e26]:
          - generic [ref=e28] [cursor=pointer]:
            - checkbox "Remember me" [ref=e30]
            - generic [ref=e32]: Remember me
          - link "Forgot Password?" [ref=e33] [cursor=pointer]:
            - /url: /auth/forgot-password
        - button "Sign In" [ref=e35] [cursor=pointer]
      - generic [ref=e37]:
        - link "Logo" [ref=e38] [cursor=pointer]:
          - /url: /
          - img "Logo" [ref=e39]
        - paragraph [ref=e40]: Sign in to your account
        - heading "Welcome Back!" [level=1] [ref=e41]
        - paragraph [ref=e42]: Please sign in to your account by completing the necessary fields below
        - img "Logo" [ref=e44]
  - region "Notifications Alt+T"
  - button "Open Next.js Dev Tools" [ref=e50] [cursor=pointer]:
    - img [ref=e51]
  - alert [ref=e54]: Welcome Back!
```

# Test source

```ts
  1   | /**
  2   |  * E2E Tests for ProjectModal - Team Members Multi-Select
  3   |  *
  4   |  * These tests verify that the team members user selector handles
  5   |  * all possible API response shapes without crashing with
  6   |  * "filteredUsers.map is not a function".
  7   |  */
  8   | import { test, expect, Page } from '@playwright/test';
  9   | 
  10  | const PROJECTS_URL = 'http://localhost:3000/projects';
  11  | 
  12  | /**
  13  |  * Intercept /api/users/names on the page and return a custom response body.
  14  |  */
  15  | async function stubUsersAPI(page: Page, body: unknown, status = 200) {
  16  |   await page.route('**/api/users/names', async (route) => {
  17  |     await route.fulfill({
  18  |       status,
  19  |       contentType: 'application/json',
  20  |       body: JSON.stringify(body),
  21  |     });
  22  |   });
  23  | }
  24  | 
  25  | test.describe('ProjectModal - Team Members User Selector', () => {
  26  |   test.beforeEach(async ({ page }) => {
  27  |     // Navigate to the projects page
  28  |     await page.goto(PROJECTS_URL);
  29  |     await page.waitForLoadState('networkidle');
  30  | 
  31  |     // Open the "Create New Project" modal
  32  |     const addButton = page.locator('button:has-text("Add New Project")');
> 33  |     await addButton.waitFor({ state: 'visible', timeout: 10000 });
      |                     ^ TimeoutError: locator.waitFor: Timeout 10000ms exceeded.
  34  |     await addButton.click();
  35  | 
  36  |     // Wait for modal to appear
  37  |     await expect(page.locator('text=Create New Project')).toBeVisible({ timeout: 5000 });
  38  |   });
  39  | 
  40  |   test('should render user list when API returns an object map { uid: name }', async ({ page }) => {
  41  |     // Stub the users API to return a map (the actual shape of /api/users/names)
  42  |     await stubUsersAPI(page, {
  43  |       'user1': 'Alice',
  44  |       'user2': 'Bob',
  45  |       'user3': 'Charlie',
  46  |     });
  47  | 
  48  |     // Fill required fields to trigger modal render
  49  |     await page.fill('input[name="projectName"]', 'Test Project');
  50  |     await page.selectOption('select[name="clientId"]', { index: 1 });
  51  |     await page.fill('input[name="clientSpocName"]', 'SPOC Name');
  52  |     await page.fill('input[name="startDate"]', '2026-07-01');
  53  | 
  54  |     // Wait for the user list to load (triggered by useEffect on isOpen)
  55  |     // The modal is already open from beforeEach, so the useEffect should fire
  56  |     // We need to wait for the API call to resolve
  57  |     await page.waitForTimeout(1000);
  58  | 
  59  |     // Click on the search input to make sure the list is rendered
  60  |     const searchInput = page.locator('input[placeholder="Search team members..."]');
  61  |     await expect(searchInput).toBeVisible({ timeout: 5000 });
  62  | 
  63  |     // Verify we can see users in the list
  64  |     // The text "Alice" or "Bob" should be visible
  65  |     await expect(page.locator('text=Alice').first()).toBeVisible({ timeout: 3000 });
  66  |     await expect(page.locator('text=Bob').first()).toBeVisible();
  67  |     await expect(page.locator('text=Charlie').first()).toBeVisible();
  68  |   });
  69  | 
  70  |   test('should show "No users found" when API returns empty array', async ({ page }) => {
  71  |     await stubUsersAPI(page, []);
  72  | 
  73  |     await page.waitForTimeout(500);
  74  | 
  75  |     // Should show "No users found" (not crash)
  76  |     await expect(page.locator('text=No users found')).toBeVisible({ timeout: 5000 });
  77  |   });
  78  | 
  79  |   test('should show "No users found" when API returns empty object map', async ({ page }) => {
  80  |     await stubUsersAPI(page, {});
  81  | 
  82  |     await page.waitForTimeout(500);
  83  | 
  84  |     await expect(page.locator('text=No users found')).toBeVisible({ timeout: 5000 });
  85  |   });
  86  | 
  87  |   test('should handle API returning null gracefully', async ({ page }) => {
  88  |     await stubUsersAPI(page, null);
  89  | 
  90  |     await page.waitForTimeout(500);
  91  | 
  92  |     // Should show "No users found" (not crash)
  93  |     await expect(page.locator('text=No users found')).toBeVisible({ timeout: 5000 });
  94  |   });
  95  | 
  96  |   test('should handle API returning undefined-like shape gracefully', async ({ page }) => {
  97  |     await stubUsersAPI(page, '');
  98  | 
  99  |     await page.waitForTimeout(500);
  100 | 
  101 |     // Should show "No users found" (not crash)
  102 |     await expect(page.locator('text=No users found')).toBeVisible({ timeout: 5000 });
  103 |   });
  104 | 
  105 |   test('should handle non-ok API response gracefully', async ({ page }) => {
  106 |     await stubUsersAPI(page, { error: 'Unauthorized' }, 401);
  107 | 
  108 |     await page.waitForTimeout(500);
  109 | 
  110 |     // Should show "No users found" (not crash)
  111 |     await expect(page.locator('text=No users found')).toBeVisible({ timeout: 5000 });
  112 |   });
  113 | 
  114 |   test('should handle API returning wrapped { data: [...] } array', async ({ page }) => {
  115 |     await stubUsersAPI(page, {
  116 |       data: [
  117 |         { uid: 'u1', displayName: 'Alice', email: 'alice@test.com' },
  118 |         { uid: 'u2', displayName: 'Bob', email: 'bob@test.com' },
  119 |       ],
  120 |     });
  121 | 
  122 |     await page.waitForTimeout(500);
  123 | 
  124 |     const searchInput = page.locator('input[placeholder="Search team members..."]');
  125 |     await expect(searchInput).toBeVisible({ timeout: 5000 });
  126 | 
  127 |     await expect(page.locator('text=Alice').first()).toBeVisible({ timeout: 3000 });
  128 |     await expect(page.locator('text=Bob').first()).toBeVisible();
  129 |   });
  130 | 
  131 |   test('should filter users when searching', async ({ page }) => {
  132 |     await stubUsersAPI(page, {
  133 |       'user1': 'Alice Johnson',
```