import { parseEntry } from "@/utils";
import Link from "next/link";
import styles from "./styles.module.css";

interface PostEntryProps {
  description: string;
  id: string;
  createdAt: string;
}

export default function PostEntry(props: PostEntryProps) {
  try {
    const { description, id, createdAt: _createdAt } = props;
    const createdAt = Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
    }).format(new Date(_createdAt));
    const { description: _description, title, type } = parseEntry(description);

    const color = (() => {
      if (type === "Poetry") {
        return "rgba(186, 48, 154, 0.8)";
      }
      if (type === "Blog") {
        return "rgba(48, 186, 94, 0.8)";
      }

      return "var(--accent)";
    })();

    return (
      <Link
        href={`/article/${id}`.toLocaleLowerCase()}
        style={{
          display: "flex",
          background: color,
          borderRadius: "var(--rounded)",
        }}
      >
        <div className={styles["post-entry"]}>
          <p className={styles["post-date"]}>{createdAt}</p>
          <p className={styles["post-title"]}>{title}</p>
          <p className={styles["post-description"]}>{_description}</p>
        </div>
        <div
          style={{
            writingMode: "vertical-lr",
            color: "var(--foreground)",
            padding: "0.5em 0.3em",
            width: "2em",
          }}
        >
          <p
            style={{
              fontSize: "1em",
              fontWeight: "bolder",
              textAlign: "center",
            }}
          >
            {type}
          </p>
        </div>
      </Link>
    );
  } catch (error) {
    return null;
  }
}
