import Link from 'next/link';
import styles from './page.module.css';
import {
  ArrowRight,
  Building2,
  Handshake,
  ShieldCheck,
  DollarSign,
  Users,
  CheckCircle,
} from 'lucide-react';

export default function Home() {
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
          <Link href="/employers#contact">Contact</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.pill}>Revenue Return Specialists</div>

          <h1>A Payroll Strategy Built for Employers, Employees, and Trusted Advisors</h1>

          <p>
            Revenue Return Specialists helps employers evaluate payroll-based savings strategies
            designed to potentially increase employee take-home pay, reduce employer payroll tax
            costs, and create meaningful value for CPAs, payroll companies, brokers, and referral
            partners.
          </p>

          <div className={styles.heroStats}>
            <div>
              <DollarSign size={22} />
              <span>$150–$200</span>
              <p>potential monthly employee increase</p>
            </div>

            <div>
              <Building2 size={22} />
              <span>Up to $600</span>
              <p>annual employer savings per employee</p>
            </div>

            <div>
              <ShieldCheck size={22} />
              <span>Managed</span>
              <p>implementation and ongoing support</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.pathSection}>
        <div className={styles.sectionIntro}>
          <h2>Choose Your Path</h2>
          <p>
            Whether you are an employer evaluating savings or a trusted advisor looking to bring new
            value to clients, we’ll guide you to the right place.
          </p>
        </div>

        <div className={styles.pathGrid}>
          <Link href="/employers" className={styles.pathCard}>
            <div className={styles.cardIcon}>
              <Building2 size={34} />
            </div>

            <h3>For Employers</h3>

            <p>
              Help eligible employees potentially take home more while your company may reduce
              matching FICA obligations and add preventive care benefits.
            </p>

            <div className={styles.cardList}>
              <span>
                <CheckCircle size={17} />
                Estimate company savings
              </span>
              <span>
                <CheckCircle size={17} />
                Review employee impact
              </span>
              <span>
                <CheckCircle size={17} />
                Understand implementation
              </span>
            </div>

            <div className={styles.cardButton}>
              I’m an Employer
              <ArrowRight size={18} />
            </div>
          </Link>

          <Link href="/partners" className={`${styles.pathCard} ${styles.partnerCard}`}>
            <div className={styles.cardIcon}>
              <Handshake size={34} />
            </div>

            <h3>For CPAs & Referral Partners</h3>

            <p>
              Bring your clients a differentiated payroll savings strategy while our team supports
              the presentation, analysis, implementation, and ongoing process.
            </p>

            <div className={styles.cardList}>
              <span>
                <CheckCircle size={17} />
                Create new client value
              </span>
              <span>
                <CheckCircle size={17} />
                Partner with our support team
              </span>
              <span>
                <CheckCircle size={17} />
                Open doors with confidence
              </span>
            </div>

            <div className={styles.cardButton}>
              I’m a Referral Partner
              <ArrowRight size={18} />
            </div>
          </Link>
        </div>
      </section>

      <section className={styles.trustSection}>
        <div className={styles.trustCard}>
          <Users size={30} />
          <h3>One Strategy. Multiple Wins.</h3>
          <p>
            The right payroll strategy can create value for the employer, improve the employee
            experience, and give trusted advisors a meaningful reason to start a new conversation
            with clients.
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        © 2026 Revenue Return Specialists. All rights reserved.
      </footer>
    </main>
  );
}

