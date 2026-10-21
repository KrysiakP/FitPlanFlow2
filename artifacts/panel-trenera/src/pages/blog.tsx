import { Link, useRoute } from "wouter";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/public-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { ARTICLES, wordCount, type Article } from "@/content/blog";

const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });

function ArticleView({ article }: { article: Article }) {
  usePageMeta(`${article.title} | Panel Trenera`, article.description, {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    inLanguage: "pl",
    publisher: { "@type": "Organization", name: "Panel Trenera", url: "https://paneltrenera.pl" },
    mainEntityOfPage: `https://paneltrenera.pl/blog/${article.slug}`,
  });

  return (
    <article className="container mx-auto px-4 py-10 max-w-2xl" data-testid={`article-${article.slug}`}>
      <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">← Wszystkie artykuły</Link>
      <h1 className="font-heading font-bold text-3xl md:text-4xl mt-4 mb-2 text-balance">{article.title}</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {formatDate(article.date)} · {Math.max(1, Math.round(wordCount(article) / 200))} min czytania
      </p>
      <div className="space-y-4 leading-relaxed">
        {article.blocks.map((block, index) => {
          if (block.type === "h2") return <h2 key={index} className="font-heading font-semibold text-xl mt-8">{block.text}</h2>;
          if (block.type === "ul") return <ul key={index} className="list-disc pl-6 space-y-1">{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
          return <p key={index}>{block.text}</p>;
        })}
      </div>
      <Card className="mt-12">
        <CardHeader>
          <CardTitle className="font-heading">Plan, raporty i płatności w jednym miejscu</CardTitle>
          <CardDescription>Panel Trenera pomaga prowadzić podopiecznych online bez chaosu w wiadomościach. Konto trenera zaczyna się od okresu próbnego.</CardDescription>
          <Button asChild className="w-fit mt-2"><Link href="/register" data-testid="link-blog-cta">Załóż konto</Link></Button>
        </CardHeader>
      </Card>
    </article>
  );
}

function Index() {
  usePageMeta("Blog dla trenerów personalnych | Panel Trenera", "Praktyczne artykuły dla trenerów personalnych prowadzących podopiecznych online: plany treningowe, raporty tygodniowe i organizacja pracy.");
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="font-heading font-bold text-3xl md:text-4xl mb-2">Blog dla trenerów</h1>
      <p className="text-muted-foreground mb-8">Jak prowadzić podopiecznych online, nie tracąc na to wieczorów.</p>
      <div className="space-y-4">
        {ARTICLES.map((article) => (
          <Link key={article.slug} href={`/blog/${article.slug}`} data-testid={`link-article-${article.slug}`}>
            <Card className="hover-elevate cursor-pointer">
              <CardHeader>
                <CardTitle className="font-heading text-xl">{article.title}</CardTitle>
                <CardDescription>{article.description}</CardDescription>
                <p className="text-xs text-muted-foreground">{formatDate(article.date)}</p>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Blog() {
  const [matches, params] = useRoute("/blog/:slug");
  const article = matches ? ARTICLES.find((item) => item.slug === params?.slug) : undefined;
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      {matches ? (
        article ? <ArticleView article={article} /> : <div className="container mx-auto px-4 py-16 text-center"><p className="mb-4">Nie znaleziono artykułu.</p><Link href="/blog" className="underline">Wróć do listy</Link></div>
      ) : (
        <Index />
      )}
    </div>
  );
}
