/**
 * Diagnose production form submission issue
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

async function diagnoseProduction() {
  try {
    const formId = 'dK0D8ziCvcROvPhFnx3k';
    const userId = 'HEN5EXqthwYTgwxXCLoz7pqFl453';

    console.log('=== PRODUCTION DIAGNOSIS ===\n');
    console.log('Current server time (UTC):', new Date().toISOString());
    console.log('Form ID:', formId);
    console.log('User ID:', userId);
    console.log('');

    // Get ALL submissions for this user and form
    console.log('Fetching ALL submissions for this user...\n');
    const allSubmissions = await db.collection('form_submissions')
      .where('formId', '==', formId)
      .where('submittedBy', '==', userId)
      .orderBy('submittedAt', 'desc')
      .get();

    if (allSubmissions.empty) {
      console.log('✅ No submissions found - validation should BLOCK clock-out');
      process.exit(0);
    }

    console.log(`Found ${allSubmissions.size} total submission(s):\n`);

    allSubmissions.forEach((doc, index) => {
      const data = doc.data();
      const submittedAt = data.submittedAt.toDate();

      console.log(`Submission #${index + 1}:`);
      console.log('  ID:', doc.id);
      console.log('  Submitted At (UTC):', submittedAt.toISOString());
      console.log('  Submitted At (Local):', submittedAt.toString());
      console.log('  Days ago:', Math.floor((Date.now() - submittedAt.getTime()) / (1000 * 60 * 60 * 24)));
      console.log('');
    });

    // Simulate the checkUserSubmissionToday logic
    console.log('=== SIMULATING checkUserSubmissionToday ===\n');

    const now = new Date();
    console.log('Input date:', now.toISOString());

    // UTC-based date range (what the code should use)
    const startOfDayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0
    ));

    const endOfDayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23, 59, 59, 999
    ));

    console.log('UTC Date Range:');
    console.log('  Start:', startOfDayUTC.toISOString());
    console.log('  End:', endOfDayUTC.toISOString());
    console.log('');

    // Check which submissions fall in today's range
    const todaySubmissions = allSubmissions.docs.filter(doc => {
      const submittedAt = doc.data().submittedAt.toDate();
      return submittedAt >= startOfDayUTC && submittedAt <= endOfDayUTC;
    });

    console.log(`Submissions in today's UTC range: ${todaySubmissions.length}`);

    if (todaySubmissions.length > 0) {
      console.log('❌ FOUND TODAY\'S SUBMISSION - validation will ALLOW clock-out');
      todaySubmissions.forEach(doc => {
        const data = doc.data();
        console.log('  - Submission ID:', doc.id);
        console.log('    Submitted At:', data.submittedAt.toDate().toISOString());
      });
    } else {
      console.log('✅ NO TODAY\'S SUBMISSION - validation will BLOCK clock-out');
    }

    console.log('\n=== DIAGNOSIS COMPLETE ===');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

diagnoseProduction();
