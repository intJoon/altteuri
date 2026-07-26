import { handleCommentsRequest } from "../lib/comments-service.mjs";

export default async function handler(req, res) {
  return handleCommentsRequest(req, res);
}
