import { toGeoJSON } from "@/lib/openData";
import { exportOccurrences } from "@/lib/openDataRoute";

export function GET(request: Request) {
  return exportOccurrences(
    request,
    "application/geo+json; charset=utf-8",
    (list, origin) => JSON.stringify(toGeoJSON(list, origin)),
  );
}
