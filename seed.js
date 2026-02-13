require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('./models/User');
const Patient = require('./models/Patient');
const Medicine = require('./models/Medicine');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log('Menghapus data lama...');
    await User.deleteMany();
    await Patient.deleteMany();
    await Medicine.deleteMany();

    // Create Users
    console.log('Membuat users...');
    
    const adminPassword = await bcrypt.hash('admin123', 10);
    const dokterPassword = await bcrypt.hash('dokter123', 10);

    const admin = await User.create({
      name: 'Admin Apotik',
      email: 'admin@apotik.com',
      password: adminPassword,
      role: 'admin_apotik',
      phoneNumber: '081234567890',
    });

    const dokter = await User.create({
      name: 'Dr. Budi Santoso',
      email: 'dokter@apotik.com',
      password: dokterPassword,
      role: 'dokter',
      phoneNumber: '081234567891',
      specialization: 'Dokter Umum',
      licenseNumber: 'SIP-123456789',
    });

    console.log('✓ Users berhasil dibuat');
    console.log('  - Admin: admin@apotik.com / admin123');
    console.log('  - Dokter: dokter@apotik.com / dokter123');

    // Create Patients
    console.log('\nMembuat patients...');
    
    const patients = await Patient.create([
      {
        name: 'John Doe',
        dateOfBirth: new Date('1985-05-15'),
        gender: 'Laki-laki',
        address: 'Jl. Merdeka No. 10, Jakarta',
        phoneNumber: '081234567892',
        email: 'john@example.com',
        idNumber: '3171234567890001',
        allergies: ['Penisilin'],
        bloodType: 'A+',
        createdBy: dokter._id,
      },
      {
        name: 'Jane Smith',
        dateOfBirth: new Date('1990-08-20'),
        gender: 'Perempuan',
        address: 'Jl. Sudirman No. 25, Jakarta',
        phoneNumber: '081234567893',
        email: 'jane@example.com',
        idNumber: '3171234567890002',
        allergies: [],
        bloodType: 'B+',
        createdBy: dokter._id,
      },
      {
        name: 'Ahmad Rahman',
        dateOfBirth: new Date('1978-03-10'),
        gender: 'Laki-laki',
        address: 'Jl. Gatot Subroto No. 15, Jakarta',
        phoneNumber: '081234567894',
        idNumber: '3171234567890003',
        allergies: ['Aspirin'],
        bloodType: 'O+',
        createdBy: dokter._id,
      },
    ]);

    console.log(`✓ ${patients.length} patients berhasil dibuat`);

    // Create Medicines
    console.log('\nMembuat medicines...');
    
    const medicines = await Medicine.create([
      {
        code: 'MED001',
        name: 'Paracetamol 500mg',
        genericName: 'Paracetamol',
        category: 'Tablet',
        manufacturer: 'Kimia Farma',
        description: 'Obat penurun panas dan pereda nyeri',
        dosage: '500mg',
        unit: 'Tablet',
        stock: 500,
        minStock: 100,
        price: 5000,
        expiryDate: new Date('2025-12-31'),
        batchNumber: 'BATCH-2024-001',
      },
      {
        code: 'MED002',
        name: 'Amoxicillin 500mg',
        genericName: 'Amoxicillin',
        category: 'Kapsul',
        manufacturer: 'Indofarma',
        description: 'Antibiotik untuk infeksi bakteri',
        dosage: '500mg',
        unit: 'Kapsul',
        stock: 300,
        minStock: 50,
        price: 8000,
        expiryDate: new Date('2025-10-31'),
        batchNumber: 'BATCH-2024-002',
      },
      {
        code: 'MED003',
        name: 'OBH Sirup',
        genericName: 'Diphenhydramine HCl',
        category: 'Sirup',
        manufacturer: 'Kalbe Farma',
        description: 'Obat batuk',
        dosage: '100ml',
        unit: 'Botol',
        stock: 150,
        minStock: 30,
        price: 15000,
        expiryDate: new Date('2025-08-31'),
        batchNumber: 'BATCH-2024-003',
      },
      {
        code: 'MED004',
        name: 'Vitamin C 1000mg',
        genericName: 'Ascorbic Acid',
        category: 'Tablet',
        manufacturer: 'Kalbe Farma',
        description: 'Suplemen vitamin C',
        dosage: '1000mg',
        unit: 'Tablet',
        stock: 200,
        minStock: 50,
        price: 3000,
        expiryDate: new Date('2026-12-31'),
        batchNumber: 'BATCH-2024-004',
      },
      {
        code: 'MED005',
        name: 'Salep 88',
        genericName: 'Miconazole',
        category: 'Salep',
        manufacturer: 'Konimex',
        description: 'Obat untuk penyakit kulit',
        dosage: '10g',
        unit: 'Tube',
        stock: 80,
        minStock: 20,
        price: 12000,
        expiryDate: new Date('2025-06-30'),
        batchNumber: 'BATCH-2024-005',
      },
      {
        code: 'MED006',
        name: 'Antasida Doen',
        genericName: 'Aluminium Hydroxide',
        category: 'Tablet',
        manufacturer: 'Pyridam Farma',
        description: 'Obat untuk sakit maag',
        dosage: '500mg',
        unit: 'Tablet',
        stock: 250,
        minStock: 50,
        price: 4000,
        expiryDate: new Date('2025-09-30'),
        batchNumber: 'BATCH-2024-006',
      },
      {
        code: 'MED007',
        name: 'Decolgen',
        genericName: 'Paracetamol + Phenylpropanolamine',
        category: 'Tablet',
        manufacturer: 'Konimex',
        description: 'Obat flu dan demam',
        dosage: '500mg',
        unit: 'Tablet',
        stock: 180,
        minStock: 40,
        price: 6000,
        expiryDate: new Date('2025-11-30'),
        batchNumber: 'BATCH-2024-007',
      },
      {
        code: 'MED008',
        name: 'Ibuprofen 400mg',
        genericName: 'Ibuprofen',
        category: 'Tablet',
        manufacturer: 'Tempo Scan Pacific',
        description: 'Anti-inflamasi dan pereda nyeri',
        dosage: '400mg',
        unit: 'Tablet',
        stock: 120,
        minStock: 30,
        price: 7000,
        expiryDate: new Date('2025-07-31'),
        batchNumber: 'BATCH-2024-008',
      },
    ]);

    console.log(`✓ ${medicines.length} medicines berhasil dibuat`);

    console.log('\n========================================');
    console.log('✓ Seeding berhasil!');
    console.log('========================================');
    console.log('\nLogin Credentials:');
    console.log('==================');
    console.log('Admin Apotik:');
    console.log('  Email: admin@apotik.com');
    console.log('  Password: admin123');
    console.log('\nDokter:');
    console.log('  Email: dokter@apotik.com');
    console.log('  Password: dokter123');
    console.log('\nData yang dibuat:');
    console.log(`  - ${patients.length} Pasien`);
    console.log(`  - ${medicines.length} Obat`);
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
