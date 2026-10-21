import { useEffect } from "react";

/** Sets the page title, meta description and optional structured data (all put back when the page is left). */
export function usePageMeta(title: string, description: string, jsonLd?: object) {
  const structured = jsonLd ? JSON.stringify(jsonLd) : null;
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    const previousDescription = meta.content;
    meta.content = description;
    let script: HTMLScriptElement | null = null;
    if (structured) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.text = structured;
      document.head.appendChild(script);
    }
    return () => {
      document.title = previousTitle;
      if (created) meta?.remove();
      else if (meta) meta.content = previousDescription;
      script?.remove();
    };
  }, [title, description, structured]);
}
