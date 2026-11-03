/** Traduz erros do Supabase Auth e do Postgres para mensagens em português. */
const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar. O link está na sua caixa de entrada.",
  user_already_exists: "Já existe uma conta com esse e-mail.",
  email_exists: "Já existe uma conta com esse e-mail.",
  weak_password: "Senha fraca. Use ao menos 8 caracteres, misturando letras e números.",
  same_password: "A nova senha precisa ser diferente da atual.",
  over_email_send_rate_limit: "Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos.",
  over_request_rate_limit: "Muitas tentativas seguidas. Aguarde um pouco e tente de novo.",
  email_address_invalid: "Esse e-mail não é válido.",
  signup_disabled: "Novos cadastros estão desativados.",
  otp_expired: "O link expirou. Peça um novo.",
  session_not_found: "Sua sessão expirou. Entre novamente.",
  reauthentication_needed: "Por segurança, entre novamente antes de trocar a senha.",
};

type MaybeError = { code?: string; message?: string; status?: number } | null | undefined;

export function authErrorMessage(error: MaybeError) {
  if (!error) return "";
  if (error.code && AUTH_MESSAGES[error.code]) return AUTH_MESSAGES[error.code];
  if (error.status === 429) return AUTH_MESSAGES.over_request_rate_limit;
  return "Não foi possível concluir agora. Tente novamente em instantes.";
}

/** Erros levantados pelas funções e restrições do banco (mensagens já em português). */
export function dbErrorMessage(error: MaybeError) {
  if (!error) return "";
  if (error.code === "P0001" || error.code === "P0002" || error.code === "P0003" || error.code === "22023") {
    return error.message ?? "Operação inválida.";
  }
  if (error.code === "23505") return "Já existe um registro com esses dados.";
  if (error.code === "42501") return "Você não tem permissão para isso.";
  return "Não foi possível salvar. Tente novamente.";
}
