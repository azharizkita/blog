"use client";

import { useEffect, useRef, useState } from "react";

interface TimeAgoProps {
  time: string;
  className?: string;
  updatedAt?: string;
}

export default function TimeAgo({ time, className, updatedAt }: TimeAgoProps) {
  const [timeAgo, setTimeAgo] = useState(
    Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
    }).format(new Date(time))
  );
  const [formattedUpdatedAt, setFormattedUpdatedAt] = useState("");
  const [isSpanVisible, setIsSpanVisible] = useState(false);
  const [isTimeAgoVisible, setIsTimeAgoVisible] = useState(true);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const updateTimeAgo = () => {
      const now = new Date();
      const createdDate = new Date(time);
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
        setIsTimeAgoVisible(false);
      } else if (minutes >= 1) {
        newTimeAgo = `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
        setIsTimeAgoVisible(false);
      } else {
        newTimeAgo = `${seconds} second${seconds > 1 ? "s" : ""} ago`;
        setIsTimeAgoVisible(false);
      }

      setTimeout(() => {
        setTimeAgo(newTimeAgo);
        setIsTimeAgoVisible(true);
      }, 500);

      if (updatedAt && time !== updatedAt) {
        const updatedDate = new Date(updatedAt);
        const updatedDay = Intl.DateTimeFormat("en-US", {
          dateStyle: "medium",
        }).format(updatedDate);
        const updatedTime = Intl.DateTimeFormat("en-US", {
          timeStyle: "short",
        }).format(updatedDate);
        setFormattedUpdatedAt(`${updatedTime}, ${updatedDay}`);
      } else {
        setFormattedUpdatedAt("");
      }
    };

    const intervalId = setInterval(updateTimeAgo, 50000);
    const timeoutId = setTimeout(updateTimeAgo, 500);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [time, updatedAt]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    const spanRefCurrent = spanRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          timeoutId = setTimeout(() => setIsSpanVisible(true), 500);
        }
      },
      { threshold: 0.1 }
    );

    if (spanRefCurrent) observer.observe(spanRefCurrent);

    return () => {
      if (spanRefCurrent) observer.unobserve(spanRefCurrent);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <time dateTime={time} className={className}>
      <span
        className={`${
          isTimeAgoVisible ? "opacity-100" : "opacity-0"
        } transition-opacity duration-500`}
      >
        {timeAgo}
      </span>
      {updatedAt && (
        <span
          ref={spanRef}
          className={`text-muted-foreground ${
            isSpanVisible ? "opacity-100" : "opacity-0 invisible"
          } text-xs transition-opacity duration-1000`}
        >
          Updated at {formattedUpdatedAt}
        </span>
      )}
    </time>
  );
}
