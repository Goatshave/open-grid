import { createServerTreePageModel, type ServerTreePageSearchParams } from "../../../shared";

export interface NextPortfoliosPageProps {
  searchParams?: ServerTreePageSearchParams | Promise<ServerTreePageSearchParams>;
}

export default async function PortfoliosPage({ searchParams }: NextPortfoliosPageProps = {}) {
  return createServerTreePageModel({
    framework: "Next.js",
    searchParams: await Promise.resolve(searchParams),
    childrenPath: "/api/portfolios/children",
  });
}
