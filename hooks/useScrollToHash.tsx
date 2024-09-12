import { useEffect } from "react";

export default function useScrollToHash() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      const url = new URL(window.location.href);
      if (url.hash) {
        const sectionId = url.hash.slice(1);
        const element = document.getElementById(`user-content-${sectionId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, []);
}
