import { connection } from "next/server";
import { listMurals } from "@/server/murals";

// GET /api/murals - every mural, in storybook order, with its progress.
export async function GET() {
  // Our SQLite calls are synchronous, so Next can't tell this reads live
  // data. connection() says "always run this per request, never pre-build it".
  await connection();
  return Response.json(listMurals());
}
