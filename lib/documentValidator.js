// ============================================================================
// VALIDACAO DE DOCUMENTOS
// Normaliza e valida CPF/CNPJ antes do cadastro de usuario.
// ============================================================================

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function hasRepeatedDigits(digits) {
  return /^(\d)\1+$/.test(digits);
}

function validateCpf(digits) {
  if (digits.length !== 11 || hasRepeatedDigits(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(digits[i]) * (10 - i);
  }
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) {
    sum += Number(digits[i]) * (11 - i);
  }
  check = (sum * 10) % 11;
  if (check === 10) check = 0;

  return check === Number(digits[10]);
}

function validateCnpj(digits) {
  if (digits.length !== 14 || hasRepeatedDigits(digits)) return false;

  const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondWeights = [6, ...firstWeights];

  const firstSum = firstWeights.reduce((sum, weight, index) => {
    return sum + Number(digits[index]) * weight;
  }, 0);
  const firstCheck = firstSum % 11 < 2 ? 0 : 11 - (firstSum % 11);
  if (firstCheck !== Number(digits[12])) return false;

  const secondSum = secondWeights.reduce((sum, weight, index) => {
    return sum + Number(digits[index]) * weight;
  }, 0);
  const secondCheck = secondSum % 11 < 2 ? 0 : 11 - (secondSum % 11);

  return secondCheck === Number(digits[13]);
}

function normalizeCpfCnpj(value) {
  const digits = onlyDigits(value);

  if (digits.length === 11) {
    return validateCpf(digits)
      ? { ok: true, type: 'cpf', digits }
      : { ok: false, type: 'cpf', digits, message: 'CPF invalido. Confira os numeros digitados.' };
  }

  if (digits.length === 14) {
    return validateCnpj(digits)
      ? { ok: true, type: 'cnpj', digits }
      : { ok: false, type: 'cnpj', digits, message: 'CNPJ invalido. Confira os numeros digitados.' };
  }

  return {
    ok: false,
    type: '',
    digits,
    message: 'Informe um CPF com 11 digitos ou um CNPJ com 14 digitos.',
  };
}

module.exports = {
  normalizeCpfCnpj,
  onlyDigits,
  validateCnpj,
  validateCpf,
};
