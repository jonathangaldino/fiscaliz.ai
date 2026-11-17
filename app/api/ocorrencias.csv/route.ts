import { toCsv } from "@/lib/openData";
import { exportOccurrences } from "@/lib/openDataRoute";

export function GET(request: Request) {
  return exportOccurrences(request, "text/csv; charset=utf-8", toCsv);
}
