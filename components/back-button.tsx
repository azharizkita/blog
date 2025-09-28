"use client";

import { CircleArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNavigation } from "./navigation-provider";

export default function BackButton() {
  const router = useRouter();
  const { checkInternalHistory } = useNavigation();

  const handleBack = () => {
    if (checkInternalHistory()) {
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
