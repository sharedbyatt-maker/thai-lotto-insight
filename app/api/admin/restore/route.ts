import { env } from "cloudflare:workers";
import { requireAdminApi, unauthorized } from "../../../../lib/admin-auth";
import { parseBackup, restoreBackup } from "../../../../lib/backup-restore";
import { validateRequestBody } from "../../../../lib/http-security";

export const dynamic = "force-dynamic";
const MAX_BYTES = 10_000_000;

export async function POST(request: Request) {
  if (!await requireAdminApi(request)) return unauthorized();
  const invalid = validateRequestBody(request, {maxBytes: MAX_BYTES});
  if (invalid) return invalid;
  if (request.headers.get("x-confirm-restore") !== "RESTORE_EMPTY_DATABASE") {
    return Response.json({error: "Restore confirmation header is required"}, {status: 409});
  }

  const reader = request.body?.getReader();
  if (!reader) return Response.json({error: "Backup is required"}, {status: 400});
  const decoder = new TextDecoder();
  let size = 0, text = "";
  for (;;) {
    const {value, done} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      return Response.json({error: "Request body is too large"}, {status: 413});
    }
    text += decoder.decode(value, {stream: true});
  }
  let backup: unknown;
  try {
    backup = JSON.parse(text + decoder.decode());
  } catch {
    return Response.json({error: "Invalid backup JSON"}, {status: 400});
  }
  const tables = parseBackup(backup);
  if (!tables) return Response.json({error: "Invalid V3.2/V3.3 backup"}, {status: 400});

  try {
    const restored = await restoreBackup(env.DB, tables);
    if (!restored) return Response.json({error: "Restore is allowed only into an empty database"}, {status: 409});
    return Response.json({status: "restored", restored});
  } catch (error) {
    console.error("Backup restore failed", error);
    return Response.json({error: "Restore failed. Check the backup and recovery database, then retry."}, {status: 500});
  }
}
