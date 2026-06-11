# Export to Excel Troubleshooting Guide

## Issue
The "Export to Excel" button appears but doesn't download the file when clicked.

## Common Causes & Solutions

### 1. **Need to Refresh the Browser**
**Solution:**
- Hard refresh the page: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Or clear browser cache and reload

### 2. **Dev Server Not Restarted**
**Solution:**
```bash
# Stop the current dev server (Ctrl+C)
# Then restart it
npm run dev
```

### 3. **Check Browser Console for Errors**
**Steps:**
1. Open browser DevTools: Press `F12`
2. Go to the **Console** tab
3. Click the "Export to Excel" button
4. Look for any red error messages

**Common errors you might see:**
- `XLSX is not defined` → Need to restart dev server
- `Cannot read property 'utils' of undefined` → XLSX import issue
- `Failed to export clients` → Check the actual error in console

### 4. **Browser Blocking Downloads**
**Solution:**
- Check if your browser blocked the download (look for a download icon in the address bar)
- Allow downloads from localhost
- Check browser's download settings

### 5. **Check Network Tab**
**Steps:**
1. Open DevTools (F12)
2. Go to **Network** tab
3. Click "Export to Excel"
4. See if any API calls fail

### 6. **Verify Clients Are Loaded**
**Steps:**
1. Open DevTools Console
2. Type: `console.log('Clients loaded:', document.querySelector('table tbody tr').length)`
3. If it shows 0, clients aren't loaded yet

## Testing Steps

### Step 1: Check if the button works
1. Open browser console (F12)
2. Click "Export to Excel" button
3. You should see these console logs:
   ```
   Export clicked, filtered clients: 184
   Calling exportClientsToExcel...
   Export function completed
   ```

### Step 2: Check if XLSX is available
1. Open browser console
2. Type: `import('xlsx').then(XLSX => console.log('XLSX loaded:', XLSX))`
3. Should see XLSX object in console

### Step 3: Test the export function directly
1. Open browser console
2. Paste this code:
   ```javascript
   import('xlsx').then(XLSX => {
     const wb = XLSX.utils.book_new();
     const ws = XLSX.utils.aoa_to_sheet([['Test', 'Data'], ['Row1', 'Value1']]);
     XLSX.utils.book_append_sheet(wb, ws, 'Test');
     XLSX.writeFile(wb, 'test.xlsx');
     console.log('Test export completed');
   });
   ```
3. If this downloads a file, the export function works

## Quick Fix Checklist

- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Restart dev server (`npm run dev`)
- [ ] Check browser console for errors
- [ ] Check browser didn't block downloads
- [ ] Verify clients are loaded (184 rows in table)
- [ ] Try in incognito/private mode
- [ ] Try different browser (Chrome, Firefox, Edge)

## If Still Not Working

### Check the build
```bash
# Build the project to see if there are any build errors
npm run build
```

### Check the export file
1. Open: `d:\jpcopanel\src\utils\client-export.utils.ts`
2. Verify the file exists and has no syntax errors
3. Look for the `exportClientsToExcel` function

### Verify imports in page
1. Open: `d:\jpcopanel\src\app\clients\page.tsx`
2. Check line 12: Should have `import { exportClientsToExcel } from '@/utils/client-export.utils';`
3. Check the `handleExport` function around line 125

## Expected Behavior

### When clicking "Export to Excel":
1. You should see a toast notification: "Preparing export..."
2. Browser should download a file named like: `Clients_Export_20260611_131859.xlsx`
3. You should see a success toast: "Successfully exported 184 clients to Excel"
4. The file should appear in your Downloads folder

### File Contents:
- **Sheet 1 (Info)**: Metadata about the export
- **Sheet 2 (Clients)**: All 184 clients with all 25 fields

## Debug Mode

If you want more detailed logging, open the browser console and run:
```javascript
localStorage.setItem('DEBUG_EXPORT', 'true');
```

Then reload the page and try exporting again. You'll see more detailed logs.

## Contact Support

If none of these solutions work, provide:
1. Screenshot of browser console errors
2. Browser name and version
3. Operating system
4. What you see when clicking the export button
5. Any toast notifications that appear
