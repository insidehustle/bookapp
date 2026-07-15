import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

const inlineComponents: Components = {
  p: ({ children }) => <>{children}</>,
};

export function Markdown({
  content,
  inline = false,
  className,
}: {
  content: string;
  inline?: boolean;
  className?: string;
}) {
  const Wrapper = inline ? "span" : "div";
  return (
    <Wrapper className={`${inline ? "" : "prose-content"} ${className ?? ""}`}>
      <ReactMarkdown components={inline ? inlineComponents : undefined}>
        {content}
      </ReactMarkdown>
    </Wrapper>
  );
}
