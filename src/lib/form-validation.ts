import { z } from 'zod';
import type { FormField } from '@/types/form.types';

/**
 * Generate a dynamic Zod schema from form fields
 * This allows runtime validation based on form configuration
 */
export function generateFormSchema(fields: FormField[]): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};

  // Flatten all fields including nested ones in sections
  const allFields: FormField[] = [];
  fields.forEach((field) => {
    if (field.type === 'section') {
      // Skip section itself, but add its nested fields
      if (field.fields) {
        allFields.push(...field.fields);
      }
    } else {
      allFields.push(field);
    }
  });

  allFields.forEach((field) => {
    // Skip section fields - they don't need validation
    if (field.type === 'section') {
      return;
    }

    let fieldSchema: z.ZodTypeAny;

    switch (field.type) {
      case 'text':
        fieldSchema = z.string();
        // If required, ensure non-empty string
        if (field.required) {
          fieldSchema = (fieldSchema as z.ZodString).min(1, `${field.label} is required`);
        }
        if (field.validation?.minLength) {
          fieldSchema = (fieldSchema as z.ZodString).min(
            field.validation.minLength,
            field.validation.customMessage ||
              `Minimum ${field.validation.minLength} characters required`
          );
        }
        if (field.validation?.maxLength) {
          fieldSchema = (fieldSchema as z.ZodString).max(
            field.validation.maxLength,
            field.validation.customMessage ||
              `Maximum ${field.validation.maxLength} characters allowed`
          );
        }
        if (field.validation?.pattern) {
          fieldSchema = (fieldSchema as z.ZodString).regex(
            new RegExp(field.validation.pattern),
            field.validation.customMessage || 'Invalid format'
          );
        }
        break;

      case 'textarea':
        fieldSchema = z.string();
        // If required, ensure non-empty string
        if (field.required) {
          fieldSchema = (fieldSchema as z.ZodString).min(1, `${field.label} is required`);
        }
        if (field.validation?.minLength) {
          fieldSchema = (fieldSchema as z.ZodString).min(
            field.validation.minLength,
            `Minimum ${field.validation.minLength} characters required`
          );
        }
        if (field.validation?.maxLength) {
          fieldSchema = (fieldSchema as z.ZodString).max(
            field.validation.maxLength,
            `Maximum ${field.validation.maxLength} characters allowed`
          );
        }
        break;

      case 'email':
        fieldSchema = z.string();
        if (field.required) {
          fieldSchema = (fieldSchema as z.ZodString).min(1, `${field.label} is required`);
        }
        fieldSchema = (fieldSchema as z.ZodString).email('Invalid email address');
        break;

      case 'phone':
        fieldSchema = z.string();
        if (field.required) {
          fieldSchema = (fieldSchema as z.ZodString).min(1, `${field.label} is required`);
        }
        fieldSchema = (fieldSchema as z.ZodString).regex(/^\d{10}$/, 'Phone number must be exactly 10 digits');
        break;

      case 'number':
        fieldSchema = z.coerce.number();
        if (field.validation?.min !== undefined) {
          fieldSchema = (fieldSchema as z.ZodNumber).min(
            field.validation.min,
            field.validation.customMessage ||
              `Minimum value is ${field.validation.min}`
          );
        }
        if (field.validation?.max !== undefined) {
          fieldSchema = (fieldSchema as z.ZodNumber).max(
            field.validation.max,
            field.validation.customMessage ||
              `Maximum value is ${field.validation.max}`
          );
        }
        break;

      case 'date':
        fieldSchema = z.coerce.date();
        break;

      case 'time':
        fieldSchema = z
          .string()
          .regex(
            /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
            'Invalid time format (HH:MM)'
          );
        break;

      case 'select':
      case 'radio':
        if (field.options && field.options.length > 0) {
          const stringOptions = field.options.map(opt =>
            typeof opt === 'string' ? opt : opt.value
          );
          fieldSchema = z.enum(stringOptions as [string, ...string[]]);
          if (field.required) {
            fieldSchema = fieldSchema.refine((val) => val !== undefined && val !== '', {
              message: `${field.label} is required`,
            });
          }
        } else {
          fieldSchema = z.string();
          if (field.required) {
            fieldSchema = (fieldSchema as z.ZodString).min(1, `${field.label} is required`);
          }
        }
        break;

      case 'multiselect':
      case 'checkbox':
        fieldSchema = z.array(z.string());
        if (field.validation?.min) {
          fieldSchema = (fieldSchema as z.ZodArray<any>).min(
            field.validation.min,
            field.validation.customMessage ||
              `Select at least ${field.validation.min} option(s)`
          );
        }
        if (field.validation?.max) {
          fieldSchema = (fieldSchema as z.ZodArray<any>).max(
            field.validation.max,
            field.validation.customMessage ||
              `Select at most ${field.validation.max} option(s)`
          );
        }
        break;

      case 'file':
        if (field.multiple) {
          fieldSchema = z
            .array(z.instanceof(File))
            .min(1, 'At least one file is required');
        } else {
          fieldSchema = z.instanceof(File, {
            message: 'File is required',
          });
        }
        break;

      default:
        fieldSchema = z.any();
    }

    // Make field optional if not required
    if (!field.required) {
      fieldSchema = fieldSchema.optional();
    }

    shape[field.id] = fieldSchema;
  });

  return z.object(shape);
}

/**
 * Validate a single field value
 * Useful for real-time validation in forms
 */
export function validateFieldValue(
  value: any,
  field: FormField
): { valid: boolean; error?: string } {
  try {
    const schema = generateFormSchema([field]);
    schema.parse({ [field.id]: value });
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        error: error.issues[0]?.message || 'Validation failed',
      };
    }
    return { valid: false, error: 'Validation failed' };
  }
}

/**
 * Validate file size
 */
export function validateFileSize(
  file: File,
  maxSize: number
): { valid: boolean; error?: string } {
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB`,
    };
  }
  return { valid: true };
}

/**
 * Validate file type
 */
export function validateFileType(
  file: File,
  acceptedTypes: string
): { valid: boolean; error?: string } {
  if (!acceptedTypes) return { valid: true };

  const types = acceptedTypes.split(',').map((t) => t.trim().toLowerCase());
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  const isValid = types.some((type) => {
    if (type.startsWith('.')) {
      return fileName.endsWith(type);
    }
    if (type.includes('*')) {
      const pattern = type.replace('*', '.*');
      return new RegExp(pattern).test(fileType);
    }
    return fileType === type;
  });

  if (!isValid) {
    return {
      valid: false,
      error: `File type not allowed. Accepted types: ${acceptedTypes}`,
    };
  }

  return { valid: true };
}

/**
 * Validate multiple files
 */
export function validateFiles(
  files: File[],
  field: FormField
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  files.forEach((file, index) => {
    if (field.maxFileSize) {
      const sizeValidation = validateFileSize(file, field.maxFileSize);
      if (!sizeValidation.valid) {
        errors.push(`File ${index + 1}: ${sizeValidation.error}`);
      }
    }

    if (field.accept) {
      const typeValidation = validateFileType(file, field.accept);
      if (!typeValidation.valid) {
        errors.push(`File ${index + 1}: ${typeValidation.error}`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
