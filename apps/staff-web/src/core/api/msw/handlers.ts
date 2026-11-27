import { http } from "msw";
import { handleMockRequest } from "./mock-transport";

export const staffWebMswHandlers = [
  http.all(/\/(health|v1\/.*)/, async ({ request }) => {
    const bodyText = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
    return handleMockRequest(request.url, {
      method: request.method,
      headers: request.headers,
      body: bodyText,
    });
  }),
];
