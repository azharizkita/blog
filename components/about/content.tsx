import ArticleContent from "../article-content";

interface AboutProps {
  data: string;
}

export function Content(props: AboutProps) {
  const { data } = props;

  return <ArticleContent withBackNavigation={false} content={data} />;
}
