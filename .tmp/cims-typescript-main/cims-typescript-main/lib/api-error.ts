import axios from "axios";

export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data;

    if (typeof detail === "string") {
      return detail;
    }

    if (detail && typeof detail === "object") {
      const message = "message" in detail ? detail.message : undefined;
      if (typeof message === "string" && message.trim()) {
        return message;
      }

      const description = "detail" in detail ? detail.detail : undefined;
      if (typeof description === "string" && description.trim()) {
        return description;
      }

      if (Array.isArray(description) && description.length > 0) {
        const firstIssue = description[0];
        if (
          firstIssue &&
          typeof firstIssue === "object" &&
          "msg" in firstIssue &&
          typeof firstIssue.msg === "string"
        ) {
          return firstIssue.msg;
        }
      }
    }

    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
