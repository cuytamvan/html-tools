export const DEFAULT_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
const DEFAULT_SEPS = 'cfhistuCFHISTU';
const MIN_ALPHABET_LENGTH = 16;
const SEPARATOR_DIV = 3.5;
const GUARD_DIV = 12;

export type HashidsNumber = number | bigint;

function keepUnique(chars: string[]): string[] {
  return Array.from(new Set(chars));
}

function withoutChars(chars: string[], exclude: string[]): string[] {
  return chars.filter((ch) => exclude.indexOf(ch) === -1);
}

function onlyChars(chars: string[], keep: string[]): string[] {
  return chars.filter((ch) => keep.indexOf(ch) !== -1);
}

function escapeRegExp(text: string): string {
  return text.replace(/[\s#$()*+,.?[\\\]^{|}-]/g, '\\$&');
}

function makeAnyOfCharsRegExp(chars: string[]): RegExp {
  return new RegExp(
    chars
      .map(escapeRegExp)
      .sort((a, b) => b.length - a.length)
      .join('|'),
  );
}

function makeAtLeastSomeCharRegExp(chars: string[]): RegExp {
  return new RegExp(
    '^[' +
      chars
        .map(escapeRegExp)
        .sort((a, b) => b.length - a.length)
        .join('') +
      ']+$',
  );
}

function shuffle(alphabetChars: string[], saltChars: string[]): string[] {
  if (saltChars.length === 0) return alphabetChars.slice();
  const transformed = alphabetChars.slice();
  for (let i = transformed.length - 1, v = 0, p = 0; i > 0; i--, v++) {
    v %= saltChars.length;
    const integer = saltChars[v].codePointAt(0) ?? 0;
    p += integer;
    const j = (integer + v + p) % i;
    const tmp = transformed[i];
    transformed[i] = transformed[j];
    transformed[j] = tmp;
  }
  return transformed;
}

function toAlphabet(input: HashidsNumber, alphabetChars: string[]): string[] {
  const id: string[] = [];
  if (typeof input === 'bigint') {
    let value = input;
    const alphabetLength = BigInt(alphabetChars.length);
    do {
      id.unshift(alphabetChars[Number(value % alphabetLength)]);
      value /= alphabetLength;
    } while (value > 0n);
  } else {
    let value = input;
    do {
      id.unshift(alphabetChars[value % alphabetChars.length]);
      value = Math.floor(value / alphabetChars.length);
    } while (value > 0);
  }
  return id;
}

function fromAlphabet(inputChars: string[], alphabetChars: string[]): HashidsNumber {
  return inputChars.reduce((carry: HashidsNumber, item) => {
    const index = alphabetChars.indexOf(item);
    if (index === -1) {
      throw new Error('Karakter tidak ada di alphabet.');
    }
    if (typeof carry === 'bigint') {
      return carry * BigInt(alphabetChars.length) + BigInt(index);
    }
    const value = carry * alphabetChars.length + index;
    if (Number.isSafeInteger(value)) return value;
    return BigInt(carry) * BigInt(alphabetChars.length) + BigInt(index);
  }, 0);
}

export class Hashids {
  minLength: number;
  salt: string[];
  alphabet: string[];
  seps: string[];
  guards: string[];
  guardsRegExp: RegExp;
  sepsRegExp: RegExp;
  allowedCharsRegExp: RegExp;

  constructor(salt?: string, minLength?: number, alphabet?: string) {
    this.minLength = minLength || 0;
    const saltChars = Array.from(salt || '');
    const alphabetChars = Array.from(alphabet || DEFAULT_ALPHABET);
    const sepsChars = Array.from(DEFAULT_SEPS);

    const uniqueAlphabet = keepUnique(alphabetChars);
    if (uniqueAlphabet.length < MIN_ALPHABET_LENGTH) {
      throw new Error('Alphabet harus berisi minimal 16 karakter unik.');
    }

    this.salt = saltChars;
    this.alphabet = withoutChars(uniqueAlphabet, sepsChars);
    this.seps = shuffle(onlyChars(sepsChars, uniqueAlphabet), saltChars);

    if (this.seps.length === 0 || this.alphabet.length / this.seps.length > SEPARATOR_DIV) {
      const sepsLength = Math.ceil(this.alphabet.length / SEPARATOR_DIV);
      if (sepsLength > this.seps.length) {
        const diff = sepsLength - this.seps.length;
        this.seps = this.seps.concat(this.alphabet.slice(0, diff));
        this.alphabet = this.alphabet.slice(diff);
      }
    }

    this.alphabet = shuffle(this.alphabet, saltChars);
    const guardCount = Math.ceil(this.alphabet.length / GUARD_DIV);
    if (this.alphabet.length < 3) {
      this.guards = this.seps.slice(0, guardCount);
      this.seps = this.seps.slice(guardCount);
    } else {
      this.guards = this.alphabet.slice(0, guardCount);
      this.alphabet = this.alphabet.slice(guardCount);
    }

    this.guardsRegExp = makeAnyOfCharsRegExp(this.guards);
    this.sepsRegExp = makeAnyOfCharsRegExp(this.seps);
    this.allowedCharsRegExp = makeAtLeastSomeCharRegExp(this.alphabet.concat(this.guards, this.seps));
  }

  encode(numbers: HashidsNumber[]): string {
    return this._encode(numbers).join('');
  }

  _encode(numbers: HashidsNumber[]): string[] {
    let alphabet = this.alphabet.slice();
    const numbersIdInt = numbers.reduce<number>((last, number, i) => {
      if (typeof number === 'bigint') {
        return last + Number(number % BigInt(i + 100));
      }
      return last + (number % (i + 100));
    }, 0);

    let ret = [alphabet[numbersIdInt % alphabet.length]];
    const lottery = ret.slice();
    const seps = this.seps;
    const guards = this.guards;

    numbers.forEach((number, i) => {
      const buffer = lottery.concat(this.salt, alphabet);
      alphabet = shuffle(alphabet, buffer);
      const last = toAlphabet(number, alphabet);
      ret = ret.concat(last);
      if (i + 1 < numbers.length) {
        const charCode = (last[0].codePointAt(0) ?? 0) + i;
        const extraNumber = typeof number === 'bigint' ? Number(number % BigInt(charCode)) : number % charCode;
        ret.push(seps[extraNumber % seps.length]);
      }
    });

    if (ret.length < this.minLength) {
      const prefixGuardIndex = (numbersIdInt + (ret[0].codePointAt(0) ?? 0)) % guards.length;
      ret.unshift(guards[prefixGuardIndex]);
      if (ret.length < this.minLength) {
        const suffixGuardIndex = (numbersIdInt + (ret[2].codePointAt(0) ?? 0)) % guards.length;
        ret.push(guards[suffixGuardIndex]);
      }
    }

    const halfLength = Math.floor(alphabet.length / 2);
    while (ret.length < this.minLength) {
      alphabet = shuffle(alphabet, alphabet);
      ret = alphabet.slice(halfLength).concat(ret, alphabet.slice(0, halfLength));
      const excess = ret.length - this.minLength;
      if (excess > 0) {
        const halfOfExcess = excess / 2;
        ret = ret.slice(halfOfExcess, halfOfExcess + this.minLength);
      }
    }

    return ret;
  }

  decode(id: string): HashidsNumber[] {
    if (!id || typeof id !== 'string') return [];
    if (!this.allowedCharsRegExp.test(id)) {
      throw new Error('Hash berisi karakter yang tidak ada di alphabet.');
    }

    const idGuardsArray = id.split(this.guardsRegExp);
    const splitIndex = idGuardsArray.length === 3 || idGuardsArray.length === 2 ? 1 : 0;
    const idBreakdown = idGuardsArray[splitIndex] || '';
    if (idBreakdown.length === 0) return [];

    const lotteryChar = Array.from(idBreakdown)[0];
    const rest = idBreakdown.slice(lotteryChar.length);
    const idArray = rest.split(this.sepsRegExp);

    let lastAlphabet = this.alphabet.slice();
    const result: HashidsNumber[] = [];

    for (let i = 0; i < idArray.length; i++) {
      const subId = idArray[i];
      const buffer = [lotteryChar].concat(this.salt, lastAlphabet);
      const nextAlphabet = shuffle(lastAlphabet, buffer.slice(0, lastAlphabet.length));
      result.push(fromAlphabet(Array.from(subId), nextAlphabet));
      lastAlphabet = nextAlphabet;
    }

    if (this.encode(result) !== id) return [];
    return result;
  }
}
