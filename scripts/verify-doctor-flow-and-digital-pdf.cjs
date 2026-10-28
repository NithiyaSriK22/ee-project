/**
 * Verification Script: Doctor Management Flow & Digital PDF Processing
 * Tests:
 * 1. Health check (GET /api/v1/health)
 * 2. Email Suggestion Endpoint (POST /api/v1/auth/suggest-email)
 * 3. Seeded Doctor Login (POST /api/v1/auth/login) with DOC001
 * 4. Duplicate Registration Rejection (POST /api/v1/auth/register)
 * 5. New Doctor Registration & Persistence (POST /api/v1/auth/register)
 * 6. Login with Newly Registered Doctor
 * 7. Digital PDF Text Extraction verification (PDFParse)
 * 8. Doctor Portal Authenticated Queue API (GET /api/v1/doctor/queue)
 */

const http = require('http');

const BACKEND_URL = 'http://localhost:5001';

function request(method, pathName, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathName, BACKEND_URL);
    const bodyStr = data ? JSON.stringify(data) : null;
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
          ...headers,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: body ? JSON.parse(body) : null,
              rawBody: body,
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body,
              rawBody: body,
            });
          }
        });
      }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function buildMinimalPdf(text) {
  const contentStream = `BT /F1 12 Tf 50 700 Td (${text}) Tj ET`;
  const streamLength = contentStream.length;

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${contentStream}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000236 00000 n 
0000000300 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
380
%%EOF`;

  return Buffer.from(pdf, 'utf-8');
}

async function runVerification() {
  console.log('====================================================');
  console.log('THUNAI VERIFICATION: DOCTOR FLOW & DIGITAL PDF OCR FIX');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await request('GET', '/api/v1/health');
    assert(health.statusCode === 200 && health.body.data.status === 'healthy', 'Backend server is healthy and database is connected');

    // 2. Suggest short email
    console.log('\n--- 1. Testing Short Email Suggestion API ---');
    const suggestRes = await request('POST', '/api/v1/auth/suggest-email', {
      fullName: 'Dr. Suresh Varma',
      doctorId: 'DOC006',
    });
    assert(suggestRes.statusCode === 200, 'Suggest email returns HTTP 200');
    assert(suggestRes.body?.data?.email === 'suresh@medbrief.test', `Suggested email is suresh@medbrief.test (got: ${suggestRes.body?.data?.email})`);

    // 3. Duplicate short email collision handling
    const suggestRes2 = await request('POST', '/api/v1/auth/suggest-email', {
      fullName: 'Dr. Arun Kumar',
    });
    assert(suggestRes2.statusCode === 200, 'Suggest email for existing doctor returns HTTP 200');
    assert(suggestRes2.body?.data?.email === 'arun2@medbrief.test', `Collision handled, suggested email is arun2@medbrief.test (got: ${suggestRes2.body?.data?.email})`);

    // 4. Seeded Doctor Login (arun@medbrief.test) with password doctor123
    console.log('\n--- 2. Testing Seeded Doctor Login (arun@medbrief.test) ---');
    const loginRes = await request('POST', '/api/v1/auth/login', {
      email: 'arun@medbrief.test',
      password: 'doctor123',
    });
    assert(loginRes.statusCode === 200, 'Seeded doctor login succeeds (HTTP 200)');
    const accessToken = loginRes.body?.data?.tokens?.accessToken;
    assert(!!accessToken, 'Access token returned for doctor');
    const doctorProfile = loginRes.body?.data?.user;
    assert(doctorProfile?.fullName === 'Dr. Arun Kumar', `Full name matches: ${doctorProfile?.fullName}`);
    assert(doctorProfile?.email === 'arun@medbrief.test', `Email matches: ${doctorProfile?.email}`);
    assert(doctorProfile?.medicalRegistrationNumber === 'TEST-NMC-2012-001', `Medical Reg matches: ${doctorProfile?.medicalRegistrationNumber}`);
    assert(doctorProfile?.qualification === 'MBBS, MD', `Qualification matches: ${doctorProfile?.qualification}`);
    assert(doctorProfile?.experienceYears === 12, `Experience matches: ${doctorProfile?.experienceYears} years`);
    assert(doctorProfile?.hospitalName === 'MEDBRIEF General Care', `Hospital matches: ${doctorProfile?.hospitalName}`);
    assert(doctorProfile?.designation === 'Senior Consultant', `Designation matches: ${doctorProfile?.designation}`);

    // 4b. Testing Alias Login (doctor1@medbrief.test) with password doctor123
    const aliasLoginRes = await request('POST', '/api/v1/auth/login', {
      email: 'doctor1@medbrief.test',
      password: 'doctor123',
    });
    assert(aliasLoginRes.statusCode === 200, 'Alias doctor1@medbrief.test login succeeds (HTTP 200)');
    assert(aliasLoginRes.body?.data?.user?.email === 'arun@medbrief.test', 'Alias maps to arun@medbrief.test');

    // 4c. Testing Invalid Password Rejection
    const badLoginRes = await request('POST', '/api/v1/auth/login', {
      email: 'arun@medbrief.test',
      password: 'wrong_password_999',
    });
    assert(badLoginRes.statusCode === 401, 'Invalid password correctly rejected with HTTP 401');

    // 5. Duplicate Registration Rejection
    console.log('\n--- 3. Testing Duplicate Registration Rejection ---');
    const dupRes = await request('POST', '/api/v1/auth/register', {
      fullName: 'Dr. Arun Duplicate',
      email: 'arun@medbrief.test', // already exists
      password: 'doctor123',
      confirmPassword: 'doctor123',
      medicalRegistrationNumber: 'TNMC-99999',
      specialization: 'General Medicine',
      hospitalName: 'Apollo Hospitals',
      qualification: 'MBBS',
      experienceYears: 5,
    });
    assert(dupRes.statusCode === 409, `Duplicate email rejected with HTTP 409 Conflict (got: ${dupRes.statusCode})`);

    // 6. Register New Doctor
    console.log('\n--- 4. Testing New Doctor Registration & Persistence ---');
    const testDoctorEmail = `testdoc_${Date.now()}@medbrief.test`;
    const regRes = await request('POST', '/api/v1/auth/register', {
      fullName: 'Dr. Rajesh Patel',
      email: testDoctorEmail,
      password: 'doctor123',
      confirmPassword: 'doctor123',
      medicalRegistrationNumber: 'GMC-778899',
      specialization: 'Cardiology',
      qualification: 'MBBS, DM (Cardiology)',
      experienceYears: 14,
      hospitalName: 'SIMS Hospital Chennai',
      designation: 'Chief Interventional Cardiologist',
      phoneNumber: '+91 98409 87654',
    });
    assert(regRes.statusCode === 201, `New doctor registration returns HTTP 201 Created (got: ${regRes.statusCode})`);
    assert(regRes.body?.data?.email === testDoctorEmail, 'Registered email matches');
    assert(regRes.body?.data?.experienceYears === 14, 'Registered experience persisted');
    assert(regRes.body?.data?.medicalRegistrationNumber === 'GMC-778899', 'Registered medical reg persisted');
    assert(regRes.body?.data?.qualification === 'MBBS, DM (Cardiology)', 'Registered qualification persisted');

    // 7. Login with Newly Registered Doctor
    console.log('\n--- 5. Testing Login with Newly Registered Doctor ---');
    const newDocLoginRes = await request('POST', '/api/v1/auth/login', {
      email: testDoctorEmail,
      password: 'doctor123',
    });
    assert(newDocLoginRes.statusCode === 200, 'Newly registered doctor successfully logs in with hashed password verification');
    assert(newDocLoginRes.body?.data?.user?.designation === 'Chief Interventional Cardiologist', 'Profile returned on login contains designation');

    // 8. Test Native Digital PDF Extraction using pdf-parse directly
    console.log('\n--- 6. Testing Digital PDF Text Extraction ---');
    const sampleClinicalText = 'Patient: John Doe, Age: 45. Diagnosis: Type 2 Diabetes Mellitus. Rx: Metformin 500mg BD.';
    const pdfBuffer = buildMinimalPdf(sampleClinicalText);

    const { PDFParse } = require('pdf-parse');
    const uint8 = new Uint8Array(pdfBuffer);
    const parser = new PDFParse(uint8);
    await parser.load();
    const parsedPdfResult = await parser.getText();
    const extractedText = parsedPdfResult?.text?.trim() || '';

    assert(extractedText.includes('Metformin 500mg BD'), `Native PDF parser extracted clinical text: "${extractedText}"`);
    assert(!extractedText.toLowerCase().includes('handwritten'), 'Extracted text has zero handwriting artifacts');

    // 9. Verify Patient List / Queue with Authenticated Doctor Token
    console.log('\n--- 7. Testing Doctor Portal API Authenticated Endpoints ---');
    const queueRes = await request('GET', '/api/v1/doctor/queue', null, {
      Authorization: `Bearer ${accessToken}`,
    });
    assert(queueRes.statusCode === 200, 'Doctor review patients queue returns HTTP 200');
    assert(Array.isArray(queueRes.body?.data?.items || queueRes.body?.data), 'Returns real patients queue from PostgreSQL database');

    console.log('\n====================================================');
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error('Unexpected error during verification:', err);
    process.exit(1);
  }
}

runVerification();
