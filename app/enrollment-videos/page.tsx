'use client';

import Image from 'next/image';
import styles from './page.module.css';

export default function EnrollmentVideosPage() {
  return (
    <div className={styles.pageWrapper}>

      {/* Background bubbles */}
      <div className={styles.bgBubble}></div>
      <div className={styles.bgBubble2}></div>
      <div className={styles.bgBubble3}></div>

      <div className={styles.contentBox}>

        {/* Logo */}
        <div className={styles.logoWrapper}>
          <Image 
            src="/8930_1663277124.png" 
            alt="RRS Logo" 
            width={200}
            height={200}
            className={styles.logo}
            priority
          />
        </div>

        <h1 className={styles.pageTitle}>Enrollment Overview Videos</h1>
        <p className={styles.pageSubtitle}>
          A quick overview of the benefits you will receive by enrolling.
        </p>

        {/* English Video */}
        <div className={styles.videoCard}>
          <h2 className={styles.videoTitle}>English Overview</h2>
          <video controls className={styles.videoPlayer}>
            <source src="/videos/simrp_video_493 (1).mp4" type="video/mp4" />
          </video>
        </div>

        {/* Spanish Video */}
        <div className={styles.videoCard}>
          <h2 className={styles.videoTitle}>Spanish Overview</h2>
          <video controls className={styles.videoPlayer}>
            <source src="/videos/simrp_video_spanish_401 (1).mp4" type="video/mp4" />
          </video>
        </div>

      </div>
    </div>
  );
}