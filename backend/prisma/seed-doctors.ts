import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const sampleDoctors = [
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
  {
    docCode: 'DOC006',
    fullName: 'Dr. Kavya Raman',
    email: 'kavya@medbrief.test',
    specialization: 'Gynaecology',
    qualification: 'MBBS, MS (Obstetrics and Gynaecology)',
    experienceYears: 8,
    designation: 'Consultant Gynaecologist',
    hospitalName: "MEDBRIEF Women's Health Centre",
    medicalRegistrationNumber: null,
    phoneNumber: null,
    password: 'doctor123',
  },
];

export async function seedDoctors() {
  console.log('Seeding development doctors into PostgreSQL...');
  for (const doc of sampleDoctors) {
    const passwordHash = await bcrypt.hash(doc.password, 12);
    // Find by either new email, legacy email, or medical registration number
    const legacyEmail = doc.email.replace('@medbrief.test', '@thunai.test');
    const orConditions: any[] = [
      { email: doc.email.toLowerCase() },
      { email: legacyEmail.toLowerCase() },
    ];
    if (doc.medicalRegistrationNumber) {
      orConditions.push({ medical_registration_number: doc.medicalRegistrationNumber });
    }

    const existing = await prisma.staffUser.findFirst({
      where: {
        OR: orConditions,
      },
    });

    if (existing) {
      await prisma.staffUser.update({
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
    } else {
      await prisma.staffUser.create({
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
    }
  }
}

if (process.argv[1]?.endsWith('seed-doctors.ts')) {
  seedDoctors()
    .then(() => {
      console.log('Seed completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
