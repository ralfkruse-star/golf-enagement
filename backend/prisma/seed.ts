import { PrismaClient, UserRole, MembershipType, MembershipStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.member.upsert({
    where: { email: 'admin@golfclub-siek.de' },
    update: {},
    create: {
      email: 'admin@golfclub-siek.de',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      membershipType: 'FULL',
      membershipStatus: 'ACTIVE',
      membershipNumber: 'GCS-000001',
      role: 'SUPER_ADMIN',
      emailVerified: true,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create some test members
  const testMembers = [
    {
      email: 'max.mustermann@example.com',
      password: await bcrypt.hash('Test123!', 10),
      firstName: 'Max',
      lastName: 'Mustermann',
      membershipType: 'FULL' as MembershipType,
      membershipStatus: 'ACTIVE' as MembershipStatus,
      membershipNumber: 'GCS-000002',
      handicap: 18.5,
      role: 'MEMBER' as UserRole,
    },
    {
      email: 'anna.schmidt@example.com',
      password: await bcrypt.hash('Test123!', 10),
      firstName: 'Anna',
      lastName: 'Schmidt',
      membershipType: 'SENIOR' as MembershipType,
      membershipStatus: 'ACTIVE' as MembershipStatus,
      membershipNumber: 'GCS-000003',
      handicap: 24.2,
      role: 'MEMBER' as UserRole,
    },
    {
      email: 'tom.neuling@example.com',
      password: await bcrypt.hash('Test123!', 10),
      firstName: 'Tom',
      lastName: 'Neuling',
      membershipType: 'TRIAL' as MembershipType,
      membershipStatus: 'ACTIVE' as MembershipStatus,
      membershipNumber: 'GCS-000004',
      role: 'MEMBER' as UserRole,
    },
  ];

  for (const member of testMembers) {
    await prisma.member.upsert({
      where: { email: member.email },
      update: {},
      create: member,
    });
    console.log('✅ Test member created:', member.email);
  }

  // Create default segments
  const segments = [
    {
      name: 'all-members',
      description: 'Alle Mitglieder',
      criteria: {},
      isSystem: true,
    },
    {
      name: 'full-members',
      description: 'Vollmitglieder',
      criteria: { membershipType: ['FULL'] },
      isSystem: true,
    },
    {
      name: 'beginners',
      description: 'Anfänger & Gelegenheitsspieler',
      criteria: { membershipType: ['GUEST', 'TRIAL'] },
      isSystem: true,
    },
    {
      name: 'seniors',
      description: 'Senioren',
      criteria: { membershipType: ['SENIOR'] },
      isSystem: true,
    },
  ];

  for (const segment of segments) {
    await prisma.segment.upsert({
      where: { name: segment.name },
      update: {},
      create: segment,
    });
    console.log('✅ Segment created:', segment.name);
  }

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
