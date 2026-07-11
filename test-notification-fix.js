/**
 * Notification Diagnostic and Test Script
 * Run this in the browser console to diagnose and test push notifications
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire script
 * 3. Run: await testNotifications()
 */

async function testNotifications() {
  console.log('🔍 Starting notification diagnostic...\n');
  
  const results = {
    serviceWorkers: [],
    permissions: null,
    fcmToken: null,
    pushSubscription: null,
    errors: []
  };

  // 1. Check Service Workers
  console.log('1️⃣ Checking Service Workers...');
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log(`   Found ${registrations.length} service worker(s)`);
    
    registrations.forEach((reg, index) => {
      const sw = {
        index: index + 1,
        scope: reg.scope,
        scriptURL: reg.active?.scriptURL || 'Not active',
        state: reg.active?.state || 'Unknown'
      };
      results.serviceWorkers.push(sw);
      console.log(`   SW ${index + 1}:`, sw.scriptURL);
    });

    // Check if firebase-messaging-sw.js is registered
    const hasFirebaseSW = registrations.some(reg => 
      reg.active?.scriptURL.includes('firebase-messaging-sw.js')
    );

    if (registrations.length === 0) {
      console.log('   ❌ No service workers registered!');
      results.errors.push('No service workers registered');
    } else if (!hasFirebaseSW) {
      console.log('   ⚠️  firebase-messaging-sw.js is NOT registered!');
      results.errors.push('firebase-messaging-sw.js not registered');
    } else if (registrations.length > 1) {
      console.log('   ⚠️  Multiple service workers detected (may cause conflicts)');
      results.errors.push('Multiple service workers registered');
    } else {
      console.log('   ✅ firebase-messaging-sw.js is registered correctly');
    }
  } catch (error) {
    console.error('   ❌ Error checking service workers:', error);
    results.errors.push(`Service worker check failed: ${error.message}`);
  }

  console.log('');

  // 2. Check Notification Permission
  console.log('2️⃣ Checking Notification Permission...');
  try {
    if ('Notification' in window) {
      results.permissions = Notification.permission;
      console.log(`   Permission: ${Notification.permission}`);
      
      if (Notification.permission === 'granted') {
        console.log('   ✅ Notifications are allowed');
      } else if (Notification.permission === 'denied') {
        console.log('   ❌ Notifications are blocked');
        results.errors.push('Notification permission denied');
      } else {
        console.log('   ⚠️  Notification permission not requested yet');
      }
    } else {
      console.log('   ❌ Notifications not supported');
      results.errors.push('Notifications not supported');
    }
  } catch (error) {
    console.error('   ❌ Error checking permissions:', error);
    results.errors.push(`Permission check failed: ${error.message}`);
  }

  console.log('');

  // 3. Check Push Subscription
  console.log('3️⃣ Checking Push Subscription...');
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      results.pushSubscription = {
        endpoint: subscription.endpoint.substring(0, 50) + '...',
        expirationTime: subscription.expirationTime
      };
      console.log('   ✅ Push subscription active');
      console.log('   Endpoint:', subscription.endpoint.substring(0, 50) + '...');
    } else {
      console.log('   ❌ No push subscription found');
      results.errors.push('No push subscription');
    }
  } catch (error) {
    console.error('   ❌ Error checking push subscription:', error);
    results.errors.push(`Push subscription check failed: ${error.message}`);
  }

  console.log('');

  // 4. Check FCM Token (from localStorage or sessionStorage)
  console.log('4️⃣ Checking FCM Token...');
  try {
    // Try to find FCM token in storage
    const fcmTokenKey = Object.keys(localStorage).find(key => 
      key.includes('firebase') || key.includes('fcm')
    );
    
    if (fcmTokenKey) {
      const tokenData = localStorage.getItem(fcmTokenKey);
      console.log('   ✅ FCM token found in localStorage');
      results.fcmToken = tokenData?.substring(0, 20) + '...';
    } else {
      console.log('   ⚠️  No FCM token found in localStorage');
    }
  } catch (error) {
    console.error('   ❌ Error checking FCM token:', error);
  }

  console.log('');

  // 5. Summary
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`Service Workers: ${results.serviceWorkers.length}`);
  console.log(`Permission: ${results.permissions || 'Unknown'}`);
  console.log(`Push Subscription: ${results.pushSubscription ? 'Active' : 'None'}`);
  console.log(`FCM Token: ${results.fcmToken ? 'Found' : 'Not found'}`);
  console.log(`Errors: ${results.errors.length}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ ISSUES FOUND:');
    results.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  } else {
    console.log('\n✅ All checks passed!');
  }

  console.log('');

  // 6. Recommendations
  console.log('💡 RECOMMENDATIONS');
  console.log('═══════════════════════════════════════');
  
  if (results.serviceWorkers.length === 0) {
    console.log('   → Reload the page to register service worker');
  } else if (results.serviceWorkers.length > 1) {
    console.log('   → Click "Fix SW Issues" button to clear conflicting service workers');
    console.log('   → Or run: await fixServiceWorkers()');
  }
  
  if (results.permissions === 'default') {
    console.log('   → Click "Enable Notifications" button to request permission');
  } else if (results.permissions === 'denied') {
    console.log('   → Go to browser settings and allow notifications for this site');
  }
  
  if (!results.pushSubscription && results.permissions === 'granted') {
    console.log('   → Try disabling and re-enabling notifications');
  }

  console.log('');
  console.log('🧪 To send a test notification, run:');
  console.log('   await sendTestNotification("YOUR_USER_ID")');
  
  return results;
}

/**
 * Fix service worker issues by unregistering all and reloading
 */
async function fixServiceWorkers() {
  console.log('🔧 Fixing service workers...');
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log(`   Found ${registrations.length} service worker(s) to unregister`);
    
    for (const reg of registrations) {
      console.log(`   Unregistering: ${reg.active?.scriptURL || reg.scope}`);
      await reg.unregister();
    }
    
    console.log('   ✅ All service workers unregistered');
    console.log('   🔄 Reloading page in 2 seconds...');
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (error) {
    console.error('   ❌ Error fixing service workers:', error);
  }
}

/**
 * Send a test notification
 */
async function sendTestNotification(userId) {
  if (!userId) {
    console.error('❌ Please provide a user ID');
    console.log('Usage: await sendTestNotification("YOUR_USER_ID")');
    return;
  }

  console.log('📤 Sending test notification...');
  
  try {
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userIds: [userId],
        title: 'Test Notification',
        body: 'This is a test notification from the diagnostic script',
        data: {
          url: '/notifications',
          type: 'test',
        },
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Test notification sent successfully!');
      console.log('   Check your device for the notification');
      console.log('   Result:', result);
    } else {
      console.error('❌ Failed to send test notification');
      console.error('   Error:', result);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
  }
}

/**
 * Check Firestore for FCM token
 */
async function checkFirestoreToken(userId) {
  if (!userId) {
    console.error('❌ Please provide a user ID');
    return;
  }

  console.log('🔍 Checking Firestore for FCM token...');
  console.log('   Go to: https://console.firebase.google.com/project/hrms-82eb5/firestore/data/fcmTokens/' + userId);
  console.log('   Check if a token document exists for this user');
}

// Auto-run diagnostic on load
console.log('🚀 Notification Diagnostic Script Loaded');
console.log('═══════════════════════════════════════════════════════════');
console.log('Available commands:');
console.log('  • await testNotifications()           - Run full diagnostic');
console.log('  • await fixServiceWorkers()           - Fix SW conflicts');
console.log('  • await sendTestNotification(userId)  - Send test notification');
console.log('  • checkFirestoreToken(userId)         - Check Firestore token');
console.log('═══════════════════════════════════════════════════════════\n');

// Export functions to window for easy access
window.testNotifications = testNotifications;
window.fixServiceWorkers = fixServiceWorkers;
window.sendTestNotification = sendTestNotification;
window.checkFirestoreToken = checkFirestoreToken;
