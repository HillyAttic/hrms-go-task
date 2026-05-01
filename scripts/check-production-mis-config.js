/**
 * Check MIS configuration in production
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

async function checkMISConfig() {
  try {
    const userId = 'HEN5EXqthwYTgwxXCLoz7pqFl453';

    console.log('=== CHECKING MIS CONFIGURATION ===\n');

    const misDoc = await db.collection('mis_configurations').doc('current').get();

    if (!misDoc.exists) {
      console.log('❌ MIS configuration NOT FOUND');
      console.log('This means form validation will be SKIPPED');
      process.exit(0);
    }

    const misData = misDoc.data();

    console.log('✅ MIS Configuration found:\n');
    console.log('formRequiredForClockout:', misData.formRequiredForClockout);
    console.log('dailyFormTemplateId:', misData.dailyFormTemplateId);
    console.log('formAssignedUsers:', misData.formAssignedUsers);
    console.log('');

    const isUserAssigned = misData.formAssignedUsers?.includes(userId);
    console.log('Is user', userId, 'assigned?', isUserAssigned);

    console.log('\n=== EXPECTED BEHAVIOR ===');
    if (misData.formRequiredForClockout && isUserAssigned && misData.dailyFormTemplateId) {
      console.log('✅ Form validation SHOULD BE ENFORCED for this user');
      console.log('   - User must submit form before clock-out');
    } else {
      console.log('❌ Form validation WILL BE SKIPPED because:');
      if (!misData.formRequiredForClockout) {
        console.log('   - formRequiredForClockout is false');
      }
      if (!isUserAssigned) {
        console.log('   - User is not in formAssignedUsers list');
      }
      if (!misData.dailyFormTemplateId) {
        console.log('   - No dailyFormTemplateId configured');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkMISConfig();
