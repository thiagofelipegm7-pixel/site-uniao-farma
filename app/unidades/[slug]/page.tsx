import { notFound, permanentRedirect } from "next/navigation";
import { getUnitBySlug } from "../../site-config";
import { getUnitPublicPath } from "../../structured-data";

type UnitPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function UnitPage({ params }: UnitPageProps) {
  const { slug } = await params;
  const unit = getUnitBySlug(slug);
  if (!unit) notFound();
  permanentRedirect(getUnitPublicPath(unit));
}
