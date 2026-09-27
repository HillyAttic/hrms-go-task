"use client";

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';

const profileFormSchema = z.object({
  displayName: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  department: z.string().optional(),
  phoneNumber: z.string().regex(/^\+?[\d\s\-()]+$/, { message: 'Invalid phone format' }).optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

interface ProfileEditFormProps {
  initialData: {
    displayName: string;
    department?: string;
    phoneNumber?: string;
    photoURL?: string;
  };
  onSuccess: (updatedData: ProfileFormData & { photoURL?: string }) => void;
  onCancel: () => void;
}

export default function ProfileEditForm({ initialData, onSuccess, onCancel }: ProfileEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [currentPhotoURL, setCurrentPhotoURL] = useState<string | undefined>(initialData.photoURL);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: initialData.displayName,
      department: initialData.department || '',
      phoneNumber: initialData.phoneNumber || '',
    },
  });

  // Generate initials for avatar fallback
  const getInitials = (name: string): string => {
    if (!name) return '';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewURL(url);
    }
  };

  // Remove selected file
  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewURL) {
      URL.revokeObjectURL(previewURL);
      setPreviewURL(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle form submission
  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsSubmitting(true);

      // Get auth token
      const user = auth.currentUser;
      if (!user) {
        toast.error('User not authenticated');
        return;
      }
      const token = await user.getIdToken(false);

      // First, upload photo if selected
      let photoURL = currentPhotoURL;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('photo', selectedFile);

        const response = await fetch('/api/auth/profile', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        const responseData = await response.text().catch(() => '');

        if (!response.ok) {
          let errorText = responseData;
          try {
            const errorJson = JSON.parse(responseData);
            errorText = errorJson.error || 'Failed to upload photo';
          } catch {
            errorText = responseData || response.statusText;
          }
          console.error('Photo upload failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          });
          throw new Error(errorText);
        }

        const result = JSON.parse(responseData);
        photoURL = result.data.photoURL;
        toast.success('Profile photo updated!');
      }

      // Then update profile data
      const updateResponse = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: data.displayName,
          department: data.department,
          phoneNumber: data.phoneNumber,
        }),
      });

      const updateResponseText = await updateResponse.text().catch(() => '');

      if (!updateResponse.ok) {
        let errorText = updateResponseText;
        try {
          const errorJson = JSON.parse(updateResponseText);
          errorText = errorJson.error || 'Failed to update profile';
        } catch {
          errorText = updateResponseText || updateResponse.statusText;
        }
        console.error('Profile update failed:', {
          status: updateResponse.status,
          statusText: updateResponse.statusText,
          error: errorText,
        });
        throw new Error(errorText);
      }

      const updateResult = JSON.parse(updateResponseText);
      toast.success('Profile updated successfully!');

      onSuccess({
        displayName: data.displayName,
        department: data.department,
        phoneNumber: data.phoneNumber,
        photoURL,
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayPhoto = previewURL || currentPhotoURL;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Profile Photo Section */}
      <div className="flex flex-col items-center gap-4">
        <Label htmlFor="photo">Profile Photo</Label>
        <div className="relative">
          {displayPhoto ? (
            <div className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-white dark:ring-gray-800">
              <img
                src={displayPhoto}
                alt="Profile preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveFile}
                className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-4 ring-white dark:ring-gray-800">
              <span className="text-4xl font-bold text-white">
                {getInitials(initialData.displayName)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            id="photo"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting}
          >
            <PhotoIcon className="w-5 h-5 mr-2" />
            {displayPhoto ? 'Change Photo' : 'Upload Photo'}
          </Button>
          {selectedFile && (
            <span className="text-sm text-muted-foreground">
              {selectedFile.name}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Maximum file size: 5MB
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Display Name */}
        <div>
          <Input
            id="displayName"
            label="Display Name"
            {...register('displayName')}
            placeholder="Enter your name"
            error={errors.displayName?.message}
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Department */}
        <div>
          <Input
            id="department"
            label="Department"
            {...register('department')}
            placeholder="Enter your department"
            error={errors.department?.message}
            disabled={isSubmitting}
          />
        </div>

        {/* Phone Number */}
        <div>
          <Input
            id="phoneNumber"
            label="Phone Number"
            {...register('phoneNumber')}
            placeholder="+1 (555) 123-4567"
            error={errors.phoneNumber?.message}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={isSubmitting}
          className="text-white"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
