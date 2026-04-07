import { redirect } from "next/navigation";

export default async function StudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ templateSlug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { templateSlug } = await params;
  const { lang } = await searchParams;
  redirect(`/create?template=${templateSlug}&lang=${lang === "zh" ? "zh" : "en"}`);
}
