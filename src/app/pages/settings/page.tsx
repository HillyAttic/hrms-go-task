import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import type { Metadata } from "next";
// import { PersonalInfoForm } from "./_components/personal-info";
// import { UploadPhotoForm } from "./_components/upload-photo";
import { UserManagementForm } from "./_components/user-management";

export const metadata: Metadata = {
  title: "Settings Page",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-[1080px]">
      <Breadcrumb pageName="Settings" />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 md:gap-8">
        <div className="col-span-1 xl:col-span-3">
          {/* <PersonalInfoForm /> */}
          <div className="bg-card p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Personal Information</h3>
            <p className="text-muted-foreground">Personal info form component will be added here.</p>
          </div>
        </div>
        <div className="col-span-1 xl:col-span-2">
          {/* <UploadPhotoForm /> */}
          <div className="bg-card p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Upload Photo</h3>
            <p className="text-muted-foreground">Photo upload form component will be added here.</p>
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <UserManagementForm />
      </div>
    </div>
  );
};

