import { Shield } from 'lucide-react';
import { SEO } from './SEO';

export function PrivacyPolicy() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 py-8">
      <SEO title="Privacy Policy | Preemptly" />
      <div className="flex items-center gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div className="w-12 h-12 rounded-xl bg-[#5a8c12]/10 text-[#5a8c12] flex items-center justify-center">
          <Shield size={24} strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Privacy Policy</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-700 dark:text-slate-300">
        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">1. Information We Collect</h2>
          <p>
            We collect information that you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us. This information may include: name, email, phone number, postal address, profile picture, payment method, and other information you choose to provide.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">2. How We Use Your Information</h2>
          <p>
            We may use the information we collect about you to:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>Provide, maintain, and improve our services.</li>
            <li>Perform internal operations, including, for example, to prevent fraud and abuse of our services.</li>
            <li>Send or facilitate communications between you and other users.</li>
            <li>Send you communications we think will be of interest to you.</li>
            <li>Personalize and improve the services, including to provide or recommend features, content, social connections, referrals, and advertisements.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">3. Data Security</h2>
          <p>
            We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">4. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at privacy@bepreemptly.com.
          </p>
        </section>
      </div>
    </div>
  );
}
