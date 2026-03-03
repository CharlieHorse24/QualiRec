import type { TemplateSection, CrmContact } from '@qualirec/shared';

// ─── Demo Contacts ───────────────────────────────────────────────────────────

export interface DemoContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  source: string;
  fields: Record<string, string>;
}

export const DEMO_CANDIDATE: DemoContact = {
  id: 'demo-candidate-1',
  firstName: 'Sarah',
  lastName: 'Mitchell',
  email: 'sarah.mitchell@email.com',
  phone: '+1 (415) 555-0127',
  company: 'Currently at TechFlow Inc.',
  title: 'Senior Software Engineer',
  source: 'LinkedIn Application',
  fields: {
    'Current Salary': '$145,000',
    'Years Experience': '8',
    Location: 'San Francisco, CA',
    'Notice Period': '2 weeks',
    'Work Authorization': 'US Citizen',
  },
};

export const DEMO_CLIENT: DemoContact = {
  id: 'demo-client-1',
  firstName: 'Marcus',
  lastName: 'Chen',
  email: 'mchen@globalpartners.io',
  phone: '+1 (212) 555-0342',
  company: 'Global Partners Inc.',
  title: 'VP of Engineering',
  source: 'Referral',
  fields: {
    Industry: 'FinTech',
    'Company Size': '500-1000',
    'Open Roles': '3',
    'Hiring Budget': '$150k-$200k per role',
    'Time to Fill': '30 days',
  },
};

// ─── Demo Templates ──────────────────────────────────────────────────────────

export const DEMO_CANDIDATE_TEMPLATE: {
  id: string;
  name: string;
  type: string;
  sections: TemplateSection[];
} = {
  id: 'demo-template-candidate',
  name: 'Candidate Qualification Screen',
  type: 'CANDIDATE',
  sections: [
    {
      id: 'sec-intro',
      title: 'Introduction',
      order: 0,
      questions: [
        {
          id: 'q1',
          text: 'How did you hear about this opportunity?',
          hint: 'Understanding the candidate source helps track pipeline',
          responseType: 'SINGLE_SELECT',
          options: ['LinkedIn', 'Referral', 'Job Board', 'Company Website', 'Other'],
          required: false,
          order: 0,
          flagForCRM: true,
          crmFieldMapping: 'contact.source',
        },
        {
          id: 'q2',
          text: "Can you give me a brief overview of your current role and responsibilities?",
          hint: 'Let the candidate talk freely — capture key themes',
          responseType: 'FREE_TEXT',
          options: [],
          required: true,
          order: 1,
          flagForCRM: false,
          crmFieldMapping: '',
        },
      ],
    },
    {
      id: 'sec-experience',
      title: 'Experience & Skills',
      order: 1,
      questions: [
        {
          id: 'q3',
          text: 'How many years of professional experience do you have?',
          hint: '',
          responseType: 'NUMERIC',
          options: [],
          required: true,
          order: 0,
          flagForCRM: true,
          crmFieldMapping: 'contact.yearsExperience',
        },
        {
          id: 'q4',
          text: 'Which of the following technologies are you proficient in?',
          hint: 'Select all that apply',
          responseType: 'MULTI_SELECT',
          options: ['React', 'Node.js', 'Python', 'AWS', 'Docker', 'Kubernetes', 'TypeScript', 'Go'],
          required: true,
          order: 1,
          flagForCRM: true,
          crmFieldMapping: 'contact.skills',
        },
        {
          id: 'q5',
          text: 'Do you have experience managing or mentoring other engineers?',
          hint: '',
          responseType: 'YES_NO',
          options: [],
          required: false,
          order: 2,
          flagForCRM: false,
          crmFieldMapping: '',
        },
      ],
    },
    {
      id: 'sec-logistics',
      title: 'Logistics & Compensation',
      order: 2,
      questions: [
        {
          id: 'q6',
          text: 'What is your expected salary range?',
          hint: 'Get a specific number or tight range if possible',
          responseType: 'FREE_TEXT',
          options: [],
          required: true,
          order: 0,
          flagForCRM: true,
          crmFieldMapping: 'contact.salary',
        },
        {
          id: 'q7',
          text: 'Are you open to relocation?',
          hint: '',
          responseType: 'YES_NO',
          options: [],
          required: false,
          order: 1,
          flagForCRM: true,
          crmFieldMapping: 'contact.openToRelocation',
        },
        {
          id: 'q8',
          text: 'What is your notice period at your current employer?',
          hint: '',
          responseType: 'SINGLE_SELECT',
          options: ['Immediately available', '2 weeks', '1 month', '2+ months'],
          required: true,
          order: 2,
          flagForCRM: true,
          crmFieldMapping: 'contact.noticePeriod',
        },
        {
          id: 'q9',
          text: 'When is the earliest you could start?',
          hint: '',
          responseType: 'DATE',
          options: [],
          required: false,
          order: 3,
          flagForCRM: true,
          crmFieldMapping: 'contact.availableDate',
        },
      ],
    },
  ],
};

export const DEMO_CLIENT_TEMPLATE: {
  id: string;
  name: string;
  type: string;
  sections: TemplateSection[];
} = {
  id: 'demo-template-client',
  name: 'Client Intake Qualification',
  type: 'CLIENT',
  sections: [
    {
      id: 'sec-company',
      title: 'Company Overview',
      order: 0,
      questions: [
        {
          id: 'cq1',
          text: 'Tell me about your company and what you do.',
          hint: 'Capture industry, size, stage',
          responseType: 'FREE_TEXT',
          options: [],
          required: true,
          order: 0,
          flagForCRM: false,
          crmFieldMapping: '',
        },
        {
          id: 'cq2',
          text: 'What industry are you in?',
          hint: '',
          responseType: 'SINGLE_SELECT',
          options: ['FinTech', 'HealthTech', 'SaaS', 'E-Commerce', 'AI/ML', 'Other'],
          required: true,
          order: 1,
          flagForCRM: true,
          crmFieldMapping: 'contact.industry',
        },
        {
          id: 'cq3',
          text: 'How large is your engineering team currently?',
          hint: '',
          responseType: 'NUMERIC',
          options: [],
          required: true,
          order: 2,
          flagForCRM: true,
          crmFieldMapping: 'contact.teamSize',
        },
      ],
    },
    {
      id: 'sec-hiring',
      title: 'Hiring Needs',
      order: 1,
      questions: [
        {
          id: 'cq4',
          text: 'How many positions are you looking to fill?',
          hint: '',
          responseType: 'NUMERIC',
          options: [],
          required: true,
          order: 0,
          flagForCRM: true,
          crmFieldMapping: 'contact.openRoles',
        },
        {
          id: 'cq5',
          text: 'What seniority level are you hiring for?',
          hint: 'Select all that apply',
          responseType: 'MULTI_SELECT',
          options: ['Junior', 'Mid-Level', 'Senior', 'Staff', 'Principal', 'Director/VP'],
          required: true,
          order: 1,
          flagForCRM: true,
          crmFieldMapping: 'contact.seniorityLevels',
        },
        {
          id: 'cq6',
          text: 'Is this a remote, hybrid, or on-site role?',
          hint: '',
          responseType: 'SINGLE_SELECT',
          options: ['Remote', 'Hybrid', 'On-Site'],
          required: true,
          order: 2,
          flagForCRM: true,
          crmFieldMapping: 'contact.workModel',
        },
      ],
    },
    {
      id: 'sec-budget',
      title: 'Budget & Timeline',
      order: 2,
      questions: [
        {
          id: 'cq7',
          text: 'What is the salary budget per role?',
          hint: 'Get a range if possible',
          responseType: 'FREE_TEXT',
          options: [],
          required: true,
          order: 0,
          flagForCRM: true,
          crmFieldMapping: 'contact.budget',
        },
        {
          id: 'cq8',
          text: 'Have you worked with a recruiting agency before?',
          hint: '',
          responseType: 'YES_NO',
          options: [],
          required: false,
          order: 1,
          flagForCRM: false,
          crmFieldMapping: '',
        },
        {
          id: 'cq9',
          text: 'What is your target date to have these positions filled?',
          hint: '',
          responseType: 'DATE',
          options: [],
          required: true,
          order: 2,
          flagForCRM: true,
          crmFieldMapping: 'contact.targetDate',
        },
      ],
    },
  ],
};

// ─── Demo Scenarios ──────────────────────────────────────────────────────────

export interface DemoScenario {
  id: string;
  title: string;
  description: string;
  contactType: 'CANDIDATE' | 'CLIENT';
  contact: DemoContact;
  template: typeof DEMO_CANDIDATE_TEMPLATE;
  voipAdapter: string;
  voipDisplayName: string;
  callerNumber: string;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'candidate-screen',
    title: 'Candidate Phone Screen',
    description:
      'Simulate an incoming call from a software engineering candidate. Walk through qualification questions, take notes, and sync to CRM after the call.',
    contactType: 'CANDIDATE',
    contact: DEMO_CANDIDATE,
    template: DEMO_CANDIDATE_TEMPLATE,
    voipAdapter: 'twilio',
    voipDisplayName: 'Twilio Voice',
    callerNumber: '+1 (415) 555-0127',
  },
  {
    id: 'client-intake',
    title: 'Client Intake Call',
    description:
      'Simulate a scheduled Zoom call with a new client. Qualify their hiring needs, budget, and timeline, then push data into your CRM.',
    contactType: 'CLIENT',
    contact: DEMO_CLIENT,
    template: DEMO_CLIENT_TEMPLATE,
    voipAdapter: 'zoom',
    voipDisplayName: 'Zoom Meeting',
    callerNumber: 'Meeting ID: 845-2901-3847',
  },
];

// ─── Demo AI Summary ─────────────────────────────────────────────────────────

export const DEMO_CANDIDATE_SUMMARY = {
  narrative:
    'Sarah Mitchell is a strong Senior Software Engineer candidate with 8 years of experience, currently at TechFlow Inc. She demonstrated deep proficiency in React, TypeScript, Node.js, and AWS, and has hands-on leadership experience mentoring a team of 4 junior engineers. Her salary expectation of $155-170k falls within our client\'s budget. She is available to start within 2 weeks and is open to the hybrid work model. Overall, she presents as a highly qualified candidate worth advancing to the technical interview stage.',
  highlights: [
    'Strong full-stack experience with 8 years in the industry',
    'Proficient in React, TypeScript, Node.js, AWS, and Docker',
    'Leadership experience — mentored 4 junior engineers',
    'Salary expectation ($155-170k) within client budget',
    'Available within 2 weeks, open to hybrid model',
  ],
  nextActions: [
    'Schedule technical interview with hiring manager at Global Partners',
    'Send role description and company deck to candidate',
    'Confirm salary range with client before advancing',
    'Check references from current employer',
  ],
};

export const DEMO_CLIENT_SUMMARY = {
  narrative:
    'Marcus Chen, VP of Engineering at Global Partners Inc., is looking to hire 3 Senior-to-Staff level engineers for their FinTech platform. The team currently has 45 engineers and is scaling rapidly. Budget is $150-200k per role with a 30-day time-to-fill target. They prefer hybrid work (NYC office). Marcus has worked with agencies before and values speed and quality of candidates. This is a high-priority engagement with strong revenue potential.',
  highlights: [
    'Hiring 3 Senior/Staff engineers for FinTech platform',
    'Budget: $150-200k per role — strong engagement value',
    'Rapid scaling — current team of 45 engineers',
    'Hybrid work model, NYC-based office',
    '30-day target to fill — urgent timeline',
  ],
  nextActions: [
    'Draft and send engagement agreement for review',
    'Source 5-8 qualified candidates from existing pipeline',
    'Schedule follow-up call to discuss specific technical requirements',
    'Set up client portal access for candidate review',
  ],
};

// ─── Demo CRM Field Mapping Preview ──────────────────────────────────────────

export interface CrmFieldMapping {
  question: string;
  crmField: string;
  value: string;
}

export const DEMO_CANDIDATE_FIELD_MAPPINGS: CrmFieldMapping[] = [
  { question: 'How did you hear about this opportunity?', crmField: 'contact.source', value: 'LinkedIn' },
  { question: 'Years of experience', crmField: 'contact.yearsExperience', value: '8' },
  { question: 'Technologies proficient in', crmField: 'contact.skills', value: 'React, TypeScript, Node.js, AWS, Docker' },
  { question: 'Expected salary range', crmField: 'contact.salary', value: '$155,000 - $170,000' },
  { question: 'Open to relocation', crmField: 'contact.openToRelocation', value: 'Yes' },
  { question: 'Notice period', crmField: 'contact.noticePeriod', value: '2 weeks' },
];

export const DEMO_CLIENT_FIELD_MAPPINGS: CrmFieldMapping[] = [
  { question: 'Industry', crmField: 'contact.industry', value: 'FinTech' },
  { question: 'Engineering team size', crmField: 'contact.teamSize', value: '45' },
  { question: 'Positions to fill', crmField: 'contact.openRoles', value: '3' },
  { question: 'Seniority level', crmField: 'contact.seniorityLevels', value: 'Senior, Staff' },
  { question: 'Work model', crmField: 'contact.workModel', value: 'Hybrid' },
  { question: 'Salary budget per role', crmField: 'contact.budget', value: '$150,000 - $200,000' },
];
