"use client";

import { CircleArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      router.push("/articles");
    }
  };

  return (
    <button
      onClick={handleBack}
      className="cursor-pointer transition-all hover:text-muted-foreground duration-300"
    >
      <CircleArrowLeft />
    </button>
  );
}
