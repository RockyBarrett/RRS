'use client';
import styles from './page.module.css';
import './globals.css';
import { useState } from 'react';
import { DollarSign, Users, ShieldCheck, Heart } from 'lucide-react';

export default function Home() {
  const [employees, setEmployees] = useState(100);
  const monthlyReimbursement = 175;
  const annualFICASavingsPerEmployee = 600;

  const monthlyTotal = employees * monthlyReimbursement;
  const annualTotal = monthlyTotal * 12;
  const employerSavings = employees * annualFICASavingsPerEmployee;
  const totalImpact = annualTotal + employerSavings;

  return (
    <main>
      {/* Header */}
      <header className={styles.header}>
        <img src="/8930_1663277124.png" height={40} />

      </header>
      <div className={styles.header}>
  <nav className={styles.navLinks}>
    <a href="#how">How It Works</a>
    <a href="#contact">Contact</a>
  </nav>
</div>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={styles.bubble}></div>
          <div className={styles.bubble2}></div>
          <div className={styles.bubble3}></div>
        </div>
        <h1 className={styles.mainTitle}>
  THE PAYROLL{' '}
  <span className={styles.underline} style={{ whiteSpace: 'nowrap' }}>
    <span style={{ display: 'inline' }}>
      <span className={`${styles.bigDollar} ${styles.heroHighlight}`}>$</span>TRATEGY
    </span>
  </span>
</h1>
        <h2 className={styles.subTitle}>THAT CHANGES EVERYTHING</h2>
        <p className={styles.heroText}>
          Help your employees keep <span className={styles.heroHighlight}>$150-$200 more</span> in their paycheck every month
          while saving your company up to <span className={styles.heroHighlight}>$600 per employee per year</span> in FICA taxes —
          plus offer comprehensive preventative care at zero direct cost.
        </p>
<div className={styles.heroButtonsContainer}>
  <a
    href="#contact"
    className={styles.heroButton}
    onClick={(e) => {
      e.preventDefault();
      const section = document.getElementById('contact');
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    }}
  >
    Schedule Your Consultation
  </a>

  <a
    href="#how"
    className={styles.buttonOutline}
    onClick={(e) => {
      e.preventDefault();
      const section = document.getElementById('how');
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    }}
  >
    Learn How It Works
  </a>
</div>
</section>

      {/* Stats Section */}
<section className={styles.stats}>
  {/* Stat 1 */}
  <div className={styles.stat}>
    <div className={`${styles.statIcon} ${styles.green}`}>
      <DollarSign size={40} />
    </div>
    <h3 className={`${styles.statNumber} ${styles.green}`}>$150–$200</h3>
    <p className={`${styles.statLabel} ${styles.green}`}>Monthly Employee Savings</p>
  </div>

  {/* Stat 2 */}
  
  <div className={styles.stat}>
    <div className={`${styles.statIcon} ${styles.blue}`}>
      <svg 
  width="25" 
  height="40" 
  style={{ transform: 'scale(1.75)' }} 
  fill="none" 
  stroke="currentColor" 
  strokeWidth="3" 
  strokeLinecap="round" 
  strokeLinejoin="round"
>
  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
  <polyline points="16 7 22 7 22 13" />
</svg>
    </div>
    <h3 className={`${styles.statNumber} ${styles.blue}`}>$600</h3>
    <p className={`${styles.statLabel} ${styles.blue}`}>Annual Employer Savings</p>
  </div>

  {/* Stat 3 */}
  <div className={styles.stat}>
    <div className={`${styles.statIcon} ${styles.purple}`}>
      <Users size={40} />
    </div>
  <h3 className={`${styles.statNumber} ${styles.purple}`}>100%</h3>
    <p className={`${styles.statLabel} ${styles.purple}`}>IRS Compliant</p>
  </div>

  {/* Stat 4 */}
  <div className={styles.stat}>
  <div className={`${styles.statIcon} ${styles.golden}`}>
    <svg width="32" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 2l4.9 9.9L32 12l-8 7.8L26.9 32 16 26.6 5.1 32 8 19.8 0 12l11.1-1.1L16 2z" />
    </svg>
  </div>
  <h3 className={`${styles.statNumber} ${styles.golden}`}>$0</h3>
  <p className={`${styles.statLabel} ${styles.golden}`}>Out-of-Pocket-Cost</p>
</div>
</section>

      {/* Benefits Section */}<section className={styles.section}>
  <section className={styles.section}>
  <div className={`${styles.pill} ${styles.greenPill}`}>💰 Win-Win Solution</div>
  <h2 className={styles.headingBig}>
    A Financial Win for <span className={styles.highlightGreen}>Everyone</span>
  </h2>
  <p className={styles.subheadingLarge}>
    Our innovative payroll strategy creates immediate value for both employers and employees,
    while providing a comprehensive preventative care program at no additional direct cost.
  </p>
</section>

<div className={styles.benefitCardWrapper}>
  <div className="benefitCard">
    {/* card content */}
  </div>
</div>


  <div className={styles.benefitsGrid}>
    {/* Card 1 */}
    <div className={styles.benefitCard}>
      <div className={`${styles.benefitIcon} ${styles.green}`}>
        <DollarSign color="white" size={24} />
      </div>
      <div className={styles.benefitContent}>
        <h3>Immediate Employee Savings</h3>
        <p>Employees get $150–$200 more in their monthly paychecks through tax‑free reimbursements</p>
        <div className={styles.benefitTag}>Up to $2,400 annually per employee</div>
      </div>
    </div>
    

    {/* Card 2 */}
    <div className={styles.benefitCard}>
      <div className={`${styles.benefitIcon} ${styles.blue}`}>
        <Users color="white" size={24} />
      </div>
      <div className={styles.benefitContent}>
        <h3>Immediate Employer Savings</h3>
        <p>Reduce your matching FICA tax obligations by an average of $600 per employee per year</p>
        <div className={styles.benefitTag}>$60,000 savings for 100 employees</div>
      </div>
    </div>

    {/* Card 3 */}
    <div className={styles.benefitCard}>
      <div className={`${styles.benefitIcon} ${styles.purple}`}>
        <Heart color="white" size={24} />
      </div>
      <div className={styles.benefitContent}>
        <h3>Comprehensive Preventative Care Program</h3>
        <p>State-of-the-art preventative care program at zero direct cost to employer or employee</p>
        <div className={styles.benefitTag}>100% covered preventative care</div>
      </div>
    </div>

    {/* Card 4 */}
    <div className={styles.benefitCard}>
      <div className={`${styles.benefitIcon} ${styles.amber}`}>
        <ShieldCheck color="white" size={24} />
      </div>
      <div className={styles.benefitContent}>
        <h3>Inovative & Acknowledged</h3>
        <p>Featured in INC. Magazine for trailblazing inovation & structurally confirmed by the CPA journal & Cornell Law School research</p>
        <div className={styles.benefitTag}>Rapidly Growing Across the US</div>
      </div>
    </div>
  </div>
</section>
            {/* ROI Calculator Section */}
      <section className={styles.section}>
  <div className={styles.roiHeader}>
    <div className={styles.roiPill}>📊 ROI Calculator</div>
    <h2 className={styles.roiTitle}>
      Calculate Your <span className={styles.highlightGreen}>Savings</span>
    </h2>
    <p className={styles.roiSubtext}>
      Calculate how much your company and employees can save with this strategy.
    </p>
  </div>

  <div className={styles.calculatorGrid}>
          
          {/* Calculator Card */}
          <div className={styles.calculatorCard}>
            <div className={styles.calculatorHeader}>
              <div className={`${styles.benefitIcon} ${styles.green}`}>
                <DollarSign color="white" size={24} />
              </div>
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
                  <li>• Average $175/month per employee reimbursement</li>
                  <li>• $600/year employer FICA savings per employee</li>
                  <li>• 100% IRS compliant methodology</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Results Column */}
          <div className={styles.resultsColumn}>
            {/* Employee Benefits card */}
            <div className={`${styles.resultCard} ${styles.green}`}>
              <div className={styles.iconAndTitle}>
                <div className={`${styles.benefitIcon} ${styles.green}`}>
                  <DollarSign color="white" size={24} />
                </div>
                <div>
                  <h3 className={styles.resultTitle}>Employee Savings</h3>
                  <p className={styles.resultSubtitle}>Monthly take-home increase</p>
                </div>
              </div>
              <div className={styles.resultRow}>
                <span>Monthly Total:</span>
                <span className={styles.resultAmount}>${monthlyTotal.toLocaleString()}</span>
              </div>
              <div className={styles.resultRow}>
                <span>Annual Total:</span>
                <span className={styles.resultAmount}>${annualTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Employer Savings card */}
            <div className={`${styles.resultCard} ${styles.blue}`}>
              <div className={styles.iconAndTitle}>
                <div className={`${styles.benefitIcon} ${styles.blue}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
              
            </svg>
                </div>
                <div>
                  <h3 className={`{styles.resultTitle}  ${styles.blue}`}>Employer Savings</h3>
                  <p className={`{styles.resultSubtitle}  ${styles.blue}`}>Annual FICA tax reduction</p>
                </div>
              </div>
              <div className="text-center">
                <span className={styles.resultLarge}>${employerSavings.toLocaleString()}</span>
                <p className={`{styles.resultNote}  ${styles.blue}`}>per year</p>
              </div>
            </div>

            {/* Total Impact card */}
            <div className={`${styles.resultCard} ${styles.purple}`}>
              <div className={styles.iconAndTitle}>
                <div className={`${styles.benefitIcon} ${styles.purple}`}>
                  <Users color="white" size={24} />
                </div>
                <div>
                  <h3 className={`${styles.resultTitle} ${styles.purple}`}>Total Impact</h3>
                  <p className={`{styles.resultSubtitle} ${styles.purple}`}>Combined annual savings</p>
                </div>
              </div>
              <div className="text-center">
                <span className={styles.resultXLarge}>${totalImpact.toLocaleString()}</span>
                <p className={`{styles.resultNote} ${styles.purple}`}>total annual value</p>
              </div>
            </div>
          </div>
        </div>
      </section>

<main>
  {/* Why Choose Us */}

  <section className={styles.whyChooseSection}>
    <h3 className={styles.whyChooseTitle}>Why Choose Our Solution?</h3>
    <div className={styles.whyChooseGrid}>
      
      {/* Item 1 */}
      <div className={styles.whyChooseItem}>
        <div className={styles.whyChooseIconBox}>
          <ShieldCheck className={styles.whyChooseIcon} />
        </div>
        <p className={styles.whyChooseText}>100% Compliant</p>
      </div>

      {/* Item 2 */}
      <div className={styles.whyChooseItem}>
        <div className={styles.whyChooseIconBox}>
          <Users className={styles.whyChooseIcon} />
        </div>
        <p className={styles.whyChooseText}>Virtually Managed</p>
      </div>

      {/* Item 3 */}
      <div className={styles.whyChooseItem}>
        <div className={styles.whyChooseIconBox}>
          <DollarSign className={styles.whyChooseIcon} />
        </div>
        <p className={styles.whyChooseText}>Zero Out-of-Pocket</p>
      </div>

      {/* Item 4 */}
      <div className={styles.whyChooseItem}>
        <div className={styles.whyChooseIconBox}>
          <Heart className={styles.whyChooseIcon} />
        </div>
        <p className={styles.whyChooseText}>Always Net Positive</p>
      </div>
    </div>
  </section>

  {/* other content here… */}
</main>

      {/* How It Works Section */}
<section className={styles.section} id="how">
  <div className={`${styles.pill} ${styles.bluePill}`}>🔄 Simple Process</div>

  {/* Step 01 */}
  <div className={styles.howCard}>
    <div className={`${styles.howHeader} ${styles.howGreen}`}>
      <div className={styles.howHeaderLeft}>
        <div className={styles.howIconBox}>
          <DollarSign color="white" size={32} />
        </div>
        <div>
          <div className={styles.howStepNumber}>Step 01</div>
          <h3 className={styles.howStepTitle}>By Reimbursement</h3>
        </div>
      </div>
      <div className={styles.howBigStep}>01</div>
    </div>
    <div className={styles.howBody}>
      <div className={styles.howTextBox}>
        <p>A pre-tax & reimbursement strategy creates an employee savings of about $150–$200 per month.</p>
        <div className={styles.howTag}>Up to $2,400 annually per employee</div>
      </div>
      <div className={styles.howImageBox}>
        <DollarSign size={64} className={styles.howGrayIcon} />
        <p>Tax‑Free Reimbursements</p>
      </div>
    </div>
  </div>

  {/* Step 02 */}
  <div className={styles.howCard}>
    <div className={`${styles.howHeader} ${styles.howBlue}`}>
      <div className={styles.howHeaderLeft}>
        <div className={styles.howIconBox}>
         <svg 
  width="30" 
  height="30" 
  style={{ transform: 'scale(1.2)' }} 
  fill="none" 
  stroke="currentColor" 
  strokeWidth="3" 
  strokeLinecap="round" 
  strokeLinejoin="round"
>
  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
  <polyline points="16 7 22 7 22 13" />
</svg>
        </div>
        <div>
          <div className={styles.howStepNumber}>Step 02</div>
          <h3 className={styles.howStepTitle}>Employer Savings</h3>
        </div>
      </div>
      <div className={styles.howBigStep}>02</div>
    </div>
    <div className={styles.howBody}>
      <div className={styles.howTextBox}>
        <p>Since Employees realize a tax savings, the Employers matching FICA is also reduced saving on average $600 per employee per year.</p>
        <div className={styles.howTag}>FICA tax savings</div>
      </div>
      <div className={styles.howImageBox}>
        <svg 
  width="30" 
  height="30" 
  style={{ transform: 'scale(1.75)' }} 
  fill="none" 
  stroke="#6b7280" 
  strokeWidth="3" 
  strokeLinecap="round" 
  strokeLinejoin="round"
>
  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
  <polyline points="16 7 22 7 22 13" />
</svg>
        <p>Employer Savings</p>
      </div>
    </div>
  </div>

  {/* Step 03 */}
  <div className={styles.howCard}>
    <div className={`${styles.howHeader} ${styles.howPurple}`}>
      <div className={styles.howHeaderLeft}>
        <div className={styles.howIconBox}>
          <ShieldCheck color="white" size={32} />
        </div>
        <div>
          <div className={styles.howStepNumber}>Step 03</div>
          <h3 className={styles.howStepTitle}>Zero Disruption</h3>
        </div>
      </div>
      <div className={styles.howBigStep}>03</div>
    </div>
    <div className={styles.howBody}>
      <div className={styles.howTextBox}>
        <p>Everything works in sync with all of your existing programs and providors.</p>
        <div className={styles.howTag}>Seamless integration</div>
      </div>
      <div className={styles.howImageBox}>
        <ShieldCheck size={64} className={styles.howGrayIcon} />
        <p>Zero Disruption</p>
      </div>
    </div>
  </div>
</section>

      <section className={styles.section}>
  <div className={`${styles.pill} ${styles.amberPill}`}>🏆 Proven & Trusted</div>
  <h2 className={styles.headingBig}>
    <span className={styles.highlightGreen}>As Featured In</span>
  </h2>
  <p className={styles.subheadingLarge}>
    Our innovative payroll strategy has been recognized by leading industry publications and validated by top legal institutions for its effectiveness and compliance.
  </p>

  <div className={styles.credibilityGrid}>
    {/* Card 1 */}
    <div className={styles.credibilityCard}>
      <div className={styles.credibilityIconBox}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 7v14"></path>
          <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
        </svg>
      </div>
      <h3>Featured in CPA Journal</h3>
      <p>Our methodology has been featured in the prestigious CPA Journal for its innovative approach to payroll tax strategy.</p>
    </div>

    {/* Card 2 */}
    <div className={styles.credibilityCard}>
      <div className={styles.credibilityIconBox}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"></path>
          <circle cx="12" cy="8" r="6"></circle>
        </svg>
      </div>
      <h3>INC. Magazine Recognition</h3>
      <p>Our Partners have been recognized for their conceptual and architectual design of this innovative program.</p>
    </div>

    {/* Card 3 */}
    <div className={styles.credibilityCard}>
      <div className={styles.credibilityIconBox}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      </div>
      <h3>Cornell Law School Research</h3>
      <p>IRS compliance confirmed through extensive research conducted by Cornell Law School's legal experts.</p>
    </div>
  </div>

  {/* Quote box under the cards */}
  <div className={styles.quoteBox}>
    <blockquote>
      "The result is an Employee Preventative Care Program creating a tax savings of $150.00 to $200.00 every month, that your emaployees can now take home"
    </blockquote>
    <div className={styles.quoteHighlight}>Wow...what employee wouldn't want more money in their paycheck???</div>
    <div className={styles.quoteTags}>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
        <path d="m9 11 3 3L22 4"></path>
      </svg>
      <span>100% IRS Compliant</span>
      <span>•</span>
      <span>Fully Managed</span>
      <span>•</span>
      <span>Always Net Positive</span>
    </div>
  </div>
</section>

<section id="contact" className="contact-section">
  <div className={styles.bottomSection}>
    <div className={styles.contactContainer}>
      <div className={styles.contactHeader}>
        <div className={`${styles.pill} ${styles.greenPill}`}>💬 Get Started Today</div>
        <h2 className={styles.contactTitle}>
          Learn More About This <span className={styles.highlightGreen}>Tax Saving Strategy...</span>
        </h2>
        <p className="contact-subtitle">
          Schedule your personal consultation with one of our Experts. No pressure, no pitch – just information and a huge win for your team.
        </p>
      </div>

      <div className={styles.contactGrid}>
        {/* Left: Schedule Form */}
        <div className={styles.formContainer}>
          <h3 className={styles.title}>Schedule Here</h3>
          <form>
            <div className={styles.gridTwoCols}>
              <input type="text" name="name" placeholder="Your Name" required className={styles.input} />
              <input type="email" name="email" placeholder="Email Address" required className={styles.input} />
            </div>
            <div className={styles.gridTwoCols}>
              <input type="text" name="company" placeholder="Company Name" required className={styles.input} />
              <input type="number" name="employees" placeholder="Number of Employees" required className={styles.input} />
            </div>
            <textarea
              name="message"
              placeholder="How did you hear about us?..."
              rows={4}
              className={styles.textarea}
            />
            <button
  type="button"
  className={styles.button}
  onClick={() => {
    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
    const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
    const companyInput = document.querySelector('input[name="company"]') as HTMLInputElement;
    const employeesInput = document.querySelector('input[name="employees"]') as HTMLInputElement;
    const messageInput = document.querySelector('textarea[name="message"]') as HTMLTextAreaElement;

    if (!nameInput.value || !emailInput.value || !companyInput.value || !employeesInput.value || !messageInput.value) {
      alert("Please fill in all fields before scheduling.");
      return;
    }

    const name = encodeURIComponent(nameInput.value);
    const email = encodeURIComponent(emailInput.value);
    const company = encodeURIComponent(companyInput.value);
    const employees = encodeURIComponent(employeesInput.value);
    const message = messageInput.value; // keep raw for now

    const a1 = `Company: ${company}\nEmployees: ${employees}\nMessage: ${message}`;

    const calendlyUrl = `https://calendly.com/lee-kw0k/payroll-strategy-meeting?full_name=${name}&email=${email}&a1=${encodeURIComponent(a1).replace(/%20/g, ' ')}`;

    window.open(calendlyUrl);
  }}
>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 22" fill="none" className={styles.icon}>
    <path d="M8 2v4"></path>
    <path d="M16 2v4"></path>
    <rect width="18" height="18" x="3" y="4" rx="2"></rect>
    <path d="M3 10h18"></path>
  </svg>
  Check Availability
</button>
          </form>
        </div>

        {/* Middle: Contact Info & Right: What to Expect */}
        <div className={styles.sideCards}>
          {/* Middle: Contact Info */}
          <div className={styles.contactCard}>
            <h3 className={styles.contactCardTitle}>Contact Our Team Directly</h3>
            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <div className={styles.infoIconBox}>
                  {/* phone icon */}
                  <div className={styles.infoIconBox}>
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2
             19.79 19.79 0 0 1-8.63-3.07
             19.5 19.5 0 0 1-6-6
             19.79 19.79 0 0 1-3.07-8.67
             A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72
             c.13.92.37 1.83.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91
             a16 16 0 0 0 6 6l1.27-1.27
             a2 2 0 0 1 2.11-.45
             c.98.33 1.89.57 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
</div>
 </div>
  <div>
  <p className={styles.infoLabel}>Phone</p>
  <p className={styles.infoValue}>
    <a href="tel:6363548393" className={styles.infoValue}>
      (636) 354-8393
    </a>
  </p>
</div>
</div>
<div className={styles.infoItem}>
  <div className={styles.infoIconBox}>
    {/* email icon */}
    <div className={styles.infoIconBox}>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
        <rect width="20" height="16" x="2" y="4" rx="2"></rect>
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
      </svg>
    </div>
  </div>
  <div>
    <p className={styles.infoLabel}>Email</p>
    <p className={styles.infoValue}>
      <a href="mailto:lee@RevenueReturnSpecialists.com" className={styles.infoValue}>
        lee@RevenueReturnSpecialists.com
      </a>
    </p>
  </div>
</div>
 </div>
 </div>

          {/* Right: What to Expect */}
          <div className={styles.expectCard}>
            <h4 className={styles.expectTitle}>What to Expect</h4>
            <div className={styles.infoList}>
              {[
                "Who, What, Why and How - all answered in 1 quick call",
                "No pressure, no pitch - just information",
                "Custom analysis for your specific situation",
                "Clear next steps if you decide to move forward"
              ].map((text, idx) => (
                <div key={idx} className={styles.expectItem}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" className={styles.expectIcon}>
                    <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
                    <path d="m9 11 3 3L22 4"></path>
                  </svg>
                  <p className={styles.expectText}>{text}</p>
                </div>
              ))}
            </div>
          </div>

<div className={styles.footer}>
  © 2025 Revenue Return Specialists. All rights reserved.
</div>
        </div>
      </div>
    </div> 
  </div>
</section>
</main>
);
}

