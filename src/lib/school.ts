/**
 * Shared constants reflecting how a typical Nigerian private school
 * actually operates — used across Staff, Subjects, and Leave so every
 * dropdown in the app agrees on the same set of values.
 */

export const STAFF_CATEGORIES = [
  { value: 'teaching', label: 'Teaching staff' },
  { value: 'non_teaching', label: 'Non-teaching staff' },
] as const

export type StaffCategory = (typeof STAFF_CATEGORIES)[number]['value']

export const EMPLOYMENT_TYPES = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'nysc', label: 'NYSC Corper' },
] as const

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]['value']

export const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual' },
  { value: 'sick', label: 'Sick' },
  { value: 'maternity', label: 'Maternity' },
  { value: 'study', label: 'Study leave' },
  { value: 'compassionate', label: 'Compassionate' },
] as const

export type LeaveType = (typeof LEAVE_TYPES)[number]['value']

/** Standard Nigerian school class levels — kept as a fixed list so the
 * Subjects coverage view can't fragment across "SS3" vs "SS 3" vs "SSS3". */
export const CLASS_LEVELS = [
  'Creche',
  'Pre-Nursery',
  'Nursery 1',
  'Nursery 2',
  'Primary 1',
  'Primary 2',
  'Primary 3',
  'Primary 4',
  'Primary 5',
  'Primary 6',
  'JSS 1',
  'JSS 2',
  'JSS 3',
  'SS 1',
  'SS 2',
  'SS 3',
  'Whole school',
] as const
