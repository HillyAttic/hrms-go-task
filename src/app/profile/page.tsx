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
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0B1430]/90 sm:p-8">
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
              salary: auth.userProfile?.salary,
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

      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] backdrop-blur-2xl transition-all duration-300 dark:border-white/10 dark:bg-[#0B1430]/90">
        {/* Cover Photo Section */}
        <div className="relative h-48 md:h-64 overflow-hidden">
          <Image
            src={data?.coverPhoto}
            alt="Profile Cover"
            className="w-full h-full object-cover"
            width={1000}
            height={300}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1430]/65 via-[#0B1430]/10 to-transparent"></div>
        </div>

        {/* Profile Content */}
        <div className="relative px-6 pb-8 -mt-16">
          {/* Profile Avatar */}
          <div className="flex justify-center mb-6">
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br from-[#0447FD] to-[#7F1BFF] shadow-[0_18px_45px_-14px_rgba(4,71,253,0.65)] ring-4 ring-white transition-transform duration-300 hover:scale-105 dark:ring-white/10">
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
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {data?.name}
            </h1>
            <div className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50/80 px-4 py-1 dark:border-indigo-400/20 dark:bg-indigo-500/10">
              <span className="font-medium text-indigo-600 dark:text-indigo-300">
                {data?.position}
              </span>
            </div>
          </div>

          {/* User Details Grid */}
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-white/70 bg-white/60 p-5 shadow-[0_10px_30px_-14px_rgba(15,23,42,0.22)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300/70 hover:shadow-[0_18px_35px_-18px_rgba(4,71,253,0.5)] dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-indigo-400/40">
                <div className="flex items-center mb-2">
                  <div className="mr-2 h-3 w-3 rounded-full bg-[#0447FD]"></div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">Email</h4>
                </div>
                <p className="truncate text-slate-600 dark:text-slate-300">{data.email}</p>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/60 p-5 shadow-[0_10px_30px_-14px_rgba(15,23,42,0.22)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300/70 hover:shadow-[0_18px_35px_-18px_rgba(4,71,253,0.5)] dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-indigo-400/40">
                <div className="flex items-center mb-2">
                  <div className="mr-2 h-3 w-3 rounded-full bg-emerald-500"></div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">Role</h4>
                </div>
                <p className="capitalize text-slate-600 dark:text-slate-300">{data.role}</p>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/60 p-5 shadow-[0_10px_30px_-14px_rgba(15,23,42,0.22)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300/70 hover:shadow-[0_18px_35px_-18px_rgba(4,71,253,0.5)] dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-indigo-400/40">
                <div className="flex items-center mb-2">
                  <div className="mr-2 h-3 w-3 rounded-full bg-[#7F1BFF]"></div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">Department</h4>
                </div>
                <p className="text-slate-600 dark:text-slate-300">{data.department || 'Not specified'}</p>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/60 p-5 shadow-[0_10px_30px_-14px_rgba(15,23,42,0.22)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300/70 hover:shadow-[0_18px_35px_-18px_rgba(4,71,253,0.5)] dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-indigo-400/40">
                <div className="flex items-center mb-2">
                  <div className="mr-2 h-3 w-3 rounded-full bg-sky-500"></div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">Status</h4>
                </div>
                <span className="inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
                  Active
                </span>
              </div>
            </div>

            {/* Edit Profile Button */}
            <div className="mt-8 flex justify-center">
              <Button
                onClick={() => setIsEditMode(true)}
                className="flex items-center gap-2 rounded-xl px-6 py-3 text-white shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5 hover:brightness-110"
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
