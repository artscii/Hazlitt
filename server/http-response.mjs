// Never try to replace headers after streaming has begun or a client has left.
export function failResponse(response, error) {
  if (response.destroyed) return;
  if (response.headersSent) {
    response.destroy(error);
    return;
  }
  response.writeHead(500);
  response.end("Unavailable");
}
