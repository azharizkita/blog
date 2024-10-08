"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./styles.module.css";

interface TimeAgoProps {
  time: string;
  className?: string;
  updatedAt?: string;
  styles?: CSSProperties;
}

export default function TimeAgo({
  time,
  className,
  updatedAt,
  styles: _styles,
}: TimeAgoProps) {
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

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          timeoutId = setTimeout(() => setIsSpanVisible(true), 500);
        }
      },
      { threshold: 0.1 }
    );

    if (spanRef.current) observer.observe(spanRef.current);

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (spanRef.current) observer.unobserve(spanRef.current);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <time style={_styles} dateTime={time} className={className}>
      <span
        className={isTimeAgoVisible ? styles.fadeIn : styles.fadeOut}
        style={{ transition: "opacity 0.5s ease" }}
      >
        {timeAgo}
      </span>
      {updatedAt && (
        <span
          ref={spanRef}
          className={isSpanVisible ? styles.fadeIn : styles.hidden}
          style={{ fontSize: "0.75em" }}
        >
          Updated at {formattedUpdatedAt}
        </span>
      )}
    </time>
  );
}
