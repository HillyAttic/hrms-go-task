/**
 * Check form template access control
 */
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found in environment');
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountKey);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkFormAccess() {
  try {
    const formId = 'dK0D8ziCvcROvPhFnx3k';
    const userId = 'HEN5EXqthwYTgwxXCLoz7pqFl453'; // Your user ID from logs

    console.log('=== Checking Form Access ===\n');
    console.log('Form ID:', formId);
    console.log('User ID:', userId);
    console.log('');

    // Get form template
    const formDoc = await db.collection('form_templates').doc(formId).get();

    if (!formDoc.exists) {
      console.log('❌ Form template not found');
      return;
    }

    const formData = formDoc.data();
    console.log('✅ Form template found:');
    console.log('  - Title:', formData.title);
    console.log('  - Status:', formData.status);
    console.log('  - Created by:', formData.createdBy);
    console.log('');

    console.log('=== Access Control Settings ===\n');
    const accessControl = formData.accessControl || {};
    console.log('  - Type:', accessControl.type || 'NOT SET');
    console.log('  - Allowed Roles:', accessControl.allowedRoles || []);
    console.log('  - Allowed User IDs:', accessControl.allowedUserIds || []);
    console.log('');

    // Get user info
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log('❌ User not found');
      return;
    }

    const userData = userDoc.data();
    console.log('=== User Info ===\n');
    console.log('  - Name:', userData.name);
    console.log('  - Email:', userData.email);
    console.log('  - Role:', userData.role);
    console.log('');

    // Check access
    console.log('=== Access Check ===\n');

    if (accessControl.type === 'public') {
      console.log('✅ Form is PUBLIC - everyone has access');
    } else if (accessControl.type === 'authenticated') {
      console.log('✅ Form is AUTHENTICATED - all logged-in users have access');
    } else if (accessControl.type === 'restricted') {
      console.log('⚠️  Form is RESTRICTED - checking permissions...');

      const roleAllowed = accessControl.allowedRoles?.includes(userData.role);
      const userAllowed = accessControl.allowedUserIds?.includes(userId);

      console.log('  - Role allowed?', roleAllowed ? '✅ YES' : '❌ NO');
      console.log('  - User ID allowed?', userAllowed ? '✅ YES' : '❌ NO');

      if (roleAllowed || userAllowed) {
        console.log('\n✅ User HAS ACCESS to this form');
      } else {
        console.log('\n❌ User DOES NOT HAVE ACCESS to this form');
        console.log('\n💡 Solution: Add user to allowedUserIds or add their role to allowedRoles');
      }
    } else {
      console.log('❌ Unknown access control type:', accessControl.type);
    }

    // Check MIS config
    console.log('\n=== MIS Configuration ===\n');
    const misDoc = await db.collection('mis_configurations').doc('current').get();
    if (misDoc.exists) {
      const misData = misDoc.data();
      const isAssigned = misData.formAssignedUsers?.includes(userId);
      console.log('  - User in formAssignedUsers?', isAssigned ? '✅ YES' : '❌ NO');

      if (!isAssigned) {
        console.log('\n⚠️  User is NOT in MIS formAssignedUsers list');
        console.log('💡 This might prevent the form from showing on dashboard');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkFormAccess();
