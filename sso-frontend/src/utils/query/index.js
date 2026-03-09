export function getQueryParams() {
  const params = new URLSearchParams(window.location.search);

  return {
    client_id: params.get("client_id"),
    redirect_uri: params.get("redirect_uri"),
    state: params.get("state"),
    code_challenge: params.get("code_challenge"),
    code_challenge_method: params.get("code_challenge_method"),
    session_id: params.get("session_id"),
  };
}