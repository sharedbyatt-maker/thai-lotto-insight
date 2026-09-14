import { requireAdminApi, unauthorized } from "../../../../lib/admin-auth";
import { runDrawDaySync } from "../../../../lib/draw-day-sync";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!(await requireAdminApi(request))) return unauthorized();
  try {
    return Response.json(await runDrawDaySync(new Date(), true));
  } catch {
    return Response.json(
      {
        status: "failed",
        message:
          "Official result sync failed; the last verified result remains available.",
      },
      { status: 502 },
    );
  }
}
