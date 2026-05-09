import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle,
  DollarSign,
  Handshake,
  ShieldCheck,
  Users,
  BriefcaseBusiness,
  Building2,
  Calculator,
  HeartHandshake,
  MessageCircle,
} from 'lucide-react';
import styles from './partners.module.css';

export default function PartnersPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logoWrap}>
          <img src="/8930_1663277124.png" height={42} alt="Revenue Return Specialists" />
        </Link>

        <nav className={styles.navLinks}>
          <Link href="/">Home</Link>
          <Link href="/employers">Employers</Link>
          <Link href="/partners">CPA & Referral Partners</Link>
          <a href="#process">How It Works</a>
          <Link href="/questions">Submit a Question</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <div className={styles.pill}>CPA, Payroll & Referral Partner Program</div>

          <h1>Help Your Clients Unlock Payroll Savings Without Adding More Work to Your Plate</h1>

          <p>
            Revenue Return Specialists partners with CPAs, payroll professionals, benefits brokers,
            consultants, and trusted advisors to help employers reduce payroll tax costs, improve
            employee take-home pay, and offer additional preventive care benefits through a fully
            supported strategy.
          </p>

          <div className={styles.heroButtons}>
            <a href="#partner-contact" className={styles.primaryButton}>
              Schedule a Partner Call
              <ArrowRight size={18} />
            </a>

            <Link href="/questions" className={styles.secondaryButton}>
              <MessageCircle size={18} />
              Submit a Question
            </Link>
          </div>

          <div className={styles.trustLine}>
            <CheckCircle size={18} />
            <span>
              We support the sales conversation, savings analysis, employee communication,
              enrollment process, and ongoing administration.
            </span>
          </div>
        </div>

        <div className={styles.heroCard}>
          <div className={styles.cardTop}>
            <Handshake size={34} />
            <span>Partner Opportunity</span>
          </div>

          <h3>Bring More Value to Every Employer Relationship</h3>

          <div className={styles.metricList}>
            <div>
              <strong>$150–$200</strong>
              <span>potential monthly employee net-pay increase</span>
            </div>

            <div>
              <strong>Up to $600</strong>
              <span>annual employer savings per eligible employee</span>
            </div>

            <div>
              <strong>Fully Supported</strong>
              <span>from first conversation through implementation</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.partnerTypes}>
        <div className={styles.sectionIntro}>
          <div className={styles.pill}>Built for Trusted Advisors</div>
          <h2>Who This Is For</h2>
          <p>
            If your clients have employees, payroll, benefits costs, or ongoing retention challenges,
            this may be a meaningful value-add for your relationship.
          </p>
        </div>

        <div className={styles.gridFour}>
          <div className={styles.infoCard}>
            <Calculator className={styles.greenIcon} />
            <h3>CPAs & Tax Advisors</h3>
            <p>
              Introduce clients to a practical payroll savings strategy that may improve cash flow
              and employee compensation.
            </p>
          </div>

          <div className={styles.infoCard}>
            <Building2 className={styles.blueIcon} />
            <h3>Payroll Companies</h3>
            <p>
              Help employer clients uncover savings inside payroll while strengthening your advisory
              relationship.
            </p>
          </div>

          <div className={styles.infoCard}>
            <BriefcaseBusiness className={styles.purpleIcon} />
            <h3>Benefits Brokers</h3>
            <p>
              Add a compelling employer-friendly strategy that complements existing benefits without
              disrupting the current plan.
            </p>
          </div>

          <div className={styles.infoCard}>
            <HeartHandshake className={styles.goldIcon} />
            <h3>Referral Partners</h3>
            <p>
              Open doors, create value, and let our team handle the technical presentation and
              implementation process.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.partnerFitCta}>
        <div>
          <div className={styles.pill}>Have a Specific Client in Mind?</div>
          <h2>Let’s See If They Might Be a Fit</h2>
          <p>
            Send us a quick question about a client, industry, employee count, or payroll situation,
            and we’ll help you think through whether the opportunity is worth exploring.
          </p>
        </div>

        <div className={styles.partnerFitButtons}>
          <Link href="/questions" className={styles.primaryButton}>
            Submit a Question
            <MessageCircle size={18} />
          </Link>

          <a href="#process" className={styles.secondaryButton}>
            See the Process
          </a>
        </div>
      </section>

      <section className={styles.winSection}>
        <div className={styles.sectionIntro}>
          <div className={styles.pill}>A Three-Way Win</div>
          <h2>A Win for You, Your Clients, and Their Employees</h2>
        </div>

        <div className={styles.gridThree}>
          <div className={styles.winCard}>
            <Handshake size={32} />
            <h3>For Partners</h3>
            <p>
              Create a new revenue opportunity while deepening client trust and bringing a
              differentiated strategy to the table.
            </p>
          </div>

          <div className={styles.winCard}>
            <DollarSign size={32} />
            <h3>For Employers</h3>
            <p>
              Reduce matching FICA obligations, improve cash flow, and offer additional employee
              benefits without a major operational lift.
            </p>
          </div>

          <div className={styles.winCard}>
            <Users size={32} />
            <h3>For Employees</h3>
            <p>
              Eligible employees may see increased net pay while gaining access to preventive care
              resources and benefit options.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.supportSection}>
        <div className={styles.supportText}>
          <div className={styles.pill}>Supported From Start to Finish</div>
          <h2>You Bring the Relationship. We Bring the Process.</h2>
          <p>
            Our role is to make you look sharp, protect the relationship, and give your client a
            clear, professional path from initial interest to implementation.
          </p>
        </div>

        <div className={styles.supportGrid}>
          <div>
            <ShieldCheck size={26} />
            <h3>Sales Support</h3>
            <p>
              We help explain the strategy, answer questions, prepare savings estimates, and support
              decision-maker conversations.
            </p>
          </div>

          <div>
            <CheckCircle size={26} />
            <h3>Implementation Support</h3>
            <p>
              Our team helps coordinate the timeline, employee communication, enrollment flow, and
              required setup steps.
            </p>
          </div>

          <div>
            <Building2 size={26} />
            <h3>Payroll & Administration Support</h3>
            <p>
              We help work through the operational details so your client is not left trying to
              figure everything out alone.
            </p>
          </div>

          <div>
            <HeartHandshake size={26} />
            <h3>Ongoing Partner Support</h3>
            <p>
              After implementation, we remain available for new hires, questions, changes, and
              continued client support.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.processSection} id="process">
        <div className={styles.sectionIntro}>
          <div className={styles.pill}>Simple Partner Path</div>
          <h2>How the Partner Process Works</h2>
        </div>

        <div className={styles.steps}>
          <div className={styles.step}>
            <span>01</span>
            <h3>Introduce the Opportunity</h3>
            <p>You identify a client who may be a fit and make a warm introduction.</p>
          </div>

          <div className={styles.step}>
            <span>02</span>
            <h3>We Prepare the Analysis</h3>
            <p>
              We review basic employer information and estimate potential savings for the company
              and employees.
            </p>
          </div>

          <div className={styles.step}>
            <span>03</span>
            <h3>We Present With You or For You</h3>
            <p>
              Depending on your preference, we can support the call, lead the presentation, or work
              quietly in the background.
            </p>
          </div>

          <div className={styles.step}>
            <span>04</span>
            <h3>We Support Implementation</h3>
            <p>
              Our team helps manage communication, enrollment, coordination, and ongoing support.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.ctaSection} id="partner-contact">
        <div>
          <div className={styles.pill}>Have a Client Who Might Benefit?</div>
          <h2>Let’s Talk Through the Partner Opportunity</h2>
          <p>
            We’ll walk through the strategy, the ideal client profile, and how our referral process
            works. No pressure, no obligation — just a practical conversation about whether this
            could create value for your clients.
          </p>
        </div>

        <div className={styles.finalCtaButtons}>
          <a
            className={styles.primaryButton}
            href="https://calendly.com/revenuereturnspecialists/payroll-strategy-meeting"
            target="_blank"
            rel="noreferrer"
          >
            Schedule a Partner Call
            <ArrowRight size={18} />
          </a>

          <Link href="/questions" className={styles.darkQuestionButton}>
            Submit a Question
          </Link>
        </div>
      </section>
    </main>
  );
}