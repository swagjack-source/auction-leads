export const ACTIVE_STAGES = [
  'New Lead',
  'Contacted',
  'In Talks',
  'Consult Scheduled',
  'Consult Completed',
  'Estimate Sent',
  'Project Accepted',
  'Project Scheduled',
]

export const OUTCOME_STAGES = ['Won', 'Lost', 'Backlog']

export const PIPELINE_STAGES = [...ACTIVE_STAGES, ...OUTCOME_STAGES]

export const JOB_TYPES = ['Clean Out', 'Auction', 'Both', 'Move', 'In-person Estate Sale']

export const DENSITY_OPTIONS = ['Low', 'Medium', 'High']

export const CONTACT_TYPES = [
  'Vendor',
  'Partner',
  'Senior Living',
  'Referral Partner',
  'Business Connection',
  'Client',
  'Lead',
]

export const BID_TAGS = [
  { key: 'underbid',  label: 'Under Bid' },
  { key: 'good_bid',  label: 'Good Bid'  },
  { key: 'overbid',   label: 'Over Bid'  },
]

export const LEAD_SOURCES = [
  'Google',
  'Referral',
  'Realtor',
  'Staff Referral',
  'Senior Living Community',
  'Other',
]

export const ROLE_OPTIONS = [
  'Owner',
  'Operations Manager',
  'Lead Crew',
  'Crew Member',
  'Driver',
  'Office Admin',
]

export const TRAINING_CATEGORIES = [
  'Onboarding',
  'Safety',
  'Sales',
  'Operations',
  'Customer Service',
  'Technology',
  'Compliance',
  'Leadership',
  'Other',
]
