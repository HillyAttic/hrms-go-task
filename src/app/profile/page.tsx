"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useEnhancedAuth } from "@/contexts/enhanced-auth.context";
import { Button } from "@/components/ui/button";
import { PencilIcon } from "@heroicons/react/24/outline";
import ProfileEditForm, { ProfileInitialData } from "./_components/ProfileEditForm";

export default function Page() {
  const auth = useEnhancedAuth();

  const [data, setData] = useState({
    name: "", // Will be populated from auth
    coverPhoto: "/images/cover/cover-01.png", // Default cover
    email: "", // Will be populated from auth
    role: "", // Will be populated from auth
    department: "", // Will be populated from auth
    position: "", // Will be derived from role
    photoURL: "", // Will be populated from auth
  });

  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (auth.userProfile) {
      setData(prev => ({
        ...prev,
        name: auth.userProfile?.displayName || auth.user?.email || "User",
        email: auth.user?.email || "",
        role: auth.userProfile?.role || "employee",
        department: auth.userProfile?.department || "",
        photoURL: auth.userProfile?.photoURL || "",
        position: auth.userProfile?.role ? auth.userProfile.role.charAt(0).toUpperCase() + auth.userProfile.role.slice(1) : "Employee"
      }));
    } else if (auth.user) {
      // Fallback to basic user info if profile isn't loaded yet
      setData(prev => ({
        ...prev,
        name: auth.user?.displayName || auth.user?.email || "User",
        email: auth.user?.email || "",
      }));
    }
  }, [auth.userProfile, auth.user]);

  const handleEditSuccess = (updatedData: ProfileInitialData) => {
    setData(prev => ({
      ...prev,
      name: updatedData.displayName,
      department: updatedData.department || "",
      photoURL: updatedData.photoURL || prev.photoURL,
    }));
    setIsEditMode(false);
    // Refresh user data in auth context
    auth.refreshUserData();
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
  };

  // Edit Mode
  if (isEditMode) {
    return (
      <div className="mx-auto w-full max-w-[700px]">
        <Breadcrumb pageName="Edit Profile" />
        <div className="rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-dark">
          <ProfileEditForm
            initialData={{
              uid: auth.user?.uid,
              displayName: auth.userProfile?.displayName || data.name,
              firstName: auth.userProfile?.firstName,
              lastName: auth.userProfile?.lastName,
              email: data.email,
              employeeId: auth.userProfile?.employeeId,
              department: data.department,
              phoneNumber: auth.userProfile?.phoneNumber,
              dateOfBirth: auth.userProfile?.dateOfBirth,
              dateOfJoining: auth.userProfile?.dateOfJoining,
              workAnniversary: auth.userProfile?.workAnniversary,
              probationDuration: auth.userProfile?.probationDuration,
              probationEndDate: auth.userProfile?.probationEndDate,
              promotionDate: auth.userProfile?.promotionDate,
              promotionDetails: auth.userProfile?.promotionDetails,
              bankName: auth.userProfile?.bankName,
              bankAccountNumber: auth.userProfile?.bankAccountNumber,
              bankIfsc: auth.userProfile?.bankIfsc,
              documents: auth.userProfile?.documents,
              photoURL: data.photoURL,
            }}
            onSuccess={handleEditSuccess}
            onCancel={handleCancelEdit}
          />
        </div>
      </div>
    );
  }

  // View Mode
  return (
    <div className="mx-auto w-full max-w-[1000px]">
      <Breadcrumb pageName="Profile" />

      <div className="overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-dark dark:shadow-2xl transition-all duration-300 hover:shadow-2xl">
        {/* Cover Photo Section */}
        <div className="relative h-48 md:h-64 overflow-hidden">
          <Image
            src={data?.coverPhoto}
            alt="Profile Cover"
            className="w-full h-full object-cover"
            width={1000}
            height={300}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>

        {/* Profile Content */}
        <div className="relative px-6 pb-8 -mt-16">
          {/* Profile Avatar */}
          <div className="flex justify-center mb-6">
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl ring-4 ring-white dark:ring-gray-800 transition-transform hover:scale-105 duration-300">
              {data.photoURL ? (
                <Image
                  src={data.photoURL}
                  alt="Profile Photo"
                  className="w-full h-full object-cover rounded-full"
                  width={144}
                  height={144}
                />
              ) : (
                <span className="text-5xl font-bold text-white">
                  {data?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              )}
            </div>
          </div>

          {/* User Info */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-dark dark:text-white mb-2">
              {data?.name}
            </h1>
            <div className="inline-flex items-center px-4 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <span className="text-blue-800 dark:text-blue-200 font-medium">
                {data?.position}
              </span>
            </div>
          </div>

          {/* User Details Grid */}
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-dark-2 rounded-xl p-5 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-dark-3 transition-colors duration-200">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                  <h4 className="font-semibold text-dark dark:text-white">Email</h4>
                </div>
                <p className="text-gray-600 dark:text-gray-300 truncate">{data.email}</p>
              </div>

              <div className="bg-gray-50 dark:bg-dark-2 rounded-xl p-5 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-dark-3 transition-colors duration-200">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <h4 className="font-semibold text-dark dark:text-white">Role</h4>
                </div>
                <p className="text-gray-600 dark:text-gray-300 capitalize">{data.role}</p>
              </div>

              <div className="bg-gray-50 dark:bg-dark-2 rounded-xl p-5 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-dark-3 transition-colors duration-200">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                  <h4 className="font-semibold text-dark dark:text-white">Department</h4>
                </div>
                <p className="text-gray-600 dark:text-gray-300">{data.department || 'Not specified'}</p>
              </div>

              <div className="bg-gray-50 dark:bg-dark-2 rounded-xl p-5 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-dark-3 transition-colors duration-200">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
                  <h4 className="font-semibold text-dark dark:text-white">Status</h4>
                </div>
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-200">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                  Active
                </span>
              </div>
            </div>

            {/* Edit Profile Button */}
            <div className="mt-8 flex justify-center">
              <Button
                onClick={() => setIsEditMode(true)}
                className="flex items-center gap-2 px-6 py-3 text-white"
              >
                <PencilIcon className="w-5 h-5" />
                Edit Profile
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
