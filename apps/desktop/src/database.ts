import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

let prisma: PrismaClient;

export function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return path.join(dbDir, 'qualirec.db');
}

export function getPrisma(): PrismaClient {
  return prisma;
}

export async function initDatabase(): Promise<void> {
  const dbPath = getDbPath();
  const dbUrl = `file:${dbPath}`;

  process.env.DATABASE_URL = dbUrl;

  prisma = new PrismaClient({
    datasources: {
      db: { url: dbUrl },
    },
  });

  // Run migrations / push schema
  // For desktop, we use db push approach via Prisma's built-in
  // The schema is pushed on first run
  const { execSync } = require('child_process');
  const prismaDir = path.join(__dirname, '..', 'prisma');

  try {
    execSync(
      `npx prisma db push --schema="${prismaDir}/schema.prisma" --skip-generate --accept-data-loss`,
      {
        env: { ...process.env, DATABASE_URL: dbUrl },
        stdio: 'pipe',
      },
    );
  } catch (error) {
    console.log('Prisma db push (may be first run):', error);
  }

  await prisma.$connect();

  // Seed if empty
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    await seedDatabase();
  }

  console.log(`Database initialized at: ${dbPath}`);
}

async function seedDatabase(): Promise<void> {
  console.log('Seeding database for first run...');

  const adminPassword = await bcrypt.hash('admin123', 12);
  const recruiterPassword = await bcrypt.hash('recruiter123', 12);

  // Create users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@qualirec.com',
      name: 'Admin User',
      passwordHash: adminPassword,
      role: 'ADMIN',
      preferences: JSON.stringify({ callViewMode: 'guided' }),
    },
  });

  await prisma.user.create({
    data: {
      email: 'recruiter@qualirec.com',
      name: 'Sarah Johnson',
      passwordHash: recruiterPassword,
      role: 'RECRUITER',
      preferences: JSON.stringify({ callViewMode: 'guided' }),
    },
  });

  // Candidate template
  await prisma.template.create({
    data: {
      id: 'tpl-candidate-general',
      name: 'General Candidate Qualification',
      type: 'CANDIDATE',
      description: 'Standard qualification template for all candidate types.',
      isDefault: true,
      createdById: admin.id,
      sections: JSON.stringify([
        {
          id: 's1', title: 'Current Situation', order: 0,
          questions: [
            { id: 'q1', text: 'What is your current role and employer?', hint: 'Get exact title and company name', responseType: 'FREE_TEXT', options: [], required: true, flagForCRM: true, crmFieldMapping: 'contact.current_role', order: 0 },
            { id: 'q2', text: 'What is your notice period or availability to start?', hint: 'Be specific - weeks or months', responseType: 'SINGLE_SELECT', options: ['Immediately', '2 weeks', '1 month', '2 months', '3+ months'], required: true, flagForCRM: true, crmFieldMapping: 'contact.notice_period', order: 1 },
            { id: 'q3', text: 'Do you have the right to work in the target country?', hint: 'Visa status', responseType: 'SINGLE_SELECT', options: ['Yes - Citizen/PR', 'Yes - Valid Work Visa', 'Needs Sponsorship', 'Not Sure'], required: true, flagForCRM: true, crmFieldMapping: 'contact.visa_status', order: 2 },
          ],
        },
        {
          id: 's2', title: 'Compensation', order: 1,
          questions: [
            { id: 'q4', text: 'What is your current base salary?', hint: 'Annual, before tax', responseType: 'NUMERIC', options: [], required: true, flagForCRM: true, crmFieldMapping: 'contact.current_salary', order: 0 },
            { id: 'q5', text: 'Do you receive a bonus?', hint: '', responseType: 'FREE_TEXT', options: [], required: false, flagForCRM: true, crmFieldMapping: 'contact.current_bonus', order: 1 },
            { id: 'q6', text: 'What is your target compensation?', hint: 'Range is fine', responseType: 'FREE_TEXT', options: [], required: true, flagForCRM: true, crmFieldMapping: 'contact.target_salary', order: 2 },
          ],
        },
        {
          id: 's3', title: 'Skills & Experience', order: 2,
          questions: [
            { id: 'q7', text: 'What are your key technical/professional skills?', hint: 'Top 5-8 skills', responseType: 'FREE_TEXT', options: [], required: true, flagForCRM: true, crmFieldMapping: 'contact.skills', order: 0 },
            { id: 'q8', text: 'Years of experience in your field?', hint: '', responseType: 'NUMERIC', options: [], required: true, flagForCRM: true, crmFieldMapping: 'contact.years_experience', order: 1 },
            { id: 'q9', text: 'Location preferences?', hint: '', responseType: 'MULTI_SELECT', options: ['Onsite', 'Hybrid', 'Fully Remote', 'Open to Relocation'], required: true, flagForCRM: true, crmFieldMapping: 'contact.location_preferences', order: 2 },
          ],
        },
        {
          id: 's4', title: 'Motivation & Process', order: 3,
          questions: [
            { id: 'q10', text: 'What is motivating you to look for a new opportunity?', hint: 'Push vs pull factors', responseType: 'FREE_TEXT', options: [], required: true, flagForCRM: false, crmFieldMapping: '', order: 0 },
            { id: 'q11', text: 'Are you interviewing elsewhere or have competing offers?', hint: 'Critical for urgency', responseType: 'SINGLE_SELECT', options: ['No active processes', 'Early stages elsewhere', 'Advanced interviews', 'Have offer(s)'], required: true, flagForCRM: true, crmFieldMapping: 'contact.competing_offers', order: 1 },
            { id: 'q12', text: 'Can you provide professional references?', hint: '', responseType: 'YES_NO', options: [], required: false, flagForCRM: false, crmFieldMapping: '', order: 2 },
          ],
        },
      ]),
    },
  });

  // Client template
  await prisma.template.create({
    data: {
      id: 'tpl-client-general',
      name: 'General Client Intake',
      type: 'CLIENT',
      description: 'Standard intake template for qualifying new client roles.',
      isDefault: true,
      createdById: admin.id,
      sections: JSON.stringify([
        {
          id: 'cs1', title: 'Company Overview', order: 0,
          questions: [
            { id: 'cq1', text: 'Company name and brief overview?', hint: 'Industry, size, stage', responseType: 'FREE_TEXT', options: [], required: true, flagForCRM: true, crmFieldMapping: 'company.overview', order: 0 },
            { id: 'cq2', text: 'Approximate headcount?', hint: '', responseType: 'NUMERIC', options: [], required: false, flagForCRM: true, crmFieldMapping: 'company.headcount', order: 1 },
          ],
        },
        {
          id: 'cs2', title: 'Role Details', order: 1,
          questions: [
            { id: 'cq3', text: 'What is the role title and level?', hint: 'Exact title for job spec', responseType: 'FREE_TEXT', options: [], required: true, flagForCRM: true, crmFieldMapping: 'role.title', order: 0 },
            { id: 'cq4', text: 'Who does this role report to?', hint: 'Name and title', responseType: 'FREE_TEXT', options: [], required: true, flagForCRM: true, crmFieldMapping: 'role.reporting_line', order: 1 },
            { id: 'cq5', text: 'Must-have skills/experience?', hint: 'Dealbreakers', responseType: 'FREE_TEXT', options: [], required: true, flagForCRM: true, crmFieldMapping: 'role.must_have_skills', order: 2 },
            { id: 'cq6', text: 'Nice-to-have skills?', hint: '', responseType: 'FREE_TEXT', options: [], required: false, flagForCRM: true, crmFieldMapping: 'role.nice_to_have_skills', order: 3 },
          ],
        },
        {
          id: 'cs3', title: 'Compensation & Location', order: 2,
          questions: [
            { id: 'cq7', text: 'Compensation budget (base salary range)?', hint: 'Get firm min and max', responseType: 'FREE_TEXT', options: [], required: true, flagForCRM: true, crmFieldMapping: 'role.salary_range', order: 0 },
            { id: 'cq8', text: 'Location / remote policy?', hint: '', responseType: 'SINGLE_SELECT', options: ['Fully Onsite', 'Hybrid', 'Fully Remote', 'Flexible'], required: true, flagForCRM: true, crmFieldMapping: 'role.location_policy', order: 1 },
          ],
        },
        {
          id: 'cs4', title: 'Process & Urgency', order: 3,
          questions: [
            { id: 'cq9', text: 'Interview process and timeline?', hint: 'Number of stages, who is involved', responseType: 'FREE_TEXT', options: [], required: true, flagForCRM: true, crmFieldMapping: 'role.interview_process', order: 0 },
            { id: 'cq10', text: 'How urgent is this hire?', hint: '', responseType: 'SINGLE_SELECT', options: ['Critical - ASAP', 'High - Within 1 month', 'Medium - Within 3 months', 'Low - Pipeline building'], required: true, flagForCRM: true, crmFieldMapping: 'role.urgency', order: 1 },
            { id: 'cq11', text: 'Who makes the final hiring decision?', hint: 'Name and title', responseType: 'FREE_TEXT', options: [], required: true, flagForCRM: true, crmFieldMapping: 'role.decision_maker', order: 2 },
          ],
        },
      ]),
    },
  });

  // Sample CRM contacts
  await prisma.crmContact.create({
    data: {
      id: 'crm-contact-1',
      firstName: 'John', lastName: 'Smith',
      email: 'john.smith@example.com', phone: '+1-555-0101',
      company: 'TechCorp', title: 'Senior Software Engineer',
      source: 'qualirec',
      fields: JSON.stringify({ skills: 'React, Node.js, Python', yearsExperience: 8 }),
    },
  });

  await prisma.crmContact.create({
    data: {
      id: 'crm-contact-2',
      firstName: 'Emily', lastName: 'Davis',
      email: 'emily.davis@innovate.io', phone: '+1-555-0102',
      company: 'Innovate.io', title: 'VP of Engineering',
      source: 'qualirec',
      fields: JSON.stringify({ headcount: 250, industry: 'SaaS' }),
    },
  });

  console.log('Database seeded successfully!');
}

export async function shutdownDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}
