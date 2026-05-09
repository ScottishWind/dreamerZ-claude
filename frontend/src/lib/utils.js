import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// FastAPI returns string `detail` for HTTPException, an array of objects for
// Pydantic 422s. Surface both as readable strings so toasts don't show
// "[object Object]".
export function formatErrorDetail(detail) {
  if (detail === null || detail === undefined) return null;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => {
        if (typeof e === "string") return e;
        const loc = Array.isArray(e?.loc)
          ? e.loc.filter((p) => p !== "body").join(".")
          : "";
        return loc ? `${loc}: ${e?.msg || ""}` : e?.msg || JSON.stringify(e);
      })
      .join("; ");
  }
  return JSON.stringify(detail);
}
