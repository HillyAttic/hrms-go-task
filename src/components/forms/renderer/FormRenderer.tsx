'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { generateFormSchema } from '@/lib/form-validation';
import { FormField } from './FormField';
import { FormSubmitButton } from './FormSubmitButton';
import type { FormTemplate, FormField as FormFieldType } from '@/types/form.types';
import { toast } from 'react-toastify';
import { authenticatedFetch } from '@/lib/api-client';

interface FormRendererProps {
  template: FormTemplate;
  onSuccess?: (submissionId: string) => void;
  onError?: (error: string) => void;
}

export function FormRenderer({
  template,
  onSuccess,
  onError,
}: FormRendererProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Generate Zod schema from form fields
  const schema = React.useMemo(
    () => generateFormSchema(template.fields),
    [template.fields]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);

    try {
      // Handle file uploads
      const filesData: any[] = [];
      const formData = { ...data };

      // Flatten all fields including nested ones
      const allFields: FormFieldType[] = [];
      template.fields.forEach((field) => {
        if (field.type === 'section' && field.fields) {
          allFields.push(...field.fields);
        } else if (field.type !== 'section') {
          allFields.push(field);
        }
      });

      for (const field of allFields) {
        if (field.type === 'file' && data[field.id]) {
          const files = Array.isArray(data[field.id])
            ? data[field.id]
            : [data[field.id]];

          // Upload files to Firebase Storage
          const { formFileUploadService } = await import(
            '@/services/form-file-upload.service'
          );

          // Generate temporary submission ID for file paths
          const tempSubmissionId = `temp_${Date.now()}`;

          for (const file of files) {
            if (file instanceof File) {
              const uploadResult = await formFileUploadService.uploadFile(
                template.id,
                tempSubmissionId,
                field.id,
                file
              );

              filesData.push({
                fieldId: field.id,
                fileName: uploadResult.fileName,
                fileUrl: uploadResult.url,
                storagePath: uploadResult.path,
                fileSize: uploadResult.size,
                mimeType: uploadResult.mimeType,
              });
            }
          }

          // Remove file objects from form data
          delete formData[field.id];
        }
      }

      // Submit form data to API
      const response = await authenticatedFetch('/api/forms/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: template.id,
          data: formData,
          files: filesData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit form');
      }

      toast.success(result.message || 'Form submitted successfully!');

      if (onSuccess) {
        onSuccess(result.submission.id);
      }
    } catch (error: any) {
      console.error('Form submission error:', error);
      const errorMessage = error.message || 'Failed to submit form';
      toast.error(errorMessage);

      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Form Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {template.title}
        </h1>
        {template.description && (
          <p className="text-gray-600">{template.description}</p>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Render fields in order */}
        {template.fields
          .sort((a, b) => a.order - b.order)
          .map((field) => {
            // Render section with nested fields
            if (field.type === 'section') {
              return (
                <div key={field.id}>
                  <FormField
                    field={field}
                    register={register}
                    error={errors[field.id] as any}
                    setValue={setValue}
                    watch={watch}
                  />
                  {/* Render nested fields within section */}
                  {field.fields && field.fields.length > 0 && (
                    <div className="ml-4 space-y-6 mt-6">
                      {field.fields
                        .sort((a, b) => a.order - b.order)
                        .map((nestedField) => (
                          <FormField
                            key={nestedField.id}
                            field={nestedField}
                            register={register}
                            error={errors[nestedField.id] as any}
                            setValue={setValue}
                            watch={watch}
                          />
                        ))}
                    </div>
                  )}
                </div>
              );
            }

            // Render regular field
            return (
              <FormField
                key={field.id}
                field={field}
                register={register}
                error={errors[field.id] as any}
                setValue={setValue}
                watch={watch}
              />
            );
          })}

        {/* Submit Button */}
        <FormSubmitButton
          isSubmitting={isSubmitting}
          text={template.settings.submitButtonText}
        />
      </form>
    </div>
  );
}
