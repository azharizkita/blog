import Image from "next/image";
import styles from "./styles.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <a
        href="https://github.com/azharizkita"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          aria-hidden
          src="/github.svg"
          alt="File icon"
          width={16}
          height={16}
        />
      </a>
    </footer>
  );
}
