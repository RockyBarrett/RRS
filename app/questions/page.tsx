'use client';

import Link from 'next/link';
import styles from './questions.module.css';
import {
  ArrowRight,
  CheckCircle,
  MessageCircle,
  Send,
} from 'lucide-react';
import { useState } from 'react';

export default function QuestionsPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = String(formData.get('name') || '');
    const email = String(formData.get('email') || '');
    const company = String(formData.get('company') || '');
    const role = String(formData.get('role') || '');
    const phone = String(formData.get('phone') || '');
    const question = String(formData.get('question') || '');

    if (!name || !email || !role || !question) {
      alert('Please fill in your name, email, role, and question before submitting.');
      return;
    }

    const subject = encodeURIComponent(`Website Question from ${name}`);
    const body = encodeURIComponent(
      `New question submitted from the Revenue Return Specialists website:\n\n` +
        `Name: ${name}\n` +
        `Email: ${email}\n` +
        `Company: ${company || 'Not provided'}\n` +
        `Role: ${role}\n` +
        `Phone: ${phone || 'Not provided'}\n\n` +
        `Question:\n${question}\n`
    );

    window.location.href = `mailto:lee@RevenueReturnSpecialists.com?subject=${subject}&body=${body}`;

    setSubmitted(true);
    form.reset();
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logoWrap}>
          <img src="/8930_1663277124.png" height={42} alt="Revenue Return Specialists" />
        </Link>

        <nav className={styles.navLinks}>
          <Link href="/">Home</Link>
          <Link href="/employers">Employers</Link>
          <Link href="/partners">Partners</Link>
          <Link href="/questions">Submit a Question</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <div className={styles.pill}>
            <MessageCircle size={16} />
            Submit a Question
          </div>

          <h1>Have a Question About the Payroll Strategy?</h1>

          <p>
            Send us your question and our team will help point you in the right direction. Whether
            you are an employer, CPA, payroll company, broker, or referral partner, we’ll help you
            understand the next best step.
          </p>

          <div className={styles.quickPoints}>
            <div>
              <CheckCircle size={18} />
              <span>No pressure</span>
            </div>
            <div>
              <CheckCircle size={18} />
              <span>Clear answers</span>
            </div>
            <div>
              <CheckCircle size={18} />
              <span>Employer and partner support</span>
            </div>
          </div>
        </div>

        <div className={styles.formCard}>
          <h2>Send Your Question</h2>

          <form onSubmit={handleSubmit}>
            <div className={styles.gridTwo}>
              <div className={styles.field}>
                <label htmlFor="name">Name *</label>
                <input id="name" name="name" type="text" placeholder="Your name" required />
              </div>

              <div className={styles.field}>
                <label htmlFor="email">Email *</label>
                <input id="email" name="email" type="email" placeholder="you@email.com" required />
              </div>
            </div>

            <div className={styles.gridTwo}>
              <div className={styles.field}>
                <label htmlFor="company">Company</label>
                <input id="company" name="company" type="text" placeholder="Company name" />
              </div>

              <div className={styles.field}>
                <label htmlFor="phone">Phone</label>
                <input id="phone" name="phone" type="tel" placeholder="Optional" />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="role">I am a *</label>
              <select id="role" name="role" required defaultValue="">
                <option value="" disabled>
                  Select one
                </option>
                <option value="Employer">Employer</option>
                <option value="CPA / Tax Advisor">CPA / Tax Advisor</option>
                <option value="Payroll Company">Payroll Company</option>
                <option value="Benefits Broker">Benefits Broker</option>
                <option value="Referral Partner">Referral Partner</option>
                <option value="Employee">Employee</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="question">Question *</label>
              <textarea
                id="question"
                name="question"
                rows={6}
                placeholder="What would you like to ask us?"
                required
              />
            </div>

            <button type="submit" className={styles.submitButton}>
              Submit Question
              <Send size={18} />
            </button>

            {submitted && (
              <p className={styles.successMessage}>
                Your email app should open with your question ready to send.
              </p>
            )}
          </form>
        </div>
      </section>

      <section className={styles.bottomCta}>
        <div>
          <h2>Prefer to Talk Through It?</h2>
          <p>
            Schedule a quick call and we’ll walk through the strategy, fit, and potential next steps.
          </p>
        </div>

        <a
          href="https://calendly.com/revenuereturnspecialists/payroll-strategy-meeting"
          target="_blank"
          rel="noreferrer"
          className={styles.callButton}
        >
          Schedule a Call
          <ArrowRight size={18} />
        </a>
      </section>

      <footer className={styles.footer}>
        © 2026 Revenue Return Specialists. All rights reserved.
      </footer>
    </main>
  );
}