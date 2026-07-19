const TermsPage = () => {
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 md:p-7 2xl:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black dark:text-white">Terms and Conditions</h1>
        <p className="text-gray-600 dark:text-gray-300">Last updated: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="prose prose-gray dark:prose-invert max-w-none">
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-black dark:text-white mb-3">Introduction</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Welcome to EdVentureHub. These terms and conditions outline the rules and regulations for the use of our services.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-black dark:text-white mb-3">Acceptance of Terms</h2>
          <p className="text-gray-600 dark:text-gray-300">
            By accessing this website, we assume you accept these terms and conditions. Do not continue to use EdVentureHub if you do not agree to all of the terms stated on this page.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-black dark:text-white mb-3">License to Use</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Unless otherwise stated, EdVentureHub and/or its licensors own the intellectual property rights for all material on EdVentureHub. All intellectual property rights are reserved.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-black dark:text-white mb-3">User Responsibilities</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Users are responsible for maintaining the confidentiality of their account credentials and for all activities that occur under their account.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-black dark:text-white mb-3">Limitations of Liability</h2>
          <p className="text-gray-600 dark:text-gray-300">
            EdVentureHub shall not be held liable for any consequential, incidental, indirect, or special damages arising out of your use of this platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-black dark:text-white mb-3">Changes to Terms</h2>
          <p className="text-gray-600 dark:text-gray-300">
            We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of the revised terms.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsPage;