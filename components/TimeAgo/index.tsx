"use client";

import { useEffect, useState } from "react";
import styles from "./styles.module.css";

interface TimeAgoProps {
  createdAt: string;
  className: string;
}

export default function TimeAgo({ createdAt, className }: TimeAgoProps) {
  const [timeAgo, setTimeAgo] = useState(
    Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
    }).format(new Date(createdAt))
  );

  const [fadeClass, setFadeClass] = useState(styles.fadeIn);

  useEffect(() => {
    const calculateTimeAgo = () => {
      const now = new Date();
      const createdDate = new Date(createdAt);
      const timeDifference = now.getTime() - createdDate.getTime();
      const seconds = Math.floor(timeDifference / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      let newTimeAgo = "";
      if (days > 1) {
        newTimeAgo = Intl.DateTimeFormat("en-US", {
          dateStyle: "medium",
        }).format(createdDate);
      } else if (hours >= 1) {
        newTimeAgo = `${hours} hour${hours > 1 ? "s" : ""} ago`;
      } else if (minutes >= 1) {
        newTimeAgo = `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
      } else {
        newTimeAgo = `${seconds} second${seconds > 1 ? "s" : ""} ago`;
      }

      if (newTimeAgo !== timeAgo) {
        setFadeClass(styles.fade);
        setTimeout(() => {
          setTimeAgo(newTimeAgo);
          setFadeClass(styles.fadeIn);
        }, 500);
      }
    };

    calculateTimeAgo();
    const intervalId = setInterval(calculateTimeAgo, 60000);

    return () => clearInterval(intervalId);
  }, [createdAt, timeAgo]);

  return (
    <time dateTime={createdAt} className={`${className} ${fadeClass}`}>
      {timeAgo}
    </time>
  );
}
