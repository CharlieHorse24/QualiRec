import { RESPONSE_TYPES, TEMPLATE_TYPES, USER_ROLES } from './constants';
import type { CreateTemplateRequest, LoginRequest, CreateSessionRequest, ResponseType, TemplateType } from './types';

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidResponseType(type: string): type is ResponseType {
  return (RESPONSE_TYPES as readonly string[]).includes(type);
}

export function isValidTemplateType(type: string): type is TemplateType {
  return (TEMPLATE_TYPES as readonly string[]).includes(type);
}

export function validateLoginRequest(data: unknown): data is LoginRequest {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.email === 'string' && isValidEmail(obj.email) && typeof obj.password === 'string' && obj.password.length >= 6;
}

export function validateCreateTemplate(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') return { valid: false, errors: ['Invalid request body'] };

  const obj = data as Partial<CreateTemplateRequest>;

  if (!obj.name || obj.name.trim().length === 0) errors.push('Name is required');
  if (!obj.type || !isValidTemplateType(obj.type)) errors.push('Valid type is required (CANDIDATE, CLIENT, or CUSTOM)');
  if (!obj.sections || !Array.isArray(obj.sections) || obj.sections.length === 0) {
    errors.push('At least one section is required');
  } else {
    obj.sections.forEach((section, si) => {
      if (!section.title) errors.push(`Section ${si + 1}: title is required`);
      if (!section.questions || !Array.isArray(section.questions) || section.questions.length === 0) {
        errors.push(`Section ${si + 1}: at least one question is required`);
      } else {
        section.questions.forEach((q, qi) => {
          if (!q.text) errors.push(`Section ${si + 1}, Question ${qi + 1}: text is required`);
          if (!q.responseType || !isValidResponseType(q.responseType)) {
            errors.push(`Section ${si + 1}, Question ${qi + 1}: valid responseType is required`);
          }
          if (['SINGLE_SELECT', 'MULTI_SELECT'].includes(q.responseType) && (!q.options || q.options.length === 0)) {
            errors.push(`Section ${si + 1}, Question ${qi + 1}: options required for select types`);
          }
        });
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

export function validateCreateSession(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') return { valid: false, errors: ['Invalid request body'] };

  const obj = data as Partial<CreateSessionRequest>;

  if (!obj.templateId) errors.push('templateId is required');
  if (!obj.contactType || !['CANDIDATE', 'CLIENT'].includes(obj.contactType)) {
    errors.push('contactType must be CANDIDATE or CLIENT');
  }
  if (!obj.voipAdapter) errors.push('voipAdapter is required');

  return { valid: errors.length === 0, errors };
}
