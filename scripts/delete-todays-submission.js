/**
 * Delete today's form submission for testing
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

async function deleteTodaysSubmission() {
  try {
    const formId = 'dK0D8ziCvcROvPhFnx3k';
    const userId = 'HEN5EXqthwYTgwxXCLoz7pqFl453';

    console.log('Searching for today\'s submission...');
    console.log('Form ID:', formId);
    console.log('User ID:', userId);

    const snapshot = await db.collection('form_submissions')
      .where('formId', '==', formId)
      .where('submittedBy', '==', userId)
      .get();

    if (snapshot.empty) {
      console.log('No submissions found');
      process.exit(0);
    }

    console.log(`Found ${snapshot.size} submission(s)`);

    for (const doc of snapshot.docs) {
      const data = doc.data();
      console.log('\nSubmission:', {
        id: doc.id,
        submittedAt: data.submittedAt.toDate().toISOString(),
        formId: data.formId
      });

      await doc.ref.delete();
      console.log('✅ Deleted submission:', doc.id);
    }

    console.log('\n✅ All submissions deleted');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

deleteTodaysSubmission();
