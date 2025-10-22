export type UserRole = 'ADMIN' | 'LEADER' | 'USER';

export const canViewCalendar = (role?: UserRole) =>
  role === 'ADMIN' || role === 'LEADER';

export const canEditCalendar = (role?: UserRole) =>
  role === 'ADMIN';

export const canConnectCalendar = (role?: UserRole) =>
  role === 'ADMIN';
