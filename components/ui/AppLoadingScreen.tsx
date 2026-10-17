import Image from "next/image";
import logo from "@/public/b.life-logo.png";
import styles from "./AppLoadingScreen.module.css";

export function AppLoadingScreen({ overlay = false }: { overlay?: boolean }) {
  return (
    <div className={`${styles.screen} ${overlay ? styles.overlay : ""}`} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.content}>
        <div className={styles.logo}>
          <Image src={logo} alt="b.life" width={56} height={56} preload />
        </div>
        <p className={styles.title}>Зареждане…</p>
        <p className={styles.description}>Подготвяме работното пространство</p>
        <div className={styles.track} aria-hidden="true"><span /></div>
      </div>
    </div>
  );
}
