'use client';

import styles from './employers.module.css';
import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  Calculator,
  CheckCircle,
  DollarSign,
  Heart,
  MessageCircle,
  ShieldCheck,
  Users,
} from 'lucide-react';

export default function Home() {
  const [employees, setEmployees] = useState(100);

  const monthlyReimbursement = 175;
  const annualFICASavingsPerEmployee = 600;

  const monthlyTotal = employees * monthlyReimbursement;
  const annualTotal = monthlyTotal * 12;
  const employerSavings = employees * annualFICASavingsPerEmployee;
  const totalImpact = annualTotal + employerSavings;

  return (
    <main className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <Link href="/" className={styles.logoWrap}>
          <img src="/8930_1663277124.png" height={42} alt="Revenue Return Specialists" />
        </Link>

        <nav className={styles.navLinks}>
          <Link href="/">Home</Link>
          <Link href="/employers">Employers</Link>
          <Link href="/partners">CPA & Referral Partners</Link>
          <a href="#how">How It Works</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroTextBlock}>
          <div className={`${styles.pill} ${styles.greenPill}`}>
            Payroll-Based Savings Strategy
          </div>

          <h1>Help Employees Take Home More While Reducing Employer Payroll Tax Costs</h1>

          <p>
            Revenue Return Specialists helps employers evaluate and implement a payroll-based
            strategy designed to potentially increase employee net pay, reduce matching FICA
            obligations, and add preventive care benefits without disrupting existing benefit plans.
          </p>

          <div className={styles.heroButtons}>
            <a
              href="#contact"
              className={styles.primaryButton}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Schedule Your Consultation
              <ArrowRight size={18} />
            </a>

            <a
              href="#calculator"
              className={styles.secondaryButton}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Calculate Savings
            </a>
          </div>

          <div className={styles.trustLine}>
            <CheckCircle size={18} />
            <span>
              Fully supported from savings analysis through employee communication, enrollment, and
              ongoing administration.
            </span>
          </div>
        </div>

        <div className={styles.heroCard}>
          <div className={styles.heroCardTop}>
            <Calculator size={34} />
            <span>Potential Company Impact</span>
          </div>

          <div className={styles.heroMetric}>
            <strong>$150–$200</strong>
            <span>potential monthly employee net-pay increase</span>
          </div>

          <div className={styles.heroMetric}>
            <strong>Up to $600</strong>
            <span>annual employer savings per eligible employee</span>
          </div>

          <div className={styles.heroMetric}>
            <strong>Preventive Care</strong>
            <span>additional benefits included with a managed rollout</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className={styles.stats}>
        <div className={styles.stat}>
          <div className={`${styles.statIcon} ${styles.greenIcon}`}>
            <DollarSign size={34} />
          </div>
          <h3>$150–$200</h3>
          <p>Potential Monthly Employee Increase</p>
        </div>

        <div className={styles.stat}>
          <div className={`${styles.statIcon} ${styles.blueIcon}`}>
            <Building2 size={34} />
          </div>
          <h3>$600</h3>
          <p>Potential Annual Employer Savings</p>
        </div>

        <div className={styles.stat}>
          <div className={`${styles.statIcon} ${styles.purpleIcon}`}>
            <ShieldCheck size={34} />
          </div>
          <h3>Designed</h3>
          <p>With Compliance in Mind</p>
        </div>

        <div className={styles.stat}>
          <div className={`${styles.statIcon} ${styles.goldIcon}`}>
            <Heart size={34} />
          </div>
          <h3>$0</h3>
          <p>Direct Out-of-Pocket Cost</p>
        </div>
      </section>

      {/* Problem */}
      <section className={styles.problemSection}>
        <div className={styles.sectionIntro}>
          <div className={`${styles.pill} ${styles.bluePill}`}>The Employer Challenge</div>
          <h2>Employers Are Being Asked to Do More With Less</h2>
          <p>
            Payroll costs keep rising. Employees need more take-home pay. Benefits are expensive.
            And most employers feel stuck between wanting to help their people and protecting the
            company’s bottom line.
          </p>
        </div>

        <div className={styles.problemGrid}>
          <div className={styles.problemCard}>
            <h3>Traditional Raises Are Expensive</h3>
            <p>
              Increasing wages helps employees, but it can also increase payroll tax costs and
              create long-term compensation pressure.
            </p>
          </div>

          <div className={styles.problemCard}>
            <h3>Benefits Are Getting Harder to Afford</h3>
            <p>
              Employers want to support their teams, but richer benefits often come with higher
              premiums, more complexity, or more administrative burden.
            </p>
          </div>

          <div className={styles.problemCard}>
            <h3>Employees Feel the Pressure</h3>
            <p>
              Even strong employees can feel squeezed by inflation, healthcare costs, and everyday
              expenses. More net pay can make a meaningful difference.
            </p>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className={styles.solutionSection}>
        <div className={styles.solutionText}>
          <div className={`${styles.pill} ${styles.greenPill}`}>The RRS Solution</div>
          <h2>A Payroll-Based Strategy That Creates Value on Both Sides of the Paycheck</h2>
          <p>
            We help employers evaluate and implement a strategy designed to improve employee
            take-home pay, reduce employer payroll tax obligations, and add preventive care benefits
            through a managed implementation process.
          </p>
        </div>

        <div className={styles.solutionGrid}>
          <div>
            <DollarSign size={28} />
            <h3>Employee Net-Pay Impact</h3>
            <p>
              Eligible employees may see $150–$200 more in monthly take-home pay through tax-free
              reimbursements.
            </p>
          </div>

          <div>
            <Building2 size={28} />
            <h3>Employer Payroll Savings</h3>
            <p>
              Employers may reduce matching FICA obligations by up to $600 per eligible employee per
              year.
            </p>
          </div>

          <div>
            <ShieldCheck size={28} />
            <h3>Managed Implementation</h3>
            <p>
              We help coordinate education, communication, enrollment, and ongoing administration.
            </p>
          </div>

          <div>
            <Heart size={28} />
            <h3>Preventive Care Benefits</h3>
            <p>
              The strategy includes access to additional preventive care benefits without disrupting
              existing plans.
            </p>
          </div>
        </div>
      </section>

      {/* Mid Page CTA */}
      <section className={styles.inlineCta}>
        <div>
          <div className={`${styles.pill} ${styles.greenPill}`}>Have Questions?</div>
          <h2>Want to Know If This Could Work for Your Company?</h2>
          <p>
            Our team can help you understand the strategy, review fit, and answer practical
            questions before you decide whether to move forward.
          </p>
        </div>

        <div className={styles.inlineCtaButtons}>
          <a href="#contact" className={styles.primaryButton}>
            Schedule a Savings Review
            <ArrowRight size={18} />
          </a>

          <Link href="/questions" className={styles.secondaryButton}>
            <MessageCircle size={18} />
            Submit a Question
          </Link>
        </div>
      </section>

      {/* Three-Way Win */}
      <section className={styles.winSection}>
        <div className={styles.sectionIntro}>
          <div className={`${styles.pill} ${styles.purplePill}`}>A Three-Way Win</div>
          <h2>Built to Benefit the Company, the Employees, and the Benefits Team</h2>
        </div>

        <div className={styles.winGrid}>
          <div className={styles.winCard}>
            <Building2 size={32} />
            <h3>For Employers</h3>
            <p>
              Potential payroll tax savings, improved cash flow, and a meaningful employee benefit
              without a major operational lift.
            </p>
          </div>

          <div className={styles.winCard}>
            <Users size={32} />
            <h3>For Employees</h3>
            <p>
              Eligible employees may receive more take-home pay while gaining access to additional
              preventive care resources.
            </p>
          </div>

          <div className={styles.winCard}>
            <ShieldCheck size={32} />
            <h3>For HR & Benefits Teams</h3>
            <p>
              A supported rollout with communication, enrollment coordination, and ongoing
              administrative help.
            </p>
          </div>
        </div>
      </section>

      {/* Partner CTA */}
      <section className={styles.partnerBand}>
        <div>
          <div className={`${styles.pill} ${styles.bluePill}`}>For Trusted Advisors</div>
          <h2>Are You a CPA, Payroll Company, Broker, or Referral Partner?</h2>
          <p>
            We also partner with trusted advisors who want to bring this strategy to employer
            clients while letting our team support the technical presentation and rollout.
          </p>
        </div>

        <Link href="/partners" className={styles.secondaryButtonDark}>
          Explore Partner Program
          <ArrowRight size={18} />
        </Link>
      </section>

      {/* ROI Calculator */}
      <section className={styles.calculatorSection} id="calculator">
        <div className={styles.sectionIntro}>
          <div className={`${styles.pill} ${styles.purplePill}`}>ROI Calculator</div>
          <h2>Estimate the Potential Impact</h2>
          <p>
            Enter the number of eligible employees to see a simple estimate of employee savings,
            employer savings, and combined annual value.
          </p>
        </div>

        <div className={styles.calculatorGrid}>
          <div className={styles.calculatorCard}>
            <div className={styles.calculatorHeader}>
              <DollarSign size={24} />
              <span>Savings Calculator</span>
            </div>

            <div className={styles.calculatorContent}>
              <label htmlFor="employees">Number of Employees</label>
              <input
                type="number"
                id="employees"
                value={employees}
                onChange={(e) => setEmployees(parseInt(e.target.value) || 0)}
                placeholder="Enter number of employees"
              />

              <div className={styles.calculatorNote}>
                <h4>Calculation Based On:</h4>
                <ul>
                  <li>Average $175/month per employee reimbursement</li>
                  <li>$600/year employer FICA savings per employee</li>
                  <li>Actual results may vary by employer and eligibility</li>
                </ul>
              </div>
            </div>
          </div>

          <div className={styles.resultsColumn}>
            <div className={`${styles.resultCard} ${styles.greenResult}`}>
              <div className={styles.resultTitleRow}>
                <DollarSign size={24} />
                <div>
                  <h3>Employee Savings</h3>
                  <p>Monthly and annual take-home increase</p>
                </div>
              </div>

              <div className={styles.resultRow}>
                <span>Monthly Total</span>
                <strong>${monthlyTotal.toLocaleString()}</strong>
              </div>

              <div className={styles.resultRow}>
                <span>Annual Total</span>
                <strong>${annualTotal.toLocaleString()}</strong>
              </div>
            </div>

            <div className={`${styles.resultCard} ${styles.blueResult}`}>
              <div className={styles.resultTitleRow}>
                <Building2 size={24} />
                <div>
                  <h3>Employer Savings</h3>
                  <p>Annual FICA tax reduction</p>
                </div>
              </div>

              <div className={styles.bigResult}>${employerSavings.toLocaleString()}</div>
              <p className={styles.resultFootnote}>estimated annual employer value</p>
            </div>

            <div className={`${styles.resultCard} ${styles.purpleResult}`}>
              <div className={styles.resultTitleRow}>
                <Users size={24} />
                <div>
                  <h3>Total Impact</h3>
                  <p>Combined annual value</p>
                </div>
              </div>

              <div className={styles.bigResult}>${totalImpact.toLocaleString()}</div>
              <p className={styles.resultFootnote}>estimated annual company-wide impact</p>
            </div>
          </div>
        </div>
      </section>

      {/* Calculator CTA */}
      <section className={styles.calculatorCta}>
        <div>
          <h2>Want to Review These Numbers With Us?</h2>
          <p>
            The calculator gives a simple estimate. A quick review can help clarify eligibility,
            implementation steps, and what this could realistically mean for your organization.
          </p>
        </div>

        <div className={styles.calculatorCtaButtons}>
          <a href="#contact" className={styles.primaryButton}>
            Review These Numbers
            <ArrowRight size={18} />
          </a>

          <Link href="/questions" className={styles.secondaryButtonDarkText}>
            Submit a Question
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.howSection} id="how">
        <div className={styles.sectionIntro}>
          <div className={`${styles.pill} ${styles.bluePill}`}>Simple Process</div>
          <h2>How It Works</h2>
          <p>
            We keep the process straightforward so employers can understand the opportunity, review
            the numbers, and move forward with clarity.
          </p>
        </div>

        <div className={styles.steps}>
          <div className={styles.step}>
            <span>01</span>
            <h3>Review Eligibility & Savings Potential</h3>
            <p>
              We gather basic information and estimate the potential savings for the company and
              eligible employees.
            </p>
          </div>

          <div className={styles.step}>
            <span>02</span>
            <h3>Coordinate the Payroll Strategy</h3>
            <p>
              We help align the strategy with payroll, benefits, and implementation requirements.
            </p>
          </div>

          <div className={styles.step}>
            <span>03</span>
            <h3>Communicate With Employees</h3>
            <p>
              Employees receive clear information about the program, their potential benefit, and
              any required next steps.
            </p>
          </div>

          <div className={styles.step}>
            <span>04</span>
            <h3>Support Ongoing Administration</h3>
            <p>
              We remain available for questions, new hires, changes, and continued administrative
              support.
            </p>
          </div>
        </div>
      </section>

      {/* Why RRS */}
      <section className={styles.whySection}>
        <div className={styles.sectionIntro}>
          <div className={`${styles.pill} ${styles.greenPill}`}>Why Employers Work With RRS</div>
          <h2>Clear Strategy. Professional Rollout. Ongoing Support.</h2>
        </div>

        <div className={styles.whyGrid}>
          <div className={styles.whyCard}>
            <ShieldCheck size={30} />
            <h3>Compliance-First Structure</h3>
            <p>
              Built around a documented strategy with tax and legal support designed to help
              employers move forward with confidence.
            </p>
          </div>

          <div className={styles.whyCard}>
            <Users size={30} />
            <h3>Fully Managed Rollout</h3>
            <p>
              We help coordinate the communication, enrollment flow, employee education, and
              implementation process.
            </p>
          </div>

          <div className={styles.whyCard}>
            <Heart size={30} />
            <h3>No Disruption to Current Benefits</h3>
            <p>The strategy is designed to work alongside existing programs and providers.</p>
          </div>

          <div className={styles.whyCard}>
            <DollarSign size={30} />
            <h3>Clear Financial Impact</h3>
            <p>
              Employers and employees can review the potential value before deciding whether to move
              forward.
            </p>
          </div>
        </div>
      </section>

      {/* Credibility */}
      <section className={styles.credibilitySection}>
        <div className={styles.sectionIntro}>
          <div className={`${styles.pill} ${styles.amberPill}`}>Proven & Trusted</div>
          <h2>Recognized, Researched, and Built for Serious Employers</h2>
          <p>
            Our partners and program structure have been recognized in respected publications and
            supported by extensive tax and legal research.
          </p>
        </div>

        <div className={styles.credibilityGrid}>
          <div className={styles.credibilityCard}>
            <h3>CPA Journal Discussion</h3>
            <p>
              This type of payroll tax strategy has been discussed in CPA Journal for its innovative
              approach to employer and employee savings.
            </p>
          </div>

          <div className={styles.credibilityCard}>
            <h3>INC. Magazine Recognition</h3>
            <p>
              Our partners have been recognized for the conceptual and architectural design of this
              innovative program.
            </p>
          </div>

          <div className={styles.credibilityCard}>
            <h3>Legal & Tax Research</h3>
            <p>
              The structure is supported by extensive research designed to give employers a
              professional foundation for review.
            </p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className={styles.contactSection}>
        <div className={styles.contactHeader}>
          <div className={`${styles.pill} ${styles.greenPillDark}`}>Get Started Today</div>

          <h2>
            See What This Could Mean for <span>Your Company</span>
          </h2>

          <p>
            Schedule a personal consultation with one of our experts. No pressure, no pitch — just a
            practical conversation about whether this strategy could create value for your team.
          </p>

          <div className={styles.contactHeaderButtons}>
            <Link href="/questions" className={styles.contactQuestionButton}>
              <MessageCircle size={18} />
              Submit a Question Instead
            </Link>
          </div>
        </div>

        <div className={styles.contactGrid}>
          <div className={styles.formContainer}>
            <h3>Schedule Here</h3>

            <form>
              <div className={styles.gridTwoCols}>
                <input type="text" name="name" placeholder="Your Name" required />
                <input type="email" name="email" placeholder="Email Address" required />
              </div>

              <div className={styles.gridTwoCols}>
                <input type="text" name="company" placeholder="Company Name" required />
                <input type="number" name="employees" placeholder="Number of Employees" required />
              </div>

              <textarea name="message" placeholder="How did you hear about us?" rows={4} />

              <button
                type="button"
                onClick={() => {
                  const nameInput = document.querySelector(
                    'input[name="name"]'
                  ) as HTMLInputElement;
                  const emailInput = document.querySelector(
                    'input[name="email"]'
                  ) as HTMLInputElement;
                  const companyInput = document.querySelector(
                    'input[name="company"]'
                  ) as HTMLInputElement;
                  const employeesInput = document.querySelector(
                    'input[name="employees"]'
                  ) as HTMLInputElement;
                  const messageInput = document.querySelector(
                    'textarea[name="message"]'
                  ) as HTMLTextAreaElement;

                  if (
                    !nameInput.value ||
                    !emailInput.value ||
                    !companyInput.value ||
                    !employeesInput.value
                  ) {
                    alert('Please fill in your name, email, company, and number of employees.');
                    return;
                  }

                  const name = encodeURIComponent(nameInput.value);
                  const email = encodeURIComponent(emailInput.value);
                  const company = encodeURIComponent(companyInput.value);
                  const employees = encodeURIComponent(employeesInput.value);
                  const message = messageInput.value || 'No message provided.';

                  const a1 = `Company: ${company}\nEmployees: ${employees}\nMessage: ${message}`;

                  const calendlyUrl = `https://calendly.com/revenuereturnspecialists/payroll-strategy-meeting?full_name=${name}&email=${email}&a1=${encodeURIComponent(
                    a1
                  ).replace(/%20/g, ' ')}`;

                  window.open(calendlyUrl, '_blank');
                }}
              >
                Check Availability
                <ArrowRight size={18} />
              </button>
            </form>
          </div>

          <div className={styles.sideCards}>
            <div className={styles.contactCard}>
              <h3>Contact Our Team Directly</h3>

              <div className={styles.infoItem}>
                <span>Phone</span>
                <a href="tel:6363548393">(636) 354-8393</a>
              </div>

              <div className={styles.infoItem}>
                <span>Email</span>
                <a href="mailto:lee@RevenueReturnSpecialists.com">
                  lee@RevenueReturnSpecialists.com
                </a>
              </div>
            </div>

            <div className={styles.expectCard}>
              <h3>What to Expect</h3>

              {[
                'Who, what, why, and how — all answered in one quick call',
                'No pressure, no pitch — just information',
                'Custom analysis for your specific situation',
                'Clear next steps if you decide to move forward',
              ].map((text) => (
                <div key={text} className={styles.expectItem}>
                  <CheckCircle size={18} />
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className={styles.footer}>
          © 2026 Revenue Return Specialists. All rights reserved.
        </footer>
      </section>
    </main>
  );
}