const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const sampleDoctors = [
  {
    docCode: 'DOC001',
    fullName: 'Dr. Arun Kumar',
    email: 'arun@medbrief.test',
    specialization: 'General Medicine',
    qualification: 'MBBS, MD',
    experienceYears: 12,
    designation: 'Senior Consultant',
    hospitalName: 'MEDBRIEF General Care',
    medicalRegistrationNumber: 'TEST-NMC-2012-001',
    phoneNumber: '+91-98401-00001',
    password: 'doctor123',
  },
  {
    docCode: 'DOC002',
    fullName: 'Dr. Priya Sharma',
    email: 'priya@medbrief.test',
    specialization: 'Cardiology',
    qualification: 'MBBS, MD, DM',
    experienceYears: 10,
    designation: 'Consultant Cardiologist',
    hospitalName: 'MEDBRIEF Heart Centre',
    medicalRegistrationNumber: 'TEST-NMC-2014-002',
    phoneNumber: '+91-98401-00002',
    password: 'doctor123',
  },
  {
    docCode: 'DOC003',
    fullName: 'Dr. Meena Raj',
    email: 'meena@medbrief.test',
    specialization: 'Pediatrics',
    qualification: 'MBBS, MD',
    experienceYears: 8,
    designation: 'Pediatric Consultant',
    hospitalName: "MEDBRIEF Children's Clinic",
    medicalRegistrationNumber: 'TEST-NMC-2016-003',
    phoneNumber: '+91-98401-00003',
    password: 'doctor123',
  },
  {
    docCode: 'DOC004',
    fullName: 'Dr. Karthik Raman',
    email: 'karthik@medbrief.test',
    specialization: 'Neurology',
    qualification: 'MBBS, MD, DM',
    experienceYears: 15,
    designation: 'Senior Neurologist',
    hospitalName: 'MEDBRIEF Neuro Care',
    medicalRegistrationNumber: 'TEST-NMC-2009-004',
    phoneNumber: '+91-98401-00004',
    password: 'doctor123',
  },
  {
    docCode: 'DOC005',
    fullName: 'Dr. Divya Nair',
    email: 'divya@medbrief.test',
    specialization: 'Dermatology',
    qualification: 'MBBS, MD',
    experienceYears: 6,
    designation: 'Consultant Dermatologist',
    hospitalName: 'MEDBRIEF Skin and Wellness Centre',
    medicalRegistrationNumber: 'TEST-NMC-2018-005',
    phoneNumber: '+91-98401-00005',
    password: 'doctor123',
  },
];

async function seed() {
  console.log('--- Seeding Fictional Development Doctors into PostgreSQL ---');
  const results = [];

  for (const doc of sampleDoctors) {
    const passwordHash = await bcrypt.hash(doc.password, 12);
    const legacyEmail = doc.email.replace('@medbrief.test', '@thunai.test');
    const existing = await prisma.staffUser.findFirst({
      where: {
        OR: [
          { email: doc.email.toLowerCase() },
          { email: legacyEmail.toLowerCase() },
          { medical_registration_number: doc.medicalRegistrationNumber },
        ],
      },
    });

    let record;
    if (existing) {
      record = await prisma.staffUser.update({
        where: { id: existing.id },
        data: {
          email: doc.email.toLowerCase(),
          full_name: doc.fullName,
          role: 'DOCTOR',
          status: 'ACTIVE',
          hospital_department: doc.specialization,
          medical_registration_number: doc.medicalRegistrationNumber,
          clinic_name: doc.hospitalName,
          qualification: doc.qualification,
          experience_years: doc.experienceYears,
          designation: doc.designation,
          phone_number: doc.phoneNumber,
          password_hash: passwordHash,
          email_verified_at: new Date(),
        },
      });
      console.log(`[UPDATED] ${doc.docCode}: ${doc.fullName} (${doc.email})`);
    } else {
      record = await prisma.staffUser.create({
        data: {
          email: doc.email.toLowerCase(),
          password_hash: passwordHash,
          full_name: doc.fullName,
          role: 'DOCTOR',
          status: 'ACTIVE',
          hospital_department: doc.specialization,
          medical_registration_number: doc.medicalRegistrationNumber,
          clinic_name: doc.hospitalName,
          qualification: doc.qualification,
          experience_years: doc.experienceYears,
          designation: doc.designation,
          phone_number: doc.phoneNumber,
          email_verified_at: new Date(),
        },
      });
      console.log(`[CREATED] ${doc.docCode}: ${doc.fullName} (${doc.email})`);
    }

    results.push({
      id: record.id,
      docCode: doc.docCode,
      name: record.full_name,
      email: record.email,
      specialization: record.hospital_department,
      qualification: record.qualification,
      experienceYears: record.experience_years,
      designation: record.designation,
      hospital: record.clinic_name,
      medRegNo: record.medical_registration_number,
      status: record.status,
    });
  }

  console.log('Successfully seeded all 5 development doctors!');
  console.table(results);
}

seed()
  .catch((e) => {
    console.error('Doctor seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
