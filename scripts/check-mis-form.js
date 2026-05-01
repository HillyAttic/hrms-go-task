/**
 * Check MIS configuration and form template status
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

async function checkMISForm() {
  try {
    console.log('=== Checking MIS Configuration ===\n');

    // Check MIS config
    const misDoc = await db.collection('mis_configurations').doc('current').get();

    if (!misDoc.exists) {
      console.log('❌ MIS configuration not found');
      console.log('Collection: mis_configurations, Document: current');
      return;
    }

    const misData = misDoc.data();
    console.log('✅ MIS Configuration found:');
    console.log('  - Daily Form Template ID:', misData.dailyFormTemplateId || 'NOT SET');
    console.log('  - Form Required for Clockout:', misData.formRequiredForClockout || false);
    console.log('  - Form Assigned Users:', misData.formAssignedUsers?.length || 0, 'users');
    console.log('  - Sheet Assigned Users:', misData.sheetAssignedUsers?.length || 0, 'users');

    if (misData.dailyFormTemplateId) {
      console.log('\n=== Checking Form Template ===\n');

      // Check if form template exists
      const formDoc = await db.collection('form_templates').doc(misData.dailyFormTemplateId).get();

      if (!formDoc.exists) {
        console.log('❌ Form template NOT FOUND in database');
        console.log('  - Template ID:', misData.dailyFormTemplateId);
        console.log('  - Collection: form_templates');
        console.log('\n⚠️  This is why the dashboard form is not showing!');
        console.log('\n💡 Solution: Create a new form template or update the MIS config with a valid form ID');
      } else {
        const formData = formDoc.data();
        console.log('✅ Form template found:');
        console.log('  - Title:', formData.title);
        console.log('  - Status:', formData.status);
        console.log('  - Fields:', formData.fields?.length || 0);
        console.log('  - Created by:', formData.createdBy);

        if (formData.status !== 'published') {
          console.log('\n⚠️  Form is not published! Status:', formData.status);
        }
      }
    } else {
      console.log('\n⚠️  No daily form template ID configured');
    }

    // List all available form templates
    console.log('\n=== Available Form Templates ===\n');
    const formsSnapshot = await db.collection('form_templates').get();

    if (formsSnapshot.empty) {
      console.log('❌ No form templates found in database');
    } else {
      console.log(`Found ${formsSnapshot.size} form template(s):\n`);
      formsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  📋 ${data.title}`);
        console.log(`     ID: ${doc.id}`);
        console.log(`     Status: ${data.status}`);
        console.log(`     Fields: ${data.fields?.length || 0}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkMISForm();
